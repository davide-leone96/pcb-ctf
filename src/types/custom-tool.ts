// src/types/custom-tool.ts

/** A quale tipo di pin si può connettere ogni sonda del tool. */
export type ProbeConnectivity = 'measurement' | 'uart' | 'all';

/** Tipo di output visualizzato dal tool nel simulatore. */
export type ToolOutputType = 'none' | 'numeric' | 'leds' | 'connection-status' | 'firmware-dump';

/** Mappatura sonda → pin richiesta per triggerare il dump firmware. */
export interface FirmwareDumpPinMapping {
  probeId: string;
  pinId: string;
}

/** Configurazione del firmware dumper: quali pin collegare e quale file scaricare. */
export interface FirmwareDumpConfig {
  /** Connessioni richieste per avviare il dump (probe → pin) */
  requiredConnections: FirmwareDumpPinMapping[];
  /** Path del file firmware sul server (es. /uploads/firmware-xxx.bin) */
  filePath?: string;
  /** Nome file mostrato all'utente nel download */
  fileName?: string;
  /** Durata della progress bar in secondi (default: 3) */
  dumpDurationSec?: number;
}

/**
 * Una singola sonda del tool custom.
 * Ogni sonda è una "punta" fisica che può agganciare pin sul PCB.
 */
export interface ToolProbe {
  id: string;
  /** Etichetta visiva, es. "CH1", "+", "TX" */
  label: string;
  /** Ruolo semantico, es. "positive", "negative", "gnd", "tx", "rx" */
  role: string;
  /** Colore hex del filo/punta nel simulatore, es. "#22C55E" */
  color: string;
  /** A quali pin può agganciarsi */
  connectivity: ProbeConnectivity;
}

/**
 * Modalità di misura del tool (es. tensione / resistenza per il multimetro).
 */
export interface ToolMode {
  id: string;
  /** Nome esteso, es. "Tensione" */
  name: string;
  /** Nome corto mostrato sul display, es. "V" */
  shortName: string;
  /** Unità di misura, es. "V", "Ω", "Hz" */
  unit: string;
}

/**
 * Definizione completa di un tool personalizzato.
 * Compatibile con la futura conversione dei tool hardcoded (multimetro, sonde UART).
 */
export interface CustomTool {
  id: string;
  name: string;
  description?: string;
  probes: ToolProbe[];
  outputType: ToolOutputType;
  /** Unità di default per outputType='numeric' senza modi attivi */
  outputUnit?: string;
  modes?: ToolMode[];
  /** Configurazione specifica per outputType='firmware-dump' */
  firmwareDumpConfig?: FirmwareDumpConfig;
}
