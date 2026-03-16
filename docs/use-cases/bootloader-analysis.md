# Use Case: Bootloader Analysis

## Scenario

Gli studenti analizzano il bootloader U-Boot di un router embedded (TP-Link WR841N) per scoprire inconsistenze nella configurazione di boot, leggere variabili di ambiente sensibili e comprendere il processo di avvio del firmware.

**Difficolta'**: Principiante/Intermedio (1/3 stelle)

**Tempo stimato**: 20-30 minuti

---

## Obiettivi Educativi

- Capire il ruolo del bootloader in un sistema embedded
- Imparare a interrompere il boot per accedere al prompt U-Boot
- Analizzare le variabili di ambiente del bootloader
- Identificare inconsistenze tra configurazione dichiarata e comportamento reale

---

## Step dell'Esercizio

### Step 1: Connessione UART e Boot Interruption

**Azioni**:
1. Collegare le UART Probes al connettore seriale della PCB
2. Aprire il Terminal (tab UART Console)
3. Osservare la boot sequence:

```
U-Boot 1.1.4-g4e19bcd0-dirty (Jan  1 2024 - 00:00:00)

AP121 (ar9330) U-Boot
DRAM:  64 MB
Flash:  8 MB

Hit any key to stop autoboot:  3
Hit any key to stop autoboot:  2
Hit any key to stop autoboot:  1
Hit any key to stop autoboot:  0
```

4. Digitare `tpl` entro la finestra di interruzione
5. Accedere al prompt U-Boot:

```
ar7100>
```

**Flag sbloccato**: `b00t` (interruzione riuscita del boot)

---

### Step 2: Analisi Variabili di Ambiente

Con il prompt `ar7100>` disponibile, analizzare le variabili di boot:

```
ar7100> printenv
bootargs=rootfstype=jffs2 console=ttyS0,115200 rootdelay=5
bootcmd=bootm 0x9f020000
bootdelay=1
ethaddr=00:AA:BB:CC:DD:EE
ipaddr=192.168.1.1
serverip=192.168.1.100
```

**Analisi delle inconsistenze**:
- `bootargs` dichiara `rootfstype=jffs2`
- Ma il kernel effettivamente monta un filesystem **squashfs**
- Questa inconsistenza indica una configurazione di boot non aggiornata o intenzionalmente fuorviante

**Flag sbloccato**: `_bootarg` (scoperta inconsistenza)

---

### Step 3: Boot Completo e Analisi Shell

Continuare il boot normale:

```
ar7100> boot
Starting kernel ...

Linux version 2.6.31 (root@buildhost)
...
BusyBox v1.19.4 built-in shell (ash)

root@router:~#
```

Verificare il filesystem effettivamente montato:

```
root@router:~# mount
/dev/root on / type squashfs (ro,relatime)
tmpfs on /tmp type tmpfs (rw,relatime)
```

**Conferma**: il filesystem e' squashfs, non jffs2 come dichiarato in `bootargs`.

---

## Flag Finale

```
flag{b00t_bootarg}
```

---

## Configurazione Terminale

### Boot Stages

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
    "delayMs": 80,
    "isFinal": false
  },
  {
    "id": "shell",
    "lines": [
      "ar7100> "
    ],
    "delayMs": 30,
    "isFinal": true
  }
]
```

### Comandi U-Boot

```json
[
  {
    "name": "tpl",
    "handler": "custom",
    "output": { "type": "static", "text": "ar7100> " },
    "sideEffects": { "unlockFlags": ["b00t"] }
  },
  {
    "name": "printenv",
    "handler": "custom",
    "output": {
      "type": "static",
      "text": "bootargs=rootfstype=jffs2 console=ttyS0,115200 rootdelay=5\nbootcmd=bootm 0x9f020000\nbootdelay=1\nethaddr=00:AA:BB:CC:DD:EE\nipaddr=192.168.1.1"
    },
    "sideEffects": { "unlockFlags": ["b00t"] }
  },
  {
    "name": "printenv bootargs",
    "handler": "custom",
    "output": { "type": "static", "text": "bootargs=rootfstype=jffs2 console=ttyS0,115200" },
    "sideEffects": { "unlockFlags": ["_bootarg"] }
  }
]
```

---

## Concetti di Sicurezza

1. **Bootloader Access** — U-Boot e' accessibile via UART su quasi tutti i router consumer, spesso senza protezione da password
2. **Boot Environment Variables** — `bootargs` puo' contenere informazioni sensibili sulla configurazione di sistema
3. **Stale Configurations** — Le inconsistenze nelle variabili di boot sono indicatori di firmware modificato o manutenzione negligente
4. **Physical Access** — L'accesso fisico alla porta UART bypassa ogni protezione di rete o software
