# Definire Comandi

## Struttura di un Comando

Ogni comando nel terminale e' definito da un `CommandDefinition`:

```typescript
interface CommandDefinition {
  name: string;            // nome esatto del comando (es. "printenv", "cat /etc/passwd")
  handler: 'builtin' | 'custom' | 'dynamic' | 'script' | 'lookup';
  builtinType?: string;    // per handler='builtin': 'ls'|'cd'|'cat'|'grep'|'find'|'pwd'|'clear'
  output?: CommandOutput;
  constraints?: CommandConstraints;
  sideEffects?: CommandSideEffects;
  description?: string;
}
```

---

## Handler: `builtin`

Comandi implementati in JavaScript nel simulatore. Operano sul filesystem virtuale della tab.

```json
{
  "name": "ls",
  "handler": "builtin",
  "builtinType": "ls"
}
```

Builtin disponibili: `ls`, `cd`, `cat`, `grep`, `find`, `pwd`, `clear`.

I builtin non richiedono `output` — generano output dinamicamente leggendo il filesystem virtuale.

---

## Handler: `custom` con Output Statico

Output predefinito e fisso:

```json
{
  "name": "printenv",
  "handler": "custom",
  "output": {
    "type": "static",
    "text": "bootargs=rootfstype=jffs2 mtdparts=spi0.0:256k(u-boot)\nbootcmd=bootm 0x9f020000"
  }
}
```

---

## Handler: `custom` con Output Condizionale

Output diverso in base a condizioni sullo stato:

```json
{
  "name": "id",
  "handler": "custom",
  "output": {
    "type": "conditional",
    "conditions": [
      {
        "check": { "type": "flagDiscovered", "flagId": "r00t" },
        "output": { "type": "static", "text": "uid=0(root) gid=0(root)" }
      }
    ],
    "default": { "type": "static", "text": "uid=1000(user) gid=1000(user)" }
  }
}
```

---

## Handler: `custom` con Output Template

Output con variabili interpolate dall'`environment` della tab:

```json
{
  "name": "whoami",
  "handler": "custom",
  "output": {
    "type": "template",
    "template": "{{USER}}"
  }
}
```

---

## Handler: `custom` con Output Lookup

Output scelto da una tabella in base all'argomento:

```json
{
  "name": "printenv",
  "handler": "custom",
  "output": {
    "type": "lookup",
    "key": "arg0",
    "table": {
      "bootargs": "rootfstype=jffs2",
      "ipaddr": "192.168.1.1"
    },
    "default": "variable not found"
  }
}
```

`printenv bootargs` restituisce `rootfstype=jffs2`.

---

## Constraints (Vincoli)

I vincoli controllano quando un comando e' disponibile:

```typescript
interface CommandConstraints {
  path?: string;            // directory richiesta (es. "/root")
  permissions?: string[];   // es. ["root"]
  prerequisites?: string[]; // flag ID gia' scoperti
  arguments?: ArgumentConstraint[];
}
```

Esempi:
```json
{ "constraints": { "path": "/tmp" } }
{ "constraints": { "prerequisites": ["uart_connected"] } }
{ "constraints": { "permissions": ["root"] } }
```

---

## Side Effects

I side effects si applicano dopo l'esecuzione del comando:

```typescript
interface CommandSideEffects {
  unlockFlags?: string[];  // flag ID da sbloccare
  setState?: Record<string, unknown>;
  executeCommand?: string;
}
```

### Sbloccare un Flag

```json
{
  "name": "cat /etc/version",
  "handler": "custom",
  "output": { "type": "static", "text": "OpenWrt 21.02.1" },
  "sideEffects": {
    "unlockFlags": ["fw_version"]
  }
}
```

L'ID `"fw_version"` deve corrispondere all'`id` di un `FlagPart` nella sezione Flags, e deve essere referenziato nelle `bootStageConditions` dell'obiettivo `terminal` corrispondente.

---

## Nome Esatto del Comando

Il campo `name` e' il testo **esatto** che lo studente digita. Per comandi con argomenti dinamici, usare `handler: 'builtin'` o definire varianti esplicite:

```json
[
  { "name": "cat /etc/passwd", "handler": "custom", "output": { "type": "static", "text": "..." } },
  { "name": "cat", "handler": "builtin", "builtinType": "cat" }
]
```

---

## Comandi Globali

I comandi in `TerminalConfig.globalCommands` sono disponibili in tutte le tab. Usare per comandi comuni come `clear`, `help`.

---

## Riferimenti

- **Tipi**: `src/types/terminal-config.ts` — `CommandDefinition`, `CommandOutput`, `CommandConstraints`
- **Executor**: `src/lib/terminal-command-executor.ts`
- **Builtin handlers**: `src/lib/terminal-builtin-handlers.ts`
