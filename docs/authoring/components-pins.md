# Componenti e Pin PCB

## Sistema di Coordinate

Tutte le coordinate in PCB-CTF sono **normalizzate** come `[x, y, width, height]` nel range 0-100, dove 100 rappresenta il 100% della dimensione del contenitore. Questo rende gli elementi indipendenti dalla risoluzione dell'immagine e responsive al ridimensionamento del canvas.

```
(0,0) ─────────────────── (100,0)
  │                           │
  │   Componente a            │
  │   [25, 40, 10, 15]        │
  │   X: 25%  Y: 40%          │
  │   W: 10%  H: 15%          │
  │                           │
(0,100) ─────────────── (100,100)
```

La conversione a pixel avviene in `PCBViewer.tsx` usando le dimensioni del contenitore (`containerDims`).

---

## Componenti Hardware (`HardwareComponent`)

I componenti sono elementi fisici della PCB che lo studente identifica e clicca.

### Struttura

```typescript
interface HardwareComponent {
  id: string;        // es. "comp-6bn8zz"
  name: string;      // nome visualizzato nell'overlay
  instruction: string; // testo per lo studente
  hint: string;      // suggerimento
  flagPart: string;  // frammento della flag sbloccato al click
  coords: [number, number, number, number]; // [x, y, w, h] normalizzati
}
```

### Aggiungere un Componente

Nella tab **Init** della sidebar:

1. Clic su "+ Add Component"
2. Compilare: nome, instruction, hint, flagPart
3. Il componente appare sulla canvas in posizione default
4. Trascinare sull'immagine PCB per posizionarlo sopra il componente fisico
5. Salvare

Nel simulatore, il click su un componente chiama `selectComponent(componentId)`. Se l'ID corrisponde all'obiettivo corrente di tipo `component`, l'obiettivo viene completato e il `flagPart` viene aggiunto alla flag.

---

## Pin di Misurazione (`MeasurementPin`)

I pin di misurazione sono i punti dove lo studente posiziona i probe del multimetro.

### Struttura Draft (editor)

```typescript
interface DraftPin {
  id: string;
  pinType: 'custom' | 'tx' | 'rx' | 'gnd' | 'vcc';
  label: string;        // "VCC", "GND", "CLK"
  shape: 'circle' | 'square';
  size: number;         // dimensione snap target in pixel
  coords: [x, y];       // centro del pin (solo x,y — non larghezza/altezza)
  voltageMode: 'fixed' | 'range';
  voltageFixed: number; // es. 5.0 per VCC
  voltageMin: number;
  voltageMax: number;
  resistanceMode: 'fixed' | 'range';
  resistanceFixed: number;
  resistanceMin: number;
  resistanceMax: number;
}
```

### Struttura Runtime (simulatore)

```typescript
interface MeasurementPin {
  id: string;
  valueV: number;   // volt mostrato dal multimetro
  valueOhm: number; // ohm mostrato dal multimetro
  coords: [number, number, number, number];
}
```

### Valori Tipici

| Tipo Pin | Tensione | Resistenza |
|----------|----------|------------|
| VCC 5V | 5.0 V | ~0 Ohm |
| VCC 3.3V | 3.3 V | ~0 Ohm |
| GND | 0.0 V | 0 Ohm |
| Segnale CLK | 3.3 V | ~50 Ohm |
| Resistore 10kOhm | variabile | 10000 Ohm |

---

## Pin UART (`UartPin`)

I pin UART determinano la topologia della connessione seriale.

### Struttura

```typescript
interface UartPin {
  id: string;
  role: 'tx' | 'rx' | 'gnd' | 'vcc';
  label: string;   // "TX (3.3V)", "RX (3.3V)", "GND (0V)"
  coords: [number, number, number, number];
}
```

### Regola del Crossover

La validazione nel simulatore verifica:
- `adapter-tx` → pin PCB con `role: 'rx'`
- `adapter-rx` → pin PCB con `role: 'tx'`
- `adapter-gnd` → pin PCB con `role: 'gnd'`

### Valori Elettrici UART

Predefiniti nel codice (non configurabili dall'editor):

```typescript
const UART_ELECTRICAL = {
  vcc: { valueV: 5.0,  valueOhm: 0 },
  tx:  { valueV: 3.3,  valueOhm: 50 },
  rx:  { valueV: 3.3,  valueOhm: 10000 },
  gnd: { valueV: 0,    valueOhm: 0 },
};
```

---

## Immagine PCB

L'immagine PCB viene caricata tramite `POST /api/images/upload`. Il server salva il file in `public/images/` e restituisce il path relativo (es. `/images/pcb_v2.jpg`), salvato in `Exercise.pcbImage`.

**Formati supportati**: PNG, JPG, SVG

**Risoluzione consigliata**: minimo 800x600 px, preferibile 1920x1080 px per dettagli leggibili.
