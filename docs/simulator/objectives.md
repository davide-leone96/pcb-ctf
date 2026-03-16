# Sistema di Obiettivi

## Panoramica

Gli **Obiettivi** (`Objective`) sono le unità atomiche di progressione dell'esercizio. Ogni obiettivo rappresenta un'azione specifica che lo studente deve compiere — identificare un componente, collegare sonde, eseguire un comando nel terminale, estrarre un firmware — e al suo completamento contribuisce con un frammento (`flagPart`) alla flag progressiva dello step.

Gli obiettivi all'interno di uno step sono completati in **sequenza obbligata**: non è possibile saltare al terzo obiettivo senza aver completato il secondo, perché `_completeCurrentObjective()` incrementa `currentObjectiveIndex` uno alla volta.

---

## Tipi di Obiettivo (`ObjectiveType`)

```typescript
export type ObjectiveType = 'component' | 'uart' | 'terminal' | 'pin' | 'firmware-dump';
```

### `component` — Identificazione Componente

Lo studente clicca su un componente hardware (chip, resistore, connettore) sulla PCB. Il completamento avviene quando l'ID del componente cliccato corrisponde all'ID dell'obiettivo corrente:

```typescript
selectComponent: (componentId) => {
  const currentObjective = currentStep.objectives[currentObjectiveIndex];
  const objType = currentObjective.type || 'component';  // default = 'component'
  if (objType !== 'component') return;
  if (componentId !== currentObjective.id) return;
  get()._completeCurrentObjective();
}
```

**Uso tipico**: identificare la CPU, la memoria flash, il connettore UART, resistori specifici.

---

### `uart` — Connessione Seriale UART

Lo studente collega le tre sonde dell'adattatore UART (TX, RX, GND) ai pin PCB corrispondenti nella sequenza corretta (crossover). Il completamento avviene automaticamente quando `hookUartProbe()` verifica che tutte e tre le connessioni siano corrette:

```typescript
const correctMapping = {
  'adapter-tx': 'rx',
  'adapter-rx': 'tx',
  'adapter-gnd': 'gnd',
};
const allCorrect = updated.every(conn => {
  const pin = data.uartPins?.find(p => p.id === conn.pcbPinId);
  return pin?.role === correctMapping[conn.adapterPin];
});
```

**Uso tipico**: step di stabilimento della connessione seriale, prerequisito per il terminale.

---

### `terminal` — Scoperta via Terminale

Lo studente esegue comandi nel terminale che sbloccano specifici flag. Il completamento dipende dalle `bootStageConditions`:

```typescript
interface BootStageCondition {
  bootStageId: string;      // ID del boot stage (non usato a runtime)
  unlockedFlags: string[];  // flag part ID che devono essere scoperti
  hint: string;             // suggerimento per lo studente
}
```

L'obiettivo si completa quando **tutti** i flag elencati in `bootStageConditions.flatMap(c => c.unlockedFlags)` sono stati aggiunti a `terminalDiscoveries`:

```typescript
addTerminalDiscovery: (id) => {
  const newDiscoveries = [...terminalDiscoveries, id];
  set({ terminalDiscoveries: newDiscoveries });

  if (stepMode === 'active' && currentObj?.type === 'terminal') {
    const requiredFlags = (currentObj.bootStageConditions ?? [])
      .flatMap(c => c.unlockedFlags);
    if (requiredFlags.length > 0 && requiredFlags.every(f => newDiscoveries.includes(f))) {
      get()._completeCurrentObjective();
    }
  }
}
```

**Caso speciale**: se `bootStageConditions` è un array vuoto, `requiredFlags.length === 0` e l'obiettivo non si completa mai automaticamente.

**Uso tipico**: analisi U-Boot, accesso root, hash cracking, scoperta vulnerabilità.

---

### `pin` — Connessione Specifica Pin

Lo studente deve collegare specifiche sonde (del multimetro o UART) a specifici pin PCB. Le condizioni sono valutate da `_checkPinConditions()` dopo ogni hook:

```typescript
interface PinCondition {
  pinId: string;
  terminal: 'probe1' | 'probe2' | 'adapter-tx' | 'adapter-rx' | 'adapter-gnd';
}
```

La logica può essere `AND` (tutte le condizioni devono essere soddisfatte, default) o `OR` (almeno una):

```typescript
const satisfied = logic === 'AND'
  ? conditions.every(isConditionMet)
  : conditions.some(isConditionMet);
```

**Uso tipico**: "Misura la tensione su VCC con probe1 rosso e GND con probe2 nero."

---

### `firmware-dump` — Estrazione Firmware

Lo studente utilizza un custom tool di tipo `firmware-dump` per estrarre il firmware da un chip. Il completamento avviene quando `completeFirmwareDump(toolId)` viene chiamata dopo che il processo di dump termina:

```typescript
completeFirmwareDump: (toolId) => {
  if (stepMode === 'active' && currentObj?.type === 'firmware-dump'
      && currentObj.customToolId === toolId) {
    get()._completeCurrentObjective();
  }
}
```

Il campo `customToolId` nell'objective deve corrispondere all'ID del custom tool che ha eseguito il dump.

**Uso tipico**: estrazione del firmware da chip SPI flash per analisi successiva.

---

## Completamento e Avanzamento

`_completeCurrentObjective()` gestisce l'avanzamento:

1. Aggiunge l'ID dell'obiettivo completato a `foundComponents`
2. Costruisce la flag progressiva concatenando i `flagPart` degli obiettivi completati finora
3. Se c'è un obiettivo successivo → incrementa `currentObjectiveIndex`
4. Se era l'ultimo obiettivo dello step → imposta `stepMode = 'completed'`

Il sistema previene il doppio completamento dello stesso obiettivo:

```typescript
if (foundComponents.includes(currentObjective.id)) return;
```

---

## Flag Progressiva

La flag si costruisce sommando i `flagPart` degli obiettivi completati in ordine:

```
Obiettivo 1 completato: flag{b00t???????????????????????????}
Obiettivo 2 completato: flag{b00t_r00t??????????????????????}
...
Tutti completati:       flag{b00t_r00t_h4sh_l34k_1nj3ct_sh3ll}
```

Nell'interfaccia, la flag mostra `?` per i frammenti non ancora scoperti, aggiornandosi in tempo reale dopo ogni completamento.

---

## Struttura degli Step

Ciascun `Step` ha un campo `availableTools` che elenca i tool utilizzabili:

```typescript
// Step 1: Solo identificazione componenti
availableTools: ['pointer', 'magnifier', 'multimeter']

// Step 2: Solo connessione UART
availableTools: ['pointer', 'magnifier', 'probes']

// Step 3: Solo terminale
availableTools: ['terminal']
```

Se `availableTools` è assente o vuoto, tutti i tool sono disponibili.

---

## Hint e Istruzioni

Ogni obiettivo ha due campi testuali mostrati nell'UI:

- **`instruction`**: descrizione precisa dell'azione da compiere
- **`hint`**: suggerimento aggiuntivo, visibile su richiesta o sempre visibile a seconda della configurazione UI

Nel terminale, i `BootStageCondition` hanno un proprio campo `hint` che può essere mostrato come guida ai flag da scoprire via comandi specifici.

---

## Riferimenti

- **Tipi**: `src/data/exercise.ts` — `Objective`, `ObjectiveType`, `PinCondition`, `BootStageCondition`
- **Store**: `src/store/exerciseStore.ts` — `_completeCurrentObjective()`, `_checkPinConditions()`, `selectComponent()`, `addTerminalDiscovery()`, `completeFirmwareDump()`
