# Configurare gli Obiettivi

## Struttura

Ogni `Objective` e' configurato tramite il tipo `DraftObjective` nell'editor. Al salvataggio viene convertito in `Objective` per il runtime del simulatore.

```typescript
interface DraftObjective {
  id: string;
  name: string;
  type: ObjectiveType;  // 'component'|'uart'|'terminal'|'pin'|'firmware-dump'
  componentId: string;  // per type='component'
  customToolId: string; // per type='firmware-dump'
  pinConditions: PinCondition[];
  pinLogic: 'AND' | 'OR';
  instruction: string;  // testo mostrato allo studente
  hint: string;         // suggerimento
  flagPart: string;     // frammento flag sbloccato al completamento
  coords: [x, y, w, h]; // per type='component': area popup sulla canvas
  bootStageConditions: BootStageCondition[];  // per type='terminal'
  requiresUart: boolean;       // per type='terminal': richiede UART per avviare il terminale
  terminalPersistent: boolean; // per type='terminal': non disattivabile dalla toolbar
}
```

---

## Type: `component`

Lo studente clicca su un componente hardware sulla PCB. Il campo `componentId` deve corrispondere all'`id` di un `HardwareComponent` definito nella lista componenti.

**Completamento**: automatico quando lo studente clicca il componente corretto.

**Quando usarlo**: identificazione di chip, connettori, resistori specifici.

**Campi rilevanti**: `componentId`, `coords` (area popup), `instruction`, `hint`, `flagPart`.

---

## Type: `uart`

Lo studente collega correttamente le tre sonde UART (TX, RX, GND). La validazione avviene automaticamente nel simulatore confrontando `role` dei pin UART con il mapping dell'adattatore.

**Completamento**: automatico quando tutte e tre le connessioni sono corrette simultaneamente.

**Quando usarlo**: step di stabilimento connessione seriale.

**Campi rilevanti**: `instruction`, `hint`, `flagPart`. Le `coords` possono essere `[0,0,0,0]`.

---

## Type: `terminal`

Lo studente esegue comandi nel terminale che sbloccano flag specifici. Il completamento dipende dalle `bootStageConditions`.

### `bootStageConditions`

```typescript
interface BootStageCondition {
  bootStageId: string;      // ID del boot stage (non usato a runtime)
  unlockedFlags: string[];  // flag part ID che devono essere scoperti
  hint: string;             // suggerimento per questo gruppo di flag
}
```

**Completamento**: quando tutti i flag in `bootStageConditions.flatMap(c => c.unlockedFlags)` sono presenti in `terminalDiscoveries`.

**Caso speciale**: se `bootStageConditions` e' un array vuoto, l'obiettivo non si completa mai automaticamente.

**Quando usarlo**: analisi U-Boot, accesso root, hash cracking, scoperta vulnerabilita'.

### `requiresUart`

Se `true` (default per nuovi obiettivi terminal), il terminale e' accessibile solo dopo che l'utente ha connesso le sonde UART almeno una volta (`uartEverConnected`). Se `false`, il terminale e' accessibile immediatamente.

### `terminalPersistent`

Se `true`, una volta attivato il terminale non puo' essere disattivato dalla toolbar (ne' cliccando il pulsante terminale, ne' selezionando un altro tool). Se `false` (default), il terminale si comporta come un tool normale.

### Sincronizzazione automatica tool/obiettivo

Nell'editor `/settings`, tool terminale e obiettivo terminale sono sincronizzati bidirezionalmente:

- **Aggiungere il tool `terminal`** ai tool disponibili di uno step → crea automaticamente un obiettivo terminale se non ne esiste uno
- **Aggiungere un obiettivo `terminal`** → attiva automaticamente il tool `terminal` nello step
- **Rimuovere il tool `terminal`** → elimina tutti gli obiettivi terminale dallo step
- **Eliminare l'ultimo obiettivo `terminal`** → rimuove il tool `terminal` dai disponibili

### Relazione con i Flag del Terminale

I `unlockedFlags` nelle `bootStageConditions` devono corrispondere ai `flagId` nei `sideEffects.unlockFlags` dei comandi del terminale. Il flusso e':

```
Comando eseguito → sideEffects.unlockFlags: ["b00t"]
    → Terminal.tsx: addTerminalDiscovery("b00t")
    → exerciseStore verifica bootStageConditions
    → tutti i requiredFlags presenti → _completeCurrentObjective()
```

---

## Type: `pin`

Lo studente collega specifici probe (multimetro o UART) a specifici pin PCB.

### `pinConditions`

```typescript
interface PinCondition {
  pinId: string;   // ID del pin PCB target
  terminal: 'probe1' | 'probe2' | 'adapter-tx' | 'adapter-rx' | 'adapter-gnd';
}
```

### `pinLogic`

- `'AND'` (default): tutte le condizioni devono essere soddisfatte simultaneamente
- `'OR'`: basta che almeno una condizione sia soddisfatta

**Completamento**: automatico dopo ogni `hookProbe()` o `hookUartProbe()`.

**Quando usarlo**: misurazioni specifiche su pin precisi, verifiche di continuita'.

---

## Type: `firmware-dump`

Lo studente usa un custom tool di tipo `firmware-dump`. Il campo `customToolId` deve corrispondere all'`id` di un `CustomTool` con `outputType: 'firmware-dump'`.

**Completamento**: quando il custom tool termina il processo di dump con tutte le connessioni richieste presenti.

**Quando usarlo**: scenari di estrazione firmware da chip SPI flash.

---

## Flag Part e Flag Progressiva

La flag complessiva dello step e' la concatenazione dei `flagPart` di tutti gli obiettivi nell'ordine in cui compaiono:

```
Step objectives:
  obj-1: flagPart = "b00t"
  obj-2: flagPart = "_r00t"
  obj-3: flagPart = "_h4sh"

Flag totale: flag{b00t_r00t_h4sh}
```

---

## Vincoli di Ordinamento

Gli obiettivi all'interno di uno step sono completati in **ordine sequenziale obbligato**. `_completeCurrentObjective()` incrementa `currentObjectiveIndex` di uno alla volta, rendendo impossibile saltare un obiettivo.

---

## Riferimenti

- **Tipi**: `src/data/exercise.ts` — `Objective`, `ObjectiveType`, `PinCondition`, `BootStageCondition`
- **Draft types**: `src/store/settingsStore.ts` — `DraftObjective`
- **Completamento**: `src/store/exerciseStore.ts`
