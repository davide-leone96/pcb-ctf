# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ARTIC (pcb-ctf)** is a web-based PCB hardware security CTF simulator. It has two modes:
- **Simulator** (`/`) — Students interact with a virtual PCB: identify components, measure pins, connect UART probes, dump firmware, and use an in-browser terminal to solve challenges. Objectives unlock flag parts progressively.
- **Configurator** (`/settings`, dev-only) — Exercise authors visually place components/pins on a PCB image, configure terminal environments (filesystem, commands, boot sequences, flags), and manage presets. This page returns 404 in production (`NEXT_PUBLIC_DEV_MODE=false`).

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build (standalone output)
npm run start    # Start production server
npm run lint     # ESLint (next/core-web-vitals + next/typescript)
```

Docker: multi-stage build with `node:20-alpine`, standalone output on port 3000.

## Architecture

### Tech Stack
Next.js 15 (App Router) / React 19 / TypeScript 5 / Tailwind CSS 4 / Zustand 5 / Radix UI / shadcn/ui (new-york style, lucide icons)

### Key Paths
- `src/app/page.tsx` — Simulator entry point
- `src/app/settings/page.tsx` — Configurator (dev-only, gated by `isDev` from `src/config/env.js`)
- `src/app/api/` — Next.js API routes for persistence (config, terminal-config, presets, images, firmware, hints)
- `src/store/` — Zustand stores: `exerciseStore` (simulator runtime), `settingsStore` (configurator UI), `terminalSettingsStore` (terminal config draft, persisted), `presetStore` (preset CRUD)
- `src/data/exercise.ts` — Exercise type definitions + default exercise data + pin helpers
- `src/types/terminal-config.ts` — Full terminal config type system (commands, filesystem, boot stages, flags, constraints, output types)
- `src/types/preset.ts` — Preset type (bundles exerciseConfig + terminalConfig)
- `src/lib/terminal-*.ts` — Terminal engine: `TerminalConfigLoader` (config validation/caching), `CommandExecutor` (constraint checking + output generation), `terminal-filesystem.ts` (path resolution, file ops), `terminal-builtin-handlers.ts` (ls, cat, cd, etc.)
- `src/components/features/exercise/` — Simulator components (PCBViewer, Terminal, Multimeter, UartProbesAdapter, FirmwareDumper, etc.)
- `src/components/features/settings/` — Configurator components (SettingsCanvas, SettingsSidebar, popup editors)
- `src/components/ui/` — shadcn/ui primitives (button, dialog, alert-dialog, tooltip)
- `src/hooks/` — `useExerciseConfig` (loads exercise from API), `useTerminalConfig` (loads terminal config from localStorage with live reload)

### Data Flow
- **Presets** are stored as JSON files in `src/data/presets/` with an `index.json` manifest. Each preset bundles an `exerciseConfig` (Exercise) and `terminalConfig` (TerminalConfig[] or single config). Preset images are copied to `public/images/preset-{id}.{ext}`.
- **Config persistence**: API routes read/write to `src/data/` (exercise override) and `public/uploads/` (firmware, hints). The simulator reads config via `/api/config/load` on mount, then syncs terminal config from the active preset into localStorage.
- **Terminal config** flows: `terminalSettingsStore` (draft in configurator) → export as JSON → stored in preset → loaded into `localStorage[pcb-ctf-terminal-config]` → consumed by `useTerminalConfig` hook → fed to `Terminal.tsx` → processed by `TerminalConfigLoader` + `CommandExecutor`.

### Coordinate System
All PCB coordinates use percentages `[x, y, width, height]` relative to the PCB image, making overlays responsive regardless of image scaling.

### Import Alias
`@/*` maps to `./src/*` (configured in tsconfig.json).

## Important Patterns

- The `exerciseStore` manages step progression with three modes: `education` (description only), `active` (simulator enabled), `completed`. Objectives can be of type `component`, `uart`, `terminal`, `pin`, or `firmware-dump`.
- Terminal commands support multiple output types: `static`, `dynamic`, `conditional`, `template`, `script`, `lookup`. Commands can have constraints (path, permissions, prerequisites, arguments, state) and side effects (flag unlocks, state changes, stage transitions).
- The terminal supports multi-tab configurations (e.g., UART tab + Local Machine tab) and boot sequences with stages that auto-progress.
- The `/settings` page uses dirty tracking (reference comparison on content fields) to detect unsaved changes to the active preset.
- Protected PCB images (original assets) are never copied or deleted by the preset system.
