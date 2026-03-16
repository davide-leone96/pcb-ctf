# Firmware API

Gestisce il caricamento dei file firmware usati negli esercizi di tipo `firmware-dump`.

**Directory di storage**: `public/uploads/`

---

## POST `/api/firmware/upload`

Carica un file firmware via multipart/form-data.

### Request

```
Content-Type: multipart/form-data

file: <binary firmware data>
```

### Risposta

```json
HTTP 200
{
  "success": true,
  "path": "/uploads/firmware-1704067200000-firmware_v1.bin",
  "fileName": "firmware_v1.bin"
}
```

Il campo `path` è relativo alla directory `public/` ed è usabile come valore di `FirmwareDumpConfig.filePath` nel custom tool di tipo `firmware-dump`.

### Esempio cURL

```bash
curl -X POST http://localhost:3000/api/firmware/upload \
  -F "file=@firmware.bin"
```

### Limiti e Validazione

| Parametro | Valore |
|-----------|--------|
| Dimensione massima | 50 MB |
| Estensione | Qualunque (default `.bin` se assente) |
| Naming | `firmware-{timestamp}-{baseName}{ext}` |

Il server sanitizza il nome originale del file rimuovendo tutti i caratteri non alfanumerici (eccetto `_` e `-`) prima di costruire il nome finale. Questo evita path traversal e caratteri problematici nel filesystem.

### Errori

| Status | Condizione |
|--------|------------|
| `400` | Campo `file` assente nel form |
| `400` | File superiore a 50 MB |
| `500` | Errore I/O durante la scrittura |

---

## Integrazione con Custom Tools

Il file firmware caricato viene usato nella configurazione `FirmwareDumpConfig` di un `CustomTool` con `outputType: 'firmware-dump'`:

```json
{
  "id": "tool-jtag",
  "name": "JTAG Debugger",
  "outputType": "firmware-dump",
  "firmwareDump": {
    "filePath": "/uploads/firmware-1704067200000-firmware_v1.bin",
    "requiredConnections": [
      { "probeId": "probe-tck", "pinId": "pin-tck" },
      { "probeId": "probe-tdi", "pinId": "pin-tdi" },
      { "probeId": "probe-tdo", "pinId": "pin-tdo" },
      { "probeId": "probe-tms", "pinId": "pin-tms" }
    ],
    "dumpDurationSec": 8
  }
}
```

Quando tutte le connessioni richieste sono attive, il simulatore avvia il dump animato e al termine chiama `completeFirmwareDump(toolId)` nello `exerciseStore`, completando l'obiettivo di tipo `firmware-dump` associato.

---

## Considerazioni di Sicurezza

- Il server sanitizza il filename originale tramite regex `[^a-zA-Z0-9_-]` → `_`
- Il file viene salvato in `public/uploads/` con nome generato dal server; il nome originale non viene mai usato direttamente sul filesystem
- Non è disponibile un endpoint di delete dedicato per i firmware (diversamente dalle immagini)

---

## Riferimenti

- **Route**: `src/app/api/firmware/upload/route.ts`
- **Tipi**: `src/types/custom-tool.ts` — `FirmwareDumpConfig`, `FirmwareDumpPinMapping`
- **Usato da**: `CustomToolsPanel` (upload file firmware), `CustomToolRenderer` (avvio dump)
- **Obiettivo correlato**: `ObjectiveType = 'firmware-dump'` in `src/data/exercise.ts`
