# Terminal Config — Setup e Struttura

## Panoramica

La **Terminal Config** e' la configurazione che definisce l'intero comportamento del terminale simulato: quali tab esistono, come si avvia il boot, quali comandi sono disponibili, il filesystem virtuale, e quali flag si sbloccano.

E' gestita dal `terminalSettingsStore` (`src/store/terminalSettingsStore.ts`), l'unico store con persistenza automatica tramite il middleware `persist` di Zustand.

**LocalStorage key draft**: `pcb-ctf-terminal-settings-draft`

Quando l'autore clicca "Apply", la configurazione viene serializzata e scritta in `localStorage` sotto la chiave `pcb-ctf-terminal-config`. Un `StorageEvent` viene emesso, che il simulatore ascolta per ricaricare la configurazione live senza refresh di pagina.

---

## Struttura Completa della TerminalConfig

```typescript
interface TerminalConfig {
  metadata?: {
    name?: string;
    description?: string;
    version?: string;
  };
  tabs: TabConfig[];                           // tab terminale (UART, Local Machine, ...)
  flags?: FlagSystem;                          // sistema flag
  globalCommands?: CommandDefinition[];        // comandi globali a tutte le tab
  customFunctions?: Record<string, string>;    // funzioni JS per handler 'dynamic'
}
```

---

## Tab Terminale (`TabConfig`)

Ogni tab rappresenta una "macchina" separata con il proprio filesystem e set di comandi:

```typescript
interface TabConfig {
  id: string;
  name: string;
  commands: CommandDefinition[];
  filesystem?: FilesystemStructure;
  bootSequence?: BootSequence;
  environment?: Record<string, string>;
}
```

### Le Due Tab Standard

**UART Console** (`id: 'uart'`): connessione seriale al dispositivo embedded, tema verde. Contiene la boot sequence e i comandi U-Boot/Linux.

**Local Machine** (`id: 'local'`): macchina dell'analista, tema blu. Contiene strumenti di analisi offline (hashcat, binwalk, strings, ecc.).

Nell'editor, "+ Add Tab" permette di creare tab aggiuntive con ID e configurazione personalizzati.

---

## Flag Parts

I **Flag Parts** sono i frammenti della flag sbloccabili tramite comandi del terminale:

```typescript
interface FlagPart {
  id: string;    // es. "b00t" — usato come riferimento in unlockFlags e bootStageConditions
  value: string; // es. "b00t" — testo del frammento
  hint?: string;
}
```

L'`id` del FlagPart deve corrispondere a quanto specificato in `sideEffects.unlockFlags` nei comandi e in `bootStageConditions.unlockedFlags` negli obiettivi di tipo `terminal`.

---

## Boot Stages (`BootStage`)

I boot stages definiscono la sequenza di avvio della tab UART:

```typescript
interface BootStage {
  id: string;
  lines: string[];      // righe di output da mostrare in sequenza
  delayMs?: number;     // ms tra una riga e la successiva (default: 50)
  isFinal?: boolean;    // se true, al termine compare il prompt interattivo
}
```

---

## Environment Variables

Ogni tab puo' avere variabili di ambiente usabili nei comandi con output `template`:

```json
{
  "environment": {
    "USER": "root",
    "HOME": "/root",
    "HOSTNAME": "router"
  }
}
```

---

## Applicare la Configurazione

Il pulsante "Apply" chiama `applyTerminalConfig()` nel `terminalSettingsStore`:

```typescript
applyTerminalConfig: () => {
  const config = get().exportAsTerminalConfig();
  localStorage.setItem('pcb-ctf-terminal-config', JSON.stringify(config));
  window.dispatchEvent(new StorageEvent('storage', {
    key: 'pcb-ctf-terminal-config',
    newValue: JSON.stringify(config),
  }));
}
```

---

## Sezioni Correlate

- [Comandi](./commands.md) — Definire comandi e output
- [Filesystem](./filesystem.md) — Struttura del filesystem virtuale
- [Boot Sequences](./boot-sequences.md) — Sequenza di avvio
- [Flag e Sblocchi](./flags.md) — Sistema di flag

---

## Riferimenti

- **Store**: `src/store/terminalSettingsStore.ts`
- **Tipi**: `src/types/terminal-config.ts`
- **Config loader runtime**: `src/lib/terminal-config-loader.ts`
