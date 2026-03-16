# Guida all'Interfaccia del Simulatore

## Layout Generale

Il simulatore occupa l'intera viewport e si divide in quattro aree principali:

```
┌──────────────────────────────────────────────────────────────┐
│  Header: titolo app + link a /settings                       │
├─────────────┬────────────────────────────────────────────────┤
│             │                                                 │
│  Sidebar    │          Area Principale                        │
│  Strumenti  │     (PCBViewer  o  Terminal)                   │
│             │                                                 │
│  [Pointer]  │                                                 │
│  [Magnif.]  │                                                 │
│  [Multim.]  │                                                 │
│  [UART]     │                                                 │
│  [Terminal] │                                                 │
│  ─────────  │                                                 │
│  [Custom 1] │                                                 │
│  [Custom 2] │                                                 │
│             │                                                 │
└─────────────┴────────────────────────────────┬───────────────┘
                                                │  Flag Panel   │
                                                │  Step Panel   │
                                                └───────────────┘
```

---

## Sidebar degli Strumenti

La sidebar a sinistra contiene i pulsanti per selezionare lo strumento attivo. Gli strumenti sono organizzati in due sezioni separate da un divisore:

**Strumenti standard** (sempre presenti):
- Pointer
- Magnifier
- Multimeter
- UART Probes
- Terminal

**Custom Tools** (sezione sotto il divisore, presenti solo se configurati dall'autore):
- Uno o più custom tool specifici dell'esercizio

Il tool attivo è evidenziato visivamente. Selezionare un tool chiama `setActiveTool()` nell'`exerciseStore`, che:
1. Imposta `activeTool`
2. Ripulisce lo stato transitorio degli altri tool (probe non connesse, snap target)
3. Se la lente è visibile e non ancorata, la disattiva (a meno che si selezioni `pointer`)

---

## Area Principale

L'area principale è **mutuamente esclusiva**: mostra o il PCBViewer o il Terminal:

```tsx
{activeTool === 'terminal' ? <Terminal … /> : <PCBViewer … />}
```

### PCBViewer

Attivo per tutti i tool tranne `terminal`. Mostra:

- **Immagine PCB** — la foto/rendering della scheda configurata dall'autore
- **Overlay componenti** — rettangoli interattivi posizionati in coordinate normalizzate sui componenti
- **Overlay pin** — cerchi interattivi sui pin (multimetro e UART)
- **Cavi probe** — linee tratteggiate dai probe ai pin agganciati
- **Lente d'ingrandimento** — overlay circolare (se attiva)

### Terminal

Attivo solo quando `activeTool === 'terminal'`. Occupa l'intera area principale. Contiene due tab:

- **UART Console** — sessione seriale sul dispositivo embedded (tema verde)
- **Local Machine** — macchina dell'analista (tema blu)

---

## Flag Panel

Pannello nell'area superiore destra che mostra il progresso della raccolta flag:

```
┌──────────────────────────┐
│ flag{b00t_r00t_?????????} │  flag progressiva (? = da scoprire)
├──────────────────────────┤
│ * b00t  (sbloccato)      │
│ * _r00t (sbloccato)      │
│ o _h4sh (da scoprire)    │
│ o _l34k (da scoprire)    │
└──────────────────────────┘
```

La flag si aggiorna in tempo reale non appena `_completeCurrentObjective()` viene chiamata. I frammenti scoperti vengono sostituiti ai `?` corrispondenti.

---

## Step Panel

Mostra lo stato dello step corrente e degli obiettivi:

**In modalità `education`** (prima di avviare lo step):
- Titolo e descrizione dello step
- Pulsante "Avvia Step" → chiama `startStep()`

**In modalità `active`** (step in corso):
- Obiettivo corrente con `instruction` e `hint`
- Lista di tutti gli obiettivi dello step con stato (completato/non completato)
- Indicatore di avanzamento (es. "Obiettivo 2 di 6")

**In modalità `completed`** (step finito):
- Riepilogo dei flag scoperti
- Campo input per inserire la flag completa
- Pulsante "Verifica Flag" → chiama `validateAndCompleteStep(inputFlag)`
- Se la flag è corretta, avanzamento al prossimo step

---

## Interazioni sulla PCB

### Click su Componente

In `stepMode === 'active'`, il click su un overlay componente chiama `selectComponent(componentId)`. Se corrisponde all'obiettivo corrente di tipo `component`, questo viene completato.

### Snap dei Probe

Con il multimetro o le UART probes attivi, spostare il cursore vicino a un pin (entro 15 px normalizzati) attiva lo snap:

- `setSnapTarget(pinId)` per il multimetro
- `setUartSnapTarget(pinId)` per le sonde UART

Il pin viene evidenziato visivamente. Il click in stato snap esegue `hookProbe()` o `hookUartProbe()`.

### Trascinamento Pannelli Custom Tool

I pannelli dei custom tool nella PCBViewer sono draggabili. Il drag è vincolato all'header del pannello. La posizione viene tracciata in `customToolPositions` nell'`exerciseStore`.

---

## Tastiera

| Tasto | Contesto | Azione |
|-------|----------|--------|
| `Enter` | Terminal | Esegue il comando |
| `Freccia Su/Giu` | Terminal | Naviga nella history comandi |
| `F5` | Ovunque | Ricarica la pagina (reset esercizio) |

---

## Responsività

Le coordinate dei componenti e pin sono espresse in percentuale (`[x, y, w, h]` nel range 0–100), quindi si adattano automaticamente al ridimensionamento del contenitore PCB.

---

## Riferimenti

- **Entry point**: `src/app/page.tsx`
- **PCBViewer**: `src/components/features/exercise/PCBViewer.tsx`
- **Terminal**: `src/components/features/exercise/Terminal.tsx`
- **Sidebar**: `src/components/features/exercise/ToolsSidebar.tsx`
- **Store**: `src/store/exerciseStore.ts`
