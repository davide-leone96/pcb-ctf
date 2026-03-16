# System Architecture Overview

## Panoramica Generale

PCB-CTF è costruito su una moderna stack JavaScript/TypeScript con separazione netta tra frontend e backend.

```
┌─────────────────────────────────────────┐
│         Browser (Next.js 15)            │
├──────────────────┬──────────────────────┤
│                  │                      │
│  Simulator       │  Settings            │
│  (exerciseStore) │  (settingsStore)     │
│                  │                      │
│  ├─ PCBViewer    │  ├─ Canvas           │
│  ├─ Terminal     │  ├─ Sidebar          │
│  └─ Tools        │  └─ Popup Editor     │
│                  │                      │
└──────────────────┼──────────────────────┘
         │         │
         │ HTTP    │
         v         v
┌─────────────────────────────────────────┐
│         API Routes (Next.js)            │
├─────────────────────────────────────────┤
│ /api/config/*                           │
│ /api/terminal-config/*                  │
│ /api/presets/*                          │
│ /api/images/*                           │
│ /api/firmware/*                         │
└──────────────────┬──────────────────────┘
         │ persist
         v
┌─────────────────────────────────────────┐
│    File System (src/data/)              │
├─────────────────────────────────────────┤
│ exercise.override.json                  │
│ presets/                                │
│ └─ *.json (preset definitions)          │
│ public/                                 │
│ └─ images/* (uploaded assets)           │
└─────────────────────────────────────────┘
```

## Principale Sezioni

### 1. Frontend - Simulator (`/`)

Lo studente interagisce con la PCB e il terminale qui.

**Componenti Chiave**:
- `page.tsx` — Entry point
- `PCBViewer.tsx` — Visualizzazione PCB interattiva
- `Terminal.tsx` — Emulatore terminale
- Custom tools rendering

**State Management**:
- `exerciseStore` (Zustand) — stato esercizio
- Module-level variables — persistenza tab terminale

### 2. Frontend - Settings (`/settings`)

L'autore configura gli esercizi qui.

**Componenti Chiave**:
- `SettingsSidebar` — 4 tab (Init, Challenge, Terminal, Tools)
- `SettingsCanvas` — Editor visual drag-and-drop
- `TerminalSettingsPanel` — Config terminale
- `CustomToolsPanel` — Creazione custom tools

**State Management**:
- `settingsStore` (Zustand) — UI state
- `terminalSettingsStore` (Zustand + persist) — Terminal config draft
- `presetStore` — Preset management

### 3. Backend - API Routes

Endpoint Next.js per persistenza e load/save:

- **Config API** — Salva/carica esercizio PCB
- **Terminal Config API** — Salva/carica configurazione terminale
- **Presets API** — CRUD preset
- **Images API** — Upload/delete immagini
- **Firmware API** — Upload file firmware (salva in `public/uploads/`)

### 4. Core Libraries

- **Terminal System** (`src/lib/terminal-*.ts`)
  - `TerminalConfigLoader` — Valida e cache config
  - `TerminalCommandExecutor` — Esegue comandi
  - `terminal-builtin-handlers.ts` — Implementazioni comandi

- **Data Types** (`src/types/`, `src/data/`)
  - Type definitions TypeScript
  - Default configurations
  - Sample presets

## Stack Tecnologico

| Layer | Tecnologia | Note |
|-------|-----------|------|
| Runtime | Node.js 18+ | Server Next.js |
| Framework | Next.js 15 | App router, API routes |
| UI | React 19 | Components moderni |
| Styling | Tailwind CSS 4 | Utility-first CSS |
| Components | Radix UI | Accessible primitives |
| State | Zustand 5 | Lightweight store |
| Lang | TypeScript 5 | Type-safe code |
| Build | Standalone output | Deployable bundle |

## Data Flow

### Simulator Mode

```
User Action (click tool, type command)
  ↓
exerciseStore action triggered
  ↓
Component re-renders with new state
  ↓
Terminal/PCBViewer display updated
  ↓
Flag unlock checked
  ↓
Flag Panel updates
```

### Settings Mode

```
Author changes config (UI)
  ↓
settingsStore/terminalSettingsStore updated
  ↓
Dirty tracking activated (*)
  ↓
Save button clicked
  ↓
Export to JSON
  ↓
POST /api/config/save or /api/terminal-config/save
  ↓
Saved to src/data/
  ↓
localStorage updated
  ↓
Reload notification sent to simulator
```

## Sezioni Approfondite

- [Technology Stack](./technology-stack.md) — Tecnologie adottate e motivazioni
- [Design Decisions](./design-decisions.md) — Scelte architetturali e rationale
- [Store Architecture](./stores.md) — Gestione dello stato
- [Terminal System](./terminal-system.md) — Funzionamento terminale
- [Data Flow](./data-flow.md) — Flusso dati completo
- [Coordinate System](./coordinates.md) — Sistema coordinate PCB
- [Type System](./types.md) — Tipi TypeScript principali
- [Security Model](./security-model.md) — Modello di sicurezza
- [Pedagogical Approach](./pedagogical-approach.md) — Approccio pedagogico

