# Multimetro

## Panoramica

Il **Multimetro** è uno strumento di misura virtuale che simula un multimetro digitale reale. Permette di misurare i valori elettrici associati ai pin della PCB — tensione (V) e resistenza (Ω) — confrontandoli con i valori configurati dall'autore dell'esercizio.

Il multimetro diventa disponibile nella sidebar quando l'esercizio prevede obiettivi di tipo `pin` o `component` che richiedono misurazioni. Lo strumento è sempre presente nell'interfaccia ma può essere limitato a determinati step dall'autore tramite la configurazione `availableTools`.

---

## Struttura dello Strumento

Il multimetro ha **due probe** (sonde):

| Probe | Colore | Ruolo |
|-------|--------|-------|
| `probe1` | Rosso (+) | Sonda positiva |
| `probe2` | Nero (−) | Sonda negativa / massa |

Lo stato di ciascuna sonda è tracciato nell'`exerciseStore`:

```typescript
probe1: { hookedTo: string | null };  // ID del pin a cui è agganciata
probe2: { hookedTo: string | null };  // ID del pin a cui è agganciata
activeProbe: 'first' | 'second' | null;  // sonda attualmente selezionata
snapTarget: string | null;               // pin in hover (prossimo aggancio)
multimeterMode: 'V' | 'Ohm';            // modalità di misurazione corrente
```

---

## Modalità di Misurazione

Il multimetro opera in due modalità selezionabili dall'utente:

### Voltaggio (V)

Misura la differenza di potenziale tra due pin. Il valore mostrato corrisponde al campo `valueV` del pin su cui è agganciata `probe1`, definito dall'autore nella configurazione dell'esercizio.

Valori tipici in un esercizio realistico:
- `5.0 V` — linea di alimentazione VCC
- `0.0 V` — massa (GND)
- `3.3 V` — logica digitale a bassa tensione
- `1.8 V` — tensione core su SoC moderni

### Resistenza (Ω)

Misura la resistenza del componente tra i due probe. Il valore corrisponde al campo `valueOhm` del pin.

---

## Workflow di Utilizzo

### 1. Selezione dello Strumento

Clic sull'icona Multimetro nella sidebar. Questo chiama `setActiveTool('multimeter')`, che resetta `activeProbe` e `snapTarget` ma **mantiene** le connessioni esistenti di `probe1` e `probe2`.

### 2. Selezione della Sonda

Clic su una delle due sonde (rosso o nero). Questo chiama `selectProbe('first' | 'second')`:

- Se la sonda selezionata è già attiva → viene deselezionata
- Se la sonda era già agganciata a un pin → viene prima sganciata (e, nel caso della sonda rossa, anche quella nera viene sganciata, perché una misura richiede sempre entrambe le sonde)
- Altrimenti → la sonda diventa attiva (`activeProbe` viene impostata)

### 3. Aggancio al Pin

Con una sonda attiva, il cursore mostra uno snap target evidenziato quando si avvicina a un pin della PCB (entro 15 px). Il clic sul pin chiama `hookProbe()`:

```typescript
hookProbe: () => {
  const { activeProbe, snapTarget, probe1 } = get();
  if (!activeProbe || !snapTarget) return;

  if (activeProbe === 'first') {
    set({ probe1: { hookedTo: snapTarget }, activeProbe: null, snapTarget: null });
  } else {
    // Impedisce di agganciare probe2 sullo stesso pin di probe1
    if (snapTarget === probe1.hookedTo) return;
    set({ probe2: { hookedTo: snapTarget }, activeProbe: null, snapTarget: null });
  }

  // Controlla se le condizioni pin dell'objective corrente sono soddisfatte
  get()._checkPinConditions();
}
```

### 4. Lettura del Valore

Con entrambe le sonde agganciate, il display del multimetro mostra il valore del pin target. Il valore viene letto dalla configurazione dell'esercizio tramite `getPinValues(pin)`.

### 5. Sgancio

Clic su una sonda agganciata per sganciare. `unhookProbe('first')` sgancia anche `probe2` automaticamente, poiché una sola sonda non ha senso in isolamento.

---

## Obiettivi Completati dal Multimetro

### Tipo `component`

L'utente clicca su un componente PCB (non tramite le sonde). Il completamento avviene quando l'ID del componente cliccato corrisponde all'ID dell'objective corrente.

### Tipo `pin`

L'obiettivo si basa su **pin conditions** — una lista di condizioni che specificano quale sonda deve essere collegata a quale pin:

```typescript
interface PinCondition {
  terminal: 'probe1' | 'probe2' | 'adapter-tx' | 'adapter-rx' | 'adapter-gnd';
  pinId: string;
}
```

`_checkPinConditions()` viene chiamata dopo ogni `hookProbe()`. Valuta le condizioni con logica `AND` (default) o `OR` (`pinLogic`):

```typescript
const satisfied = logic === 'AND'
  ? conditions.every(isConditionMet)
  : conditions.some(isConditionMet);

if (satisfied) {
  get()._completeCurrentObjective();
}
```

---

## Coesistenza con la Lente

La lente d'ingrandimento può essere attivata contemporaneamente al multimetro, ma solo se **entrambe le sonde sono già agganciate**. Se si tenta di attivare la lente mentre una delle sonde è scollegata, il tool viene automaticamente commutato a `pointer` prima di attivare la lente:

```typescript
if (activeTool === 'multimeter') {
  if (!probe1.hookedTo || !probe2.hookedTo) {
    // Forza switch a pointer prima di attivare la lente
    shouldSwitchToPointer = true;
  }
}
```

---

## Riferimenti

- **Store**: `src/store/exerciseStore.ts` — `hookProbe()`, `unhookProbe()`, `selectProbe()`, `_checkPinConditions()`
- **Tipi pin**: `src/data/exercise.ts` — `MeasurementPin`, `getPinValues()`
- **Componente UI**: `src/components/features/exercise/tools/MultimeterTool.tsx` (rendering del display e delle sonde)
