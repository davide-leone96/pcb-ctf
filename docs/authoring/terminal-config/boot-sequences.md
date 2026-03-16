# Boot Sequences

## Panoramica

La **boot sequence** e' l'animazione di avvio che il terminale UART mostra all'apertura. Riproduce il processo reale di avvio di un dispositivo embedded: dal bootloader U-Boot al kernel Linux fino alla shell interattiva.

E' definita come array di `BootStage` nella configurazione della tab UART.

---

## Struttura di un Boot Stage

```typescript
interface BootStage {
  id: string;
  lines: string[];     // righe di output da mostrare in sequenza
  delayMs?: number;    // ms tra una riga e la successiva (default: 50)
  isFinal?: boolean;   // se true, al termine compare il prompt interattivo
}
```

Il campo `isFinal: true` segnala che e' l'ultimo stage — al termine delle righe, la boot sequence termina e l'utente puo' digitare comandi.

---

## Esempio Completo: Router Embedded

```json
[
  {
    "id": "bootloader",
    "lines": [
      "U-Boot 1.1.4-g4e19bcd0-dirty (Jan  1 2024 - 00:00:00)",
      "",
      "AP121 (ar9330) U-Boot",
      "DRAM:  64 MB",
      "Flash:  8 MB",
      "Net:   ag71xx_eth0",
      "",
      "Hit any key to stop autoboot:  3 ",
      "Hit any key to stop autoboot:  2 ",
      "Hit any key to stop autoboot:  1 ",
      "Hit any key to stop autoboot:  0 "
    ],
    "delayMs": 80
  },
  {
    "id": "kernel",
    "lines": [
      "Starting kernel ...",
      "",
      "Linux version 2.6.31 (root@buildhost)",
      "Initializing cgroup subsys cpuset",
      "...",
      "Mounting /proc filesystem",
      "Starting services: done",
      ""
    ],
    "delayMs": 40
  },
  {
    "id": "shell",
    "lines": [
      "BusyBox v1.19.4 (2024-01-01) built-in shell (ash)",
      "Enter 'help' for a list of built-in commands.",
      "",
      "root@router:~# "
    ],
    "delayMs": 30,
    "isFinal": true
  }
]
```

---

## Animazione nel Simulatore

Il processo di animazione in `Terminal.tsx` usa `setInterval` per mostrare le righe una alla volta:

1. All'apertura della tab UART, parte la boot sequence
2. Per ogni stage, le righe vengono mostrate con il `delayMs` tra una e l'altra
3. Quando si raggiunge lo stage `isFinal: true`, l'animazione termina
4. Il prompt interattivo appare e l'utente puo' digitare comandi

---

## Aggiungere Boot Stages nell'Editor

Nella tab **Terminal** di `/settings`, sezione **Boot Stages**:

1. Clic su "+ Add Stage"
2. Assegnare un ID univoco (es. "bootloader", "kernel", "shell")
3. Inserire le righe di output nell'editor multilinea
4. Configurare `delayMs` (default 50 ms)
5. Marcare l'ultimo stage con `isFinal: true`

---

## Boot Stage Conditions negli Obiettivi

Il campo `bootStageId` in `BootStageCondition` degli obiettivi `terminal` e' memorizzato ma **non usato a runtime**. E' solo un riferimento semantico per l'autore. Solo `unlockedFlags` viene verificato da `addTerminalDiscovery()`.

```typescript
interface BootStageCondition {
  bootStageId: string;      // solo per documentazione — non influisce sul completamento
  unlockedFlags: string[];  // questi vengono verificati per il completamento
  hint: string;
}
```

---

## Best Practices

- **Realismo**: copiare output reale da dispositivi simili per un'esperienza educativa autentica
- **Timing**: `delayMs` piu' alto (80-100ms) per il bootloader, piu' basso (20-30ms) per il kernel
- **Stage finale**: assicurarsi che esattamente uno stage abbia `isFinal: true`

---

## Riferimenti

- **Tipi**: `src/types/terminal-config.ts` — `BootStage`, `BootSequence`
- **Animazione**: `src/components/features/exercise/Terminal.tsx`
- **Store**: `src/store/terminalSettingsStore.ts`
