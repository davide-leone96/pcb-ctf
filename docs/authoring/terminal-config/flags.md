# Flag e Sblocchi

## Due Sistemi di Flag Distinti

PCB-CTF ha **due meccanismi di flag separati** che devono essere coordinati:

1. **Flag del terminale** (`FlagPart` nel `terminalSettingsStore`) — definisce i frammenti sbloccabili via comandi
2. **Flag degli obiettivi** (`flagPart` nel `DraftObjective`) — il frammento contribuito da ogni obiettivo alla flag progressiva dello step

Questi due sistemi si coordinano tramite il campo `bootStageConditions` degli obiettivi di tipo `terminal`.

---

## Flag Parts (`FlagPart`)

Definiti nella sezione **Flags** della tab Terminal:

```typescript
interface FlagPart {
  id: string;    // es. "b00t" — usato come riferimento
  value: string; // es. "b00t" — testo del frammento
  hint?: string; // suggerimento per lo studente
}
```

Il campo `id` del `FlagPart` e' quello che viene usato in:
- `sideEffects.unlockFlags` nei comandi del terminale
- `bootStageConditions.unlockedFlags` negli obiettivi di tipo `terminal`

---

## Come si Sblocca un Flag

### Passo 1: Definire il FlagPart

Nella tab Terminal, sezione Flags:

```
ID: "b00t"
Value: "b00t"
Hint: "Trovato nelle variabili U-Boot"
```

### Passo 2: Collegare al Comando

Nella definizione del comando che sblocca il flag:

```json
{
  "name": "printenv bootargs",
  "handler": "custom",
  "output": {
    "type": "static",
    "text": "bootargs=rootfstype=jffs2 console=ttyS0,115200"
  },
  "sideEffects": {
    "unlockFlags": ["b00t"]
  }
}
```

### Passo 3: Collegare all'Obiettivo

Nell'obiettivo di tipo `terminal` che richiede questo flag:

```json
{
  "type": "terminal",
  "bootStageConditions": [
    {
      "bootStageId": "bootloader",
      "unlockedFlags": ["b00t"],
      "hint": "Esegui printenv nel U-Boot per trovare le variabili di boot"
    }
  ],
  "flagPart": "b00t"
}
```

---

## Flusso Completo

```
Studente digita: "printenv bootargs"
    │
    ▼
TerminalCommandExecutor trova la CommandDefinition
    │
    ▼
Esegue output + applica sideEffects
    │
    ▼
result.newFlags = ["b00t"]
    │
    ▼
Terminal.tsx: addTerminalDiscovery("b00t")
    │
    ▼
exerciseStore: terminalDiscoveries.push("b00t")
    │
    ▼
Verifica bootStageConditions obiettivo corrente:
  requiredFlags = ["b00t"]
  newDiscoveries.includes("b00t") === true
  requiredFlags.every(f => ...) === true
    │
    ▼
_completeCurrentObjective()
    │
    ▼
Flag panel aggiornato, obiettivo completato
```

---

## Flag Completa dello Step (`FlagSystem`)

Il `FlagSystem` nella configurazione terminale definisce la flag finale dell'esercizio:

```typescript
interface FlagSystem {
  prefix: string;    // es. "flag{"
  suffix: string;    // es. "}"
  parts: FlagPart[]; // ordinati come appaiono nella flag
}
```

La flag completa e' la concatenazione di `prefix + parts[0].value + ... + suffix`.

---

## Coordinamento con gli Obiettivi

La regola fondamentale: l'`id` del `FlagPart` deve comparire nei `unlockedFlags` delle `bootStageConditions` dell'obiettivo `terminal` corrispondente.

**Esempio coordinato:**

```
Terminal FlagPart:
  id: "r00t", value: "_r00t"

Comando nel terminale:
  name: "su root"
  sideEffects.unlockFlags: ["r00t"]

Obiettivo terminal:
  type: "terminal"
  flagPart: "_r00t"
  bootStageConditions: [{ bootStageId: "shell", unlockedFlags: ["r00t"] }]
```

---

## Sblocco Multiplo

Un solo comando puo' sbloccare piu' flag contemporaneamente:

```json
{
  "name": "cat /etc/passwd && cat /etc/shadow",
  "sideEffects": {
    "unlockFlags": ["passwd_found", "shadow_found"]
  }
}
```

Un obiettivo puo' richiedere piu' flag da bootStageConditions diverse:

```json
{
  "bootStageConditions": [
    { "bootStageId": "shell", "unlockedFlags": ["passwd_found", "shadow_found"], "hint": "Cerca i file di autenticazione" }
  ]
}
```

---

## Riferimenti

- **Tipi**: `src/types/terminal-config.ts` — `FlagPart`, `FlagSystem`, `FlagUnlock`
- **Store**: `src/store/terminalSettingsStore.ts` — `flagParts`, `exportAsTerminalConfig()`
- **exerciseStore**: `src/store/exerciseStore.ts` — `addTerminalDiscovery()`
