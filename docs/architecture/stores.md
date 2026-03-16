# Store Architecture (Zustand)

## Panoramica

PCB-CTF adotta Zustand come libreria di state management. L'architettura prevede store indipendenti senza gerarchia padre-figlio e senza un root reducer centralizzato (approccio opposto a Redux). La coordinazione cross-store avviene tramite subscription e attraverso `localStorage`.

| Store | File | Ambito | Persistenza |
|-------|------|--------|-------------|
| `exerciseStore` | `src/store/exerciseStore.ts` | Stato runtime del simulatore | Variabili di modulo (Terminal) |
| `settingsStore` | `src/store/settingsStore.ts` | UI della pagina Settings | Nessuna (persa al refresh) |
| `terminalSettingsStore` | `src/store/terminalSettingsStore.ts` | Editor config terminale | `localStorage` via Zustand `persist` |
| `presetStore` | `src/store/presetStore.ts` | CRUD preset | `localStorage` |

---

## exerciseStore

**File:** `src/store/exerciseStore.ts`

Lo store centrale per il runtime del simulatore. Mantiene tutto lo stato necessario a orchestrare l'interazione tra i diversi strumenti e il progresso dell'esercizio.

### Stato

```typescript
interface ExerciseState {
  // Dati esercizio e navigazione
  exerciseData: Exercise | null;
  currentStepIndex: number;
  currentObjectiveIndex: number;
  stepMode: 'education' | 'active' | 'completed';
  isSimulatorEnabled: boolean;

  // Strumenti
  activeTool: Tool;          // ultimo tool selezionato (primario per interazioni click)
  activeTools: Tool[];       // tool attualmente attivi (supporta piu' tool simultanei via tool groups)
  multimeterUnlocked: boolean;
  uartUnlocked: boolean;
  terminalUnlocked: boolean;

  // Multimetro
  multimeterMode: 'V' | 'Ohm';
  activeProbe: 'first' | 'second' | null;
  probe1: { hookedTo: string | null };
  probe2: { hookedTo: string | null };
  snapTarget: string | null;
  measuredComponentId: string | null;

  // UART Probes
  uartConnections: Array<{ adapterPin: AdapterPin; pcbPinId: string | null }>;
  activeAdapterPin: 'adapter-tx' | 'adapter-rx' | 'adapter-gnd' | null;
  uartSnapTarget: string | null;
  uartConnected: boolean;

  // Lente d'ingrandimento
  lensRadius: number;        // default 120
  lensZoomLevel: number;     // default 2.5
  lensVisible: boolean;
  lensIsAnchored: boolean;
  lensAnchorPosition: { x: number; y: number } | null;

  // Terminal
  terminalDiscoveries: string[];   // flag ID scoperti via terminale
  flag: string;                    // flag progressivo (aggiornato con '?' per parti mancanti)

  // Custom Tools
  activeCustomToolId: string | null;
  activeCustomProbeId: string | null;
  customSnapTarget: { probeId: string; pinId: string } | null;
  customToolConnections: Record<string, Array<{ probeId: string; pinId: string | null }>>;
  customToolPositions: Record<string, { x: number; y: number }>;
}
```

### Azioni Principali

**`setActiveTool(tool)`** — Seleziona lo strumento attivo. La logica e' **group-aware**: se il tool appartiene a un `ToolGroup` definito in `exerciseData.toolGroups`, i tool dello stesso gruppo possono coesistere in `activeTools` (toggle on/off singolarmente). Se il tool non e' in nessun gruppo, sostituisce tutti i tool attivi. Gestisce automaticamente la pulizia dello stato transitorio per i tool non piu' attivi (es. resetta `activeProbe` e `snapTarget` quando il multimetro esce da `activeTools`, resetta `activeCustomToolId` quando i custom tool escono da `activeTools`).

**`addTerminalDiscovery(flagId)`** — Metodo critico per il progresso dell'esercizio. Aggiunge un flag ID a `terminalDiscoveries` (idempotente: ignora duplicati). Poi verifica se l'objective corrente di tipo `terminal` e' completato controllando che tutti i flag richiesti dalle `bootStageConditions` siano stati scoperti:

```typescript
addTerminalDiscovery: (id) => {
  const { terminalDiscoveries } = get();
  if (!terminalDiscoveries.includes(id)) {
    const newDiscoveries = [...terminalDiscoveries, id];
    set({ terminalDiscoveries: newDiscoveries });

    // Verifica completamento objective terminal
    const { stepMode, exerciseData, currentStepIndex, currentObjectiveIndex } = get();
    const currentObj = exerciseData?.steps?.[currentStepIndex]?.objectives?.[currentObjectiveIndex];

    if (stepMode === 'active' && currentObj?.type === 'terminal') {
      // Estrae tutti i flag richiesti dalle bootStageConditions
      const requiredFlags = (currentObj.bootStageConditions ?? [])
        .flatMap(c => c.unlockedFlags);

      if (requiredFlags.length > 0 && requiredFlags.every(f => newDiscoveries.includes(f))) {
        get()._completeCurrentObjective();
      }
      // Se requiredFlags.length === 0, l'objective non si completa mai automaticamente
    }
  }
},
```

**Nota critica**: se `bootStageConditions` e' un array vuoto, l'obiettivo **non si completa mai automaticamente**. Questa e' una scelta progettuale documentata nel README.md.

**`hookProbe()` / `unhookProbe(probeNumber)`** — Gestisce il collegamento dei probe del multimetro ai pin PCB. Quando si sgancia `probe1` (rosso), viene sganciato automaticamente anche `probe2` (nero), perche' una misura richiede sempre entrambi i probe. Dopo ogni hook, viene chiamato `_checkPinConditions()` per verificare se le condizioni di un objective di tipo `pin` sono soddisfatte.

**`hookUartProbe()` / `unhookUartProbe(adapterPin)`** — Gestisce le connessioni delle sonde UART (TX, RX, GND). Impedisce di collegare due adapter pin allo stesso PCB pin. Dopo ogni connessione, controlla se le tre connessioni richieste (TX→RX, RX→TX, GND→GND) sono complete per segnare l'objective UART come completato.

**`_completeCurrentObjective()`** — Gestisce il completamento di un singolo obiettivo. Aggiunge l'ID dell'obiettivo a `foundComponents` e ricostruisce la flag progressiva. Se si tratta dell'**ultimo** obiettivo dello step, imposta `stepMode = 'completed'` e `isSimulatorEnabled = false` (non incrementa automaticamente `currentStepIndex`: l'avanzamento allo step successivo avviene solo dopo che lo studente inserisce e valida la flag via `validateAndCompleteStep()`). Se ci sono ancora obiettivi nello step corrente, incrementa `currentObjectiveIndex`.

**`completeFirmwareDump(toolId)`** — Chiamato quando un custom tool di tipo `firmware-dump` completa il dump. Verifica le `requiredConnections` del tool e, se soddisfatte, completa l'objective corrente.

### Strumento Attivo e Tool Groups

Lo store supporta **piu' tool attivi contemporaneamente** tramite il campo `activeTools: Tool[]`. Il campo `activeTool` rappresenta l'ultimo tool selezionato (usato per determinare quale tool gestisce il click).

```typescript
setActiveTool: (tool) => {
  const groups = exerciseData?.toolGroups ?? [];
  const toolGroup = groups.find(g => g.toolIds.includes(tool));

  if (toolGroup) {
    // Tool in un gruppo: toggle on/off mantenendo gli altri tool del gruppo
    if (prevTools.includes(tool)) {
      newActiveTools = prevTools.filter(t => t !== tool);
      if (newActiveTools.length === 0) newActiveTools = ['pointer'];
    } else {
      const keptFromGroup = prevTools.filter(t => groupIds.has(t));
      newActiveTools = [...keptFromGroup, tool];
    }
  } else {
    // Tool senza gruppo: toggle off se gia' attivo, altrimenti sostituisce tutto
    if (prevTools.includes(tool) && tool !== 'pointer') {
      newActiveTools = ['pointer'];
    } else {
      newActiveTools = [tool];
    }
  }

  // Pulizia stato transitorio per tool non piu' attivi
  if (!newActiveTools.includes('multimeter')) set({ activeProbe: null, snapTarget: null });
  if (!newActiveTools.includes('probes')) set({ activeAdapterPin: null, uartSnapTarget: null });
  if (!newActiveTools.includes('custom')) set({ activeCustomToolId: null, ... });
}
```

### ToolGroup

I gruppi sono definiti in `Exercise.toolGroups`:

```typescript
interface ToolGroup {
  id: string;
  name: string;
  toolIds: string[];  // ID dei tool che possono coesistere
}
```

**Esempio**: un gruppo `[pointer, magnifier, multimeter]` permette all'utente di avere contemporaneamente il puntatore attivo (hotspot cliccabili), la lente visibile e il multimetro con le sue sonde — tutti evidenziati nella sidebar.

---

## settingsStore

**File:** `src/store/settingsStore.ts`

Gestisce lo stato dell'interfaccia di authoring (`/settings`). Non ha persistenza esplicita: lo stato viene perso al refresh della pagina (ma i dati persistono su filesystem tramite le API).

### Responsabilita' Principali

- **Canvas transforms**: posizione e zoom del canvas PCB in modalita' authoring
- **Componenti draggabili**: posizioni correnti durante il drag-and-drop
- **Popup attivi**: quale popup di objective/componente/pin e' aperto
- **Custom tools draft**: stato corrente dei tool in fase di creazione/editing
- **Export/import**: funzioni per serializzare e deserializzare la configurazione

### DraftCustomTool

Il tipo `DraftCustomTool` e' la versione mutabile di `CustomTool` usata durante l'authoring. Contiene gli stessi campi ma con valori opzionali per supportare la creazione incrementale.

---

## terminalSettingsStore

**File:** `src/store/terminalSettingsStore.ts`

Editor di configurazione del terminale. E' l'unico store con persistenza automatica tramite il middleware `persist` di Zustand.

### Persistenza

```
localStorage key: 'pcb-ctf-terminal-settings-draft'
```

Lo stato viene serializzato in JSON e scritto in `localStorage` ad ogni modifica. Al caricamento della pagina, viene deserializzato e ripristinato automaticamente. Questo permette all'autore di chiudere il browser e riprendere il lavoro esattamente dove lo aveva lasciato.

### Struttura dello Stato

Rispecchia la struttura di `TerminalConfig` con alcune differenze per supportare l'editing:

- **`tabs`**: array di `DraftTabConfig` con comandi in formato editabile
- **`flagParts`**: array di `FlagPart` per costruire il `FlagSystem`
- **`bootStages`**: array di `BootStage` per la sequenza di avvio

### Funzione `applyTerminalConfig()`

Serializza lo stato corrente in un oggetto `TerminalConfig` e lo salva in `localStorage` sotto la chiave `'pcb-ctf-terminal-config'`. Emette anche un `StorageEvent` che il simulatore ascolta per ricaricare la configurazione senza refresh di pagina.

---

## presetStore

**File:** `src/store/presetStore.ts`

Gestisce il ciclo di vita dei preset: oggetti che raggruppano una configurazione esercizio completa (PCB + terminale + custom tools) in un singolo file JSON.

### Struttura di un Preset

```typescript
interface Preset {
  id: string;
  name: string;
  description?: string;
  exercise: Exercise;           // Configurazione PCB
  terminalConfig: TerminalConfig; // Configurazione terminale
  customTools?: CustomTool[];   // Strumenti personalizzati
  createdAt: string;
  updatedAt: string;
}
```

I preset sono salvati su filesystem tramite l'API `/api/presets/[id]` in `src/data/presets/{id}.json`. Il file `src/data/presets/index.json` mantiene la lista di tutti i preset disponibili.

### Dirty Tracking

Il `presetStore` sottoscrive le modifiche di `settingsStore` e `terminalSettingsStore`. Quando uno dei due cambia, il flag `isDirty` viene attivato, segnalando che ci sono modifiche non salvate. Questo viene visualizzato nell'UI con un asterisco accanto al nome del preset corrente.

---

## localStorage Keys

```
pcb-ctf-exercise-config          # Configurazione esercizio PCB salvata (Settings → API)
pcb-ctf-terminal-config          # Configurazione terminale attuale (usata dal simulatore)
pcb-ctf-terminal-settings-draft  # Draft dell'editor terminale (Zustand persist)
pcb-ctf-active-preset            # ID del preset attualmente caricato
```

---

## Coordinazione Cross-Store

### Settings → Simulator (via localStorage)

Quando l'autore salva la configurazione terminale, questa viene scritta in `localStorage`. Il simulatore, nella hook `useTerminalConfig()`, ascolta l'evento `storage` per ricaricare la configurazione senza richiedere un refresh completo della pagina:

```typescript
// In useTerminalConfig.ts:
useEffect(() => {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'pcb-ctf-terminal-config') {
      // Ricarica e ricostruisce il TerminalConfigLoader
      reloadConfig();
    }
  };
  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}, []);
```

### Nessun Redux Root Reducer

A differenza di Redux, non esiste un reducer centralizzato. Ogni store gestisce autonomamente le proprie transizioni di stato. La coordinazione avviene tramite:

1. **Subscription Zustand**: `store.subscribe(callback)` notifica le modifiche
2. **localStorage events**: comunicazione indiretta tra tab o componenti
3. **Chiamate dirette tra store**: un'azione di uno store puo' leggere lo stato di un altro

**Vantaggi**: semplicita', assenza di boilerplate, store evolvibili indipendentemente.

**Svantaggi**: la coordinazione cross-store e' meno esplicita e piu' difficile da tracciare rispetto a un approccio centralizzato.

---

## Tipi Chiave

### ObjectiveType e Tool

```typescript
// src/data/exercise.ts
export type ObjectiveType = 'component' | 'uart' | 'terminal' | 'pin' | 'firmware-dump';
export type Tool = 'pointer' | 'magnifier' | 'multimeter' | 'probes' | 'terminal' | 'custom';

// Tool esposti nella sidebar (esclude 'custom', gestito separatamente)
export const ALL_TOOLS: Tool[] = ['pointer', 'magnifier', 'multimeter', 'probes', 'terminal'];
```

### StepMode

```typescript
export type StepMode = 'education' | 'active' | 'completed';
// 'education': step in modalita' lettura, non ancora avviato
// 'active': step in corso, interaction abilitata
// 'completed': step completato
```

### BootStageCondition

```typescript
export interface BootStageCondition {
  bootStageId: string;
  unlockedFlags: string[];  // flag part ID dal terminalSettingsStore.flagParts
  hint: string;
}
```

I `bootStageId` e i campi `hint` sono memorizzati ma **non consumati** dalla logica di completamento. Solo `unlockedFlags` viene usato da `addTerminalDiscovery()` per verificare il completamento dell'objective.
