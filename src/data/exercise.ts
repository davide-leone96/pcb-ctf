// src/data/exercise.ts
import type { CustomTool } from '@/types/custom-tool';

/**
 * Definisce la struttura di un singolo componente hardware cliccabile sul PCB.
 */
export type ObjectiveType = 'component' | 'uart' | 'terminal' | 'pin' | 'firmware-dump';
/**
 * Tool hardcoded del simulatore + 'custom' per i tool definiti dall'autore.
 * 'custom' NON è incluso in ALL_TOOLS per evitare che appaia nei toggle degli step.
 */
export type Tool = 'pointer' | 'magnifier' | 'multimeter' | 'probes' | 'terminal' | 'firmware-dump' | 'custom';
export const ALL_TOOLS: Tool[] = ['pointer', 'magnifier', 'multimeter', 'probes', 'terminal', 'firmware-dump'];

export interface PinCondition {
  pinId: string;
  terminal: string; // 'probe1' | 'probe2' | 'adapter-tx' | 'adapter-rx' | 'adapter-gnd'
}

export type PinLogic = 'AND' | 'OR';

export interface BootStageCondition {
  bootStageId: string;
  unlockedFlags: string[];  // flag part IDs from terminalSettingsStore.flagParts
  hint: string;
}

export interface Objective {
  id: string;
  name: string;
  type?: ObjectiveType;
  componentId?: string;
  instruction: string;
  hint: string;
  flagPart: string;
  coords: [number, number, number, number];
  pinConditions?: PinCondition[];
  pinLogic?: PinLogic;
  bootStageConditions?: BootStageCondition[];
  /** Per type='firmware-dump': ID del custom tool collegato */
  customToolId?: string;
  /** Per type='terminal': se true, il terminale richiede collegamento UART per avviarsi */
  requiresUart?: boolean;
  /** Per type='terminal': se true, il terminale non può essere disattivato dalla toolbar una volta attivato */
  terminalPersistent?: boolean;
}

export interface Step {
  id: string;
  title: string;
  description: string;
  objectives: Objective[];
  expectedFlag: string;
  availableTools?: Tool[];
}

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

export type SpiRole = 'vcc' | 'gnd' | 'cs' | 'clk' | 'mosi' | 'miso';

export interface FirmwareDumpPin {
  id: string;
  role: SpiRole;
  label: string;
  coords: [number, number, number, number];
}

export interface FirmwareDumpProbeConfig {
  id: string;
  role: SpiRole;
  label: string;
  color: string;
}

export interface FirmwareDumpToolConfig {
  probes: FirmwareDumpProbeConfig[];
  requiredConnections: Array<{ probeId: string; pinId: string }>;
  filePath: string;
  fileName: string;
  dumpDurationSec: number;
}

/**
 * Definisce la struttura dell'intero esercizio.
 */
export interface ToolGroup {
  id: string;
  name: string;
  toolIds: string[];
}

export interface MagnifierConfig {
  defaultRadius: number;
  defaultZoomLevel: number;
}

export interface UartConnectorConfig {
  /** Se true, il connettore UART resta visibile dopo una connessione corretta */
  persistAfterConnection: boolean;
  /** ID degli step in cui il connettore resta visibile (con stato connesso) dopo la prima connessione */
  visibleInSteps: string[];
}

export interface TerminalToolConfig {
  /** Se true, il terminale richiede collegamento UART per avviarsi */
  requiresUart: boolean;
  /** Se true, il terminale non puo' essere disattivato dalla toolbar */
  persistent: boolean;
  /** Condizioni boot stage con flag da sbloccare */
  bootStageConditions: BootStageCondition[];
}

export interface CompletionDialogConfig {
  /** Dialog title */
  title: string;
  /** Dialog description/message */
  description: string;
  /** If set, show redirect button */
  redirectUrl: string;
  /** Redirect button label */
  redirectLabel: string;
  /** If set, show download button. Path relative to /public */
  downloadFilePath: string;
  /** Label for download button */
  downloadLabel: string;
  /** Filename the user receives when downloading */
  downloadFileName: string;
  /** Show copy-flag button */
  showCopyFlag: boolean;
}

export interface ToolConfig {
  magnifier?: MagnifierConfig;
  uartConnector?: UartConnectorConfig;
  terminal?: TerminalToolConfig;
  firmwareDump?: FirmwareDumpToolConfig;
}

export interface Exercise {
  pcbImage: string;
  steps: Step[];
  components: HardwareComponent[];
  pins: MeasurementPin[];
  uartPins: UartPin[];
  initialFlag: string;
  /** Tool personalizzati definiti dall'autore tramite la tab "Strumenti" in /settings. */
  customTools?: CustomTool[];
  /** Percorso del firmware caricato dall'autore. */
  firmwarePath?: string;
  /** Gruppi di tool attivabili contemporaneamente. */
  toolGroups?: ToolGroup[];
  /** Configurazione dei tool built-in (lente, UART, terminale). */
  toolConfig?: ToolConfig;
  /** Pin SPI sulla PCB per il firmware dump. */
  firmwareDumpPins?: FirmwareDumpPin[];
  /** Configurazione del popup di completamento esercizio. */
  completionDialog?: CompletionDialogConfig;
}

// ===================================================================================
// ===                          DEFINIZIONE DELL'ESERCIZIO                         ===
// ===================================================================================

export const SETTINGS_STORAGE_KEY = 'pcb-ctf-exercise-config';

export const defaultExerciseData: Exercise = {
  pcbImage: '/images/pcb_v2.jpg',
  initialFlag: 'flag{????????????????????}',

  steps: [
    {
      id: 'step-1',
      title: 'Hardware Analysis',
      description:
        'Benvenuto nella prima sfida! In questo step imparerai a identificare i componenti principali di un circuito stampato (PCB). Dovrai individuare la CPU, la memoria ROM e il connettore UART. Usa gli strumenti a tua disposizione per esplorare la scheda e completare gli obiettivi.',
      expectedFlag: 'flag{STM32F4|75xx_UART_OK}',
      availableTools: ['pointer', 'magnifier', 'multimeter'],
      objectives: [
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
    },
    {
      id: 'step-2',
      title: 'UART Connection',
      description:
        "Ottimo lavoro! Ora che hai identificato i componenti principali, è il momento di stabilire una connessione seriale UART con il dispositivo. Dovrai collegare le sonde dell'adattatore USB-to-Serial ai pin UART che hai individuato sul PCB. Ricorda la regola fondamentale: TX va su RX e viceversa (crossover). Seleziona lo strumento 'Connessione UART' dalla sidebar per iniziare.",
      expectedFlag: 'flag{UART_CONNECTED}',
      availableTools: ['pointer', 'magnifier', 'probes'],
      objectives: [
        {
          id: 'uart-connect',
          name: 'Connessione UART',
          type: 'uart',
          instruction:
            "Collega le 3 sonde dall'adattatore USB-to-Serial ai pin UART del PCB: TX dell'adattatore va su RX del PCB, RX dell'adattatore va su TX del PCB, e GND su GND. Seleziona lo strumento 'Connessione UART' dalla sidebar.",
          hint: 'Ricorda il crossover: TX→RX, RX→TX. Il GND è sempre GND. Cerca i pin nella parte inferiore della scheda.',
          flagPart: 'UART_CONNECTED',
          coords: [0, 0, 0, 0],
        },
      ],
    },
    {
      id: 'step-3',
      title: 'Terminal Challenge',
      description:
        "Connessione UART stabilita! Ora hai accesso alla console seriale del dispositivo. In questo step dovrai esplorare il sistema embedded attraverso il terminale, analizzare la configurazione di U-Boot, ottenere accesso root, cercare credenziali e vulnerabilità. Ogni scoperta rivelerà una parte della flag finale. Seleziona lo strumento 'Terminale' dalla sidebar per iniziare.",
      expectedFlag: 'flag{b00t_r00t_h4sh_l34k_1nj3ct_sh3ll}',
      availableTools: ['terminal'],
      objectives: [
        {
          id: 'boot',
          name: 'Boot Analysis',
          type: 'terminal',
          instruction:
            "Analizza la configurazione di U-Boot. Usa il comando 'printenv' nella shell U-Boot per esaminare le variabili d'ambiente. Cerca inconsistenze tra il bootloader e il kernel.",
          hint: "Confronta 'rootfstype' nel printenv con il filesystem effettivamente montato dal kernel. Sono diversi?",
          flagPart: 'b00t',
          coords: [0, 0, 0, 0],
        },
        {
          id: 'root',
          name: 'Root Access',
          type: 'terminal',
          instruction:
            "Ottieni accesso root al sistema. Dopo il boot del kernel, il dispositivo chiederà un login. Prova credenziali comuni per dispositivi embedded.",
          hint: "I router TP-Link spesso usano credenziali di default. Prova 'root' come utente. La password potrebbe essere 'sohoadmin'.",
          flagPart: '_r00t',
          coords: [0, 0, 0, 0],
        },
        {
          id: 'hash',
          name: 'Hash Cracking',
          type: 'terminal',
          instruction:
            "Esamina il file /etc/shadow per trovare gli hash delle password. Usa il tab 'Local Machine' per crackarli con hashcat o john.",
          hint: "Usa 'cat /etc/shadow' nel tab UART, poi copia l'hash MD5 e usa 'hashcat <hash> rockyou.txt' nel tab Local Machine.",
          flagPart: '_h4sh',
          coords: [0, 0, 0, 0],
        },
        {
          id: 'leak',
          name: 'Data Leak',
          type: 'terminal',
          instruction:
            "Analizza la partizione di configurazione del dispositivo. Usa il comando 'strings' per estrarre dati leggibili dai dispositivi a blocchi in /dev/.",
          hint: "Prova 'strings /dev/mtdblock3'. La partizione config spesso contiene credenziali WiFi e configurazioni in chiaro.",
          flagPart: '_l34k',
          coords: [0, 0, 0, 0],
        },
        {
          id: 'inject',
          name: 'Command Injection',
          type: 'terminal',
          instruction:
            "Analizza il web server del dispositivo. Usa 'strings' sul binario httpd per cercare vulnerabilità di command injection.",
          hint: "Prova 'strings /usr/bin/httpd | grep exec'. Cerca funzioni come execFormatCmd che potrebbero essere vulnerabili.",
          flagPart: '_1nj3ct',
          coords: [0, 0, 0, 0],
        },
        {
          id: 'shell',
          name: 'Backdoor Discovery',
          type: 'terminal',
          instruction:
            "Cerca file sospetti nel sistema. Analizza i processi in esecuzione con 'ps' e indaga su binari insoliti in /usr/bin/.",
          hint: "Usa 'ps' per vedere i processi attivi. Noti qualcosa di sospetto? Prova 'strings /usr/bin/backdoorTest' o 'file /usr/bin/backdoorTest'.",
          flagPart: '_sh3ll',
          coords: [0, 0, 0, 0],
        },
      ],
    },
  ],

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
  customTools: [],
};

/**
 * Carica la configurazione da localStorage se presente,
 * altrimenti usa i dati di default hardcoded.
 */
/**
 * Unisce la configurazione caricata con gli step di default mancanti (UART + Terminal).
 * La pagina /settings salva solo Step 1, quindi Step 2 e 3 devono essere sempre aggiunti.
 */
export function mergeWithDefaultSteps(loaded: Exercise): Exercise {
  const defaultSteps = defaultExerciseData.steps || [];
  const loadedSteps = loaded.steps || [];

  const defaultUartStep = defaultSteps.find(s => s.id === 'step-2');
  const defaultTerminalStep = defaultSteps.find(s => s.id === 'step-3');

  const mergedSteps = [...loadedSteps];
  if (!loadedSteps.some(s => s.id === 'step-2') && defaultUartStep) mergedSteps.push(defaultUartStep);
  if (!loadedSteps.some(s => s.id === 'step-3') && defaultTerminalStep) mergedSteps.push(defaultTerminalStep);

  return { ...loaded, steps: mergedSteps };
}

function loadExerciseData(): Exercise {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Exercise;

        // Accetta configurazioni con steps validi O con componenti validi
        const hasValidSteps = parsed.steps && Array.isArray(parsed.steps) && parsed.steps.length > 0;
        const hasValidComponents = parsed.components && Array.isArray(parsed.components) && parsed.components.length > 0;

        if (hasValidSteps || hasValidComponents) {
          console.log('✅ [Exercise] Configurazione caricata da localStorage:', {
            steps: parsed.steps?.length || 0,
            components: parsed.components?.length || 0,
            pins: parsed.pins?.length || 0,
            uartPins: parsed.uartPins?.length || 0
          });
          return parsed;
        }
      }
    } catch (error) {
      console.error('❌ [Exercise] Errore caricamento configurazione:', error);
    }
  }

  console.log('📝 [Exercise] Usando configurazione di default');
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

const SPI_ELECTRICAL: Record<SpiRole, { valueV: number; valueOhm: number }> = {
  vcc:  { valueV: 3.3,  valueOhm: 0 },
  gnd:  { valueV: 0,    valueOhm: 0 },
  cs:   { valueV: 3.3,  valueOhm: 10000 },
  clk:  { valueV: 0,    valueOhm: 50 },
  mosi: { valueV: 0,    valueOhm: 50 },
  miso: { valueV: 0,    valueOhm: 50 },
};

/** Restituisce tensione e resistenza per qualsiasi pin (measurement, UART o SPI). */
export function getPinValues(pinId: string): { valueV: number; valueOhm: number } | null {
  const mPin = exerciseData.pins.find(p => p.id === pinId);
  if (mPin) return { valueV: mPin.valueV, valueOhm: mPin.valueOhm };
  const uPin = exerciseData.uartPins.find(p => p.id === pinId);
  if (uPin) return UART_ELECTRICAL[uPin.role];
  const sPin = exerciseData.firmwareDumpPins?.find(p => p.id === pinId);
  if (sPin) return SPI_ELECTRICAL[sPin.role];
  return null;
}

/** Restituisce le coordinate per qualsiasi pin. */
export function getPinCoords(pinId: string, data: Exercise): [number, number, number, number] | null {
  const mPin = data.pins.find(p => p.id === pinId);
  if (mPin) return mPin.coords;
  const uPin = data.uartPins.find(p => p.id === pinId);
  if (uPin) return uPin.coords;
  const sPin = data.firmwareDumpPins?.find(p => p.id === pinId);
  if (sPin) return sPin.coords;
  return null;
}

/** Tutti i pin combinati per iterazione (snap detection, overlay). */
export function getAllPins(data: Exercise): { id: string; coords: [number, number, number, number]; isUart: boolean; isFirmwareDump: boolean; role?: UartRole | SpiRole; label?: string }[] {
  return [
    ...data.pins.map(p => ({ id: p.id, coords: p.coords, isUart: false as const, isFirmwareDump: false as const })),
    ...data.uartPins.map(p => ({ id: p.id, coords: p.coords, isUart: true as const, isFirmwareDump: false as const, role: p.role, label: p.label })),
    ...(data.firmwareDumpPins ?? []).map(p => ({ id: p.id, coords: p.coords, isUart: false as const, isFirmwareDump: true as const, role: p.role, label: p.label })),
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

