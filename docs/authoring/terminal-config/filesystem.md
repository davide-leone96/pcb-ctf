# Filesystem Virtuale

## Panoramica

Il filesystem virtuale e' una struttura ad albero di directory e file accessibile tramite i comandi builtin (`ls`, `cd`, `cat`, `grep`, `find`). E' definito nella configurazione della tab terminale e viene processato dal `TerminalConfigLoader` al caricamento.

---

## Formato Shorthand (`tree`)

Il formato consigliato per definire il filesystem e' il formato anidato `tree`:

```json
{
  "filesystem": {
    "tree": {
      "etc": {
        "passwd": "root:x:0:0:root:/root:/bin/bash\nadmin:x:1000:1000::/home/admin:/bin/sh",
        "shadow": "root:$1$salt$hashedpwd:...",
        "config": {
          "system": "admin_password=admin123\nwifi_ssid=MyRouter"
        }
      },
      "root": {
        ".ssh": {
          "authorized_keys": "ssh-rsa AAAA..."
        },
        "notes.txt": "Remember to change default password!"
      },
      "tmp": {},
      "var": {
        "log": {
          "syslog": "Jan 1 00:00:01 router kernel: Linux version 2.6.31..."
        }
      }
    }
  }
}
```

Il `TerminalConfigLoader.normalizeFilesystem()` appiattisce questo formato in strutture piatte `directories` e `files` usate dai builtin handlers.

---

## Formato Flat (Alternativo)

In alternativa al formato `tree`, e' possibile definire direttamente directories e files:

```json
{
  "filesystem": {
    "directories": ["/etc", "/root", "/tmp", "/var/log"],
    "files": [
      { "path": "/etc/passwd", "content": "root:x:0:0..." },
      { "path": "/etc/shadow", "content": "root:$1$..." },
      { "path": "/root/notes.txt", "content": "Remember to change password" }
    ]
  }
}
```

---

## Nell'Editor (`terminalSettingsStore`)

Il `terminalSettingsStore` rappresenta il filesystem come array di `DraftFilesystemEntry`:

```typescript
interface DraftFilesystemEntry {
  id: string;
  tabId: string;        // a quale tab appartiene
  path: string;         // percorso assoluto: "/etc/passwd"
  type: 'directory' | 'file';
  content: string;      // contenuto (solo per type='file')
}
```

Nell'editor:
1. Nella sezione **Filesystem** della tab Terminal
2. "+ Add Directory" per creare una directory (es. `/etc`)
3. "+ Add File" per aggiungere un file con contenuto
4. Modificare il contenuto direttamente nell'editor

Alla chiamata di `exportAsTerminalConfig()`, le entries vengono ricostruite in un `FilesystemTree` annidato tramite `buildTree()`.

---

## Operazioni Supportate dai Builtin

| Comando | Operazione |
|---------|-----------|
| `ls [path]` | Lista directory. Senza argomento: directory corrente |
| `ls -la [path]` | Lista con dettagli (permessi, dimensioni simulate) |
| `ls -a [path]` | Mostra anche file nascosti (`.` prefix) |
| `cd [path]` | Cambia directory. Supporta: assoluto, relativo, `..`, `~` |
| `pwd` | Mostra directory corrente |
| `cat <file>` | Mostra contenuto del file |
| `grep <pattern> <file>` | Cerca nel file (case-sensitive) |
| `find [path] [-name <pattern>]` | Ricerca ricorsiva |

---

## Flag Nascoste nei File

I flag possono essere nascosti nel contenuto dei file. Quando lo studente legge un file, il side effect `unlockFlags` del comando `cat` si attiva:

```json
{
  "name": "cat /root/secret.txt",
  "handler": "builtin",
  "builtinType": "cat",
  "sideEffects": {
    "unlockFlags": ["secret_found"]
  }
}
```

Oppure definire un comando `cat` specifico per quel file:

```json
{
  "name": "cat /root/flag.txt",
  "handler": "custom",
  "output": { "type": "static", "text": "CTF{hardware_analysis_complete}" },
  "sideEffects": { "unlockFlags": ["flag_found"] }
}
```

---

## File Nascosti

File e directory con nome che inizia con `.` sono "nascosti" e appaiono solo con `ls -a`:

```json
"root": {
  ".ssh": {
    "authorized_keys": "ssh-rsa AAAA..."
  },
  ".bash_history": "cat /etc/shadow\ngrep password /etc/config",
  "visible_file.txt": "This file is visible"
}
```

---

## Riferimenti

- **Config loader**: `src/lib/terminal-config-loader.ts` — `normalizeFilesystem()`, `flattenTree()`
- **Filesystem utilities**: `src/lib/terminal-filesystem.ts` — `resolvePath()`, `listDirectory()`, `getFileContent()`
- **Store**: `src/store/terminalSettingsStore.ts` — `DraftFilesystemEntry`, `buildTree()`
