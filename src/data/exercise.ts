// src/data/exercise.ts

/**
 * Definisce la struttura di un singolo componente hardware cliccabile sul PCB.
 */
export interface HardwareComponent {
  id: string;
  name: string;
  instruction: string;
  hint: string;
  flagPart: string;
  coords: [number, number, number, number];
}

export interface MeasurementPin {
  id: string;
  valueV: number;
  valueOhm: number;
  coords: [number, number, number, number];
}

export type UartRole = 'tx' | 'rx' | 'gnd' | 'vcc';

export interface UartPin {
  id: string;
  role: UartRole;
  label: string;
  coords: [number, number, number, number];
}

/**
 * Definisce la struttura dell'intero esercizio.
 */
export interface Exercise {
  pcbImage: string;
  components: HardwareComponent[];
  pins: MeasurementPin[];
  uartPins: UartPin[];
  initialFlag: string;
}

// ===================================================================================
// ===                          DEFINIZIONE DELL'ESERCIZIO                         ===
// ===================================================================================

export const SETTINGS_STORAGE_KEY = 'pcb-ctf-exercise-config';

const defaultExerciseData: Exercise = {
  pcbImage: '/images/pcb_v2.jpg',
  initialFlag: 'flag{????????????????????}',

  components: [
    {
      id: 'cpu',
      name: 'CPU',
      instruction:
        'Identifica il componente principale del circuito, la CPU (Central Processing Unit). Solitamente è il chip più grande e di forma quadrata.',
      hint: 'Cerca il quadrato nero più grande al centro della scheda.',
      flagPart: 'STM32F4',
      coords: [45, 40, 15, 20],
    },
    {
      id: 'rom',
      name: 'Memoria ROM',
      instruction:
        'Ora trova la memoria ROM. È un chip rettangolare, spesso con 8 pin per lato (4+4). Cerca vicino alla CPU.',
      hint: 'Guarda alla destra della CPU, c\'è un chip più piccolo con 8 piedini.',
      flagPart: '|75xx',
      coords: [65, 48, 8, 4],
    },
    {
      id: 'uart',
      name: 'Connettore UART',
      instruction:
        "Individua il connettore UART. È un gruppo di pin usato per la comunicazione seriale. Cerca un connettore con 3 o 4 pin, spesso etichettato con 'TX', 'RX', 'GND'.",
      hint: 'Controlla la parte inferiore destra della scheda per un piccolo connettore a 3 pin.',
      flagPart: '_UART_OK',
      coords: [80, 85, 10, 5],
    },
  ],
  pins: [
    { id: 'pin-r69-1', valueV: 5.0, valueOhm: 1000, coords: [58, 75, 1, 2] },
    { id: 'pin-r69-2', valueV: 3.3, valueOhm: 0, coords: [62, 75, 1, 2] },
    { id: 'pin-c48-1', valueV: 3.3, valueOhm: 0, coords: [60, 80, 1, 2] },
    { id: 'gnd-1', valueV: 0, valueOhm: 0, coords: [70, 85, 2, 2] },
  ],
  uartPins: [
    { id: 'uart-vcc', role: 'vcc', label: 'VCC (5V)',  coords: [58, 74.5, 1.5, 2.5] },
    { id: 'uart-tx',  role: 'tx',  label: 'TX (3.3V)', coords: [62, 74.5, 1.5, 2.5] },
    { id: 'uart-rx',  role: 'rx',  label: 'RX (3.3V)', coords: [60, 79.5, 1.5, 2.5] },
    { id: 'uart-gnd', role: 'gnd', label: 'GND (0V)',  coords: [70, 84.5, 2, 2.5] },
  ],
};

/**
 * Carica la configurazione da localStorage se presente,
 * altrimenti usa i dati di default hardcoded.
 */
function loadExerciseData(): Exercise {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) return JSON.parse(saved) as Exercise;
    } catch { /* fallback ai default */ }
  }
  return defaultExerciseData;
}

export const exerciseData: Exercise = loadExerciseData();

// ===================================================================================
// ===                        HELPER: ACCESSO UNIFICATO AI PIN                     ===
// ===================================================================================

const UART_ELECTRICAL: Record<UartRole, { valueV: number; valueOhm: number }> = {
  vcc: { valueV: 5.0,  valueOhm: 0 },
  tx:  { valueV: 3.3,  valueOhm: 50 },
  rx:  { valueV: 3.3,  valueOhm: 10000 },
  gnd: { valueV: 0,    valueOhm: 0 },
};

/** Restituisce tensione e resistenza per qualsiasi pin (measurement o UART). */
export function getPinValues(pinId: string): { valueV: number; valueOhm: number } | null {
  const mPin = exerciseData.pins.find(p => p.id === pinId);
  if (mPin) return { valueV: mPin.valueV, valueOhm: mPin.valueOhm };
  const uPin = exerciseData.uartPins.find(p => p.id === pinId);
  if (uPin) return UART_ELECTRICAL[uPin.role];
  return null;
}

/** Restituisce le coordinate per qualsiasi pin. */
export function getPinCoords(pinId: string): [number, number, number, number] | null {
  const mPin = exerciseData.pins.find(p => p.id === pinId);
  if (mPin) return mPin.coords;
  const uPin = exerciseData.uartPins.find(p => p.id === pinId);
  if (uPin) return uPin.coords;
  return null;
}

/** Tutti i pin combinati per iterazione (snap detection, overlay). */
export function getAllPins(): { id: string; coords: [number, number, number, number]; isUart: boolean; role?: UartRole; label?: string }[] {
  return [
    ...exerciseData.pins.map(p => ({ id: p.id, coords: p.coords, isUart: false as const })),
    ...exerciseData.uartPins.map(p => ({ id: p.id, coords: p.coords, isUart: true as const, role: p.role, label: p.label })),
  ];
}

/*

### Analisi e Punti Chiave

1.  **Type Safety (`export interface`)**: Esportiamo i "tipi" `HardwareComponent` e `Exercise`. Questo ci permetterà, in altri file, di importare queste definizioni e assicurarci che i nostri dati siano sempre corretti. Se per sbaglio scrivessimo `cords` invece di `coords`, TypeScript ci avviserebbe subito di un errore.
2.  **Dati Centralizzati (`export const exerciseData`)**: Esportiamo un singolo oggetto `exerciseData` che contiene tutto. Qualsiasi parte della nostra applicazione che abbia bisogno di informazioni sull'esercizio (es. il numero totale di step, il nome di un componente) importerà questo oggetto.
3.  **Ordine degli Step**: L'ordine in cui i componenti sono elencati nell'array `components` definisce l'ordine delle sfide. Il primo oggetto dell'array è lo Step 1, il secondo è lo Step 2, e così via. Questo rende facilissimo riordinare le sfide.
4.  **Coordinate Percentuali**: L'uso di percentuali per le coordinate è una scelta strategica. Ci permetterà di rendere l'area cliccabile **responsiva**. Indipendentemente da quanto l'immagine del PCB venga ridimensionata per adattarsi allo schermo, le aree cliccabili manterranno le loro proporzioni e posizioni corrette.
5.  **Dati Fittizi**: Le coordinate `[x, y, w, h]` sono al momento fittizie. Uno dei prossimi passi sarà aggiustare questi valori per farli coincidere con le aree reali sull'immagine che hai scelto.

**Task completato!** Abbiamo creato con successo una struttura dati robusta, tipizzata e centralizzata. Questo è il "cervello" del nostro esercizio. Ora abbiamo una "fonte di verità" a cui i nostri componenti React potranno attingere per mostrarsi e comportarsi correttamente.

*/

