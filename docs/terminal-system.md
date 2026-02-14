# Terminal System - Documentazione Tecnica

Documentazione completa del sistema terminale interattivo utilizzato nella piattaforma PCB-CTF per simulare sessioni di penetration testing su dispositivi embedded.

---

## Indice

1. [Panoramica Architetturale](#1-panoramica-architetturale)
2. [Struttura dei File](#2-struttura-dei-file)
3. [Guida all'Uso della Settings UI](#3-guida-alluso-della-settings-ui)
4. [Sistema dei Tipi (`terminal-config.ts`)](#4-sistema-dei-tipi)
5. [Configurazione Statica (`terminal.config.ts`)](#5-configurazione-statica)
6. [Config Loader (`terminal-config-loader.ts`)](#6-config-loader)
7. [Command Executor (`terminal-command-executor.ts`)](#7-command-executor)
8. [Filesystem Virtuale (`terminal-filesystem.ts`)](#8-filesystem-virtuale)
9. [Builtin Handlers (`terminal-builtin-handlers.ts`)](#9-builtin-handlers)
10. [Componente React (`Terminal.tsx`)](#10-componente-react)
11. [Configurazione Dinamica (`useTerminalConfig.ts`)](#11-configurazione-dinamica)
12. [Settings Store (`terminalSettingsStore.ts`)](#12-settings-store)
13. [Pipeline di Esecuzione](#13-pipeline-di-esecuzione)
14. [Sistema di Boot](#14-sistema-di-boot)
15. [Sistema delle Flag](#15-sistema-delle-flag)
16. [Estensione e Personalizzazione](#16-estensione-e-personalizzazione)

---

## 1. Panoramica Architetturale

Il terminale e' un simulatore completamente client-side che riproduce l'esperienza di una sessione di penetration testing su un router TP-Link WR841N via connessione UART. Non esegue comandi reali: ogni comando, ogni file, ogni output e' definito dichiarativamente in una configurazione JSON.

### Principi di Design

- **Sincrono**: Nessuna operazione asincrona. Tutte le esecuzioni sono immediate.
- **Dichiarativo**: I comandi usano constraint e output dichiarativi, non logica imperativa.
- **Configurabile**: L'intero comportamento del terminale e' definito in un oggetto `TerminalConfig` modificabile dalla UI Settings.
- **Modulare**: Separazione netta tra tipi, configurazione, caricamento, esecuzione, filesystem e UI.
- **Persistente**: Lo stato del draft (editing) e la configurazione applicata usano localStorage con chiavi separate.

### Diagramma Data Flow

```
                    +--------------------------+
                    |   Settings UI (/settings)|
                    |   TerminalSettingsPanel  |
                    +-----------+--------------+
                                |
                   exportAsTerminalConfig()
                                |
                                v
                    +-----------+--------------+
                    |  terminalSettingsStore   |
                    |  (Zustand + persist)     |
                    +-----------+--------------+
                                |
                   applyTerminalConfig()
                                |
                                v
                    +-----------+--------------+
                    |  localStorage            |
                    |  'pcb-ctf-terminal-config'|
                    +-----------+--------------+
                                |
                    window.dispatchEvent('terminal-config-updated')
                                |
                                v
                    +-----------+--------------+
                    |  useTerminalConfig()     |
                    |  (React Hook)            |
                    +-----------+--------------+
                                |
                                v
                    +-----------+--------------+
                    |  TerminalConfigLoader    |
                    |  (cache + validazione)   |
                    +-----------+--------------+
                                |
                    +-----------+-----------+
                    |                       |
                    v                       v
         +------------------+   +---------------------+
         | CommandExecutor  |   | Terminal.tsx         |
         | (esecuzione)     |   | (UI + boot + input) |
         +--------+---------+   +----------+----------+
                  |                         |
         +--------+---------+              |
         |                  |              |
         v                  v              v
  +-----------+   +------------------+   +-------------------+
  | Builtin   |   | Custom Functions |   | Filesystem Utils  |
  | Handlers  |   | (getFileType...) |   | (resolvePath...)  |
  +-----------+   +------------------+   +-------------------+
```

---

## 2. Struttura dei File

```
src/
├── types/
│   └── terminal-config.ts          # Interfacce TypeScript per tutto il sistema
├── config/
│   └── terminal.config.ts          # Configurazione statica (fallback)
├── lib/
│   ├── terminal-config-loader.ts   # Classe TerminalConfigLoader
│   ├── terminal-command-executor.ts# Classe CommandExecutor
│   ├── terminal-filesystem.ts      # Utility pure per filesystem virtuale
│   └── terminal-builtin-handlers.ts# Implementazioni comandi builtin
├── hooks/
│   └── useTerminalConfig.ts        # Hook React per config dinamica
├── store/
│   └── terminalSettingsStore.ts    # Zustand store per editing settings
├── components/features/exercise/
│   └── Terminal.tsx                 # Componente React principale
└── data/
    └── terminalData.ts             # Dati statici (filesystem, boot lines, output)
```

---

## 3. Guida all'Uso della Settings UI

La configurazione del terminale e' completamente editabile dalla pagina `/settings` dell'applicazione. Questa sezione spiega passo-passo come utilizzare l'interfaccia.

### 3.1 Accesso al Tab Terminal

1. Aprire `/settings` nel browser
2. Nella sidebar a sinistra, cliccare il tab **Terminal** (icona terminale, sfondo verde quando attivo)
3. Il pannello laterale mostrera' le 5 sezioni di configurazione
4. Il canvas centrale mostrera' una preview della configurazione (Summary, JSON o YAML)

I tre tab principali della sidebar sono:
- **Init**: Configura componenti PCB e pin (Step 1)
- **Challenge**: Configura gli step e obiettivi della sfida
- **Terminal**: Configura l'intero comportamento del terminale (Step 3)

### 3.2 Navigazione tra le Sezioni

In cima al pannello Terminal ci sono 5 bottoni-sezione:

| Sezione | Icona | Cosa configura |
|---------|-------|---------------|
| **Comandi** | Terminal | I comandi disponibili nel terminale (per tab) |
| **Flag** | Bandiera | Le parti della flag e la flag completa |
| **Boot** | CPU | La sequenza di boot (per tab) |
| **Filesystem** | Cartella | Directory e file del filesystem virtuale (per tab) |
| **Tab** | Layers | I tab del terminale (UART, Local, custom) |

Le sezioni Comandi, Boot e Filesystem mostrano un **selettore tab** in alto: i contenuti sono filtrati per il tab attivo (es. "UART Console" o "Local Machine").

### 3.3 Gestione dei Comandi

#### Vedere i comandi esistenti

1. Selezionare la sezione **Comandi**
2. Usare il tab selector per scegliere il tab (UART/Local)
3. Ogni comando mostra:
   - Badge **BLT** (giallo) per builtin o **CST** (verde) per custom
   - Nome del comando in font mono
   - Icona bandiera se il comando sblocca flag
4. Al passaggio del mouse appaiono le icone: modifica (matita), duplica (copia), elimina (cestino)

#### Aggiungere un nuovo comando

1. Cliccare il pulsante **+** accanto al titolo "Comandi"
2. Si crea un comando vuoto nel tab attivo
3. Cliccare l'icona matita per aprire l'**Editor Comando**

#### Editor Comando (popup modale)

L'editor ha 4 tab interni:

**Tab Generale:**
- **Nome comando**: il nome con cui verra' invocato (es. `cat`, `scan`, `dump`)
- **Descrizione**: testo descrittivo
- **Tipo handler**: `Builtin` (usa un handler predefinito) o `Custom` (output dalla configurazione)
- **Tipo builtin** (solo se Builtin): seleziona tra `ls`, `cat`, `cd`, `pwd`, `grep`, `find`, `file`, `mount`, `ps`, `help`, `printenv`, `version`, `md`, `clear`, `strings`
- **Aliases**: nomi alternativi per il comando. Digitare nel campo e premere Enter o cliccare +. Per rimuovere, cliccare la X sull'alias.

**Tab Output:**
- **Tipo output**:
  - `Nessuno`: il comando non produce output (utile per comandi che cambiano solo stato)
  - `Statico`: output fisso. Inserire le righe in una textarea (una per riga)
  - `Condizionale`: output che varia in base agli argomenti

Per l'output **Condizionale**:
1. Cliccare + per aggiungere una regola
2. Ogni regola ha:
   - **Arg Index**: quale argomento controllare (0 = primo)
   - **Match**: tipo di confronto (`Equals`, `Contains`, `Regex`)
   - **Valore**: stringa da confrontare
   - **Output**: righe di output quando la condizione matcha
3. In fondo, **Output default**: righe mostrate quando nessuna regola corrisponde

Esempio pratico: il comando `strings` con 3 regole condizionali:
- Se arg[0] contiene "mtdblock3" → mostra output partizione config
- Se arg[0] contiene "httpd" → mostra stringhe del web server
- Se arg[0] contiene "backdoorTest" → mostra stringhe del backdoor
- Default → "strings: file not found"

**Tab Effetti:**
- **Flag Unlock**: aggiunge flag che vengono sbloccate quando il comando viene eseguito
  1. Cliccare + per aggiungere un flag unlock
  2. Selezionare la flag dal dropdown (le flag disponibili sono quelle definite nella sezione Flag)
  3. Opzionalmente attivare **Condizionale**: la flag si sblocca solo se l'argomento specificato matcha il pattern

  Esempio: `strings` sblocca la flag `leak` solo se arg[0] contiene "mtdblock3"

- **State Changes**: coppie chiave-valore che modificano lo stato del terminale
  - `bootStage = shell` → cambia lo stage di boot
  - `currentPath = /` → cambia la working directory
  - Qualsiasi chiave custom → salvata nello stato per usi futuri

  Esempio: il comando `boot` in U-Boot ha lo state change `bootStage = kernel_boot` per far partire il boot del kernel.

**Tab Vincoli:**
- **Boot stages consentiti**: selezionare in quali stage di boot il comando e' disponibile
  - Se nessuno e' selezionato, il comando e' disponibile in tutti gli stage
  - Esempio: i comandi U-Boot (`printenv`, `version`, ecc.) hanno solo `uboot_shell` selezionato
  - Esempio: i comandi shell (`ls`, `cat`, ecc.) hanno solo `shell` selezionato

- **Argomenti**:
  - **Min args**: numero minimo di argomenti richiesti (es. `cat` richiede min 1)
  - **Max args**: numero massimo (-1 = illimitati, es. `cd` ha max 1)

Chiudere l'editor con il pulsante **Chiudi**. Le modifiche sono applicate in tempo reale allo store.

### 3.4 Gestione delle Flag

1. Selezionare la sezione **Flag**
2. In cima: campo **Flag completa** - la stringa finale (es. `flag{b00t_r00t_h4sh_l34k_1nj3ct_sh3ll}`)
3. Sotto: lista delle **Parti** della flag

#### Aggiungere una flag part

1. Cliccare + accanto a "Parti"
2. Espandere la nuova parte cliccando sulla riga
3. Compilare:
   - **ID**: identificativo unico (es. `boot`, `root`, `hash`) - usato dai flag unlock dei comandi
   - **Part**: stringa della parte (es. `b00t`, `_r00t`) - le parti vengono concatenate nella flag
   - **Descrizione**: tooltip mostrato quando la flag e' scoperta
   - **Hint**: suggerimento per l'utente

In fondo alla sezione, una **Preview** mostra le parti concatenate.

### 3.5 Gestione del Boot Sequence

1. Selezionare la sezione **Boot**
2. Usare il tab selector per scegliere il tab (UART/Local)
3. La lista mostra i boot stage in ordine

#### Aggiungere uno stage

1. Cliccare + accanto a "Boot Stages"
2. Espandere lo stage cliccando sulla riga
3. Compilare:
   - **ID**: identificativo unico (es. `connecting`, `booting`, `shell`)
   - **Nome**: nome leggibile
   - **Next Stage**: selezionare lo stage successivo dal dropdown, oppure "Nessuno" per stage interattivi/finali
   - **Durata (ms)**: durata dell'animazione in millisecondi. Se 0, lo stage e' interattivo (attende input)
   - **Prompt**: stringa del prompt (es. `U-Boot>`, `#`, `Password:`)
   - **Lines**: righe di output animate durante lo stage (una per riga nella textarea)

#### Riordinare gli stage

Usare le frecce su/giu che appaiono al passaggio del mouse per cambiare l'ordine. L'ordine nella lista determina l'ordine visuale, ma le transizioni sono governate dal campo **Next Stage**.

### 3.6 Gestione del Filesystem

1. Selezionare la sezione **Filesystem**
2. Usare il tab selector per scegliere il tab
3. La sezione e' divisa in **Directory** e **File**

#### Aggiungere una directory

1. Cliccare + accanto a "Directory"
2. Espandere ed editare:
   - **Path**: percorso assoluto della directory (es. `/etc`, `/usr/bin`)

Ogni directory mostra due tipi di voci:

- **Voci reali** (chip verdi, auto-calcolate): Corrispondono a sotto-directory e file che hanno un record effettivo nella configurazione. Non servono essere specificate manualmente: vengono derivate dai path delle altre directory e dei file.
  Ad esempio, se esistono `/etc/shadow` (file) e `/etc/config` (directory), la directory `/etc` mostrera' automaticamente `config  shadow` come voci reali.

- **Voci extra** (textarea editabile): Nomi di file che appaiono nell'output di `ls` ma non hanno contenuto definito. Servono per rendere il filesystem realistico senza dover creare un record file per ogni voce.
  Ad esempio, `/bin` contiene `busybox`, `cat`, `chmod`, ecc. - file che appaiono quando si fa `ls /bin` ma che non hanno contenuto leggibile con `cat`.

#### Aggiungere un file

1. Cliccare + accanto a "File"
2. Espandere ed editare:
   - **Path**: percorso assoluto completo (es. `/etc/shadow`)
   - **Contenuto**: testo del file nella textarea

Il file apparira' automaticamente come voce reale nella directory padre, purche' la directory padre sia definita.

### 3.7 Gestione dei Tab

1. Selezionare la sezione **Tab**
2. La lista mostra i tab del terminale

#### Aggiungere un tab

1. Cliccare + accanto a "Tab terminale"
2. Espandere ed editare:
   - **ID**: identificativo (es. `uart`, `local`, `remote`)
   - **Nome**: nome visibile nel terminale (es. "UART Console", "Local Machine")
   - **Path iniziale**: working directory di partenza (es. `/`, `/home/kali`)
   - **Environment**: variabili ambiente (coppie chiave=valore)
     - Usare i campi KEY/value e premere Enter o cliccare + per aggiungere
     - Cliccare il cestino rosso per rimuovere una variabile
     - Variabili tipiche: `USER`, `HOME`, `PATH`, `SHELL`

### 3.8 Preview e Editor della Configurazione

Nell'area centrale (canvas), quando il tab Terminal e' attivo, viene mostrato un pannello di preview con tre modalita':

- **Summary** (default): Griglia con statistiche (numero tab, comandi, flag, boot stages, directory, file), dettaglio per tab con pill dei comandi, preview del sistema flag
- **JSON**: Cliccare il pulsante "JSON" nell'header per visualizzare e **modificare** la configurazione in formato JSON
- **YAML**: Cliccare il pulsante "YAML" per visualizzare e **modificare** la configurazione in formato YAML

I pulsanti funzionano come toggle: cliccare di nuovo per tornare alla vista Summary.

#### Editing diretto JSON/YAML

Nelle modalita' JSON e YAML, il contenuto e' direttamente editabile in una textarea. Sopra la textarea appare una toolbar con:

- **Importa modifiche**: Parsa il contenuto modificato e lo carica nello store. Il bottone e' disabilitato finche' non vengono fatte modifiche. Mostra errori di parsing in rosso se il formato non e' valido.
- **Ricarica**: Rigenera il contenuto della textarea dallo stato corrente dello store (utile dopo modifiche dalla sidebar).
- **Indicatore "Modifiche non salvate"**: Appare in giallo quando il testo e' stato modificato ma non ancora importato.

Questo permette di configurare il terminale modificando direttamente il JSON o YAML completo, utile per:
- Importare configurazioni da file esterni (copia-incolla)
- Modificare campi avanzati non esposti dalla UI form
- Effettuare modifiche bulk su molti comandi/file contemporaneamente

### 3.9 Applicare le Modifiche

Le modifiche nella sidebar vengono salvate automaticamente nel draft (localStorage). Ma per renderle attive nel terminale:

**Applica al simulatore** (pulsante verde):
- Salva la configurazione in `localStorage['pcb-ctf-terminal-config']`
- Il terminale rileva il cambiamento via evento `terminal-config-updated` e si aggiorna
- Le modifiche sono visibili immediatamente nel terminale senza ricaricare la pagina
- Applica anche le configurazioni Init/Challenge

**Salva** (pulsante blu):
- Persiste la configurazione come file `terminal.override.json` sul server
- Utile per conservare la configurazione tra sessioni e ambienti diversi

**Carica** (pulsante outline):
- Legge il file `terminal.override.json` dal server e lo carica nello store
- Sovrascrive le modifiche correnti nel draft

**JSON / TS** (pulsanti export):
- **JSON**: Scarica la configurazione exercise come file `.json`
- **TS**: Copia la configurazione exercise come codice TypeScript negli appunti

**Reset configurazione** (pulsante rosso):
- Elimina tutte le configurazioni (componenti, pin, step, obiettivi, immagine PCB)
- Richiede conferma con dialog di alert
- Non resetta il draft della configurazione terminale (che ha persistenza separata)

### 3.10 Workflow Tipico

Ecco un esempio di workflow completo per configurare una nuova sfida terminale:

1. **Definire i tab**: Sezione Tab → creare UART Console e Local Machine con i path e variabili ambiente appropriati

2. **Creare il filesystem**: Sezione Filesystem → per ogni tab:
   - Aggiungere le directory (dall'alto: `/`, `/bin`, `/etc`, ecc.)
   - Per ogni directory, listare le entries
   - Aggiungere i file con il contenuto appropriato

3. **Configurare il boot**: Sezione Boot → per il tab UART:
   - Creare gli stage in ordine: connecting → booting → login → shell
   - Per ogni stage: definire le righe di output, la durata, il next stage e il prompt

4. **Definire le flag**: Sezione Flag →
   - Aggiungere le parti della flag con ID, part string, descrizione e hint
   - Compilare la flag completa nel campo in cima

5. **Creare i comandi**: Sezione Comandi → per ogni tab:
   - Aggiungere i comandi necessari
   - Per comandi standard (ls, cat, cd, pwd): usare handler Builtin
   - Per comandi con output specifico: usare handler Custom con output Statico o Condizionale
   - Collegare i flag unlock ai comandi appropriati (tab Effetti)
   - Impostare i vincoli di boot stage (tab Vincoli)

6. **Applicare e testare**:
   - Cliccare "Applica al simulatore"
   - Aprire l'esercizio e verificare che il terminale funzioni correttamente
   - Verificare la sequenza di boot, i comandi, gli output e lo sblocco delle flag

7. **Salvare**: Cliccare "Salva" per persistere su file

---

## 4. Sistema dei Tipi

**File**: `src/types/terminal-config.ts`

Definisce tutte le interfacce TypeScript che governano il sistema. E' il contratto formale tra tutti i moduli.

### 4.1 Constraint

I constraint definiscono le precondizioni per l'esecuzione di un comando.

```typescript
interface CommandConstraints {
  path?: PathConstraint;           // Vincolo sul path corrente
  permissions?: PermissionConstraint; // Vincolo su utente/root
  prerequisites?: PrerequisiteConstraint; // Comandi/file/flag prerequisiti
  arguments?: ArgumentConstraint;  // Vincolo su numero/pattern argomenti
  state?: StateConstraint;         // Vincolo su boot stage e variabili di stato
}
```

**PathConstraint**: Controlla in quale directory il comando e' eseguibile.
- `type`: `'exact'` | `'contains'` | `'startsWith'` | `'regex'`
- `value`: stringa o array di stringhe da confrontare
- `errorMessage`: messaggio di errore custom (opzionale)

**PermissionConstraint**: Controlla i permessi utente.
- `requireRoot`: booleano, richiede `USER === 'root'`
- `requireUser`: stringa, richiede un utente specifico

**PrerequisiteConstraint**: Verifica che determinate condizioni siano soddisfatte.
- `commands`: array di comandi che devono essere stati eseguiti (controllato nella history)
- `files`: array di path che devono esistere nel filesystem
- `flags`: array di flag ID che devono essere stati scoperti
- `condition`: `'all'` (tutte le condizioni) o `'any'` (almeno una)

**ArgumentConstraint**: Valida gli argomenti del comando.
- `min`/`max`: numero minimo/massimo di argomenti
- `required`: array di validazioni posizionali con index, pattern regex, errorMessage

**StateConstraint**: Controlla lo stato del terminale.
- `bootStage`: stringa o array di stringhe - il comando e' disponibile solo in questi stage
- `variables`: record chiave-valore che devono corrispondere allo stato corrente

### 4.2 Output

I tipi di output definiscono come un comando genera la sua risposta.

```typescript
type CommandOutput =
  | StaticOutput       // Array di stringhe fisso
  | DynamicOutput      // Chiama una funzione registrata
  | ConditionalOutput  // Branching basato su condizioni
  | TemplateOutput     // Interpolazione di variabili in un template
  | ScriptOutput;      // Esecuzione di una funzione script
```

**StaticOutput**: L'output piu' semplice.
```typescript
{ type: 'static', lines: ['riga 1', 'riga 2', ...] }
```

**DynamicOutput**: Delega a una funzione custom registrata nel CommandExecutor.
```typescript
{ type: 'dynamic', generator: 'getFileType', args?: [...] }
```

**ConditionalOutput**: Valuta condizioni in ordine e ritorna il primo match.
```typescript
{
  type: 'conditional',
  conditions: [
    { if: ConditionCheck, then: CommandOutput, else?: CommandOutput },
    ...
  ],
  default?: CommandOutput  // Fallback se nessuna condizione matcha
}
```

**TemplateOutput**: Interpolazione `{{variabile}}` in un template stringa.
```typescript
{
  type: 'template',
  template: 'User: {{user}}, Path: {{path}}',
  variables: {
    user: { type: 'state', value: 'USER' },
    path: { type: 'computed', compute: 'getCurrentPath' }
  }
}
```

**ScriptOutput**: Come dynamic ma per funzioni script.
```typescript
{ type: 'script', script: 'functionName' }
```

### 4.3 ConditionCheck

Le condizioni sono usate sia nell'output condizionale che nel flag unlock.

```typescript
interface ConditionCheck {
  type: 'argument' | 'path' | 'file' | 'flag' | 'state' | 'custom';
  index?: number;      // Per argument: quale argomento (0-based)
  contains?: string;   // Substring match
  equals?: string;     // Exact match
  regex?: string;      // Regex match
  exists?: boolean;    // Per file: verifica esistenza
  value?: any;         // Per state: valore atteso
  variable?: string;   // Per state: nome variabile
  check?: string;      // Per custom: nome funzione
}
```

Esempio pratico (da `terminal.config.ts`):
```typescript
// Condizione: il primo argomento contiene "mtdblock3"
{
  type: 'argument',
  index: 0,
  contains: 'mtdblock3'
}
```

### 4.4 Side Effects

I side effects vengono applicati dopo l'esecuzione di un comando.

```typescript
interface CommandSideEffects {
  unlockFlags?: Array<string | FlagUnlock>;  // Flag da sbloccare
  setState?: Record<string, any>;             // Variabili di stato da modificare
  executeCommand?: string;                    // Comando da eseguire dopo
  customEffect?: string;                      // Funzione custom da invocare
}

interface FlagUnlock {
  id: string;                    // ID della flag part
  condition?: ConditionCheck;    // Condizione opzionale per lo sblocco
}
```

Esempio: il comando `printenv` sblocca la flag `boot` incondizionatamente:
```typescript
sideEffects: {
  unlockFlags: ['boot']
}
```

Esempio: il comando `strings` sblocca `leak` solo se l'argomento contiene "mtdblock3":
```typescript
sideEffects: {
  unlockFlags: [{
    id: 'leak',
    condition: { type: 'argument', index: 0, contains: 'mtdblock3' }
  }]
}
```

### 4.5 CommandDefinition

La definizione completa di un comando.

```typescript
interface CommandDefinition {
  name: string;                    // Nome primario del comando
  aliases?: string[];              // Nomi alternativi
  description: string;             // Descrizione breve
  usage?: string;                  // Stringa di usage
  handler: 'builtin' | 'custom' | 'script' | 'dynamic';
  builtinType?: string;            // Per builtin: tipo handler (es. 'ls', 'cat')
  constraints?: CommandConstraints; // Precondizioni
  output?: CommandOutput;           // Definizione output
  sideEffects?: CommandSideEffects; // Effetti collaterali
  help?: string;                    // Testo di help esteso
}
```

I quattro tipi di handler:
- **`builtin`**: Usa un handler registrato nel CommandExecutor (es. `ls`, `cat`, `cd`). Identificato da `builtinType`.
- **`custom`**: Genera output dalla definizione `output` della configurazione. Non chiama handler specifici.
- **`dynamic`**: Chiama una funzione registrata con `registerCustomFunction()`.
- **`script`**: Come dynamic, ma per script inline.

### 4.6 Filesystem

```typescript
interface FilesystemStructure {
  directories: Record<string, string[]>;  // path -> entries (auto-calcolate a runtime)
  files: Record<string, FileNode>;        // full path -> dati file
}

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  content?: string;
  permissions?: string;    // es. '-rw-r--r--'
  owner?: string;
  size?: number;
  modified?: string;
  metadata?: Record<string, any>;
}
```

Il filesystem e' un'astrazione piatta: le directory sono mappe `path -> entries[]`, i file sono mappe `path -> FileNode`. Non e' un albero ricorsivo.

**Entries ibride**: gli array di entries nelle directory contengono l'unione di:
- **Voci auto-calcolate**: derivate dai path delle altre directory e dei file (tramite `computeDirectoryEntries()`). Non serve specificarle manualmente.
- **Voci extra/virtuali**: nomi presenti solo nel listing `ls` ma senza record file (es. binari in `/bin`). Queste vanno specificate manualmente.

Al runtime, `getDirectoryEntries()` fonde entrambe le fonti. In export, l'array contiene l'unione completa.

Esempio:
```typescript
directories: {
  '/': ['bin', 'etc', 'root', 'usr'],      // 'etc', 'root' auto da dir keys; 'bin', 'usr' auto da dir keys
  '/etc': ['shadow', 'passwd', 'config'],    // 'shadow', 'passwd' auto da file keys; 'config' auto da dir keys
  '/bin': ['busybox', 'cat', 'sh', ...],     // tutte extra (nessun file record per i binari)
  '/root': [],
}
files: {
  '/etc/shadow': { name: 'shadow', type: 'file', content: 'root:$1$GTN...', permissions: '-rw-------', owner: 'root' },
  '/etc/passwd': { name: 'passwd', type: 'file', content: 'root:x:0:0:root:/root:/bin/sh', ... },
}
```

### 4.7 Boot Sequence

```typescript
interface BootSequence {
  stages: BootStage[];
  initialStage: string;    // ID dello stage iniziale
}

interface BootStage {
  id: string;              // Identificativo unico
  name: string;            // Nome leggibile
  lines: string[];         // Righe di output da animare
  duration?: number;       // Durata animazione in ms
  nextStage?: string;      // Stage successivo (transizione automatica)
  prompt?: string;         // Prompt mostrato all'utente
}
```

Se `duration` e' presente, le righe vengono animate una alla volta. Al termine dell'animazione, se `nextStage` e' definito, il terminale transita automaticamente.

Se `duration` non e' presente (e non c'e' `nextStage`), lo stage e' interattivo e attende input dall'utente (es. U-Boot shell, login, password).

### 4.8 Flag System

```typescript
interface FlagSystem {
  parts: FlagPart[];           // Parti componenti la flag
  completeFlag: string;        // Flag completa
  showProgress?: boolean;      // Mostra barra progresso
  completionMessage?: string;  // Messaggio a completamento
}

interface FlagPart {
  id: string;          // Identificativo (es. 'boot', 'root', 'hash')
  part: string;        // Stringa della flag part (es. 'b00t', '_r00t')
  description: string; // Descrizione per tooltip
  hint: string;        // Suggerimento per l'utente
}
```

### 4.9 Tab Configuration

```typescript
interface TabConfig {
  id: string;                               // 'uart' | 'local'
  name: string;                             // Nome visibile
  filesystem: FilesystemStructure;           // Filesystem dedicato
  commands: Record<string, CommandDefinition>; // Comandi disponibili
  bootSequence?: BootSequence;               // Sequenza di boot (opzionale)
  initialPath?: string;                      // Path iniziale
  environment?: Record<string, string>;      // Variabili ambiente
}
```

### 4.10 TerminalConfig (Root)

```typescript
interface TerminalConfig {
  metadata: {
    version: string;
    name: string;
    description: string;
    author?: string;
  };
  tabs: TabConfig[];
  flags?: FlagSystem;
  globalCommands?: Record<string, CommandDefinition>;  // Disponibili in tutti i tab
  customFunctions?: Record<string, string>;
}
```

### 4.11 Runtime Types

```typescript
interface CommandContext {
  command: string;                      // Nome comando
  args: string[];                       // Argomenti
  currentPath: string;                  // Working directory
  filesystem: FilesystemStructure;      // Filesystem del tab
  environment: Record<string, string>;  // Variabili ambiente
  bootStage: string;                    // Stage corrente
  discoveredFlags: string[];            // Flag scoperte finora
  history: string[];                    // Storico comandi
  state: Record<string, any>;           // Stato custom
  tab: string;                          // ID del tab
}

interface CommandExecutionResult {
  success: boolean;
  output: string[];
  error?: string;
  sideEffects?: {
    newFlags?: string[];
    stateChanges?: Record<string, any>;
    stageChange?: string;
    pathChange?: string;
  };
}
```

---

## 5. Configurazione Statica

**File**: `src/config/terminal.config.ts`

Contiene la configurazione completa di default per la sfida TP-Link WR841N. Viene usata come fallback quando non esiste una configurazione custom in localStorage.

### Tab UART Console

**Boot sequence** (8 stage):

| Stage | Nome | Durata | Next | Interattivo |
|-------|------|--------|------|-------------|
| `connecting` | Connecting | 1500ms | `booting` | No |
| `booting` | Booting | 2000ms | `uboot_wait` | No |
| `uboot_wait` | U-Boot Wait | 1000ms | `uboot_shell` | Si (press Enter) |
| `uboot_shell` | U-Boot Shell | - | - | Si (comandi U-Boot) |
| `kernel_boot` | Kernel Boot | 2500ms | `login` | No |
| `login` | Login Prompt | - | - | Si (username) |
| `password` | Password Prompt | - | - | Si (password) |
| `shell` | Shell | - | - | Si (comandi Linux) |

**Comandi U-Boot** (disponibili solo nello stage `uboot_shell`):

| Comando | Alias | Handler | Flag Unlock |
|---------|-------|---------|-------------|
| `?` | `help` | builtin (`help`) | - |
| `printenv` | - | builtin (`printenv`) | `boot` |
| `version` | - | builtin (`version`) | - |
| `md` | - | builtin (`md`) | - |
| `boot` | - | custom | - (transita a `kernel_boot`) |

**Comandi Shell** (disponibili solo nello stage `shell`):

| Comando | Handler | Note |
|---------|---------|------|
| `ls` | builtin | Supporta `-l`, `-a`, `-la` |
| `cd` | builtin | Max 1 argomento |
| `pwd` | builtin | - |
| `cat` | builtin | Min 1 argomento |
| `file` | custom (conditional) | Flag `shell` se argomento = `/usr/bin/backdoorTest` |
| `strings` | custom (conditional) | Flag `leak`/`inject`/`shell` in base all'argomento |
| `mount` | builtin | Output statico predefinito |
| `ps` | builtin | Output statico predefinito |
| `grep` | builtin | Min 1 argomento |
| `find` | builtin | Supporta `-name`, `-type` |

**Sequenza di login**:

| Comando | Stage | Azione |
|---------|-------|--------|
| `root` | `login` | Transita a `password`, imposta `loginUser: 'root'` |
| `sohoadmin` | `password` | Transita a `shell`, sblocca flag `root` |

### Tab Local Machine

Shell semplice senza boot sequence, che simula un sistema Kali Linux.

| Comando | Handler | Flag Unlock |
|---------|---------|-------------|
| `ls` | builtin | - |
| `cd` | builtin | - |
| `pwd` | builtin | - |
| `cat` | builtin | - |
| `hashcat` | custom (conditional) | `hash` se argomento matcha hash MD5 |
| `john` | custom (conditional) | `hash` se argomento contiene "shadow" |
| `clear` | builtin | - |

---

## 6. Config Loader

**File**: `src/lib/terminal-config-loader.ts`

**Classe**: `TerminalConfigLoader`

Il Config Loader e' il punto di accesso centrale alla configurazione. Carica, valida e fornisce metodi di query per tab, comandi, filesystem, boot stages e flag.

### Inizializzazione

```typescript
const loader = new TerminalConfigLoader(config);
```

Il costruttore chiama `initialize()` che:
1. Costruisce `tabsMap: Map<string, TabConfig>` per accesso O(1) ai tab per ID
2. Per ogni tab, costruisce `commandsCache: Map<string, Map<string, CommandDefinition>>`:
   - Prima aggiunge i `globalCommands` (se presenti)
   - Poi aggiunge i comandi specifici del tab (sovrascrivono i globali con lo stesso nome)
   - Per ogni comando, registra anche tutti gli alias nella stessa mappa

### API Principali

**Accesso ai Tab**:
- `getTabs()`: Ritorna tutti i tab
- `getTab(tabId)`: Ritorna un tab specifico
- `getFilesystem(tabId)`: Ritorna il filesystem di un tab
- `getInitialPath(tabId)`: Path iniziale (default: `'/'`)
- `getEnvironment(tabId)`: Variabili ambiente

**Boot Sequence**:
- `getBootSequence(tabId)`: Intera sequenza di boot
- `getBootStage(tabId, stageId)`: Stage specifico
- `getInitialBootStage(tabId)`: ID dello stage iniziale
- `getNextBootStage(tabId, stageId)`: ID dello stage successivo

**Comandi**:
- `getCommand(tabId, commandName)`: Risolve alias e ritorna la definizione. Se `commandName` e' un alias, ritorna il comando originale.
- `getAllCommands(tabId)`: Ritorna comandi unici (senza duplicati da alias)
- `getCommandsForStage(tabId, bootStage)`: Filtra comandi disponibili in uno specifico boot stage. Un comando senza `constraints.state.bootStage` e' disponibile in tutti gli stage.

**Flag**:
- `getFlagSystem()`: Configurazione completa del sistema flag
- `getFlagParts()`: Array di `FlagPart`
- `getCompleteFlag()`: Stringa della flag completa
- `getFlagPart(flagId)`: Singola flag part per ID
- `buildCurrentFlag(discoveredFlags)`: Costruisce la flag corrente con `?` per le parti non scoperte. Formato: `flag{part1_part2_...}`
- `areAllFlagsDiscovered(discoveredFlags)`: Verifica se tutte le flag sono state scoperte

**Validazione**:
- `validate()`: Ritorna `{ valid: boolean, errors: string[] }`. Controlla:
  - Presenza di metadata.version e metadata.name
  - Almeno un tab
  - Ogni tab ha id, name, filesystem, commands
  - Boot sequence: initialStage esiste, niente stage duplicati
  - Comandi: ogni comando ha name e handler
  - Flag: parts non vuoto, completeFlag presente, niente ID duplicati

**Debug**:
- `getSummary()`: Ritorna una stringa leggibile con statistiche della configurazione

---

## 7. Command Executor

**File**: `src/lib/terminal-command-executor.ts`

**Classe**: `CommandExecutor`

Motore di esecuzione sincrono che gestisce constraint validation, output generation e side effects.

### Registrazione

```typescript
const executor = new CommandExecutor();

// Registra handler builtin
executor.registerBuiltinHandler('ls', handleLs);
executor.registerBuiltinHandler('cat', handleCat);

// Registra funzioni custom
executor.registerCustomFunction('getFileType', getFileType);
```

### Pipeline di Esecuzione

`executeCommand(command, context)` segue tre step:

**Step 1: Validazione Constraint**

Ogni constraint viene valutato in ordine. Se uno fallisce, il comando non viene eseguito e viene ritornato l'errore.

Ordine di validazione:
1. `path` - Verifica che il path corrente corrisponda al vincolo
2. `permissions` - Verifica utente/root
3. `prerequisites` - Verifica comandi/file/flag prerequisiti
4. `arguments` - Verifica numero e pattern argomenti
5. `state` - Verifica boot stage e variabili di stato

**Step 2: Generazione Output**

In base al tipo di handler:

| Handler | Comportamento |
|---------|--------------|
| `builtin` | Chiama il handler registrato con `registerBuiltinHandler(builtinType)`. Il handler riceve `CommandContext` e ritorna `string[]`. |
| `custom` | Processa la definizione `output` del comando tramite `generateOutput()`. Non chiama handler esterni. |
| `dynamic` | Chiama la funzione registrata con `registerCustomFunction(generator)`. |
| `script` | Come dynamic, ma usa il campo `script` invece di `generator`. |

**Step 3: Side Effects**

Dopo l'esecuzione, `applySideEffects()` processa:
1. **Flag Unlock**: Per ogni flag nella lista, verifica le condizioni e sblocca se necessario
2. **State Changes**: Aggiorna variabili di stato (es. `bootStage`, `currentPath`)
3. **Custom Effects**: Invoca funzioni custom se definite

### Generazione Output Condizionale

`generateConditionalOutput()` valuta le condizioni in ordine:

```
Per ogni condizione:
  Se condizione.if e' vera → genera condizione.then
  Se condizione.else esiste e condizione.if e' falsa → genera condizione.else
Se nessuna condizione matcha → genera output.default
```

Le condizioni supportano:

| Tipo | Campi | Esempio |
|------|-------|---------|
| `argument` | index, contains/equals/regex | Controlla argomenti del comando |
| `path` | equals/contains | Controlla working directory |
| `file` | value (path) | Verifica esistenza file |
| `flag` | value (flagId) | Verifica flag scoperta |
| `state` | variable, value | Controlla variabile di stato |
| `custom` | check (function name) | Invoca funzione custom |

### Generazione Output Template

`generateTemplateOutput()` interpolazione `{{key}}` nel template:

| Tipo variabile | Comportamento |
|----------------|---------------|
| `static` | Valore fisso da `value` |
| `computed` | Invoca funzione registrata da `compute` |
| `random` | Genera valore random tra `min`/`max` o da `options[]` |
| `state` | Legge dal context.state usando `value` come chiave |

---

## 8. Filesystem Virtuale

**File**: `src/lib/terminal-filesystem.ts`

Collezione di funzioni pure (senza stato) per navigare e interrogare il filesystem virtuale definito nella configurazione.

### Risoluzione Path

```typescript
resolvePath(inputPath: string, currentPath: string): string
```

Gestisce:
- Path relativi (risolti rispetto a `currentPath`)
- Path assoluti (iniziano con `/`)
- `~` e `~/...` (espanso a `/root`)
- `.` (directory corrente)
- `..` (directory padre)
- Path normalizzati (no doppi slash, no trailing slash)

Esempi:
```
resolvePath('etc', '/') → '/etc'
resolvePath('../usr/bin', '/etc') → '/usr/bin'
resolvePath('~/config', '/') → '/root/config'
resolvePath('.', '/etc') → '/etc'
```

### Operazioni sui Path

| Funzione | Descrizione |
|----------|-------------|
| `normalizePath(path)` | Rimuove slash ridondanti, risolve `.` e `..` |
| `joinPath(...parts)` | Unisce parti di path e normalizza |
| `getParentPath(path)` | Ritorna la directory padre |
| `getBasename(path)` | Ritorna il nome del file/directory |
| `isAbsolutePath(path)` | Controlla se il path inizia con `/` |

### Verifica Esistenza

| Funzione | Descrizione |
|----------|-------------|
| `pathExists(path, fs)` | Verifica se e' directory o file |
| `isDirectory(path, fs)` | True se il path e' nelle directory |
| `isFile(path, fs)` | True se il path e' nei file |

### Operazioni su Directory

```typescript
computeDirectoryEntries(path, filesystem): string[]
```
Calcola automaticamente i figli diretti di una directory scansionando le chiavi di `directories` e `files`. Ritorna i nomi ordinati alfabeticamente. Questa funzione elimina la necessita' di specificare manualmente le entries per ogni directory.

```typescript
getDirectoryEntries(path, filesystem): string[]
```
Ritorna l'unione di entries stored (incluse le extra/virtuali) e auto-calcolate, deduplicate e ordinate. Verifica l'esistenza della directory prima di procedere.

```typescript
listDirectory(path, filesystem, options): string[]
```
Formatta l'output come `ls`:
- `long: true` → formato `-l` con permessi, owner, size, data
- `all: true` → include `.` e `..`

### Operazioni su File

```typescript
getFileContent(path, filesystem): string | null
getFileNode(path, filesystem): FileNode | null
```

### Ricerca

```typescript
findFiles(startPath, pattern, filesystem, options): string[]
```
Ricerca ricorsiva. Opzioni:
- `type: 'f' | 'd'` - filtra per tipo
- `name: string` - pattern con `*` e `?` (convertito a regex)
- `maxDepth: number` - profondita' massima

```typescript
grepFiles(pattern, paths, filesystem, options): string[]
```
Cerca pattern regex nel contenuto dei file. Opzioni:
- `ignoreCase: boolean`
- `lineNumber: boolean`
- `recursive: boolean`

### Debug

```typescript
filesystemToTree(filesystem): string
```
Genera rappresentazione ad albero per debug:
```
└── /
    ├── bin
    ├── etc
    │   ├── shadow
    │   └── passwd
    └── usr
        └── bin
```

---

## 9. Builtin Handlers

**File**: `src/lib/terminal-builtin-handlers.ts`

Implementazioni dei comandi shell standard. Ogni handler riceve `CommandContext` e ritorna `string[]`.

### Registrazione

```typescript
registerBuiltinHandlers(executor: CommandExecutor): void
```

Registra tutti gli handler. Chiamata durante l'inizializzazione del Terminal.

### Handler Disponibili

#### File Operations

| Handler | Comando | Descrizione |
|---------|---------|-------------|
| `handleLs` | `ls` | Lista directory. Flag: `-l` (long), `-a` (all), `-la`/`-al`. Target path opzionale. |
| `handleCd` | `cd` | Cambia directory. Ritorna array vuoto su successo, errore se path non esiste o non e' directory. Il cambio effettivo del path e' gestito dal componente Terminal. |
| `handlePwd` | `pwd` | Ritorna `[context.currentPath]` |
| `handleCat` | `cat` | Mostra contenuto file. Supporta argomenti multipli. Gestisce errori: file non trovato, directory, permission denied. |
| `handleFile` | `file` | Determina tipo file. Usa `FILE_TYPES` predefiniti, poi fallback a detection da contenuto (shebang detection). |

#### Search Operations

| Handler | Comando | Descrizione |
|---------|---------|-------------|
| `handleGrep` | `grep` | Richiede minimo 2 argomenti (pattern + file). Usa `grepFiles()`. |
| `handleFind` | `find` | Path opzionale (default: cwd). Supporta `-name` e `-type f/d`. Usa `findFiles()`. |

#### System Info

| Handler | Comando | Descrizione |
|---------|---------|-------------|
| `handleMount` | `mount` | Output statico da `terminalData.MOUNT_OUTPUT` |
| `handlePs` | `ps` | Output statico da `terminalData.PS_OUTPUT` |

#### U-Boot Commands

| Handler | Comando | Descrizione |
|---------|---------|-------------|
| `handleHelp` | `?`/`help` | Output statico da `terminalData.UBOOT_HELP` |
| `handlePrintenv` | `printenv` | Output statico da `terminalData.UBOOT_PRINTENV` |
| `handleVersion` | `version` | Output statico da `terminalData.UBOOT_VERSION` |
| `handleMd` | `md` | Output statico da `terminalData.UBOOT_MD` |

#### Special

| Handler | Comando | Descrizione |
|---------|---------|-------------|
| `handleClear` | `clear` | Ritorna `['__CLEAR__']`. Il componente Terminal intercetta questo marker speciale e svuota la history. |

### Custom Functions Esportate

Queste funzioni sono registrate come custom functions nel CommandExecutor e usate come generatori per output dinamico/condizionale.

```typescript
getFileType(context: CommandContext): string[]
```
- Controlla prima `FILE_TYPES` predefiniti
- Se non trovato: verifica esistenza path, distingue directory da file
- Per file con contenuto: detecta shebang (`#!/bin/sh`, `#!/bin/bash`)
- Default: `'data'`

```typescript
getStringsOutput(context: CommandContext): string[]
```
- Controlla prima `STRINGS_OUTPUT` predefiniti
- Se non trovato: prende il contenuto del file, filtra righe non vuote, limita a 20 righe
- Default: errore `'No such file'`

---

## 10. Componente React

**File**: `src/components/features/exercise/Terminal.tsx`

Il componente React che gestisce l'interfaccia utente del terminale, il boot, l'input e la visualizzazione.

### State Management

#### Module-Level State (persistente tra remount)

Lo stato del terminale e' mantenuto a livello di modulo (fuori dal componente) per sopravvivere ai remount:

```typescript
// UART
let persistedUartHistory: HistoryLine[] | null = null;
let persistedStage: string | null = null;
let persistedUartPath = '/';
let persistedUartCmdHistory: string[] = [];

// Local
let persistedLocalHistory: HistoryLine[] | null = null;
let persistedLocalPath = '/home/kali';
let persistedLocalCmdHistory: string[] = [];
```

Quando il componente si rimonta, lo state React viene inizializzato da queste variabili. Ogni update allo state React viene sincronizzato indietro tramite `useEffect`.

#### React State

| State | Tipo | Descrizione |
|-------|------|-------------|
| `activeTab` | `'uart' \| 'local'` | Tab attivo |
| `uartHistory` | `HistoryLine[]` | Storico UART |
| `stage` | `string` | Boot stage corrente |
| `uartPath` | `string` | Working directory UART |
| `uartCmdHistory` | `string[]` | Storico comandi UART |
| `localHistory` | `HistoryLine[]` | Storico Local |
| `localPath` | `string` | Working directory Local |
| `localCmdHistory` | `string[]` | Storico comandi Local |
| `currentInput` | `string` | Input corrente |
| `cmdHistoryIndex` | `number` | Indice navigazione history (-1 = nessuno) |
| `showCompleteDialog` | `boolean` | Dialogo completamento visibile |

#### HistoryLine

```typescript
type HistoryLine = {
  type: 'output' | 'input' | 'system' | 'flag' | 'error';
  content: string;
  prompt?: string;  // Solo per 'input': il prompt mostrato prima del comando
};
```

### Inizializzazione (useMemo)

Il componente inizializza due oggetti principali con `useMemo`:

1. **TerminalConfigLoader**: Ricostruito quando `terminalConfigDynamic` cambia (config da localStorage o statica)
2. **CommandExecutor**: Creato una sola volta. Registra builtin handlers e custom functions.

```typescript
const configLoader = useMemo(() => new TerminalConfigLoader(terminalConfigDynamic), [terminalConfigDynamic]);
const executor = useMemo(() => {
  const exec = new CommandExecutor();
  registerBuiltinHandlers(exec);
  exec.registerCustomFunction('getFileType', getFileType);
  exec.registerCustomFunction('getStringsOutput', getStringsOutput);
  return exec;
}, []);
```

### Boot Sequence

Un `useEffect` monitora `stage` e `activeTab`:

1. Se il tab attivo e' UART e lo stage corrente ha `lines[]` e `duration`:
   - Calcola `lineDelay = duration / lines.length`
   - Anima le righe una alla volta con `setInterval`
   - Al termine, se `nextStage` e' definito, transita dopo 500ms

2. Se lo stage non ha duration, e' interattivo (es. U-Boot shell, login)

### Gestione Input

`handleKeyDown()` gestisce:

| Tasto | Azione |
|-------|--------|
| **Enter** | Esegue comando o gestisce stage speciali |
| **ArrowUp** | Naviga indietro nello storico comandi |
| **ArrowDown** | Naviga avanti nello storico comandi |
| **Tab** | Tab completion sui path |
| **Ctrl+L** | Pulisce lo schermo |

#### Stage Speciali (Enter su UART)

| Stage | Comportamento |
|-------|---------------|
| `uboot_wait` | Transita a `uboot_shell`, ignora input |
| `login` | Se input = `'root'` → transita a `password`. Altrimenti → "Login incorrect" |
| `password` | Se input = `'sohoadmin'` → transita a `shell`, sblocca flag `root`. Altrimenti → "Login incorrect", torna a `login` |
| `uboot_shell`/`shell` | Esecuzione normale del comando |

### Esecuzione Comandi

`executeCommand(input)`:

1. Parsa input: split per whitespace, primo token = comando, resto = argomenti
2. Costruisce `CommandContext` con path, filesystem, environment, stage, flag, history
3. Aggiunge input alla history visuale (con prompt)
4. Cerca la definizione del comando tramite `configLoader.getCommand(tabId, commandName)`
5. Se non trovato: mostra errore `"command not found"`
6. Esegue tramite `executor.executeCommand(commandDef, context)`
7. Gestisce risultato:
   - Se `!success`: mostra errore
   - Se output contiene `'__CLEAR__'`: svuota history
   - Aggiunge output alla history
8. Applica side effects:
   - `newFlags`: chiama `discoverFlag(flagId)` per ogni nuova flag
   - `stateChanges.bootStage`: aggiorna stage
   - `stateChanges.currentPath`: aggiorna path
9. Gestione speciale `cd`: verifica e aggiorna path anche senza side effects

### Tab Completion

`handleTabCompletion()`:

1. Prende l'ultimo token dell'input corrente
2. Determina la directory di ricerca (dalla parte del path prima dell'ultimo `/`)
3. Cerca entries che iniziano con il prefisso
4. Se match singolo: autocompleta (aggiunge `/` se directory)
5. Se match multipli: mostra lista nella history

### Prompt Dinamico

`getPrompt()`:

| Tab | Stage | Prompt |
|-----|-------|--------|
| Local | - | `kali@local:~/path$` |
| UART | `shell` | `/path #` |
| UART | `uboot_wait` | (vuoto) |
| UART | `uboot_shell` | `ar7100>` |
| UART | `login` | `(none) login:` |
| UART | `password` | `Password:` |
| UART | altri | (vuoto) |

### Rendering

Il componente renderizza:

1. **Header** con tab switcher (UART/Local) e barra progresso flag
2. **Area contenuto** scrollabile con history lines colorate per tipo
3. **Linea input** con prompt dinamico e campo input
4. **Dialog completamento** quando tutte le flag sono scoperte

Colori per tipo di HistoryLine:
- `error` → rosso (`text-red-400`)
- `system` → blu (`text-blue-400`)
- `flag` → giallo (`text-yellow-400`)
- `input` → bianco (`text-white`)
- `output` → grigio chiaro (`text-gray-300`)

L'input per lo stage `password` usa `type="password"` per mascherare i caratteri.

---

## 11. Configurazione Dinamica

**File**: `src/hooks/useTerminalConfig.ts`

Hook React che fornisce la configurazione del terminale con supporto per aggiornamenti in tempo reale.

### Comportamento

```typescript
const { config, isCustom } = useTerminalConfig();
```

1. **Stato iniziale**: Configurazione statica da `terminal.config.ts`
2. **Al mount**: Tenta di leggere da `localStorage['pcb-ctf-terminal-config']`
   - Se presente e valido (ha `tabs` con almeno un elemento): usa la config custom
   - Se assente o invalido: mantiene la config statica
3. **Listener**: Ascolta due eventi:
   - `StorageEvent` (cross-tab): quando un'altra tab modifica localStorage
   - `terminal-config-updated` (same-tab): evento custom dispatched da `applyTerminalConfig()`

### Chiavi localStorage

| Chiave | Uso |
|--------|-----|
| `pcb-ctf-terminal-config` | Configurazione finale applicata (letta dal terminale) |
| `pcb-ctf-terminal-settings-draft` | Stato draft dello store Zustand (per persistenza editing) |

La separazione e' intenzionale: il terminale legge solo la config "applicata", non il draft in corso di modifica.

---

## 12. Settings Store

**File**: `src/store/terminalSettingsStore.ts`

Store Zustand con middleware `persist` per la gestione dell'editing della configurazione terminale dalla UI Settings.

### Draft Types

Lo store usa tipi "draft" semplificati per l'editing UI:

- `DraftTab`: `{ id, name, initialPath, environment }`
- `DraftCommand`: `{ id, tabId, name, description, aliases, handler, builtinType, constraints, output, flagUnlocks, stateChanges }`
- `DraftConditionalRule`: `{ argIndex, matchType, matchValue, output }`
- `DraftFlagUnlock`: `{ flagId, conditional, argIndex, matchType, matchValue }`
- `DraftFlagPart`: `{ id, part, description, hint }`
- `DraftBootStage`: `{ id, tabId, name, lines, duration, nextStage, prompt }`
- `DraftFilesystemEntry`: `{ id, tabId, type, path, content, extraEntries }` (`extraEntries`: voci virtuali per le directory, visibili in `ls` ma senza record file)

### State

```typescript
{
  // Dati
  tabs: DraftTab[],
  commands: DraftCommand[],
  bootStages: DraftBootStage[],
  filesystemEntries: DraftFilesystemEntry[],
  flagParts: DraftFlagPart[],
  completeFlag: string,
  configName: string,
  configDescription: string,

  // UI
  activeSection: 'commands' | 'flags' | 'boot' | 'filesystem' | 'tabs',
  activeTabId: string,
  activeCommandId: string | null,
  editingCommandId: string | null,
  initialized: boolean,
}
```

### Operazioni CRUD

Ogni entita' ha operazioni add/update/delete:

| Entita' | Add | Update | Delete | Extra |
|---------|-----|--------|--------|-------|
| Tab | `addTab()` | `updateTab(id, data)` | `deleteTab(id)` | - |
| Command | `addCommand(tabId)` | `updateCommand(id, data)` | `deleteCommand(id)` | `duplicateCommand(id)` |
| Flag Part | `addFlagPart()` | `updateFlagPart(id, data)` | `deleteFlagPart(id)` | `updateCompleteFlag(flag)` |
| Boot Stage | `addBootStage(tabId)` | `updateBootStage(id, data)` | `deleteBootStage(id)` | `reorderBootStage(id, dir)` |
| Filesystem | `addFilesystemEntry(tabId, type)` | `updateFilesystemEntry(id, data)` | `deleteFilesystemEntry(id)` | - |

### Conversione Config ↔ Draft

```typescript
// Config → Draft (per caricare)
loadFromTerminalConfig(config: TerminalConfig): void

// Draft → Config (per esportare)
exportAsTerminalConfig(): TerminalConfig
```

`commandDefToDraft()` converte una `CommandDefinition` nel formato draft estraendo:
- Flag unlock conditions da `sideEffects.unlockFlags`
- State changes da `sideEffects.setState`
- Conditional rules da output di tipo `'conditional'`

`draftToCommandDef()` ricostruisce la `CommandDefinition` completa dal formato draft.

### Persistenza

| Azione | Metodo | Destinazione |
|--------|--------|-------------|
| Applica config | `applyTerminalConfig()` | localStorage + dispatchEvent |
| Salva su file | `saveToFile()` | POST `/api/terminal-config/save` → `terminal.override.json` |
| Carica da file | `loadFromFile()` | GET `/api/terminal-config/load` → store |
| Carica da storage | `loadFromStorage()` | localStorage → store |
| Reset | `resetAll()` | Svuota tutto lo store |

Il middleware `persist` di Zustand salva automaticamente lo stato draft (escludendo proprieta' UI non necessarie) in `localStorage['pcb-ctf-terminal-settings-draft']`.

---

## 13. Pipeline di Esecuzione

Flusso completo dall'input dell'utente al risultato a schermo:

```
1. Utente digita comando e preme Enter
        │
        v
2. Terminal.handleKeyDown()
   ├── Stage speciale? (uboot_wait, login, password)
   │   └── Gestione diretta (transizione stage, login flow)
   └── Stage normale? → executeCommand(input)
        │
        v
3. Terminal.executeCommand()
   ├── Parse input → commandName + args
   ├── Build CommandContext
   ├── Aggiungi input alla history visuale
   ├── configLoader.getCommand(tabId, commandName)
   │   ├── Non trovato → errore "command not found"
   │   └── Trovato → commandDef
   │
   v
4. executor.executeCommand(commandDef, context)
   │
   ├── Step 1: validateConstraints()
   │   ├── path → validatePath()
   │   ├── permissions → validatePermissions()
   │   ├── prerequisites → validatePrerequisites()
   │   ├── arguments → validateArguments()
   │   └── state → validateState()
   │   [Se fallisce: return { success: false, error: "..." }]
   │
   ├── Step 2: Genera output
   │   ├── builtin → executeBuiltinCommand() → handler(context) → string[]
   │   ├── custom → generateOutput(command.output, context) → string[]
   │   ├── dynamic → executeDynamicCommand() → customFunction(context) → string[]
   │   └── script → executeScriptCommand() → scriptFunction(context) → string[]
   │
   └── Step 3: applySideEffects()
       ├── unlockFlags → checkCondition() → newFlags[]
       ├── setState → stateChanges{}
       └── customEffect → customFunction()
   │
   v
5. Terminal processa risultato
   ├── Output → aggiunge righe alla history
   ├── newFlags → discoverFlag() per ognuna
   ├── stateChanges.bootStage → setStage()
   ├── stateChanges.currentPath → setPath()
   └── cd special → verifica e aggiorna path
```

---

## 14. Sistema di Boot

Il boot sequence e' un sistema di stati finiti (FSM) che governa la progressione del terminale UART.

### Diagramma degli Stati

```
[connecting] ──1500ms──> [booting] ──2000ms──> [uboot_wait]
                                                    │
                                          user presses Enter
                                                    │
                                                    v
                                             [uboot_shell]
                                                    │
                                           user types "boot"
                                                    │
                                                    v
                                            [kernel_boot] ──2500ms──> [login]
                                                                        │
                                                              user types "root"
                                                                        │
                                                                        v
                                                                   [password]
                                                                        │
                                                             user types "sohoadmin"
                                                                        │
                                                                        v
                                                                     [shell]
                                                               (interactive)
```

### Stage Animati vs Interattivi

| Tipo | Caratteristiche | Esempio |
|------|----------------|---------|
| Animato | Ha `duration` e `nextStage`. Le righe scorrono automaticamente. | `connecting`, `booting`, `kernel_boot` |
| Semi-interattivo | Ha `duration` e `nextStage`, ma anche `prompt`. Mostra un messaggio e attende input prima di proseguire. | `uboot_wait` |
| Interattivo | Non ha `duration`. Resta nello stage finche' un comando non causa una transizione. | `uboot_shell`, `login`, `password`, `shell` |

### Transizioni di Stage

Le transizioni avvengono in due modi:

1. **Automatica**: Dopo l'animazione di uno stage con `nextStage`, il terminale transita automaticamente.
2. **Via Side Effects**: Un comando con `sideEffects.setState.bootStage` forza la transizione. Es. il comando `boot` transita da `uboot_shell` a `kernel_boot`.
3. **Via Logica Componente**: Il componente Terminal gestisce direttamente login/password (hardcoded nel handler Enter).

### Vincoli Stato-Comando

I comandi usano `constraints.state.bootStage` per limitare la disponibilita':

```typescript
// Questo comando e' disponibile SOLO nello stage 'uboot_shell'
constraints: {
  state: { bootStage: 'uboot_shell' }
}

// Questo comando e' disponibile in 'shell' E 'uboot_shell'
constraints: {
  state: { bootStage: ['shell', 'uboot_shell'] }
}

// Questo comando e' disponibile in TUTTI gli stage (nessun vincolo state)
constraints: {}
```

Se un comando viene eseguito in uno stage non permesso, il `CommandExecutor` ritorna un errore di validazione e il comando non viene processato.

---

## 15. Sistema delle Flag

Il sistema flag e' il meccanismo centrale della sfida CTF.

### Struttura

La flag completa e': `flag{b00t_r00t_h4sh_l34k_1nj3ct_sh3ll}`

Composta da 6 parti:

| ID | Parte | Come si sblocca |
|----|-------|-----------------|
| `boot` | `b00t` | Eseguire `printenv` nella shell U-Boot |
| `root` | `_r00t` | Login con credenziali `root`/`sohoadmin` |
| `hash` | `_h4sh` | Cracking hash MD5 con `hashcat` o `john` (tab Local) |
| `leak` | `_l34k` | Eseguire `strings /dev/mtdblock3` |
| `inject` | `_1nj3ct` | Eseguire `strings` su httpd |
| `shell` | `_sh3ll` | Eseguire `file` o `strings` su `/usr/bin/backdoorTest` |

### Meccanismo di Sblocco

1. Un comando viene eseguito con successo
2. Il `CommandExecutor` processa i `sideEffects.unlockFlags`
3. Per ogni flag:
   - Se e' una stringa semplice (es. `'boot'`): sblocca incondizionatamente
   - Se e' un `FlagUnlock` con `condition`: valuta la condizione prima
4. Le flag sbloccate vengono ritornate in `result.sideEffects.newFlags`
5. Il componente Terminal chiama `discoverFlag(flagId)` per ognuna
6. `discoverFlag()` aggiorna lo store `exerciseStore` tramite `addTerminalDiscovery()`

### Visualizzazione Progresso

Nella header del terminale, una barra mostra:
- Rettangolini verdi per le flag scoperte
- Rettangolini grigi per le flag non scoperte
- Counter `N/6`

### Flag Parziale

`configLoader.buildCurrentFlag(discoveredFlags)` genera la flag corrente sostituendo le parti non scoperte con `?`:

```
// Nessuna flag: flag{????_?????_?????_?????_??????_?????}
// Solo boot:   flag{b00t_?????_?????_?????_??????_?????}
// Tutte:       flag{b00t_r00t_h4sh_l34k_1nj3ct_sh3ll}
```

### Completamento

Quando `terminalDiscoveries.length === flagParts.length`, il componente mostra `TerminalChallengeCompleteDialog` con la flag completa copiabile.

---

## 16. Estensione e Personalizzazione

### Aggiungere un Nuovo Comando

#### Via Configurazione (consigliato)

Nella UI Settings (tab Terminal > sezione Comandi), oppure direttamente nel file `terminal.config.ts`:

```typescript
mycommand: {
  name: 'mycommand',
  aliases: ['mc'],
  description: 'Il mio comando custom',
  handler: 'custom',  // Usa output dalla configurazione
  constraints: {
    state: { bootStage: 'shell' },  // Solo nella shell
    arguments: { min: 1 },          // Richiede almeno 1 argomento
  },
  output: {
    type: 'conditional',
    conditions: [
      {
        if: { type: 'argument', index: 0, equals: 'secret' },
        then: { type: 'static', lines: ['Hai trovato il segreto!'] },
      },
    ],
    default: { type: 'static', lines: ['Nessun risultato per questo argomento.'] },
  },
  sideEffects: {
    unlockFlags: [{
      id: 'myFlag',
      condition: { type: 'argument', index: 0, equals: 'secret' },
    }],
  },
},
```

#### Via Codice (per handler complessi)

1. Creare il handler in `terminal-builtin-handlers.ts`:
```typescript
function handleMyCommand(context: CommandContext): string[] {
  // Logica complessa qui
  return ['output'];
}
```

2. Registrare il handler:
```typescript
executor.registerBuiltinHandler('mycommand', handleMyCommand);
```

3. Definire il comando nella config con `handler: 'builtin'` e `builtinType: 'mycommand'`.

### Aggiungere un Nuovo File al Filesystem

Nella config del tab appropriato:

```typescript
filesystem: {
  directories: {
    '/': ['bin', 'etc', 'newdir'],
    '/newdir': ['file.txt'],
  },
  files: {
    '/newdir/file.txt': {
      name: 'file.txt',
      type: 'file',
      content: 'Contenuto del file',
      permissions: '-rw-r--r--',
      owner: 'root',
    },
  },
}
```

Nota: la directory padre deve avere il nome della entry nel suo array, E la directory figlia deve essere registrata in `directories`.

### Aggiungere un Nuovo Boot Stage

```typescript
bootSequence: {
  initialStage: 'connecting',
  stages: [
    // ... stage esistenti ...
    {
      id: 'custom_stage',
      name: 'My Custom Stage',
      lines: ['Riga 1', 'Riga 2', 'Riga 3'],
      duration: 2000,      // 2 secondi di animazione
      nextStage: 'shell',  // Transizione automatica alla shell
    },
  ],
}
```

### Aggiungere una Nuova Flag Part

1. Aggiungere la definizione nella `FlagSystem`:
```typescript
flags: {
  parts: [
    // ... parti esistenti ...
    { id: 'myflag', part: 'fl4g', description: 'La mia flag', hint: 'Cerca...' },
  ],
  completeFlag: 'flag{b00t_r00t_h4sh_l34k_1nj3ct_sh3ll_fl4g}',
}
```

2. Aggiungere lo sblocco a un comando con `sideEffects.unlockFlags`.

### Aggiungere un Nuovo Tab

```typescript
tabs: [
  // ... tab esistenti ...
  {
    id: 'custom_tab',
    name: 'My Custom Tab',
    initialPath: '/home/user',
    filesystem: { directories: { '/': ['home'], '/home': ['user'], '/home/user': [] }, files: {} },
    commands: { /* ... */ },
    environment: { USER: 'user', HOME: '/home/user', SHELL: '/bin/bash' },
    // bootSequence e' opzionale
  },
]
```

Nota: il componente Terminal attualmente gestisce solo due tab (`uart` e `local`) nell'UI. Per supportare tab aggiuntivi dalla configurazione e' necessario modificare il componente Terminal per renderizzare tab dinamicamente dalla configurazione.

### Aggiungere Custom Functions

1. Implementare la funzione:
```typescript
function myCustomFunction(context: CommandContext): string[] {
  const arg = context.args[0];
  // Logica custom
  return [`Risultato per ${arg}`];
}
```

2. Registrare nel Terminal.tsx:
```typescript
exec.registerCustomFunction('myCustomFunction', myCustomFunction);
```

3. Usare nella config:
```typescript
output: {
  type: 'dynamic',
  generator: 'myCustomFunction',
}
```

---

## Appendice: Chiavi localStorage

| Chiave | Contenuto | Usata da |
|--------|-----------|----------|
| `pcb-ctf-terminal-config` | `TerminalConfig` JSON (config applicata) | `useTerminalConfig()`, `applyTerminalConfig()` |
| `pcb-ctf-terminal-settings-draft` | Draft state Zustand (editing in corso) | `terminalSettingsStore` (persist middleware) |
| `pcb-ctf-exercise-config` | Exercise config (PCB, steps, objectives) | `settingsStore` |

## Appendice: Eventi Custom

| Evento | Dispatched da | Ascoltato da | Scopo |
|--------|-------------|-------------|-------|
| `terminal-config-updated` | `applyTerminalConfig()` | `useTerminalConfig()` | Notifica lo stesso tab che la config e' cambiata |
| `storage` (nativo) | Browser (cross-tab) | `useTerminalConfig()` | Notifica altre tab che localStorage e' cambiato |

## Appendice: Marker Speciali

| Marker | Generato da | Intercettato da | Azione |
|--------|------------|-----------------|--------|
| `__CLEAR__` | `handleClear()` | `Terminal.executeCommand()` | Svuota la history del tab attivo |
