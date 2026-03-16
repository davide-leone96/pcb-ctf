# Sistema Terminale - Documentazione Tecnica

## Panoramica

Il terminale di PCB-CTF e' un emulatore di shell **completamente client-side** scritto in TypeScript. Non viene eseguita nessuna istruzione di sistema reale: ogni comando, ogni file, ogni risposta e' definita dichiarativamente in una configurazione JSON caricata a runtime.

L'obiettivo progettuale e' simulare con fedelta' la sessione UART di un dispositivo embedded (nello scenario predefinito, un router TP-Link WR841N), consentendo agli studenti di esercitarsi in un ambiente controllato, riproducibile e privo di rischi.

---

## Architettura dei Componenti

Il sistema e' composto da quattro moduli principali, orchestrati dal componente React `Terminal.tsx`:

```
Terminal.tsx                      (src/components/features/exercise/Terminal.tsx)
    |
    +-- TerminalConfigLoader      (src/lib/terminal-config-loader.ts)
    |       Carica, valida e indicizza la configurazione
    |
    +-- CommandExecutor           (src/lib/terminal-command-executor.ts)
    |       Valida i vincoli ed esegue i comandi
    |
    +-- terminal-builtin-handlers (src/lib/terminal-builtin-handlers.ts)
    |       Implementazioni JS pure di ls, cd, cat, pwd, grep, find
    |
    +-- terminal-filesystem       (src/lib/terminal-filesystem.ts)
            Utility di path resolution e navigazione del filesystem virtuale
```

---

## TerminalConfigLoader

**File:** `src/lib/terminal-config-loader.ts`

La classe `TerminalConfigLoader` e' il punto di ingresso della configurazione. Riceve un oggetto `TerminalConfig` al costruttore e:

1. **Normalizza il filesystem** di ogni tab, convertendo il formato shorthand `tree` (oggetto annidato) nelle strutture piatte `directories` e `files` usate a runtime.
2. **Risolve i comandi**: applica i `defaultConstraints` di tab a ogni `CommandDefinition` tramite shallow merge, con precedenza al livello comando.
3. **Indicizza comandi e alias**: costruisce una `Map<tabId, Map<commandName, CommandDefinition>>` per lookup O(1).
4. **Espone API di accesso** per tab, filesystem, boot sequence e flag system.

### Normalizzazione del Filesystem

Il formato `tree` e' un oggetto JS annidato dove i valori stringa rappresentano file e i valori oggetto rappresentano directory:

```json
{
  "tree": {
    "etc": {
      "passwd": "root:x:0:0::/root:/bin/sh",
      "config": {}
    },
    "root": {
      "flag.txt": "b00t"
    }
  }
}
```

Il metodo privato `flattenTree()` traversa ricorsivamente questo albero costruendo path assoluti, distinguendo file (valore stringa) da directory (valore oggetto):

```typescript
private flattenTree(tree, basePath, directories, files): void {
  for (const [name, value] of Object.entries(tree)) {
    const fullPath = basePath === '/' ? `/${name}` : `${basePath}/${name}`;
    if (typeof value === 'string') {
      files[fullPath] = value;                        // stringa -> file
    } else if (value && typeof value === 'object') {
      directories[fullPath] = [];
      this.flattenTree(value, fullPath, directories, files);  // oggetto -> directory
    }
  }
}
```

Dopo l'appiattimento, `normalizeFilesystem()` espande ogni file-stringa in un oggetto `FileNode` completo con `permissions`, `owner`, `name` e `type`, applicando i valori di `fileDefaults` ove definiti.

### Merging dei Constraint

Ogni tab puo' definire `defaultConstraints` applicati a tutti i suoi comandi. I constraint a livello di singolo comando hanno precedenza in caso di conflitto (shallow merge):

```typescript
private mergeConstraints(defaults, command): CommandConstraints | undefined {
  if (!defaults) return command;
  if (!command) return { ...defaults };
  return { ...defaults, ...command };  // il livello comando vince
}
```

### Cache dei Comandi

All'inizializzazione, i `globalCommands` vengono inseriti nella mappa di ogni tab, dopodiché i comandi specifici della tab li sovrascrivono in caso di nome identico. Gli alias vengono registrati come entry aggiuntive nella stessa mappa, puntando alla stessa `CommandDefinition`.

---

## CommandExecutor

**File:** `src/lib/terminal-command-executor.ts`

La classe `CommandExecutor` implementa la pipeline di esecuzione di ogni singolo comando. Tutte le operazioni sono **sincrone**: non ci sono Promise, async/await o callback.

### Pipeline di Esecuzione

```
executeCommand(command, context)
    |
    +-- Step 1: validateConstraints()
    |       Verifica path, permissions, prerequisites, arguments, state
    |       Se fallisce -> { success: false, error: "..." }
    |
    +-- Step 2: Esecuzione handler
    |       'builtin'  -> executeBuiltinCommand()  (delega ai builtinHandlers registrati)
    |       'custom'   -> generateOutput()          (output dichiarativo)
    |       'dynamic'  -> executeDynamicCommand()   (chiama custom function con args)
    |       'script'   -> executeScriptCommand()    (chiama custom function senza args)
    |
    +-- Step 3: applySideEffects()
            Raccoglie newFlags, stateChanges, esegue customEffect
            Ritorna: { success, output: string[], sideEffects }
```

### Validazione dei Vincoli

Il metodo `validateConstraints()` controlla cinque categorie di vincoli nell'ordine in cui compaiono nel `CommandConstraints`. Al primo vincolo non soddisfatto, interrompe la catena e restituisce l'errore:

| Vincolo | Tipo TypeScript | Logica |
|---------|-----------------|--------|
| `path` | `PathConstraint` | Verifica che `context.currentPath` corrisponda (exact, contains, startsWith, regex). Supporta sia stringa singola che array di valori. |
| `permissions` | `PermissionConstraint` | Controlla `context.environment.USER` rispetto a `requireRoot` o `requireUser`. |
| `prerequisites` | `PrerequisiteConstraint` | Verifica la presenza di comandi nella history, file nel filesystem, o flag nei `discoveredFlags`. La condizione puo' essere `'all'` o `'any'`. |
| `arguments` | `ArgumentConstraint` | Controlla il numero di argomenti (`min`, `max`) e pattern regex per argomenti specifici. |
| `state` | `StateConstraint` | Verifica `context.bootStage` e variabili di stato arbitrarie in `context.state`. |

### Tipi di Output

Il sistema definisce sei tipi di output dichiarativi, tutti appartenenti all'unione `CommandOutput`:

**`StaticOutput`** — Restituisce una lista di stringhe fissa:
```typescript
{ type: 'static'; lines: string[] }
```

**`TemplateOutput`** — Interpola variabili nel template con la sintassi `{{variableName}}`. Le variabili possono essere `static` (valore fisso), `computed` (custom function), `random` (range numerico o lista di opzioni) o `state` (da `context.state`):
```typescript
{ type: 'template'; template: string; variables: Record<string, TemplateVariable> }
```

**`ConditionalOutput`** — Valuta condizioni `ConditionCheck` in sequenza, restituisce l'output del primo ramo soddisfatto. Le condizioni possono testare argomenti, path, esistenza di file, flag scoperti, variabili di stato, o funzioni custom:
```typescript
{ type: 'conditional'; conditions: Array<{ if: ConditionCheck; then: CommandOutput; else?: CommandOutput }>; default?: CommandOutput }
```

**`LookupOutput`** — Implementa una lookup table: fa corrispondere un argomento (per indice) a un set di righe tramite corrispondenza `equals`, `contains` o `regex`. Ha un output di default se nessuna entry corrisponde:
```typescript
{ type: 'lookup'; argIndex: number; matchType: 'contains'|'equals'|'regex'; table: Record<string, string[]>; default?: CommandOutput }
```

**`DynamicOutput`** — Delega a una custom function registrata, con argomenti aggiuntivi:
```typescript
{ type: 'dynamic'; generator: string; args?: any[] }
```

**`ScriptOutput`** — Delega a una custom function registrata senza argomenti aggiuntivi:
```typescript
{ type: 'script'; script: string }
```

### Side Effects e Sblocco Flag

Dopo l'esecuzione dell'handler, `applySideEffects()` elabora `command.sideEffects`. L'effetto piu' importante per il progresso dell'esercizio e' `unlockFlags`:

```typescript
for (const flagDef of command.sideEffects.unlockFlags) {
  if (typeof flagDef === 'string') {
    // Sblocco incondizionato: basta che il flag non sia gia' scoperto
    if (!context.discoveredFlags.includes(flagDef)) {
      newFlags.push(flagDef);
    }
  } else {
    // Sblocco condizionale: valuta flagDef.condition prima di sbloccare
    const shouldUnlock = flagDef.condition
      ? this.checkCondition(flagDef.condition, context)
      : true;
    if (shouldUnlock && !context.discoveredFlags.includes(flagDef.id)) {
      newFlags.push(flagDef.id);
    }
  }
}
```

I `newFlags` ritornati nel `CommandExecutionResult.sideEffects` sono consumati da `Terminal.tsx`.

---

## Terminal Builtin Handlers

**File:** `src/lib/terminal-builtin-handlers.ts`

I comandi built-in sono implementazioni JavaScript pure che replicano il comportamento dei corrispondenti comandi shell Unix. Sono registrati nel `CommandExecutor` tramite `registerBuiltinHandlers()`:

| Handler | Equivalente Unix | Descrizione |
|---------|-----------------|-------------|
| `ls` | `ls [-l] [-a] [path]` | Chiama `listDirectory()`. Riconosce i flag `-l`, `-a`, `-la`, `-al`. |
| `cd` | `cd [path]` | Risolve il path e verifica esistenza/tipo. Il cambio effettivo del path e' gestito da `Terminal.tsx`. |
| `pwd` | `pwd` | Ritorna `[context.currentPath]`. |
| `cat` | `cat [file...]` | Chiama `getFileContent()` per ogni argomento. Gestisce errori (directory, file assente, permessi). |
| `grep` | `grep pattern file...` | Chiama `grepFiles()` con pattern e path risolti. |
| `find` | `find [path] [-name p] [-type f\|d]` | Chiama `findFiles()` con filtri nome e tipo. |
| `clear` | `clear` | Ritorna `['__CLEAR__']`, stringa speciale riconosciuta dalla UI. |

Sono esposte anche due custom function per la registrazione esplicita in `Terminal.tsx`:

- **`getFileType(context)`**: Rileva il tipo di un file dal contenuto (cerca shebang `#!/bin/sh`). Usata come fallback dinamico per il comando `file`.
- **`getStringsOutput(context)`**: Estrae le righe non vuote dal contenuto di un file (fino a 20 righe). Usata come fallback per `strings`.

---

## Virtual Filesystem

**File:** `src/lib/terminal-filesystem.ts`

Il filesystem virtuale e' rappresentato da un oggetto `FilesystemStructure` con due mappe flat:

```typescript
interface FilesystemStructure {
  directories: Record<string, string[]>; // path assoluto -> lista entry (nomi)
  files: Record<string, FileNode | string>; // path assoluto -> FileNode o contenuto
}
```

Funzioni principali:

| Funzione | Descrizione |
|---------|-------------|
| `resolvePath(input, current)` | Risolve path relativi, assoluti, `~`, `..`, `.` in path assoluto. |
| `pathExists(path, fs)` | Restituisce `true` se il path esiste come directory o file. |
| `isDirectory(path, fs)` | Controlla se il path e' una directory. |
| `isFile(path, fs)` | Controlla se il path e' un file. |
| `getFileContent(path, fs)` | Restituisce il contenuto testuale di un file (o `null` se non accessibile). |
| `listDirectory(path, fs, opts)` | Genera l'output testuale del comando `ls` (formato short o long). |
| `findFiles(start, name, fs, opts)` | Ricerca ricorsiva con filtri su nome e tipo. |
| `grepFiles(pattern, paths, fs, opts)` | Cerca il pattern nelle righe dei file specificati. |

---

## Componente Terminal.tsx

**File:** `src/components/features/exercise/Terminal.tsx`

Il componente React `Terminal` e' l'orchestratore dell'intera UI. Gestisce due sessioni indipendenti — UART Console e Local Machine — con stato completamente separato.

### Persistenza tra Re-mount tramite Variabili di Modulo

Quando l'utente seleziona un altro strumento e poi torna al terminale, il componente viene smontato e rimontato. Per preservare la sessione, lo stato e' mantenuto in variabili a livello di modulo (al di fuori del componente):

```typescript
// Variabili module-level: sopravvivono ai re-mount del componente React
let persistedUartHistory: HistoryLine[] | null = null;
let persistedStage: string | null = null;
let persistedUartPath = '/';
let persistedUartCmdHistory: string[] = [];

let persistedLocalHistory: HistoryLine[] | null = null;
let persistedLocalPath = '/home/kali';
let persistedLocalCmdHistory: string[] = [];
```

All'inizializzazione, lo stato React viene precaricato da queste variabili; ad ogni aggiornamento, `useEffect` le sincronizza:

```typescript
useEffect(() => {
  persistedUartHistory = uartHistory;
  persistedStage = stage;
  persistedUartPath = uartPath;
  persistedUartCmdHistory = uartCmdHistory;
}, [uartHistory, stage, uartPath, uartCmdHistory]);
```

### Boot Sequence Animata

La boot sequence e' guidata da un sistema a stati (`stage: string`) che avanza attraverso le fasi definite in `BootSequence.stages`. Ogni fase (`BootStage`) ha:

- `lines`: righe da visualizzare in sequenza
- `duration`: durata totale in millisecondi per visualizzare tutte le righe
- `nextStage`: ID della fase successiva (assente per le fasi interattive)
- `prompt`: prompt da mostrare quando la fase e' attiva

L'animazione usa `setInterval` per distribuire le righe nell'arco di `duration` ms, poi avanza con `setTimeout`:

```typescript
const lineDelay = currentStage.duration / currentStage.lines.length;
bootAnimRef.current = setInterval(() => {
  if (lineIndex < currentStage.lines.length) {
    setUartHistory(prev => [...prev, { type: 'output', content: currentStage.lines[lineIndex] }]);
    lineIndex++;
  } else {
    clearInterval(bootAnimRef.current);
    if (currentStage.nextStage) {
      bootTimerRef.current = setTimeout(() => setStage(currentStage.nextStage!), 500);
    }
  }
}, lineDelay);
```

### Costruzione del CommandContext

Al momento dell'esecuzione di un comando, `Terminal.tsx` assembla il `CommandContext` raccogliendo lo stato da piu' sorgenti:

```typescript
const context: CommandContext = {
  command: commandName,
  args: parts.slice(1),
  currentPath: isUart ? uartPath : localPath,
  filesystem: configLoader.getFilesystem(tabId)!,
  environment: configLoader.getEnvironment(tabId),
  bootStage: stage,
  discoveredFlags: terminalDiscoveries,    // da exerciseStore
  history: isUart ? uartCmdHistory : localCmdHistory,
  state: {},
  tab: tabId,
};
```

### Propagazione dei Flag Scoperti

Dopo ogni esecuzione, i flag sbloccati vengono propagati allo store globale:

```typescript
const discoverFlag = useCallback((flagId: string) => {
  if (terminalDiscoveries.includes(flagId)) return;  // idempotente
  addTerminalDiscovery(flagId);
}, [terminalDiscoveries, addTerminalDiscovery]);

// Nel loop post-esecuzione:
if (result.sideEffects?.newFlags) {
  for (const flagId of result.sideEffects.newFlags) {
    discoverFlag(flagId);
  }
}
```

---

## Flusso End-to-End: Dal Comando al Flag

Il seguente diagramma illustra il percorso completo dall'input dell'utente all'aggiornamento della UI:

```
1. Utente digita "cat /root/flag.txt" e preme Enter
           |
           v
2. Terminal.tsx: executeCommand("cat /root/flag.txt")
   - Parsing: command="cat", args=["/root/flag.txt"]
   - Costruisce CommandContext (path, fs, env, bootStage, flags, history)
           |
           v
3. configLoader.getCommand('uart', 'cat')
   - Lookup O(1) nella commandsCache Map
   - Ritorna CommandDefinition { handler: 'builtin', builtinType: 'cat' }
           |
           v
4. executor.executeCommand(commandDef, context)
   a. validateConstraints() -> { valid: true }   (nessun vincolo sul comando cat)
   b. executeBuiltinCommand() -> handleCat(context)
      - resolvePath("/root/flag.txt", "/root") -> "/root/flag.txt"
      - pathExists() -> true
      - isDirectory() -> false
      - getFileContent("/root/flag.txt", filesystem) -> "b00t"
      - Ritorna ["b00t"]
   c. applySideEffects() -> { newFlags: ["boot_flag"] }
           |
           v
5. Terminal.tsx riceve CommandExecutionResult:
   - Appende alla history: { type: 'output', content: 'b00t' }
   - Itera result.sideEffects.newFlags: ["boot_flag"]
   - Chiama discoverFlag("boot_flag") -> addTerminalDiscovery("boot_flag")
           |
           v
6. exerciseStore.addTerminalDiscovery("boot_flag")
   - Aggiorna terminalDiscoveries: [...prev, "boot_flag"]
   - Controlla bootStageConditions dell'objective corrente
   - Se tutti i flag richiesti sono scoperti: _completeCurrentObjective()
           |
           v
7. FlagDisplay legge terminalDiscoveries dallo store
   - Aggiorna la visualizzazione del flag progressivo
   - "b00t" appare nella UI
```

---

## Struttura dei Tipi Principali

### TerminalConfig

```typescript
interface TerminalConfig {
  metadata: { version: string; name: string; description: string; author?: string; };
  tabs: TabConfig[];                          // Almeno una tab richiesta
  flags?: FlagSystem;                         // Sistema di flag opzionale
  globalCommands?: Record<string, CommandDefinition>; // Comandi in tutti i tab
  customFunctions?: Record<string, string>;   // Funzioni JS custom (nome -> sorgente)
}
```

### TabConfig

```typescript
interface TabConfig {
  id: string;
  name: string;
  filesystem: FilesystemStructure;
  commands: Record<string, CommandDefinition>;
  bootSequence?: BootSequence;
  initialPath?: string;
  environment?: Record<string, string>;
  defaultConstraints?: CommandConstraints;    // Applicati a tutti i comandi del tab
}
```

### CommandContext

```typescript
interface CommandContext {
  command: string;              // Nome del comando eseguito
  args: string[];               // Argomenti parsati
  currentPath: string;          // Directory di lavoro corrente
  filesystem: FilesystemStructure;
  environment: Record<string, string>;
  bootStage: string;            // Fase di boot corrente
  discoveredFlags: string[];    // Flag gia' scoperti (da exerciseStore)
  history: string[];            // Comandi eseguiti in precedenza
  state: Record<string, any>;   // Stato arbitrario (modificabile da setState side effect)
  tab: string;                  // ID del tab corrente
}
```

### FlagSystem

```typescript
interface FlagSystem {
  parts: FlagPart[];        // Flag parziali in ordine
  completeFlag: string;     // Flag completo (es. "flag{b00t_r00t_h4sh}")
  showProgress?: boolean;
  completionMessage?: string;
}

interface FlagPart {
  id: string;          // Identificatore (es. "boot_flag")
  part: string;        // Porzione testuale (es. "b00t")
  description: string;
  hint: string;
}
```

---

## Note Architetturali

### Sincronia totale

Tutta la pipeline di esecuzione e' sincrona. Non ci sono `Promise`, `async/await` o callback asincroni nel percorso critico. Questo semplifica il modello mentale, elimina le race condition e garantisce che lo stato React sia sempre aggiornato in modo prevedibile.

### Separazione delle responsabilita'

- `TerminalConfigLoader` conosce la struttura della configurazione, non esegue comandi.
- `CommandExecutor` sa come eseguire comandi, non ha dipendenze su React o sullo store.
- `terminal-builtin-handlers` sono funzioni pure senza side effects globali.
- `Terminal.tsx` coordina UI, stato locale e interagisce con lo store solo per comunicare i flag scoperti.

### Estensibilita'

Aggiungere un nuovo tipo di handler richiede: (1) aggiungere il nuovo literal all'unione `handler`; (2) aggiungere un case nello switch di `CommandExecutor.executeCommand()`; (3) implementare la logica. Aggiungere un nuovo tipo di output richiede: (1) definire l'interfaccia in `terminal-config.ts`; (2) aggiungere un case in `generateOutput()`.
