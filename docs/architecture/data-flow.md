# Data Flow Architecture

## Panoramica

Questo documento descrive il flusso completo dei dati nell'applicazione, dalla configurazione dell'autore all'interazione dello studente, inclusi tutti i passaggi di persistenza, caricamento e aggiornamento in tempo reale.

---

## Flusso Settings → Simulator (Authoring → Runtime)

```
AUTORE modifica la configurazione in /settings
    │
    ▼
settingsStore / terminalSettingsStore aggiornati (Zustand)
    │
    ▼
presetStore.isDirty = true (* asterisco nell'UI)
    │
    │  Autore clicca "Save" o "Apply"
    ▼
settingsStore.exportAsJson()          → Exercise JSON
terminalSettingsStore.exportAsTerminalConfig()  → TerminalConfig JSON
    │
    ▼
POST /api/config/save  →  src/data/exercise.override.json
POST /api/terminal-config/save  →  src/data/terminal-config.json
    │
    ▼
localStorage.setItem('pcb-ctf-exercise-config', exerciseJson)
localStorage.setItem('pcb-ctf-terminal-config', terminalJson)
    │
    ▼
window.dispatchEvent(new StorageEvent('storage', { key: 'pcb-ctf-terminal-config' }))
    │
    ▼ (nel Simulator, se aperto in un'altra tab)
useTerminalConfig() hook ascolta StorageEvent
    │
    ▼
TerminalConfigLoader.load(newConfig) → ricostruisce cache comandi
    │
    ▼
Terminal.tsx re-render con nuova configurazione
```

---

## Flusso di Caricamento del Simulator

```
Utente apre http://localhost:3000
    │
    ▼
page.tsx monta i componenti
    │
    ▼
useExerciseConfig() hook:
  1. Tenta GET /api/config/load
  2. Se fallisce, legge localStorage 'pcb-ctf-exercise-config'
  3. Se vuoto, usa defaultExerciseData (src/data/exercise.ts)
    │
    ▼
exerciseStore.setExerciseData(config)
  - currentStepIndex = 0
  - stepMode = 'education'
  - flag = computeBlankFlag(step[0])
    │
    ▼
useTerminalConfig() hook:
  1. Tenta GET /api/terminal-config/load
  2. Se fallisce, legge localStorage 'pcb-ctf-terminal-config'
    │
    ▼
TerminalConfigLoader.load(config)
  - flattenTree() normalizza il filesystem
  - Costruisce command cache: Map<tabId, Map<commandName, CommandDef>>
  - Mergia defaultConstraints su ogni comando
    │
    ▼
PCBViewer + Terminal pronti per interazione
```

---

## Flusso di Interazione: Comando Terminale

```
Studente digita comando e preme Enter
    │
    ▼
Terminal.tsx: executeCommand(input, tabId)
    │
    ▼
Costruisce CommandContext:
  { tabId, currentPath, discoveredFlags, environment, ... }
    │
    ▼
TerminalCommandExecutor.execute(commandName, args, context)
    │
    ├─ 1. validateConstraints() — path, permissions, prerequisites, arguments
    │       Se fallisce → result.error
    │
    ├─ 2. executeHandler() — builtin | custom | dynamic | script | lookup
    │       Genera result.output
    │
    └─ 3. applySideEffects() — unlockFlags, setState, executeCommand
            result.newFlags = [...]
    │
    ▼
Terminal.tsx processa result:
  - Aggiunge output alla history della tab
  - Per ogni flag in result.newFlags:
      addTerminalDiscovery(flagId)  → exerciseStore
    │
    ▼
exerciseStore.addTerminalDiscovery(flagId):
  - Aggiunge a terminalDiscoveries (idempotente)
  - Verifica bootStageConditions obiettivo corrente
  - Se soddisfatte → _completeCurrentObjective()
    │
    ▼
Flag Panel aggiornato + obiettivo avanzato
```

---

## Flusso di Interazione: Probe Multimetro

```
Studente seleziona probe rosso (clic)
    │
    ▼
exerciseStore.selectProbe('first')
  - activeProbe = 'first'
    │
    ▼
Studente avvicina probe a un pin (hover)
    │
    ▼
PCBViewer: rilevamento snap (entro 15px)
exerciseStore.setSnapTarget(pinId)
    │
    ▼
Studente clicca sul pin
    │
    ▼
exerciseStore.hookProbe()
  - probe1.hookedTo = snapTarget
  - activeProbe = null
  - _checkPinConditions()
    │
    ▼
_checkPinConditions():
  - Verifica pinConditions dell'obiettivo corrente (tipo 'pin')
  - logic AND/OR
  - Se soddisfatte → _completeCurrentObjective()
```

---

## Flusso Preset: Salvataggio

```
Autore clicca "Save as New Preset"
    │
    ▼
presetStore.saveAsNewPreset(name, description)
    │
    ▼
captureCurrentConfig():
  - useSettingsStore.getState().exportAsJson()    → Exercise
  - useTerminalSettingsStore.getState().exportAsTerminalConfig()  → TerminalConfig
    │
    ▼
POST /api/presets  body: { name, description, exercise, terminalConfig }
    │
    ▼
Server: genera ID, scrive src/data/presets/{id}.json
         aggiorna src/data/presets/index.json
    │
    ▼
presetStore.activePresetId = id
presetStore.isDirty = false
localStorage.setItem('pcb-ctf-active-preset', id)
```

---

## Flusso Preset: Caricamento

```
Autore clicca "Load Preset" → seleziona preset
    │
    ▼
presetStore.loadPreset(id)
    │
    ▼
GET /api/presets/{id}  → { exercise, terminalConfig }
    │
    ▼
settingsStore carica exercise config:
  - components, pins, uartPins, steps
    │
    ▼
terminalSettingsStore carica terminal config:
  - tabs, commands, flagParts, bootStages, filesystemEntries
    │
    ▼
localStorage aggiornato
presetStore.isDirty = false
presetStore.activePresetId = id
localStorage.setItem('pcb-ctf-active-preset', id)
```

---

## Comunicazione Cross-Store

PCB-CTF non usa un root reducer centralizzato (Redux). La coordinazione avviene tramite:

1. **Zustand subscriptions** — `presetStore` subscribe a `settingsStore` e `terminalSettingsStore` per dirty tracking
2. **Chiamate dirette** — `captureCurrentConfig()` legge altri store tramite `getState()`
3. **localStorage events** — il simulator ascolta `StorageEvent` per ricaricare la config live
4. **LocalStorage condiviso** — entrambe le pagine (`/` e `/settings`) leggono/scrivono le stesse chiavi

---

## localStorage Keys

| Chiave | Scritto da | Letto da |
|--------|-----------|----------|
| `pcb-ctf-exercise-config` | Settings API + terminalSettingsStore | Simulator (loadExerciseData) |
| `pcb-ctf-terminal-config` | terminalSettingsStore.applyTerminalConfig() | Simulator (useTerminalConfig) |
| `pcb-ctf-terminal-settings-draft` | terminalSettingsStore (Zustand persist) | terminalSettingsStore |
| `pcb-ctf-active-preset` | presetStore | presetStore |
