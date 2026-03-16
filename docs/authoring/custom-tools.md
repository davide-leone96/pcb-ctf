# Authoring Custom Tools

## Panoramica

I **Custom Tools** sono strumenti di misura e analisi definiti dall'autore che estendono il set predefinito del simulatore. Vengono configurati nella tab **Tools** di `/settings` tramite il `CustomToolsPanel`.

I custom tools definiti vengono salvati nel campo `Exercise.customTools` e sono quindi inclusi nel preset. Nel simulatore appaiono nella sidebar degli strumenti sotto un divisore separato dagli strumenti standard.

La tab **Tools** e' organizzata in due sotto-tab:
- **Tool** (accento viola) — creazione e modifica dei tool personalizzati
- **Gruppi** (accento blu) — gestione dei gruppi di tool attivabili contemporaneamente (vedi sezione [Tool Groups](#tool-groups))

---

## Creare un Custom Tool

Nella sotto-tab **Tool**:

1. Clic su "+ New Tool"
2. Compilare le proprieta' principali
3. Aggiungere probe
4. Scegliere il tipo di output
5. (Opzionale) Caricare un'immagine
6. Salvare

### Proprieta' Principali

```typescript
interface CustomTool {
  id: string;           // generato: "tool-6bn8zz"
  name: string;         // "Oscilloscopio 100MHz"
  description?: string; // descrizione opzionale
  probes: ToolProbe[];
  outputType: ToolOutputType;
  outputUnit?: string;  // per outputType='numeric': "V", "Hz", "C"
  modes?: ToolMode[];
  firmwareDumpConfig?: FirmwareDumpConfig;  // solo per outputType='firmware-dump'
}
```

---

## Configurare le Probe

Ogni probe e' un punto di contatto fisico che puo' agganciarsi ai pin PCB:

```typescript
interface ToolProbe {
  id: string;
  label: string;           // etichetta visiva: "CH1", "+", "TX"
  role: string;            // ruolo semantico: "channel1", "positive", "clock"
  color: string;           // colore esadecimale del filo: "#FF0000"
  connectivity: ProbeConnectivity;  // 'measurement' | 'uart' | 'all'
}
```

### `connectivity`

| Valore | Pin a cui si puo' connettere |
|--------|------------------------------|
| `'measurement'` | Solo `MeasurementPin` |
| `'uart'` | Solo `UartPin` |
| `'all'` | Qualsiasi pin |

**Esempio — Oscilloscopio a 2 canali:**

```
Probe 1: label="CH1", color="#FF0000", role="channel1", connectivity="measurement"
Probe 2: label="CH2", color="#0000FF", role="channel2", connectivity="measurement"
Probe 3: label="GND", color="#000000", role="ground",   connectivity="measurement"
```

---

## Tipi di Output

### `'numeric'`

Mostra un valore numerico nel display del tool. Il valore viene letto dal pin agganciato alla prima probe:
- Se `outputUnit === 'V'` → legge `pin.valueV`
- Se `outputUnit === 'Ohm'` → legge `pin.valueOhm`

### `'leds'`

Mostra indicatori LED colorati. Lo stato di ciascun LED dipende dalla connessione delle probe corrispondenti.

### `'connection-status'`

Indica visivamente se le connessioni richieste sono complete. Utile per tool di diagnosi della connettivita'.

### `'none'`

Nessun display. Il tool e' puramente visivo o serve per connessioni UART senza readout.

### `'firmware-dump'`

Caso speciale: attiva un processo di dump firmware con progress bar e download del file. Richiede la configurazione di `firmwareDumpConfig`.

---

## Firmware Dump Config

```typescript
interface FirmwareDumpConfig {
  requiredConnections: FirmwareDumpPinMapping[];
  filePath?: string;       // path file sul server (es. "/uploads/firmware.bin")
  fileName?: string;       // nome mostrato nel download
  dumpDurationSec?: number; // durata progress bar (default: 3)
}

interface FirmwareDumpPinMapping {
  probeId: string;  // ID della probe del tool
  pinId: string;    // ID del pin PCB richiesto
}
```

Il file firmware da scaricare deve essere caricato sul server preventivamente (cartella `public/`). Il `filePath` deve essere il path relativo accessibile pubblicamente.

**Esempio:**
```json
{
  "firmwareDumpConfig": {
    "requiredConnections": [
      { "probeId": "probe-clk", "pinId": "pin-spi-clk" },
      { "probeId": "probe-data", "pinId": "pin-spi-mosi" },
      { "probeId": "probe-cs", "pinId": "pin-spi-cs" },
      { "probeId": "probe-gnd", "pinId": "pin-gnd" }
    ],
    "filePath": "/uploads/firmware-router.bin",
    "fileName": "firmware.bin",
    "dumpDurationSec": 5
  }
}
```

---

## Modalita' (`ToolMode`)

I tool con piu' modalita' di misura possono elencarle qui:

```typescript
interface ToolMode {
  id: string;
  name: string;       // "Voltage Mode"
  shortName: string;  // "V"
  unit: string;       // "V"
}
```

Le modalita' selezionabili appaiono nell'header del pannello del tool nel simulatore.

---

## Caricamento Immagine

Un'immagine personalizzata puo' rappresentare visivamente il tool nel simulatore:

1. Clic su "Upload Image" nel form del tool
2. Scegliere PNG/JPG (PNG con sfondo trasparente consigliato)
3. Upload via `POST /api/images/upload`
4. Il path viene salvato in `CustomTool` e usato come `<img src>` nel renderer

**Dimensioni consigliate**: 200-400 px di larghezza, proporzioni variabili.

---

## Collegamento a un Obiettivo `firmware-dump`

Per creare un obiettivo che si completa quando il firmware dump termina:

1. Creare il custom tool con `outputType: 'firmware-dump'` e `firmwareDumpConfig`
2. Nella tab Challenge, aggiungere un obiettivo con `type: 'firmware-dump'`
3. Impostare il campo `customToolId` dell'obiettivo con l'ID del custom tool creato

Il simulatore verifichera' che `currentObj.customToolId === toolId` prima di completare l'obiettivo.

---

## Tool Groups

I **Tool Groups** permettono di definire insiemi di tool che possono essere attivi contemporaneamente nel simulatore. Per default, selezionare un tool ne disattiva il precedente. Con un gruppo, i tool al suo interno coesistono nella sidebar e nel viewer.

### Configurazione

Nella sotto-tab **Gruppi**:

1. Clic su "+ Aggiungi gruppo"
2. Inserire un nome (es. "Analisi completa")
3. Selezionare i tool che devono coesistere tramite le checkbox

```typescript
interface ToolGroup {
  id: string;
  name: string;
  toolIds: string[];  // ID dei tool (builtin + custom)
}
```

I gruppi sono salvati in `Exercise.toolGroups` e inclusi nel preset.

### Comportamento nel Simulatore

- **Tool nel gruppo**: cliccando un tool, viene aggiunto/rimosso da `activeTools` senza influenzare gli altri tool del gruppo
- **Tool fuori dal gruppo**: sostituisce tutti i tool attivi (comportamento classico)
- **Rendering**: tutti i tool in `activeTools` mostrano i loro overlay (multimetro, UART adapter, hotspot componenti) contemporaneamente

**Esempio**: gruppo `[pointer, magnifier, multimeter]` → l'utente puo' cliccare componenti, usare la lente e vedere il multimetro nello stesso momento.

---

## Stato nel Simulatore

Il `exerciseStore` traccia lo stato di ogni custom tool:

```typescript
customToolConnections: Record<string, Array<{ probeId: string; pinId: string | null }>>;
customToolPositions: Record<string, { x: number; y: number }>;
activeCustomToolId: string | null;
activeCustomProbeId: string | null;
```

Le connessioni e le posizioni persistono quando si cambia tool attivo. Solo lo stato transitorio (`activeCustomToolId`, `activeCustomProbeId`, `customSnapTarget`) viene ripulito da `setActiveTool()`.

---

## Riferimenti

- **Tipi**: `src/types/custom-tool.ts`
- **Store**: `src/store/settingsStore.ts` — `DraftCustomTool`, `DraftToolProbe`
- **Renderer**: `src/components/features/exercise/tools/CustomToolRenderer.tsx`
- **Panel authoring**: `src/components/features/settings/CustomToolsPanel.tsx`
