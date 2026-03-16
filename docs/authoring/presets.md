# Gestione Preset

## Cos'e' un Preset

Un **Preset** e' un bundle JSON che raggruppa in un unico file l'intera configurazione di un esercizio PCB-CTF:

```typescript
interface Preset {
  id: string;
  name: string;
  description?: string;
  exercise: Exercise;              // configurazione PCB (componenti, pin, step)
  terminalConfig: TerminalConfig;  // configurazione terminale (comandi, boot, filesystem)
  customTools?: CustomTool[];      // strumenti personalizzati
  createdAt: string;
  updatedAt: string;
}
```

I preset sono salvati su file system in `src/data/presets/{id}.json`. Il file `src/data/presets/index.json` mantiene la lista di tutti i preset disponibili.

---

## Store del Preset

Il `presetStore` (in `src/store/presetStore.ts`) gestisce il ciclo di vita dei preset:

```typescript
interface PresetState {
  presets: PresetListItem[];    // lista preset disponibili
  activePresetId: string | null;
  isLoading: boolean;
  isDirty: boolean;             // true se ci sono modifiche non salvate

  fetchPresets: () => Promise<void>;
  loadPreset: (id: string) => Promise<ActionResult>;
  saveAsNewPreset: (name: string, description?: string) => Promise<ActionResult>;
  updatePreset: (id: string) => Promise<ActionResult>;
  deletePreset: (id: string) => Promise<ActionResult>;
  renamePreset: (id: string, name: string) => Promise<ActionResult>;
}
```

---

## Dirty Tracking

Il `presetStore` sottoscrive automaticamente le modifiche di `settingsStore` e `terminalSettingsStore`. Quando uno dei campi di contenuto cambia, `isDirty` viene impostato a `true`:

**Campi monitorati in `settingsStore`**:
- `components`, `steps`, `pins`, `pcbImagePath`

**Campi monitorati in `terminalSettingsStore`**:
- `tabs`, `commands`, `bootStages`, `filesystemEntries`, `flagParts`, `completeFlag`

I campi UI-only (zoom del canvas, componente selezionato, ecc.) non attivano `isDirty`.

L'asterisco `*` accanto al nome del preset nell'UI indica modifiche non salvate.

---

## Operazioni CRUD

### Salvare come Nuovo Preset

```
1. Modifica la configurazione corrente
2. Clic "Save as New Preset"
3. Inserisci nome e descrizione
4. Il sistema chiama captureCurrentConfig() → legge stato corrente da entrambi gli store
5. POST /api/presets  con il payload completo
6. Salvato in src/data/presets/{new-id}.json
7. index.json aggiornato
8. activePresetId impostato al nuovo ID
9. isDirty = false
```

### Aggiornare Preset Esistente

```
1. Modifica la configurazione (isDirty = true)
2. Clic "Save" (update del preset corrente)
3. PUT /api/presets/{id}
4. File aggiornato su disco
5. isDirty = false
```

### Caricare un Preset

```
1. Clic "Load Preset" → lista preset disponibili
2. Selezione preset
3. GET /api/presets/{id}
4. settingsStore carica exercise config
5. terminalSettingsStore carica terminal config
6. isDirty = false
7. activePresetId = id
```

### Eliminare un Preset

```
1. Selezionare preset dalla lista
2. Clic "Delete"
3. DELETE /api/presets/{id}
4. File rimosso da disk
5. index.json aggiornato
6. Se era il preset attivo: activePresetId = null
```

---

## Export / Import

### Export

Scarica il file JSON del preset corrente per condivisione:

1. Clic "Export Preset"
2. File `{preset-name}.json` viene scaricato nel browser
3. Il file e' autonomo — contiene tutta la configurazione necessaria

### Import

Carica un preset ricevuto da un altro autore:

1. Clic "Import Preset"
2. Selezionare il file JSON
3. Il sistema valida e carica la configurazione
4. Viene creato un nuovo preset con un nuovo ID
5. La configurazione e' disponibile per essere testata e modificata

---

## Persistenza

| Dato | Storage |
|------|---------|
| Lista preset | `src/data/presets/index.json` |
| Contenuto preset | `src/data/presets/{id}.json` |
| ID preset attivo | `localStorage` → chiave `pcb-ctf-active-preset` |

Il `captureCurrentConfig()` nel `presetStore` legge lo stato corrente direttamente dagli store tramite `getState()`:

```typescript
function captureCurrentConfig() {
  const exerciseJson = useSettingsStore.getState().exportAsJson();
  const exerciseConfig: Exercise = JSON.parse(exerciseJson);
  const terminalConfig = useTerminalSettingsStore.getState().exportAsTerminalConfig();
  return { exerciseConfig, terminalConfig };
}
```

---

## API Endpoints

| Metodo | Endpoint | Azione |
|--------|----------|--------|
| `GET` | `/api/presets` | Lista tutti i preset |
| `GET` | `/api/presets/{id}` | Carica un preset specifico |
| `POST` | `/api/presets` | Crea nuovo preset |
| `PUT` | `/api/presets/{id}` | Aggiorna preset esistente |
| `DELETE` | `/api/presets/{id}` | Elimina preset |

---

## Riferimenti

- **Store**: `src/store/presetStore.ts`
- **Tipi**: `src/types/preset.ts` — `Preset`, `PresetListItem`
- **API**: `src/app/api/presets/` directory
