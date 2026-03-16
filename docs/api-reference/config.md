# Config API

Gestisce il salvataggio e il caricamento della configurazione dell'esercizio PCB (componenti, pin, step, obiettivi).

**File su disco**: `src/data/exercise.override.json`

---

## GET `/api/config/load`

Carica la configurazione esercizio salvata.

### Risposta

```json
HTTP 200
{
  "pcbImage": "/images/pcb_v2.jpg",
  "steps": [...],
  "components": [...],
  "pins": [...],
  "uartPins": [...],
  "customTools": [...]
}
```

Se il file non esiste, restituisce `404` e il client usa la configurazione di default.

---

## POST `/api/config/save`

Salva la configurazione esercizio.

### Body

```json
{
  "pcbImage": "/images/pcb_v2.jpg",
  "steps": [
    {
      "id": "step-1",
      "title": "Hardware Analysis",
      "description": "...",
      "availableTools": ["pointer", "magnifier", "multimeter"],
      "objectives": [
        {
          "id": "obj-abc123",
          "name": "Find CPU",
          "type": "component",
          "componentId": "comp-cpu",
          "instruction": "...",
          "hint": "...",
          "flagPart": "ch1p",
          "coords": [45, 40, 15, 20],
          "pinConditions": [],
          "pinLogic": "AND",
          "bootStageConditions": []
        }
      ],
      "expectedFlag": "flag{ch1p}"
    }
  ],
  "components": [
    {
      "id": "comp-cpu",
      "name": "Main CPU",
      "instruction": "...",
      "hint": "...",
      "flagPart": "ch1p",
      "coords": [45, 40, 15, 20]
    }
  ],
  "pins": [
    { "id": "pin-vcc", "valueV": 5.0, "valueOhm": 0, "coords": [58, 75, 1, 2] }
  ],
  "uartPins": [
    { "id": "uart-tx", "role": "tx", "label": "TX", "coords": [62, 74.5, 1.5, 2.5] }
  ],
  "customTools": [],
  "initialFlag": "flag{????}"
}
```

### Risposta

```json
HTTP 200
{ "success": true }
```

### Effetti Collaterali

La configurazione viene scritta in `src/data/exercise.override.json`. La pagina Settings aggiorna anche `localStorage['pcb-ctf-exercise-config']`.

---

## Riferimenti

- **Route**: `src/app/api/config/save/route.ts`, `src/app/api/config/load/route.ts`
- **Tipi**: `src/data/exercise.ts` — `Exercise`
- **Hook client**: `src/hooks/useExerciseConfig.ts`
