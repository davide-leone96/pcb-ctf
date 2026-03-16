# Terminal Emulator

## Panoramica

Il **Terminal** è un emulatore di terminale completamente client-side che simula l'interfaccia a riga di comando di un dispositivo embedded collegato via UART. Non viene eseguita nessuna shell reale: ogni comportamento — boot sequence, comandi, filesystem, output — è definito dichiarativamente in un file di configurazione JSON e interpretato interamente nel browser.

L'architettura a simulazione pura permette agli autori di controllare con precisione l'esperienza dello studente: ogni comando produce esattamente l'output previsto, i flag si sbloccano in risposta a comandi specifici, e il filesystem virtuale è navigabile con comandi standard (`ls`, `cd`, `cat`, `grep`, `find`).

Il terminale è attivato selezionando lo strumento **Terminal** dalla sidebar degli strumenti. Quando attivo, sostituisce visualmente il `PCBViewer` nell'area principale dell'interfaccia:

```tsx
// In page.tsx — mutually exclusive rendering
{activeTool === 'terminal' ? <Terminal … /> : <PCBViewer … />}
```

---

## Architettura a Due Tab

Il terminale è organizzato in **due tab indipendenti**, ognuna con la propria cronologia, directory corrente, filesystem e set di comandi:

```
┌─ UART Console ─────┬─ Local Machine ────┐
│  (green theme)     │  (blue theme)      │
│                    │                    │
│  Connessione UART  │  Macchina locale   │
│  al device target  │  dell'analista     │
└────────────────────┴────────────────────┘
```

### UART Console (tema verde)

Rappresenta la connessione seriale al dispositivo embedded tramite adattatore UART-USB. Simula:

- Boot sequence (bootloader U-Boot + kernel Linux)
- Shell di root sul dispositivo (`root@router:~#`)
- Filesystem del router (partizioni, configurazioni, logs)
- Comandi Linux (`ls`, `cat`, `grep`, `find`, `dd`, ecc.)

### Local Machine (tema blu)

Rappresenta la macchina dell'analista (tipicamente Kali Linux). Simula:

- Strumenti di analisi offline (`binwalk`, `strings`, `hashcat`, `john`)
- Operazioni sul firmware estratto
- Network utilities (`nc`, `nmap`, ecc.)

### Persistenza dello Stato tra Cambi Tool

Lo stato di ciascuna tab (cronologia output, directory corrente, history comandi digitati) sopravvive al cambio di strumento attivo. Questo avviene tramite **variabili di modulo** in `Terminal.tsx`, che persistono tra i re-render React:

```typescript
// In Terminal.tsx — module-level variables (survive React remounts)
let persistedUartHistory: TerminalLine[] = [];
let persistedLocalHistory: TerminalLine[] = [];
let persistedUartPath: string = '/';
let persistedLocalPath: string = '/home/kali';
let persistedUartCommandHistory: string[] = [];
let persistedLocalCommandHistory: string[] = [];
```

Quando l'utente passa da `terminal` a `multimeter` e poi torna a `terminal`, trova la sessione esattamente com'era.

---

## Boot Sequence

All'apertura del terminale, viene eseguita automaticamente la **boot sequence** della tab UART Console. Si tratta di un'animazione che riproduce il processo di avvio di un dispositivo embedded.

### Struttura della Boot Sequence

La sequenza è divisa in **boot stages** configurabili. Ogni stage ha:
- Un ID univoco
- Un array di righe di output da mostrare
- Un delay tra una riga e la successiva
- Un flag che indica se è l'ultimo stage (che porta al prompt interattivo)

```typescript
interface BootStage {
  id: string;
  lines: string[];          // righe da visualizzare
  delayMs?: number;         // ms tra una riga e la successiva (default: 50ms)
  isFinal?: boolean;        // se true, al termine appare il prompt
}
```

### Animazione

Il processo di animazione usa `setInterval` e `setTimeout` per mostrare le righe una alla volta, simulando l'output progressivo di un terminale reale:

```
U-Boot 1.1.4-g4e19bcd0-dirty (Jan 1 2024 - 00:00:00)
AP121 (ar9330) U-Boot
DRAM:  64 MB
Flash: 8 MB
...
Hit any key to stop autoboot:  1
```

### Interruzione del Boot

Se la configurazione prevede una finestra di interruzione (`interruptible: true`), lo studente può premere un tasto entro la finestra temporale (tipicamente 4 secondi) per fermarsi al prompt del bootloader:

```
Hit any key to stop autoboot:  3 2 1 0
ar7100>
```

Se non interrotto, la sequenza prosegue con il boot del kernel e porta al prompt della shell Linux:

```
Starting kernel ...
Linux version 2.6.31
...
root@router:~#
```

---

## Pipeline di Esecuzione dei Comandi

Ogni volta che l'utente preme Invio, il comando attraversa una pipeline rigida implementata in `TerminalCommandExecutor`:

```
Input utente
    │
    ▼
1. Parse del comando (nome + argomenti)
    │
    ▼
2. Ricerca CommandDefinition nella tab corrente
    │
    ├─ Non trovato → output "command not found"
    │
    ▼
3. Validazione dei constraints
    │
    ├─ path: directory corrente non corrisponde → errore
    ├─ permissions: permessi insufficienti → errore
    ├─ prerequisites: flag richiesti non ancora scoperti → errore
    ├─ arguments: argomenti mancanti/non validi → errore
    └─ state: condizione sullo stato dell'esercizio → errore
    │
    ▼
4. Esecuzione dell'handler
    │
    ├─ builtin: ls, cd, cat, grep, find, pwd, clear
    ├─ static: output fisso dalla config
    ├─ dynamic: output generato da funzione JS
    ├─ conditional: output scelto in base a condizioni
    ├─ template: output con variabili interpolate
    ├─ script: sequenza di sotto-comandi
    └─ lookup: ricerca in tabella
    │
    ▼
5. Side effects
    │
    ├─ unlockFlags: scoperta flag → addTerminalDiscovery()
    ├─ setState: aggiornamento stato filesystem/terminale
    └─ executeCommand: esecuzione automatica di altri comandi
    │
    ▼
Output visualizzato + Flag Panel aggiornato
```

---

## Comandi Builtin

I comandi builtin sono implementati in JavaScript puro in `src/lib/terminal-builtin-handlers.ts` e operano sul filesystem virtuale della tab corrente:

| Comando | Sintassi | Descrizione |
|---------|----------|-------------|
| `ls` | `ls [-la] [path]` | Elenca il contenuto di una directory. Supporta flag `-l` (formato long) e `-a` (mostra file nascosti). |
| `cd` | `cd [path]` | Cambia directory corrente. Supporta percorsi assoluti (`/etc`), relativi (`../boot`), e `~` per la home. |
| `pwd` | `pwd` | Mostra il percorso assoluto della directory corrente. |
| `cat` | `cat <file>` | Mostra il contenuto di un file. Restituisce errore se il file non esiste o il path è una directory. |
| `grep` | `grep <pattern> <file>` | Cerca righe contenenti il pattern nel file specificato. Case-sensitive di default. |
| `find` | `find [path] [-name <pattern>]` | Cerca ricorsivamente file e directory. Supporta wildcard (`*.txt`). |
| `clear` | `clear` | Pulisce la cronologia visualizzata nel terminale. |

### Filesystem Virtuale

Il filesystem è una struttura ad albero definita nella configurazione della tab. Supporta il formato shorthand `tree`:

```json
{
  "tree": {
    "/": {
      "etc": {
        "passwd": "root:x:0:0:root:/root:/bin/bash\nadmin:x:1000:1000:...",
        "shadow": "root:$1$xyz...:...",
        "config": {
          "system": "admin_password=admin123\n"
        }
      },
      "root": {
        ".ssh": {
          "authorized_keys": "ssh-rsa AAAA..."
        },
        "flag.txt": "CTF{hardware_pwned}"
      },
      "tmp": {}
    }
  }
}
```

`TerminalConfigLoader` normalizza questo formato in strutture piatte `directories` e `files` prima dell'uso.

---

## Comandi Custom

Oltre ai builtin, ciascuna tab può definire comandi personalizzati specifici dell'esercizio. Un `CommandDefinition` completo:

```typescript
interface CommandDefinition {
  name: string;               // nome esatto del comando (es. "printenv bootargs")
  handler: 'custom'           // tipo handler
    | 'builtin'
    | 'dynamic'
    | 'script'
    | 'lookup';
  builtinType?: string;       // per handler 'builtin': 'ls'|'cd'|'cat'|'grep'|'find'|'pwd'|'clear'
  output?: CommandOutput;     // output statico, condizionale, template, lookup
  constraints?: CommandConstraints;
  sideEffects?: CommandSideEffects;
  description?: string;
}
```

### Tipi di Output

**Static** — output fisso:
```json
{
  "type": "static",
  "text": "bootargs=rootfstype=jffs2 mtdparts=spi0.0:256k(u-boot),64k(u-boot-env),6m(rootfs),1m(kernel),64k(ART)"
}
```

**Conditional** — output dipendente da condizioni sullo stato:
```json
{
  "type": "conditional",
  "conditions": [
    {
      "check": { "type": "flagDiscovered", "flagId": "uart_connected" },
      "output": { "type": "static", "text": "Connection established." }
    }
  ],
  "default": { "type": "static", "text": "No connection." }
}
```

**Template** — output con variabili interpolate dall'environment:
```json
{
  "type": "template",
  "template": "Welcome to {{hostname}}. Uptime: {{uptime}} seconds."
}
```

**Lookup** — output scelto da una tabella in base all'argomento:
```json
{
  "type": "lookup",
  "key": "arg0",
  "table": {
    "bootargs": "rootfstype=jffs2",
    "ipaddr": "192.168.1.1"
  }
}
```

**Script** — esecuzione sequenziale di sotto-comandi:
```json
{
  "type": "script",
  "commands": ["echo Starting...", "sleep 1", "echo Done."]
}
```

### Constraints

I constraint filtrano chi può eseguire un comando e in quali condizioni:

```typescript
interface CommandConstraints {
  path?: string;              // directory richiesta (es. "/root")
  permissions?: string[];     // permessi richiesti (es. ["root"])
  prerequisites?: string[];   // flag ID che devono essere già stati scoperti
  arguments?: ArgumentConstraint[];
  state?: StateConstraint;
}
```

Esempio — comando disponibile solo dalla directory `/tmp` e solo dopo aver scoperto il flag `uart_connected`:
```json
{
  "constraints": {
    "path": "/tmp",
    "prerequisites": ["uart_connected"]
  }
}
```

---

## Flag Unlock e Progressione

Il meccanismo di unlock dei flag avviene in due fasi distinte:

### Fase 1 — Side Effect nel Comando

Quando un comando ha `sideEffects.unlockFlags`, il `TerminalCommandExecutor` include i flag ID nel risultato:

```typescript
// In TerminalCommandExecutor — applySideEffects()
if (sideEffects?.unlockFlags) {
  result.newFlags = sideEffects.unlockFlags;
}
```

### Fase 2 — Propagazione all'exerciseStore

`Terminal.tsx` legge `result.newFlags` dopo ogni esecuzione e chiama `addTerminalDiscovery()` per ciascun flag:

```typescript
// In Terminal.tsx — executeCommand()
if (result.newFlags) {
  result.newFlags.forEach(flagId => {
    addTerminalDiscovery(flagId);
  });
}
```

### Fase 3 — Verifica Completamento Objective

`exerciseStore.addTerminalDiscovery()` controlla se l'objective corrente è di tipo `terminal` e se tutti i flag richiesti (`bootStageConditions.flatMap(c => c.unlockedFlags)`) sono stati scoperti:

```typescript
addTerminalDiscovery: (id) => {
  // Aggiunge a terminalDiscoveries (idempotente)
  const newDiscoveries = [...terminalDiscoveries, id];
  set({ terminalDiscoveries: newDiscoveries });

  // Controlla completamento objective
  const currentObj = exerciseData?.steps?.[currentStepIndex]?.objectives?.[currentObjectiveIndex];
  if (stepMode === 'active' && currentObj?.type === 'terminal') {
    const requiredFlags = (currentObj.bootStageConditions ?? [])
      .flatMap(c => c.unlockedFlags);
    if (requiredFlags.length > 0 && requiredFlags.every(f => newDiscoveries.includes(f))) {
      get()._completeCurrentObjective();
    }
  }
}
```

**Nota critica**: se `bootStageConditions` è un array vuoto, `requiredFlags` sarà vuoto e la condizione `requiredFlags.length > 0` sarà `false`. L'objective non si completa mai automaticamente in questo caso.

---

## Interazione Utente

### Input e Navigazione

- **Invio** — esegue il comando corrente
- **Freccia Su/Giù** — naviga nella history dei comandi digitati (per tab)
- **Tab** — completamento automatico (se configurato)
- **Ctrl+C** — annulla il comando corrente (se supportato dalla config)

### Output Multi-linea

L'output di un comando è visualizzato come array di `TerminalLine`, ciascuna con:
- `text` — contenuto testuale
- `type` — `'output' | 'input' | 'error' | 'system'` (determina il colore)

### Scrolling

L'area di output è scrollabile verticalmente. Dopo ogni comando, lo scroll si posiziona automaticamente all'ultima riga.

---

## Visualizzazione nel Simulatore

Il terminale è reso **inline nell'area principale** accanto alla sidebar degli strumenti. Non è un overlay fisso in basso.

La tab UART Console appare con un tema verde (colori tipici dei terminali seriali), mentre la tab Local Machine usa il tema blu standard.

La **flag panel** nell'angolo in alto a destra si aggiorna in tempo reale non appena un flag viene sbloccato tramite un comando del terminale.

---

## Relazione con il Sistema di Obiettivi

Un objective di tipo `terminal` si considera completato quando tutti i flag elencati nelle `bootStageConditions` dell'objective corrente vengono scoperti. La struttura:

```typescript
interface BootStageCondition {
  bootStageId: string;      // ID del boot stage (non usato a runtime)
  unlockedFlags: string[];  // flag part ID che devono essere scoperti
  hint: string;             // suggerimento per lo studente
}
```

Solo il campo `unlockedFlags` viene consumato dalla logica di completamento. I campi `bootStageId` e `hint` sono memorizzati ma non influenzano il completamento automatico.

---

## Riferimenti Tecnici

- **Componente principale**: `src/components/features/exercise/Terminal.tsx`
- **Executor**: `src/lib/terminal-command-executor.ts`
- **Config loader**: `src/lib/terminal-config-loader.ts`
- **Builtin handlers**: `src/lib/terminal-builtin-handlers.ts`
- **Filesystem utilities**: `src/lib/terminal-filesystem.ts`
- **Tipi**: `src/types/terminal-config.ts`
- **Store**: `src/store/exerciseStore.ts` → `addTerminalDiscovery()`
