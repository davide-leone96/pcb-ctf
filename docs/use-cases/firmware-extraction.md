# Use Case: Firmware Extraction & Analysis

## Scenario

Gli studenti estraggono il firmware dal dispositivo embedded e lo analizzano per scoprire vulnerabilità.

## Obiettivi

1. Accedere come root (prerequisito)
2. Localizzare la partizione firmware
3. Estrarre il firmware dalla memoria flash
4. Analizzare il contenuto del firmware
5. Scoprire secrets e vulnerabilità

## Step a Step

### Step 1: Prerequisiti (UART Access)

Vedi [UART Exploitation](./uart-exploitation.md) per ottenere accesso root.

### Step 2: Identificare Partizioni

**Descrizione**: Scopri dove è memorizzato il firmware.

**Azione dello Studente**:
```
root@router:~# cat /proc/mtd
dev:    size   erasesize  name
mtd0: 00020000 00010000 "u-boot"
mtd1: 00100000 00010000 "kernel"
mtd2: 00ed0000 00010000 "rootfs"
mtd3: 00100000 00010000 "config"
mtd4: 00020000 00010000 "ART"
mtd5: 01000000 00010000 "firmware"
```

**Flag Sbloccato**: "fw_partition"

### Step 3: Estrazione Firmware

**Descrizione**: Estrai il firmware in un file.

**Azione dello Studente**:
```
root@router:~# dd if=/dev/mtd5 of=/tmp/firmware.bin
33554432 bytes (32M) copied

root@router:~# ls -lah /tmp/firmware.bin
-rw-r--r-- 1 root root 32M firmware.bin
```

**Flag Sbloccato**: "fw_extract"

### Step 4: Analisi Firmware (Local Machine)

**Descrizione**: Cambia a "Local Machine" tab e analizza il firmware.

**Azione dello Studente**:
```
kali@local:~$ file firmware.bin
firmware.bin: uImage, Linux Kernel Image

kali@local:~$ binwalk firmware.bin
DECIMAL       HEXADECIMAL     DESCRIPTION
0             0x0             uImage header
64            0x40            Linux kernel LZMA compressed data
...
2097152       0x200000        Squashfs filesystem

✓ FLAG: "fw_analysis"
```

### Step 5: Estrazione Filesystem

**Descrizione**: Estrai il filesystem dal firmware.

**Azione dello Studente**:
```
kali@local:~$ dd if=firmware.bin of=rootfs.squashfs skip=2097152 bs=1

kali@local:~$ unsquashfs rootfs.squashfs
Destination directory: squashfs-root

kali@local:~$ ls -la squashfs-root/
drwxr-xr-x  etc
drwxr-xr-x  lib
drwxr-xr-x  usr
drwxr-xr-x  var
drwxr-xr-x  root
...

✓ FLAG: "fs_extract"
```

### Step 6: Scoperta Secrets

**Descrizione**: Analizza il filesystem estratto per trovare secrets.

**Azione dello Studente**:
```
kali@local:~$ grep -r "password\|secret\|key" squashfs-root/etc/
etc/config:admin_password=admin123
etc/config:telnet_secret=0x1234567890abcdef
etc/ssl:private.key (RSA private key found!)

✓ FLAG: "secrets_found"

kali@local:~$ strings squashfs-root/bin/httpd | grep "backdoor"
"Backdoor shell enabled"

✓ FLAG: "backdoor_code"
```

## Configurazione Esercizio

### Commands (UART Console tab)

```json
[
  {
    "name": "cat /proc/mtd",
    "handler": "custom",
    "output": {
      "type": "static",
      "text": "dev:    size   erasesize  name\nmtd0: 00020000 00010000 \"u-boot\"\nmtd5: 01000000 00010000 \"firmware\""
    },
    "sideEffects": {
      "unlockFlags": ["fw_partition"]
    }
  },
  {
    "name": "dd if=/dev/mtd5 of=/tmp/firmware.bin",
    "handler": "custom",
    "output": {
      "type": "static",
      "text": "33554432 bytes (32M) copied"
    },
    "sideEffects": {
      "unlockFlags": ["fw_extract"]
    }
  }
]
```

### Local Machine Tab

```json
{
  "id": "local",
  "name": "Local Machine",
  "commands": [
    {
      "name": "file firmware.bin",
      "handler": "custom",
      "output": {
        "type": "static",
        "text": "firmware.bin: uImage, Linux Kernel Image"
      }
    },
    {
      "name": "binwalk firmware.bin",
      "handler": "custom",
      "output": {
        "type": "static",
        "text": "DECIMAL    HEXADECIMAL  DESCRIPTION\n0          0x0          uImage header\n2097152    0x200000     Squashfs filesystem"
      },
      "sideEffects": {
        "unlockFlags": ["fw_analysis"]
      }
    },
    {
      "name": "strings squashfs-root/bin/httpd | grep backdoor",
      "handler": "custom",
      "output": {
        "type": "static",
        "text": "Backdoor shell enabled"
      },
      "sideEffects": {
        "unlockFlags": ["backdoor_code"]
      }
    }
  ]
}
```

## Difficoltà

**Livello**: Avanzato ⭐⭐⭐

**Competenze Necessarie**:
- Accesso root
- Partizioni flash/MTD
- Estrazione binaria
- Analisi hex/strings
- Filesystem Linux
- Strumenti: dd, binwalk, unsquashfs, strings

**Tempo Stimato**: 45-60 minuti

## Concetti di Sicurezza

1. **Firmware Extraction** — Dump della memoria flash
2. **Binary Analysis** — Reverse engineering del codice
3. **Hardcoded Secrets** — Credenziali nel firmware
4. **Backdoors** — Codice malevolo nel firmware
5. **Supply Chain Security** — Compromissione di fabbrica

## Tools Realistici

- `binwalk` — Analisi firmware
- `dd` — Dump memoria
- `strings` — Estrazione stringhe
- `unsquashfs` — Decompressione filesystem
- `hexdump` — Visualizzazione hex
- `file` — Identificazione tipo file

