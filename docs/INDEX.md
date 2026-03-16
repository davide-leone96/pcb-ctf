# PCB-CTF Documentation

Benvenuto nella documentazione completa di **PCB-CTF**, una piattaforma educativa per CTF (Capture The Flag) basata su simulazione di hardware.

## 📚 Indice Principale

### [Getting Started](./getting-started/)
Inizia da qui se sei nuovo a PCB-CTF.
- [Installation & Setup](./getting-started/installation.md) — Come installare e configurare l'ambiente
- [First Exercise](./getting-started/first-exercise.md) — La tua prima esperienza con il simulatore
- [Quick Tutorial](./getting-started/quick-tutorial.md) — Tutorial veloce sulle funzionalità principali

### [Simulator Guide](./simulator/)
Guida completa al simulatore PCB-CTF.
- [Overview](./simulator/overview.md) — Panoramica del simulatore
- [Tools](./simulator/tools/) — Strumenti disponibili
  - [Multimeter](./simulator/tools/multimeter.md) — Uso del multimetro
  - [UART Probes](./simulator/tools/uart-probes.md) — Connessione seriale UART
  - [Magnifier](./simulator/tools/magnifier.md) — Lente d'ingrandimento
  - [Custom Tools](./simulator/tools/custom-tools.md) — Strumenti personalizzati
- [Objectives & Challenges](./simulator/objectives.md) — Sistema di obiettivi
- [Terminal Emulator](./simulator/terminal.md) — Terminale interattivo (pipeline, comandi builtin, flag unlock, boot sequence)
- [UI Guide](./simulator/ui-guide.md) — Navigazione dell'interfaccia

### [Authoring Guide](./authoring/)
Come creare e configurare esercizi PCB-CTF.
- [Overview](./authoring/overview.md) — Introduzione all'authoring
- [Creating Exercises](./authoring/exercises.md) — Creazione di esercizi
  - [PCB Components & Pins](./authoring/components-pins.md) — Configurazione PCB
  - [Objectives](./authoring/objectives-config.md) — Definizione obiettivi
  - [Flag System](./authoring/terminal-config/flags.md) — Sistema di flag
- [Terminal Configuration](./authoring/terminal-config/) — Configurazione terminale
  - [Setup & Basics](./authoring/terminal-config/setup.md)
  - [Commands Definition](./authoring/terminal-config/commands.md)
  - [Virtual Filesystem](./authoring/terminal-config/filesystem.md)
  - [Boot Sequences](./authoring/terminal-config/boot-sequences.md)
  - [Flags & Unlocks](./authoring/terminal-config/flags.md)
- [Custom Tools](./authoring/custom-tools.md) — Creazione di strumenti personalizzati
- [Presets](./authoring/presets.md) — Gestione dei preset

### [Use Cases](./use-cases/)
Esempi e scenari di utilizzo reali.
- [Use Case 1: Bootloader Analysis](./use-cases/bootloader-analysis.md)
- [Use Case 2: UART Exploitation](./use-cases/uart-exploitation.md)
- [Use Case 3: Firmware Extraction](./use-cases/firmware-extraction.md)

### [Architecture & Design](./architecture/)
Documentazione tecnica approfondita.
- [System Overview](./architecture/overview.md) — Architettura generale
- [Technology Stack](./architecture/technology-stack.md) — Tecnologie adottate e motivazioni
- [Design Decisions](./architecture/design-decisions.md) — Scelte architetturali e rationale
- [Store Architecture](./architecture/stores.md) — Gestione dello stato con Zustand
- [Terminal System](./architecture/terminal-system.md) — Come funziona il terminale
- [Data Flow](./architecture/data-flow.md) — Flusso dati tra componenti
- [Coordinate System](./architecture/coordinates.md) — Sistema di coordinate
- [Type System](./architecture/types.md) — Tipi principali
- [Security Model](./architecture/security-model.md) — Modello di sicurezza
- [Pedagogical Approach](./architecture/pedagogical-approach.md) — Approccio pedagogico

### [Related Work](./related-work.md)
Confronto con piattaforme esistenti (HackTheBox, TryHackMe, CTFd, DVRF).

### [API Reference](./api-reference/)
Documentazione degli endpoint API.
- [Overview](./api-reference/overview.md) — Introduzione agli API
- [Config API](./api-reference/config.md) — `/api/config/*`
- [Terminal Config API](./api-reference/terminal-config.md) — `/api/terminal-config/*`
- [Presets API](./api-reference/presets.md) — `/api/presets/*`
- [Images API](./api-reference/images.md) — `/api/images/*`
- [Firmware API](./api-reference/firmware.md) — `/api/firmware/*`

### [Troubleshooting & FAQ](./troubleshooting.md)
Domande frequenti e risoluzione dei problemi.

---

## 🎯 Naviga per Ruolo

**Sono uno studente che vuole imparare:**
1. Leggi [Getting Started](./getting-started/first-exercise.md)
2. Esplora il [Simulator Guide](./simulator/)
3. Prova i [Use Cases](./use-cases/)

**Sono un autore di esercizi:**
1. Leggi [Authoring Overview](./authoring/overview.md)
2. Segui [Creating Exercises](./authoring/exercises.md)
3. Consulta [Terminal Configuration](./authoring/terminal-config/)
4. Dai un'occhiata ai [Use Cases](./use-cases/) per l'ispirazione

**Sono uno sviluppatore che mantiene PCB-CTF:**
1. Leggi [Architecture Overview](./architecture/overview.md)
2. Approfondisci [Terminal System](./architecture/terminal-system.md)
3. Consulta [API Reference](./api-reference/)
4. Guarda il [README.md](../README.md) di progetto

---

## 📖 Versione e Info

- **Versione App:** 0.1.0
- **Stack:** Next.js 15, React 19, TypeScript, Zustand, Tailwind CSS, Radix UI
- **Repository:** [PCB-CTF GitHub](https://github.com/yourusername/pcb-ctf)
- **Ultimo Aggiornamento:** 2026-03-07

