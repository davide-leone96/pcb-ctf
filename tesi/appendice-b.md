# Appendice B — Schema della configurazione terminale

Si riporta lo schema completo della struttura dati `TerminalConfig`, che definisce il comportamento del terminale simulato nella piattaforma PCB-CTF. Lo schema governa l'intero sistema: tab, comandi, filesystem, sequenza di boot, flag e vincoli di esecuzione.

Nel formato di persistenza, la configurazione terminale è incapsulata in un array di **componenti terminale**, ciascuno con un proprio identificatore, nome e configurazione indipendente:

```jsonc
[
  {
    "id": "<string>",           // Identificatore univoco del componente
    "name": "<string>",         // Nome descrittivo (es. "UART Console")
    "config": { /* TerminalConfig */ }
  }
]
```

Questa struttura modulare consente di definire più terminali indipendenti nello stesso esercizio (ad esempio, una console UART e una macchina locale), ciascuno con il proprio filesystem, comandi e sequenza di boot.

---

## B.1 Struttura principale (`TerminalConfig`)

```jsonc
{
  "metadata": {
    "version": "<string>",          // Versione dello schema (es. "1.0.0")
    "name": "<string>",             // Nome della configurazione
    "description": "<string>",      // Descrizione testuale
    "author?": "<string>"           // Autore della configurazione
  },

  "tabs": [ /* TabConfig[] — vedi §B.2 */ ],

  "flags?": { /* FlagSystem — vedi §B.5 */ },

  "globalCommands?": {
    // Comandi disponibili in tutti i tab. Stessa struttura di
    // CommandDefinition (§B.3). Utile per comandi trasversali
    // come "help" o "exit".
    "<commandName>": { /* CommandDefinition */ }
  },

  "customFunctions?": {
    // Funzioni JavaScript custom referenziabili dai generatori
    // di output dinamico e dagli effetti collaterali.
    "<functionName>": "<string>"    // Codice della funzione
  }
}
```


## B.2 Configurazione del tab (`TabConfig`)

Ogni tab rappresenta un ambiente terminale indipendente, con il proprio filesystem, set di comandi, variabili d'ambiente e sequenza di boot opzionale.

```jsonc
{
  "id": "<string>",                     // Identificatore univoco del tab
  "name": "<string>",                   // Nome visualizzato (es. "UART Console")
  "initialPath?": "<string>",           // Directory iniziale (default: "/")

  "filesystem": { /* FilesystemStructure — vedi §B.4 */ },

  "commands": {
    // Dizionario dei comandi disponibili nel tab.
    // La chiave è il nome del comando; il valore è un CommandDefinition.
    "<commandName>": { /* CommandDefinition — vedi §B.3 */ }
  },

  "bootSequence?": {
    // Sequenza di boot animata, riprodotta all'apertura del terminale.
    "initialStage": "<string>",         // ID del primo stadio
    "stages": [
      {
        "id": "<string>",              // Identificatore dello stadio
        "name": "<string>",            // Nome descrittivo
        "lines": ["<string>"],         // Righe di testo animate
        "duration?": "<number>",       // Durata in millisecondi
        "nextStage?": "<string>",      // Stadio successivo (auto-transizione)
        "prompt?": "<string>",         // Prompt dello stadio (se interattivo)
        "autoProgressTimeout?": "<number>"
        // Timeout in millisecondi per l'auto-progressione.
        // Se configurato, lo stadio avanza automaticamente allo
        // stadio successivo dopo il periodo indicato di inattività.
        // L'input dell'utente annulla il timeout in corso.
        // Utile per replicare il countdown "Hit any key to stop
        // autoboot" dei bootloader.
      }
    ]
  },

  "environment?": {
    // Variabili d'ambiente del tab. Accessibili dai comandi template.
    "USER": "<string>",
    "HOME": "<string>",
    "PATH": "<string>",
    "SHELL": "<string>"
    // ... qualsiasi coppia chiave-valore
  },

  "defaultConstraints?": { /* CommandConstraints — vedi §B.3.1 */ }
  // Vincoli applicati a tutti i comandi del tab.
  // I vincoli specificati a livello di singolo comando hanno
  // precedenza su quelli di default.
}
```

### Stadi speciali della sequenza di boot

Il terminale riconosce tre identificatori di stadio con comportamento hardcoded:

| ID stadio | Comportamento |
|---|---|
| `uboot_wait` | Mostra un messaggio "Hit any key to stop autoboot" con countdown. Se lo studente preme un tasto, transita allo stadio successivo (tipicamente `uboot_shell`); altrimenti, il boot prosegue automaticamente. |
| `login` | Mostra un prompt di login. L'input dello studente viene trattato come nome utente e inoltrato al sistema di comandi per la validazione. |
| `password` | Mostra un prompt di password (input mascherato). L'input viene inoltrato al sistema di comandi; il comando corrispondente alla password corretta deve produrre la transizione allo stadio `shell`. |


## B.3 Definizione di un comando (`CommandDefinition`)

```jsonc
{
  "name?": "<string>",
  // Nome del comando. Opzionale: se omesso, viene derivato dalla
  // chiave nel dizionario commands.

  "aliases?": ["<string>"],
  // Nomi alternativi che invocano lo stesso comando.
  // Es. ["help"] come alias di "?".

  "description": "<string>",
  // Descrizione del comando (usata internamente e nell'eventuale help).

  "usage?": "<string>",
  // Stringa di utilizzo (es. "cat <file>").

  "handler": "<'builtin' | 'custom' | 'script' | 'dynamic'>",
  // Tipo di handler che gestisce l'esecuzione:
  //   "builtin"  — implementazione nativa in JavaScript (ls, cd, cat, etc.)
  //   "custom"   — output definito nella configurazione
  //   "script"   — esecuzione di una funzione JavaScript custom
  //   "dynamic"  — generazione dinamica tramite funzione registrata

  "builtinType?": "<string>",
  // Per handler="builtin": nome dell'implementazione nativa.
  // Valori supportati: "ls", "cd", "cat", "pwd", "grep", "find", "clear"

  "constraints?": { /* CommandConstraints — vedi §B.3.1 */ },

  "output?": { /* CommandOutput — vedi §B.3.2 */ },

  "sideEffects?": {
    // Effetti collaterali eseguiti dopo la produzione dell'output.

    "unlockFlags?": [
      // Flag da sbloccare. Può essere:
      //   - una stringa (ID del flag, sbloccato incondizionatamente)
      //   - un oggetto FlagUnlock con condizione

      "<string>",
      // oppure:
      {
        "id": "<string>",              // ID del flag da sbloccare
        "condition?": { /* ConditionCheck — vedi §B.3.3 */ }
        // Se presente, il flag viene sbloccato solo se la condizione
        // è soddisfatta (es. argomento specifico passato al comando).
      }
    ],

    "setState?": {
      // Modifica variabili di stato del terminale.
      // Uso tipico: transizione dello stadio di boot.
      "bootStage": "<string>",
      // ... qualsiasi coppia chiave-valore
    },

    "executeCommand?": "<string>",
    // Comando da eseguire automaticamente dopo quello corrente.

    "customEffect?": "<string>"
    // Nome di una funzione custom da invocare.
  },

  "help?": "<string>"
  // Testo di aiuto esteso.
}
```

### B.3.1 Vincoli del comando (`CommandConstraints`)

I vincoli determinano le condizioni sotto le quali un comando può essere eseguito. Se un vincolo non è soddisfatto, il comando produce un messaggio di errore configurabile.

```jsonc
{
  "path?": {
    // Vincolo sul percorso corrente del filesystem.
    "type": "<'exact' | 'contains' | 'startsWith' | 'regex'>",
    "value": "<string | string[]>",     // Valore o lista di valori ammessi
    "errorMessage?": "<string>"
  },

  "permissions?": {
    // Vincolo sui permessi dell'utente.
    "requireRoot?": "<boolean>",        // Richiede utente root
    "requireUser?": "<string>",         // Richiede un utente specifico
    "errorMessage?": "<string>"
  },

  "prerequisites?": {
    // Vincolo su prerequisiti (comandi eseguiti, file esistenti, flag).
    "commands?": ["<string>"],          // Comandi che devono essere stati eseguiti
    "files?": ["<string>"],             // File che devono esistere
    "flags?": ["<string>"],             // Flag che devono essere state scoperte
    "condition?": "<'all' | 'any'>",    // Logica di combinazione (default: "all")
    "errorMessage?": "<string>"
  },

  "arguments?": {
    // Vincolo sugli argomenti passati al comando.
    "min?": "<number>",                 // Numero minimo di argomenti
    "max?": "<number>",                 // Numero massimo di argomenti
    "required?": [
      {
        "index": "<number>",            // Posizione dell'argomento (0-based)
        "pattern?": "<string>",         // Pattern regex che deve matchare
        "errorMessage?": "<string>"
      }
    ],
    "errorMessage?": "<string>"
  },

  "state?": {
    // Vincolo sullo stato del terminale.
    "bootStage?": "<string | string[]>",
    // Stadio (o stadi) di boot in cui il comando è disponibile.
    // Uso tipico: limitare comandi U-Boot allo stadio "uboot_shell",
    // comandi filesystem allo stadio "shell".

    "variables?": {
      // Variabili di stato che devono avere valori specifici.
      "<key>": "<any>"
    },
    "errorMessage?": "<string>"
  }
}
```

### B.3.2 Tipi di output (`CommandOutput`)

Il sistema supporta sei tipi di output, ciascuno con semantica e struttura propria.

#### Output statico

```jsonc
{
  "type": "static",
  "lines": ["<string>"]
  // Array di righe restituite verbatim.
}
```

#### Output condizionale

```jsonc
{
  "type": "conditional",
  "conditions": [
    {
      "if": { /* ConditionCheck */ },
      "then": { /* CommandOutput */ },
      "else?": { /* CommandOutput */ }
    }
  ],
  "default?": { /* CommandOutput */ }
  // Valutazione sequenziale: la prima condizione soddisfatta
  // determina l'output. Se nessuna è vera, si usa default.
}
```

#### Output template

```jsonc
{
  "type": "template",
  "template": "<string>",
  // Stringa con placeholder {{variabile}}.

  "variables": {
    "<name>": {
      "type": "<'static' | 'computed' | 'random' | 'state'>",
      "value?": "<any>",               // Per type="static"
      "min?": "<number>",              // Per type="random": limite inferiore
      "max?": "<number>",              // Per type="random": limite superiore
      "options?": ["<string>"],        // Per type="random": scelta tra opzioni
      "compute?": "<string>"           // Per type="computed": nome funzione
    }
  }
}
```

#### Output lookup

```jsonc
{
  "type": "lookup",
  "argIndex": "<number>",
  // Indice dell'argomento da confrontare (0-based).

  "matchType": "<'contains' | 'equals' | 'regex'>",
  // Strategia di matching.

  "table": {
    // Mappa valore → output. La chiave è il valore da matchare,
    // il valore è l'array di righe da restituire.
    "<matchValue>": ["<string>"]
  },

  "default?": { /* CommandOutput */ }
  // Output di fallback se nessun match.
}
```

#### Output dinamico

```jsonc
{
  "type": "dynamic",
  "generator": "<string>",     // Nome della funzione generatore
  "args?": ["<any>"]           // Argomenti opzionali
}
```

#### Output script

```jsonc
{
  "type": "script",
  "script": "<string>"         // Nome funzione o script inline
}
```

### B.3.3 Controllo delle condizioni (`ConditionCheck`)

Le condizioni sono utilizzate sia negli output condizionali sia nello sblocco condizionale delle flag.

```jsonc
{
  "type": "<'argument' | 'path' | 'file' | 'flag' | 'state' | 'custom'>",

  // Per type="argument":
  "index?": "<number>",            // Indice dell'argomento (0-based)
  "contains?": "<string>",         // L'argomento contiene la stringa
  "equals?": "<string>",           // L'argomento è esattamente uguale
  "regex?": "<string>",            // L'argomento matcha il pattern regex

  // Per type="file":
  "exists?": "<boolean>",          // Il file esiste/non esiste

  // Per type="state":
  "variable?": "<string>",         // Nome della variabile di stato
  "value?": "<any>",               // Valore atteso

  // Per type="custom":
  "check?": "<string>"             // Nome della funzione di verifica
}
```


## B.4 Struttura del filesystem (`FilesystemStructure`)

Il filesystem del terminale supporta due formati di definizione: un formato ad **albero annidato** (più leggibile per l'autore) e un formato **piatto** (utilizzato internamente dal sistema). Il `TerminalConfigLoader` converte automaticamente il formato annidato in formato piatto al caricamento.

```jsonc
{
  "tree?": {
    // Formato annidato: le chiavi sono nomi di file/directory.
    // - Se il valore è una stringa → file con quel contenuto
    // - Se il valore è un oggetto → directory (ricorsiva)
    // - Se il valore è un oggetto vuoto {} → directory vuota

    "etc": {                                    // directory
      "passwd": "root:x:0:0:root:/root:/bin/sh",   // file
      "rc.d": {                                 // sotto-directory
        "rcS": "#!/bin/sh\nmount -a\n..."       // file
      }
    },
    "tmp": {}                                   // directory vuota
  },

  "directories": {
    // Formato piatto: percorso → lista di entry contenute.
    // Popolato automaticamente dal loader a partire da tree.
    "/": ["etc", "tmp"],
    "/etc": ["passwd", "rc.d"],
    "/etc/rc.d": ["rcS"]
  },

  "files": {
    // Formato piatto: percorso completo → contenuto o metadati.
    // Può essere una stringa (shorthand) o un oggetto FileNode.

    "/etc/passwd": "root:x:0:0:root:/root:/bin/sh",
    // oppure:
    "/etc/passwd": {
      "name": "passwd",
      "type": "file",
      "content": "root:x:0:0:root:/root:/bin/sh",
      "permissions?": "-rw-r--r--",
      "owner?": "root",
      "size?": 37,
      "modified?": "Jun 16 2015",
      "metadata?": {}
    }
  },

  "fileDefaults?": {
    // Valori di default per permessi e proprietario, applicati
    // a tutti i file che non specificano valori propri.
    "permissions?": "<string>",     // Es. "-rw-r--r--"
    "owner?": "<string>"            // Es. "root"
  }
}
```

### Processo di normalizzazione

Il `TerminalConfigLoader` esegue la normalizzazione del filesystem in quattro fasi:

1. **Flatten** — converte il `tree` annidato in strutture piatte `directories` e `files`;
2. **Normalize** — assicura che tutte le directory intermedie siano presenti e che la root `/` esista;
3. **Compute** — calcola le dimensioni dei file e verifica la coerenza dei percorsi;
4. **Build** — genera la struttura finale pronta per l'uso da parte dei comandi built-in.


## B.5 Sistema di flag (`FlagSystem`)

```jsonc
{
  "parts": [
    {
      "id": "<string>",
      // Identificatore univoco del frammento di flag.
      // Referenziato nei sideEffects.unlockFlags dei comandi.

      "part": "<string>",
      // Testo del frammento. Contribuisce alla costruzione
      // progressiva della flag visibile allo studente.

      "description": "<string>",
      // Descrizione del frammento (visibile nel pannello di
      // progressione).

      "hint": "<string>"
      // Suggerimento per lo studente.
    }
  ],

  "completeFlag": "<string>",
  // Flag finale completa, risultante dalla concatenazione di
  // tutti i frammenti. Esempio: "flag{b00t_r00t_h4sh_l34k_1nj3ct_sh3ll}"

  "showProgress?": "<boolean>"
  // Se true, mostra la barra di progressione con i frammenti
  // scoperti e quelli ancora nascosti.
}
```


## B.6 Contesto di esecuzione (`CommandContext`)

Per completezza, si riporta la struttura del contesto passato a ogni esecuzione di comando. Questa interfaccia non è configurabile dall'autore, ma è costruita automaticamente dal sistema a runtime.

```jsonc
{
  "command": "<string>",            // Nome del comando eseguito
  "args": ["<string>"],             // Argomenti passati
  "currentPath": "<string>",        // Directory corrente
  "filesystem": { /* FilesystemStructure */ },
  "environment": { /* Record<string, string> */ },
  "bootStage": "<string>",          // Stadio di boot corrente
  "discoveredFlags": ["<string>"],  // Flag già scoperte
  "history": ["<string>"],          // Storico dei comandi eseguiti
  "state": { /* Record<string, any> */ },  // Variabili di stato
  "tab": "<string>"                 // ID del tab corrente
}
```


## B.7 Risultato dell'esecuzione (`CommandExecutionResult`)

Analogamente, la struttura del risultato restituito dall'esecutore al termine di ogni comando:

```jsonc
{
  "success": "<boolean>",           // Esecuzione riuscita
  "output": ["<string>"],           // Righe di output
  "error?": "<string>",             // Messaggio di errore (se fallita)
  "sideEffects?": {
    "newFlags?": ["<string>"],      // Flag sbloccate dal comando
    "stateChanges?": {},            // Variabili di stato modificate
    "stageChange?": "<string>",     // Nuovo stadio di boot
    "pathChange?": "<string>"       // Nuova directory corrente
  }
}
```


## B.8 Esempio: configurazione del tab UART Console

Si riporta un estratto semplificato della configurazione del tab "UART Console" dal caso di studio, che illustra l'uso combinato di comandi built-in, comandi custom con vincoli di boot stage, output lookup con sblocco condizionale di flag, e sequenza di boot multi-stadio.

```json
{
  "id": "uart",
  "name": "UART Console",
  "initialPath": "/",
  "filesystem": {
    "tree": {
      "etc": {
        "passwd": "root:x:0:0:root:/root:/bin/sh",
        "shadow": "root:$1$GTN.gpri$DlSyKvZKMR9A9Uj9e9wR3/:15771:0:99999:7:::"
      },
      "proc": {
        "cpuinfo": "system type  : QCA953x\nprocessor  : 0\ncpu model  : MIPS 24Kc V7.4"
      }
    },
    "directories": {},
    "files": {},
    "fileDefaults": { "permissions": "-rw-r--r--", "owner": "root" }
  },
  "commands": {
    "ls":  { "handler": "builtin", "builtinType": "ls", "description": "List directory contents" },
    "cat": { "handler": "builtin", "builtinType": "cat", "description": "Display file contents",
             "constraints": { "arguments": { "min": 1 } } },
    "printenv": {
      "description": "Print environment variables",
      "handler": "custom",
      "constraints": { "state": { "bootStage": "uboot_shell" } },
      "output": {
        "type": "static",
        "lines": [
          "bootargs=console=ttyS0,115200 root=31:2 rootfstype=jffs2 init=/sbin/init",
          "bootcmd=bootm 0x9f020000",
          "bootdelay=1",
          "baudrate=115200"
        ]
      },
      "sideEffects": { "unlockFlags": ["boot"] }
    },
    "strings": {
      "description": "Print printable characters in files",
      "handler": "custom",
      "constraints": { "arguments": { "min": 1 } },
      "output": {
        "type": "lookup",
        "argIndex": 0,
        "matchType": "contains",
        "table": {
          "mtdblock3": ["TP-LINK_807C", "WPA2-PSK", "MyW1F1P@ssw0rd!", "192.168.0.1"],
          "httpd":     ["execFormatCmd", "system", "popen"],
          "backdoorTest": ["socket", "connect", "/bin/sh", "192.168.0.100", "4444"]
        }
      },
      "sideEffects": {
        "unlockFlags": [
          { "id": "leak",   "condition": { "type": "argument", "index": 0, "contains": "mtdblock3" } },
          { "id": "inject", "condition": { "type": "argument", "index": 0, "contains": "httpd" } },
          { "id": "shell",  "condition": { "type": "argument", "index": 0, "contains": "backdoorTest" } }
        ]
      }
    },
    "root": {
      "description": "Login as root",
      "handler": "custom",
      "constraints": { "state": { "bootStage": "login" } },
      "sideEffects": { "setState": { "bootStage": "password", "loginUser": "root" } }
    },
    "sohoadmin": {
      "description": "Enter password",
      "handler": "custom",
      "constraints": { "state": { "bootStage": "password" } },
      "output": {
        "type": "static",
        "lines": ["", "BusyBox v1.01 Built-in shell (ash)", "Enter 'help' for a list of built-in commands.", ""]
      },
      "sideEffects": {
        "unlockFlags": ["root"],
        "setState": { "bootStage": "shell", "currentPath": "/" }
      }
    }
  },
  "bootSequence": {
    "initialStage": "connecting",
    "stages": [
      { "id": "connecting",   "name": "Connecting",  "lines": ["Connecting to UART interface..."], "duration": 1500, "nextStage": "booting" },
      { "id": "booting",      "name": "Booting",     "lines": ["U-Boot 1.1.4 (Jun 16 2015)", "DRAM: 32 MB", "Flash: 4 MB"], "duration": 2000, "nextStage": "uboot_wait" },
      { "id": "uboot_wait",   "name": "U-Boot Wait", "lines": ["Hit any key to stop autoboot: 3"], "duration": 1000, "nextStage": "uboot_shell", "prompt": "Press Enter to access U-Boot console" },
      { "id": "uboot_shell",  "name": "U-Boot Shell","lines": ["U-Boot> "], "prompt": "U-Boot> " },
      { "id": "kernel_boot",  "name": "Kernel Boot", "lines": ["Booting QCA953x", "Linux version 2.6.31", "VFS: Mounted root (squashfs) readonly"], "duration": 2500, "nextStage": "login" },
      { "id": "login",        "name": "Login",       "lines": ["TP-LINK login: "], "prompt": "Login: " },
      { "id": "password",     "name": "Password",    "lines": [], "prompt": "Password: " },
      { "id": "shell",        "name": "Shell",       "lines": ["BusyBox v1.01 Built-in shell (ash)"], "prompt": "# " }
    ]
  },
  "environment": { "USER": "root", "HOME": "/root", "PATH": "/bin:/sbin:/usr/bin:/usr/sbin", "SHELL": "/bin/sh" },
  "defaultConstraints": { "state": { "bootStage": "shell" } }
}
```

Questo esempio illustra i principali pattern di configurazione:

- I comandi `ls` e `cat` utilizzano handler built-in con vincoli sugli argomenti;
- Il comando `printenv` è limitato allo stadio `uboot_shell` e sblocca incondizionatamente la flag `boot`;
- Il comando `strings` usa un output di tipo lookup con sblocco condizionale: la flag sbloccata dipende dall'argomento passato dallo studente;
- I comandi `root` e `sohoadmin` gestiscono il flusso di login tramite transizioni di stato (`bootStage`);
- I `defaultConstraints` del tab limitano tutti i comandi (tranne quelli con vincoli propri) allo stadio `shell`, impedendo l'uso di comandi filesystem durante il prompt U-Boot.
