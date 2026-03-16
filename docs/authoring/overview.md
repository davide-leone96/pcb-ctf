# Authoring — Panoramica

## Cos'è la Modalità Authoring

La **modalità Authoring** è l'area di configurazione degli esercizi PCB-CTF, accessibile dalla route `/settings`. È riservata agli autori che progettano le sfide hardware: definiscono la PCB, gli obiettivi, il comportamento del terminale, gli strumenti personalizzati, e organizzano tutto in preset condivisibili.

A differenza della modalità Simulator (`/`), Settings non ha persistenza di sessione: lo stato dell'interfaccia viene perso al refresh della pagina. I dati reali (configurazione esercizio, terminal config, preset) vengono salvati su file system tramite le API.

---

## Interfaccia

L'interfaccia di Settings è divisa in due sezioni affiancate:

### Sidebar Sinistra — 4 Tab

**Tab Init** — Inizializzazione della PCB:
- Caricamento immagine PCB
- Aggiunta/modifica/rimozione componenti hardware (`HardwareComponent`)
- Aggiunta/modifica/rimozione pin di misurazione (`MeasurementPin`)
- Aggiunta/modifica/rimozione pin UART (`UartPin`)

**Tab Challenge** — Progettazione dell'esercizio:
- Creazione step con titolo, descrizione, tool disponibili
- Creazione obiettivi (component, uart, terminal, pin, firmware-dump)
- Configurazione flag (`flagPart`), istruzioni, hint
- Gestione preset (salva, carica, esporta, importa)

**Tab Terminal** — Configurazione del terminale simulato:
- Definizione flag parts e flag completa
- Boot stages e boot sequence
- Tab terminale (UART Console, Local Machine) e comandi
- Filesystem virtuale
- Anteprima YAML della configurazione

**Tab Tools** — Custom tools:
- Creazione e modifica custom tools
- Configurazione probe (label, colore, connectivity)
- Output type (numeric, leds, connection-status, none, firmware-dump)
- Upload immagine tool

### Canvas Principale — Destra

Il canvas mostra l'immagine PCB con overlay interattivi:
- **Componenti draggabili** — posizionabili con drag-and-drop
- **Pin draggabili** — con indicatori visivi (cerchio/quadrato)
- **Popup obiettivi** — editor contestuale posizionato sulla canvas
- **Preview terminale** — pannello YAML + anteprima live

---

## Store di Stato

La modalità Settings usa tre store Zustand distinti:

| Store | File | Responsabilità |
|-------|------|----------------|
| `settingsStore` | `src/store/settingsStore.ts` | Stato UI: canvas transform, componenti/pin draft, popup attivi, custom tools draft |
| `terminalSettingsStore` | `src/store/terminalSettingsStore.ts` | Config terminale: tab, comandi, boot stages, filesystem, flag parts (persistito in localStorage) |
| `presetStore` | `src/store/presetStore.ts` | CRUD preset: carica, salva, esporta, importa, dirty tracking |

Il `presetStore` sottoscrive le modifiche di `settingsStore` e `terminalSettingsStore` per attivare il flag `isDirty` (asterisco `*` accanto al nome del preset) quando ci sono modifiche non salvate.

---

## Flusso di Salvataggio

```
Autore modifica config UI
        │
        ▼
settingsStore / terminalSettingsStore aggiornati
        │
        ▼
presetStore.isDirty = true  (* asterisco visibile)
        │  Autore clicca "Save"
        ▼
settingsStore.exportAsJson()
terminalSettingsStore.exportAsTerminalConfig()
        │
        ▼
POST /api/config/save  +  POST /api/terminal-config/save
        │
        ▼
Scritto su filesystem: src/data/exercise.override.json
        │
        ▼
localStorage aggiornato + StorageEvent emesso
        │
        ▼
Simulator ricarica config live (senza refresh pagina)
```

---

## Persistenza dei Dati

| Tipo dato | Dove viene salvato | Chiave/Path |
|-----------|-------------------|-------------|
| Configurazione PCB | File system | `src/data/exercise.override.json` |
| Configurazione terminale | File system via API | `/api/terminal-config/save` |
| Draft terminale editor | `localStorage` | `pcb-ctf-terminal-settings-draft` |
| Preset | File system | `src/data/presets/{id}.json` |
| ID preset attivo | `localStorage` | `pcb-ctf-active-preset` |

---

## Workflow Consigliato

1. **Carica immagine PCB** (tab Init)
2. **Posiziona componenti e pin** sulla canvas
3. **Configura step e obiettivi** (tab Challenge)
4. **Configura terminale** (tab Terminal): flag, comandi, boot stages, filesystem
5. **Aggiungi custom tools** se necessari (tab Tools)
6. **Salva come preset** per una gestione ordinata
7. **Testa nel simulatore** (`/`) verificando il comportamento end-to-end
8. **Itera** tornando a Settings per correzioni

---

## Sezioni Approfondite

- [Componenti e Pin](./components-pins.md) — Configurazione della PCB
- [Obiettivi](./objectives-config.md) — Step e obiettivi
- [Terminale](./terminal-config/setup.md) — Sistema terminale
- [Custom Tools](./custom-tools.md) — Strumenti personalizzati
- [Preset](./presets.md) — Gestione preset
