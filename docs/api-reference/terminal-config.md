# Terminal Config API

Gestisce il salvataggio e il caricamento della configurazione del terminale simulato.

**File su disco**: `src/data/terminal-config.json`

---

## GET `/api/terminal-config/load`

Carica la configurazione terminale salvata.

### Risposta

```json
HTTP 200
{
  "metadata": {
    "name": "Router TP-Link WR841N",
    "description": "UART console simulation"
  },
  "tabs": [
    {
      "id": "uart",
      "name": "UART Console",
      "commands": [...],
      "filesystem": {
        "tree": {
          "etc": {
            "passwd": "root:x:0:0:root:/root:/bin/bash"
          }
        }
      },
      "bootSequence": {
        "stages": [...]
      }
    }
  ],
  "flags": {
    "parts": [
      { "id": "b00t", "value": "b00t" }
    ]
  }
}
```

`404` se il file non esiste.

---

## POST `/api/terminal-config/save`

Salva la configurazione terminale.

### Body

Oggetto `TerminalConfig` completo (stesso formato della risposta GET).

### Risposta

```json
HTTP 200
{ "success": true }
```

### Effetti Collaterali

Dopo il salvataggio, la Settings page aggiorna anche `localStorage['pcb-ctf-terminal-config']` e emette un `StorageEvent` per il ricaricamento live nel simulatore.

---

## Riferimenti

- **Routes**: `src/app/api/terminal-config/save/route.ts`, `src/app/api/terminal-config/load/route.ts`
- **Tipi**: `src/types/terminal-config.ts` — `TerminalConfig`
- **Store**: `src/store/terminalSettingsStore.ts`
- **Hook client**: `src/hooks/useTerminalConfig.ts`
