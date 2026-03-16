# Custom Tools

## Panoramica

I **Custom Tools** sono strumenti di misura e diagnosi aggiuntivi definiti dall'autore dell'esercizio. Sono progettati per rappresentare strumenti hardware che non rientrano nel set predefinito (multimetro, sonde UART, lente), come oscilloscopi, analizzatori logici, sensori specifici, o tool per l'estrazione del firmware.

Ogni custom tool appare nella sidebar degli strumenti **sotto un divisore**, separato dagli strumenti standard.

---

## Struttura di un Custom Tool

```typescript
interface CustomTool {
  id: string;                        // identificatore univoco
  name: string;                      // nome visualizzato nella sidebar
  description?: string;              // descrizione opzionale
  probes: ToolProbe[];               // sonde del tool
  outputType: ToolOutputType;        // tipo di display
  outputUnit?: string;               // unità per outputType='numeric'
  modes?: ToolMode[];                // modalità di misura disponibili
  firmwareDumpConfig?: FirmwareDumpConfig;  // solo per outputType='firmware-dump'
}
```

### Sonde (`ToolProbe`)

Ogni sonda è un punto di contatto del tool che può agganciarsi ai pin della PCB:

```typescript
interface ToolProbe {
  id: string;
  label: string;          // etichetta visiva (es. "CH1", "+", "TX")
  role: string;           // ruolo semantico (es. "positive", "clock", "data")
  color: string;          // colore del filo nel simulatore (hex, es. "#22C55E")
  connectivity: ProbeConnectivity;  // 'measurement' | 'uart' | 'all'
}
```

Il campo `connectivity` determina a quali pin PCB la sonda può agganciarsi:
- `'measurement'` — solo pin di tipo `MeasurementPin`
- `'uart'` — solo pin di tipo `UartPin`
- `'all'` — qualsiasi pin

### Tipi di Output (`ToolOutputType`)

| Tipo | Comportamento |
|------|---------------|
| `'none'` | Nessun display numerico — il tool mostra solo lo stato di connessione |
| `'numeric'` | Display numerico con valore letto dal pin agganciato (`valueV` o `valueOhm`) |
| `'leds'` | Indicatori LED che si accendono in base allo stato dei pin |
| `'connection-status'` | Indica visivamente se le connessioni richieste sono complete |
| `'firmware-dump'` | Avvia un processo di dump firmware con progress bar e download |

### Modalità (`ToolMode`)

I tool possono avere più modalità di misura, selezionabili dall'utente nella UI:

```typescript
interface ToolMode {
  id: string;
  name: string;       // es. "Tensione"
  shortName: string;  // es. "V"
  unit: string;       // es. "V", "Ω", "Hz"
}
```

---

## Workflow di Utilizzo nel Simulatore

### 1. Selezione

Clic sul nome del tool nella sezione Custom della sidebar. Chiama `setActiveCustomTool(toolId)`:

```typescript
setActiveCustomTool: (toolId) => {
  // Inizializza le connessioni per questo tool se non esistono
  const connections = existingConns ?? tool.probes.map(p => ({ probeId: p.id, pinId: null }));
  set({
    activeTool: 'custom',
    activeCustomToolId: toolId,
    customToolConnections: { ...customToolConnections, [toolId]: connections },
  });
}
```

Il tool appare come pannello draggabile nella PCB view.

### 2. Posizionamento

Il pannello del tool è **draggabile** tenendo il header. La posizione è tracciata in `customToolPositions`:

```typescript
customToolPositions: Record<string, { x: number; y: number }>;
```

### 3. Connessione delle Sonde

Clic su una sonda del pannello per selezionarla (`setActiveCustomProbe(toolId, probeId)`). Avvicinandosi a un pin PCB compatibile (rispetto al campo `connectivity`) appare lo snap target. Il clic sul pin chiama `hookCustomProbe(toolId, probeId, pinId)`.

Il cavo di connessione viene visualizzato come **linea tratteggiata** dal pannello del tool al pin PCB.

### 4. Lettura del Valore

Per `outputType === 'numeric'`, il valore viene letto dal pin agganciato alla prima sonda:
- Se `outputUnit` è `'V'` → legge `pin.valueV`
- Se `outputUnit` è `'Ω'` → legge `pin.valueOhm`

### 5. Disconnessione

Clic su una sonda già connessa per disconnetterla (`unhookCustomProbe(toolId, probeId)`).

---

## Firmware Dump Tool

Il tipo `'firmware-dump'` è un caso speciale che simula l'estrazione del firmware da un chip di memoria.

### Configurazione

```typescript
interface FirmwareDumpConfig {
  requiredConnections: FirmwareDumpPinMapping[];  // sonde → pin richiesti
  filePath?: string;       // path del file sul server per il download
  fileName?: string;       // nome del file mostrato all'utente
  dumpDurationSec?: number;  // durata progress bar (default: 3 secondi)
}

interface FirmwareDumpPinMapping {
  probeId: string;  // ID della sonda del tool
  pinId: string;    // ID del pin PCB richiesto
}
```

### Processo

1. L'utente connette tutte le sonde ai pin specificati in `requiredConnections`
2. Il sistema rileva il completamento delle connessioni
3. Viene mostrata una **progress bar** per `dumpDurationSec` secondi
4. Al termine, viene avviato automaticamente il **download del file** `filePath`
5. `completeFirmwareDump(toolId)` viene chiamata nell'exerciseStore, che completa l'objective corrente di tipo `firmware-dump`

### Completamento Obiettivo

```typescript
completeFirmwareDump: (toolId) => {
  const currentObj = currentStep?.objectives?.[currentObjectiveIndex];
  if (stepMode === 'active' && currentObj?.type === 'firmware-dump'
      && currentObj.customToolId === toolId) {
    get()._completeCurrentObjective();
  }
}
```

L'objective di tipo `firmware-dump` richiede che il campo `customToolId` dell'objective corrisponda all'ID del tool che ha completato il dump.

---

## Stato nel exerciseStore

```typescript
activeCustomToolId: string | null;
activeCustomProbeId: string | null;
customSnapTarget: { probeId: string; pinId: string } | null;
customToolConnections: Record<string, Array<{ probeId: string; pinId: string | null }>>;
customToolPositions: Record<string, { x: number; y: number }>;
```

Quando si cambia tool (da `custom` a qualsiasi altro), lo stato transitorio viene ripulito automaticamente da `setActiveTool()`:

```typescript
if (tool !== 'custom') {
  set({ activeCustomToolId: null, activeCustomProbeId: null, customSnapTarget: null });
}
```

Le connessioni effettuate (`customToolConnections`) e le posizioni (`customToolPositions`) **persistono** tra cambi di tool, in modo che l'utente non debba riposizionare il pannello ogni volta.

---

## Authoring dei Custom Tools

La creazione e configurazione dei custom tools avviene nella pagina `/settings`, tab **Tools**, tramite il `CustomToolsPanel`. Vedi [Authoring → Custom Tools](../../authoring/custom-tools.md) per la documentazione completa.

---

## Riferimenti

- **Tipi**: `src/types/custom-tool.ts`
- **Store**: `src/store/exerciseStore.ts` — azioni `setActiveCustomTool`, `hookCustomProbe`, `completeFirmwareDump`
- **Renderer**: `src/components/features/exercise/tools/CustomToolRenderer.tsx`
- **Sidebar**: lista custom tools in `src/components/features/exercise/ToolsSidebar.tsx`
