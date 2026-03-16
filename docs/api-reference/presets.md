# Presets API

Gestisce il ciclo di vita dei preset — bundle che raggruppano configurazione PCB e terminale in un singolo file JSON.

**File su disco**: `src/data/presets/{id}.json`
**Indice**: `src/data/presets/index.json`

---

## GET `/api/presets`

Lista tutti i preset disponibili.

### Risposta

```json
HTTP 200
[
  {
    "id": "preset-abc123",
    "name": "Router TP-Link Exercise",
    "description": "Esercizio UART exploitation",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T12:00:00Z"
  }
]
```

---

## POST `/api/presets`

Crea un nuovo preset.

### Body

```json
{
  "name": "My Exercise",
  "description": "Descrizione esercizio",
  "exercise": { ...Exercise object... },
  "terminalConfig": { ...TerminalConfig object... },
  "customTools": []
}
```

### Risposta

```json
HTTP 200
{
  "id": "preset-xyz789",
  "name": "My Exercise",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

---

## GET `/api/presets/{id}`

Carica un preset specifico.

### Risposta

```json
HTTP 200
{
  "id": "preset-abc123",
  "name": "Router TP-Link Exercise",
  "description": "...",
  "exercise": { ...Exercise... },
  "terminalConfig": { ...TerminalConfig... },
  "customTools": [...],
  "createdAt": "...",
  "updatedAt": "..."
}
```

`404` se il preset non esiste.

---

## PUT `/api/presets/{id}`

Aggiorna un preset esistente.

### Body

Stesso formato di POST. Il campo `id` nel body viene ignorato — usa l'ID nel path.

### Risposta

```json
HTTP 200
{ "success": true, "updatedAt": "2024-01-01T12:00:00Z" }
```

---

## DELETE `/api/presets/{id}`

Elimina un preset.

### Risposta

```json
HTTP 200
{ "success": true }
```

Rimuove il file `{id}.json` e aggiorna `index.json`.

---

## Riferimenti

- **Routes**: `src/app/api/presets/route.ts`, `src/app/api/presets/[id]/route.ts`
- **Helpers**: `src/app/api/presets/_helpers.ts`
- **Tipi**: `src/types/preset.ts` — `Preset`, `PresetListItem`
- **Store**: `src/store/presetStore.ts`
