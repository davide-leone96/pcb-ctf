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

/**
 * Definisce la struttura dell'intero esercizio.
 */
export interface Exercise {
  pcbImage: string;
  components: HardwareComponent[];
  pins: MeasurementPin[];
  initialFlag: string;
}

// ===================================================================================
// ===                          DEFINIZIONE DELL'ESERCIZIO                         ===
// ===================================================================================

export const exerciseData: Exercise = {
  pcbImage: '/images/pcb.jpg',
  initialFlag: 'flag{????????????????????}',

  // L'ordine degli oggetti in questo array definisce l'ordine degli step
  components: [
    {
      id: 'cpu',
      name: 'CPU',
      instruction:
        'Identifica il componente principale del circuito, la CPU (Central Processing Unit). Solitamente è il chip più grande e di forma quadrata.',
      hint: 'Cerca il quadrato nero più grande al centro della scheda.',
      flagPart: 'STM32F4',
      coords: [45, 40, 15, 20], // Queste coordinate sono indicative, da aggiustare!
    },
    {
      id: 'rom',
      name: 'Memoria ROM',
      instruction:
        'Ora trova la memoria ROM. È un chip rettangolare, spesso con 8 pin per lato (4+4). Cerca vicino alla CPU.',
      hint: 'Guarda alla destra della CPU, c\'è un chip più piccolo con 8 piedini.',
      flagPart: '|75xx',
      coords: [65, 48, 8, 4], // Queste coordinate sono indicative, da aggiustare!
    },
    {
      id: 'uart',
      name: 'Connettore UART',
      instruction:
        "Individua il connettore UART. È un gruppo di pin usato per la comunicazione seriale. Cerca un connettore con 3 o 4 pin, spesso etichettato con 'TX', 'RX', 'GND'.",
      hint: 'Controlla la parte inferiore destra della scheda per un piccolo connettore a 3 pin.',
      flagPart: '_UART_OK',
      coords: [80, 85, 10, 5], // Queste coordinate sono indicative, da aggiustare!
    },
    // Potremmo aggiungere altri componenti qui per estendere l'esercizio...
  ],
  pins: [
    { id: 'pin-r69-1', valueV: 5.0, valueOhm: 1000, coords: [58, 75, 1, 2] },
    { id: 'pin-r69-2', valueV: 3.3, valueOhm: 0, coords: [62, 75, 1, 2] },
    { id: 'pin-c48-1', valueV: 3.3, valueOhm: 0, coords: [60, 80, 1, 2] },
    { id: 'gnd-1', valueV: 0, valueOhm: 0, coords: [70, 85, 2, 2] },
    // ... altri pin
  ],
};

/*

### Analisi e Punti Chiave

1.  **Type Safety (`export interface`)**: Esportiamo i "tipi" `HardwareComponent` e `Exercise`. Questo ci permetterà, in altri file, di importare queste definizioni e assicurarci che i nostri dati siano sempre corretti. Se per sbaglio scrivessimo `cords` invece di `coords`, TypeScript ci avviserebbe subito di un errore.
2.  **Dati Centralizzati (`export const exerciseData`)**: Esportiamo un singolo oggetto `exerciseData` che contiene tutto. Qualsiasi parte della nostra applicazione che abbia bisogno di informazioni sull'esercizio (es. il numero totale di step, il nome di un componente) importerà questo oggetto.
3.  **Ordine degli Step**: L'ordine in cui i componenti sono elencati nell'array `components` definisce l'ordine delle sfide. Il primo oggetto dell'array è lo Step 1, il secondo è lo Step 2, e così via. Questo rende facilissimo riordinare le sfide.
4.  **Coordinate Percentuali**: L'uso di percentuali per le coordinate è una scelta strategica. Ci permetterà di rendere l'area cliccabile **responsiva**. Indipendentemente da quanto l'immagine del PCB venga ridimensionata per adattarsi allo schermo, le aree cliccabili manterranno le loro proporzioni e posizioni corrette.
5.  **Dati Fittizi**: Le coordinate `[x, y, w, h]` sono al momento fittizie. Uno dei prossimi passi sarà aggiustare questi valori per farli coincidere con le aree reali sull'immagine che hai scelto.

**Task completato!** Abbiamo creato con successo una struttura dati robusta, tipizzata e centralizzata. Questo è il "cervello" del nostro esercizio. Ora abbiamo una "fonte di verità" a cui i nostri componenti React potranno attingere per mostrarsi e comportarsi correttamente.

*/

