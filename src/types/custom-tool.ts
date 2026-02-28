// src/types/custom-tool.ts

/** A quale tipo di pin si può connettere ogni sonda del tool. */
export type ProbeConnectivity = 'measurement' | 'uart' | 'all';

/** Tipo di output visualizzato dal tool nel simulatore. */
export type ToolOutputType = 'none' | 'numeric' | 'leds' | 'connection-status';

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
  /** Percorso immagine del corpo del tool nel simulatore, es. "/images/oscilloscope.png" */
  imagePath?: string;
  probes: ToolProbe[];
  outputType: ToolOutputType;
  /** Unità di default per outputType='numeric' senza modi attivi */
  outputUnit?: string;
  modes?: ToolMode[];
}
