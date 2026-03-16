# Simulator — Panoramica

## Funzione del Simulatore

Il **Simulator** è la modalità interattiva di PCB-CTF, accessibile dalla route `/`. È l'ambiente in cui gli studenti risolvono l'esercizio progettato dall'autore: analizzano una PCB virtuale, usano strumenti di misura simulati, interagiscono con un terminale embedded e progressivamente sbloccano i frammenti della flag finale.

Il simulatore non è un ambiente sandbox aperto: ogni interazione è vincolata dalla configurazione dell'esercizio. I componenti cliccabili, i pin misurabili, i comandi del terminale, e i flag sbloccabili sono tutti definiti dall'autore nell'area `/settings`.

---

## Struttura dell'Esercizio

Un esercizio è rappresentato dall'interfaccia `Exercise`:

```typescript
interface Exercise {
  pcbImage: string;          // path immagine PCB (es. '/images/pcb_v2.jpg')
  steps: Step[];             // sequenza di step
  components: HardwareComponent[];  // componenti cliccabili globali
  pins: MeasurementPin[];    // pin per il multimetro
  uartPins: UartPin[];       // pin per la connessione UART
  customTools?: CustomTool[]; // strumenti personalizzati
  initialFlag: string;       // placeholder flag iniziale (es. 'flag{????}')
  firmwarePath?: string;     // percorso firmware caricato dall'autore
  toolGroups?: ToolGroup[];  // gruppi di tool attivabili contemporaneamente
}
```

### Step

Ogni `Step` raggruppa uno o più `Objective` da completare in sequenza:

```typescript
interface Step {
  id: string;
  title: string;
  description: string;       // testo educativo mostrato prima di avviare lo step
  objectives: Objective[];
  expectedFlag: string;      // flag completa attesa alla fine dello step
  availableTools?: Tool[];   // tool abilitati per questo step
}
```

Il campo `availableTools` limita gli strumenti selezionabili. Se `activeTool` non è nell'elenco quando si avvia lo step, il sistema commuta automaticamente al primo tool disponibile.

### Objective

```typescript
interface Objective {
  id: string;
  name: string;
  type?: ObjectiveType;      // 'component' | 'uart' | 'terminal' | 'pin' | 'firmware-dump'
  instruction: string;       // testo mostrato allo studente
  hint: string;              // suggerimento
  flagPart: string;          // frammento della flag sbloccato al completamento
  coords: [number, number, number, number];  // coordinate normalizzate [x, y, w, h]
  pinConditions?: PinCondition[];
  pinLogic?: 'AND' | 'OR';
  bootStageConditions?: BootStageCondition[];
  customToolId?: string;     // per type='firmware-dump'
  requiresUart?: boolean;    // per type='terminal': richiede UART
  terminalPersistent?: boolean; // per type='terminal': non disattivabile
}
```

---

## Ciclo di Vita di uno Step

```
STEP CARICATO
    │
    ▼
stepMode = 'education'
    │  Utente clicca "Avvia Step"
    ▼
stepMode = 'active' + isSimulatorEnabled = true
    │
    ▼  Utente interagisce con strumenti
Completamento obiettivi in sequenza
    │  _completeCurrentObjective() per ogni obiettivo
    ▼
Ultimo obiettivo completato
    │
    ▼
stepMode = 'completed' + isSimulatorEnabled = false
    │  Utente inserisce la flag
    ▼
validateAndCompleteStep(inputFlag) → true
    │
    ▼
STEP SUCCESSIVO (o isFinished = true se è l'ultimo)
```

---

## Strumenti Disponibili

Il simulatore offre sei strumenti selezionabili dalla sidebar:

| Tool | ID | Descrizione |
|------|----|-------------|
| Puntatore | `pointer` | Navigazione base, attivazione lente |
| Lente | `magnifier` | Zoom su aree della PCB |
| Multimetro | `multimeter` | Misura V e Ω sui pin |
| Sonde UART | `probes` | Connessione seriale al dispositivo |
| Terminale | `terminal` | Shell interattiva simulata |
| Custom | `custom` | Strumenti definiti dall'autore |

Lo store mantiene sia `activeTool` (ultimo tool selezionato, determina le interazioni primarie) sia `activeTools: Tool[]` (tutti i tool attualmente attivi). Di default solo un tool e' attivo alla volta, ma se l'autore ha definito dei **Tool Groups** in `Exercise.toolGroups`, i tool dello stesso gruppo possono coesistere:

- `activeTools` determina quali overlay sono visibili (multimetro, UART adapter, hotspot componenti)
- `activeTool` determina quale tool gestisce il click e gli snap target
- Se `activeTools` include `'terminal'`, il viewer mostra il terminale al posto della PCB

**Esempio**: con un gruppo `[pointer, magnifier, multimeter]`, l'utente puo' vedere contemporaneamente gli hotspot componenti, la lente e il multimetro con le sue sonde.

---

## Sistema di Flag

La flag è un testo costruito progressivamente completando gli obiettivi. Ogni `Objective` contribuisce con il suo campo `flagPart`:

```
Step 3, 6 obiettivi:
  boot → "b00t"
  root → "_r00t"
  hash → "_h4sh"
  leak → "_l34k"
  inject → "_1nj3ct"
  shell → "_sh3ll"

Flag finale: flag{b00t_r00t_h4sh_l34k_1nj3ct_sh3ll}
```

La flag si assembla incrementalmente: `computeBlankFlag()` genera il placeholder con `?` per i frammenti non ancora scoperti:

```typescript
function computeBlankFlag(step) {
  const total = step?.objectives?.reduce((acc, o) => acc + (o.flagPart?.length ?? 0), 0) ?? 0;
  return total > 0 ? `flag{${'?'.repeat(total)}}` : 'flag{????}';
}
```

---

## Caricamento della Configurazione

All'avvio del simulatore, la configurazione viene caricata da `localStorage` (chiave `pcb-ctf-exercise-config`). Se assente, viene usata la configurazione di default (`defaultExerciseData` in `src/data/exercise.ts`).

La funzione `mergeWithDefaultSteps()` garantisce che step 2 (UART) e step 3 (Terminal) siano sempre presenti, anche se la configurazione salvata ne contiene solo uno (es. il solo step 1 configurato da `/settings`).

---

## Rendering e Routing

Il componente `page.tsx` alla root `/` gestisce il rendering condizionale:

```tsx
{activeTools.includes('terminal') ? <Terminal … /> : <PCBViewer … />}
```

Il `PCBViewer` e' attivo quando `terminal` non e' in `activeTools`. Il `Terminal` occupa l'intera area principale quando incluso.

Il terminale puo' avere due flag configurabili per obiettivo:
- `requiresUart`: se `true`, il terminale e' accessibile solo dopo che l'UART e' stato connesso almeno una volta
- `terminalPersistent`: se `true`, il terminale non puo' essere disattivato dalla toolbar una volta attivato

---

## Riferimenti

- **Entry point**: `src/app/page.tsx`
- **Store**: `src/store/exerciseStore.ts`
- **Tipi**: `src/data/exercise.ts`
- **Config loader**: hook `useExerciseConfig()` in `src/hooks/`
