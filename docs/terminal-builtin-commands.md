# Comandi Built-in del Terminale

Questo documento descrive il funzionamento dei comandi **built-in hardcoded** del terminale simulato: cosa fanno, come interagiscono con il filesystem virtuale e come si differenziano dai comandi custom configurabili.

---

## Architettura: built-in vs custom

Il `CommandExecutor` distingue due categorie di comandi in base al campo `handler` nella definizione del comando:

| `handler` | Da dove viene l'output |
|-----------|------------------------|
| `'builtin'` | Funzione TypeScript hardcoded in `terminal-builtin-handlers.ts` — calcola l'output dinamicamente dal filesystem/environment virtuale |
| `'custom'` | Il campo `output` configurato nel pannello settings (testo statico, template, lookup table, ecc.) |
| `'dynamic'` | Funzione custom registrata via `registerCustomFunction()` |
| `'script'` | Come `dynamic`, con firma diversa |

Per i comandi built-in il campo `output` nella configurazione viene **ignorato completamente**. L'output è sempre generato dal codice.

### Flusso di esecuzione

```
executeCmd(input)
  └─ configLoader.getCommand(tabId, commandName)   → CommandDefinition
       └─ executor.executeCommand(def, context)
            ├─ validateConstraints(def.constraints, context)   ← vincoli ancora attivi
            ├─ switch(def.handler)
            │    case 'builtin' → executeBuiltinCommand(def, context)
            │         └─ builtinHandlers.get(def.builtinType)(context)
            │    case 'custom'  → generateOutput(def.output, context)
            └─ applySideEffects(def, context)                  ← side effects ancora attivi
```

I **constraints** e i **sideEffects** configurati nel pannello settings funzionano normalmente anche per i comandi built-in. Solo l'output viene ignorato.

---

## Il filesystem virtuale

Tutti i comandi built-in operano su una struttura `FilesystemStructure` che vive interamente in memoria:

```typescript
interface FilesystemStructure {
  directories: Record<string, string[]>;  // path → lista nomi figli
  files: Record<string, FileNode | string>;  // path → contenuto o nodo completo
}
```

Le directory e i file vengono definiti nel pannello **Terminal → Filesystem**. Il filesystem è **per tab**: ogni tab del terminale ha il proprio filesystem indipendente.

### `FilesystemStructure` in pratica

```
directories: {
  "/":           ["bin", "etc", "root", "tmp"],
  "/root":       ["firmware.bin", "notes.txt"],
  "/etc":        ["passwd"],
  "/bin":        ["busybox"],
}

files: {
  "/root/notes.txt":    "Ricordati di cambiare la password!",
  "/etc/passwd":        { content: "root:x:0:0:root:/root:/bin/sh", permissions: "-rw-r--r--", owner: "root" },
  "/bin/busybox":       { content: null, permissions: "-rwxr-xr-x", size: 1048576 },
}
```

Le **entries delle directory** vengono calcolate come unione tra:
- Le voci esplicite in `directories[path]` (per includere voci virtuali, es. `/bin/busybox`)
- Le voci auto-calcolate scansionando le chiavi di `directories` e `files` (così non serve aggiornarle manualmente)

---

## Comandi built-in disponibili

### `ls` — Lista directory

```
ls [opzioni] [path]
```

**Implementazione:** legge le entry della directory target via `getDirectoryEntries()`.

| Argomento / Flag | Comportamento |
|-----------------|---------------|
| *(nessuno)* | Lista la directory corrente |
| `path` | Lista la directory o mostra il file specificato |
| `-l` | Formato lungo: `permessi owner size data nome` |
| `-a` | Include voci nascoste (aggiunge `.` e `..`) |
| `-la` / `-al` | Combina entrambi |

**Formato lungo** (`ls -l`): per ogni voce mostra `permissions`, `owner`, `size`, `modified` letti dal `FileNode`. Se non specificati nel config, usa valori di default (`-rw-r--r--`, `root`, `0`, `Jan  1 00:00`).

**Errori:**
- `ls: cannot access 'x': No such file or directory` — path non esiste nel filesystem virtuale

---

### `cd` — Cambia directory

```
cd [path]
```

**Implementazione:** verifica che il path esista e sia una directory, poi restituisce un array vuoto. Il cambio di path viene effettivamente applicato dal componente terminal che intercetta il `sideEffect.stateChanges.currentPath` (oppure, nel caso del builtin, tramite il codice di `executeCmd` in `TerminalPreviewPanel`/`Terminal.tsx`).

| Caso | Output |
|------|--------|
| Path valido | `[]` (nessun output), il prompt si aggiorna |
| Path inesistente | `cd: x: No such file or directory` |
| Path è un file | `cd: x: Not a directory` |
| *(nessun argomento)* | Naviga a `/root` |

**Supporta:** path relativi (`cd ../etc`), path assoluti (`cd /root`), home shorthand (`cd ~` → `/root`), `..` multipli (`cd ../../bin`).

---

### `pwd` — Mostra directory corrente

```
pwd
```

Restituisce semplicemente `context.currentPath`. Non ha argomenti né flags.

---

### `cat` — Mostra contenuto file

```
cat file1 [file2 ...]
```

**Implementazione:** per ogni argomento chiama `getFileContent(path, filesystem)`.

| Caso | Output |
|------|--------|
| File con contenuto | Contenuto testuale del file |
| File con `content: null` | `cat: x: Permission denied` |
| Path inesistente | `cat: x: No such file or directory` |
| Path è directory | `cat: x: Is a directory` |
| Più file | Output concatenato, uno dopo l'altro |

Il contenuto dei file può includere newline (`\n`) che vengono renderizzati come righe separate nel terminale.

---

### `grep` — Ricerca pattern nei file

```
grep pattern file1 [file2 ...]
```

**Implementazione:** applica una `RegExp` al contenuto di ogni file tramite `grepFiles()`.

| Caso | Output |
|------|--------|
| Match trovati (1 file) | Le righe che contengono il pattern |
| Match trovati (N file) | `nomefile:riga` per ogni match |
| Nessun match | *(output vuoto)* |
| Meno di 2 argomenti | `Usage: grep [options] pattern [file...]` |
| File inesistente | *(saltato silenziosamente)* |

**Attenzione:** il `pattern` viene interpretato come **espressione regolare**. Caratteri come `.`, `*`, `(` hanno significato speciale.

> Attualmente non supporta `-i` (case insensitive), `-n` (line numbers) o `-r` (ricorsivo) dall'input utente — queste opzioni sono parse-ready nel codice ma non esposte nei flag.

---

### `find` — Cerca file nel filesystem

```
find [path] [-name pattern] [-type f|d]
```

**Implementazione:** ricerca ricorsiva a partire dal path dato tramite `findFiles()`.

| Opzione | Comportamento |
|---------|---------------|
| *(nessun path)* | Parte dalla directory corrente |
| `-name pattern` | Filtra per nome. Supporta glob `*` (→ `.*`) e `?` (→ `.`) |
| `-type f` | Solo file |
| `-type d` | Solo directory |
| Combinati | Applica entrambi i filtri |

**Output:** una riga per ogni path trovato, incluso il path di partenza se corrisponde ai filtri.

**Errore:** `find: 'x': No such file or directory` se il path iniziale non esiste.

---

### `clear` — Pulisce lo schermo

```
clear
```

Restituisce la stringa speciale `['__CLEAR__']`. Il componente terminal intercetta questo marker e svuota l'array `history` del tab corrente. Equivalente a `Ctrl+L`.

---

## Funzioni custom registrate

Oltre ai built-in puri, due funzioni sono registrate come **custom functions** tramite `executor.registerCustomFunction()` e usate dai comandi `file` e `strings` tramite handler `dynamic`:

### `getFileType` — Fallback per il comando `file`

Usata come output di fallback quando la **lookup table** del comando `file` non ha una entry per l'argomento dato.

**Logica di rilevamento:**
1. Se il path non esiste → `x: cannot open (No such file or directory)`
2. Se è una directory → `x: directory`
3. Se il contenuto inizia con `#!/bin/sh` o `#!/bin/bash` → `x: Bourne-Again shell script, ASCII text executable`
4. Se ha contenuto → `x: ASCII text`
5. Altrimenti → `x: data`

> Per file binari (firmware, immagini, ecc.) è consigliabile aggiungere una entry nella **lookup table** del comando `file` nel config, in modo da restituire un output preciso (es. `firmware.bin: ELF 32-bit LSB executable, ARM`).

### `getStringsOutput` — Fallback per il comando `strings`

Usata come fallback quando la lookup table del comando `strings` non ha una entry per l'argomento.

**Comportamento:** estrae le righe non vuote dal contenuto del file (max 20 righe). Per file binari con contenuto testuale simulato, questo produce un output plausibile. Per file con `content: null` o path inesistente restituisce un errore.

> Anche qui, per output controllato e realistico, è meglio popolare la lookup table nel config con le stringhe che si vuole che lo studente trovi.

---

## Constraints: come limitare i built-in

I comandi built-in rispettano tutti i vincoli configurabili. Esempi utili:

### Rendere `cat` disponibile solo in una certa directory
```yaml
cat:
  handler: builtin
  builtinType: cat
  constraints:
    path:
      type: startsWith
      value: /root/challenge
      errorMessage: "cat: permission denied"
```

### Rendere `strings` disponibile solo dopo aver scoperto un flag
```yaml
strings:
  handler: dynamic
  output:
    type: dynamic
    generator: getStringsOutput
  constraints:
    prerequisites:
      flags: [flag-part-1]
      errorMessage: "strings: command not found"
```

### Rendere `find` disponibile solo in una fase di boot specifica
```yaml
find:
  handler: builtin
  builtinType: find
  constraints:
    state:
      bootStage: shell
      errorMessage: "find: command not found"
```

---

## Come aggiungere un nuovo comando built-in

1. Scrivere la funzione handler in [terminal-builtin-handlers.ts](../src/lib/terminal-builtin-handlers.ts):
   ```typescript
   function handleXxx(context: CommandContext): string[] {
     // ...
     return ['output lines'];
   }
   ```

2. Registrarla in `registerBuiltinHandlers()`:
   ```typescript
   executor.registerBuiltinHandler('xxx', handleXxx);
   ```

3. Nel config (YAML o settings), definire il comando con:
   ```yaml
   xxx:
     handler: builtin
     builtinType: xxx
     description: "Descrizione"
   ```

Il campo `builtinType` è il nome con cui il handler è stato registrato. Se omesso, viene usato `command.name`.
