# PCB CTF

Piattaforma interattiva per challenge di sicurezza hardware. Simula l'analisi di un PCB, connessioni seriali e l'exploitation di sistemi embedded.

---

## Indice

- [Come risolvere la challenge](#come-risolvere-la-challenge)
  - [Step 1 — Identificazione Hardware](#step-1--identificazione-hardware)
  - [Step 2 — Connessione UART e Analisi Vulnerabilità](#step-2--connessione-uart-e-analisi-vulnerabilità)
  - [Step 3 — Dump Firmware SPI (CH341A)](#step-3--dump-firmware-spi-ch341a)
  - [Terminale — Flag Completo](#terminale--flag-completo)
    - [Parte 1 — b00t](#parte-1--b00t-u-boot-bootargs-inconsistency)
    - [Parte 2 — r00t](#parte-2--r00t-root-shell-via-credenziali-di-default)
    - [Parte 3 — h4sh](#parte-3--h4sh-hash-md5-crackabile-da-etcshadow)
    - [Parte 4 — l34k](#parte-4--l34k-credenziali-wi-fi-in-chiaro-nella-partizione-config)
    - [Parte 5 — 1nj3ct](#parte-5--1nj3ct-cve-2023-33538--command-injection-in-httpd)
    - [Parte 6 — sh3ll](#parte-6--sh3ll-backdoor-reverse-shell)
  - [Riepilogo Flag](#riepilogo-flag)
- [Configuratore](#configuratore)
- [Avvio e build](#avvio-e-build)

---

## Come risolvere la challenge

La challenge si divide in **3 step progressivi**. Il preset attivo è **TP-Link WR841N — Vulnerability Analysis**.

---

### Step 1 — Identificazione Hardware

**Flag:** `flag{QCA9533_W25Q32PORTA_UART}`

Obiettivo: identificare i tre componenti principali sulla PCB del router TP-Link WR841N usando la **lente di ingrandimento**.

| Obiettivo | Componente | Descrizione |
|-----------|-----------|-------------|
| CPU / SoC | **QCA9533** | Chip quadrato Qualcomm Atheros, il più grande sulla board. Gestisce tutte le operazioni di rete. |
| Flash NOR SPI | **W25Q32** | Chip Winbond SOP-8 (8 pin). Contiene l'intero firmware: bootloader, kernel e rootfs. Capacity: 4 MB. |
| Porta seriale | **PORTA UART** | Header a 3 pin sul bordo sinistro della board. Fornisce accesso diretto alla console seriale. |

Clicca su ciascun componente per leggerne la scheda. Tutti e tre gli obiettivi devono essere completati per avanzare.

---

### Step 2 — Connessione UART e Analisi Vulnerabilità

**Flag:** `flag{UART}`

Obiettivo: identificare i pin UART con il multimetro e collegare l'adattatore seriale.

**Identificazione pin con il multimetro:**

| Pin | Funzione | Tensione (Voltmetro) | Resistenza (Ohmmetro) |
|-----|----------|---------------------|-----------------------|
| `pin-u-3` | TX (device) | ~3.3 V idle | alta impedenza |
| `pin-u-4` | RX (device) | ~3.3 V idle | alta impedenza |
| `pin-u-5` | GND | 0 V | ~0 Ω |

**Cablaggio adattatore UART (crossover obbligatorio):**

```
Board TX  →  Adattatore RX
Board RX  →  Adattatore TX
Board GND →  Adattatore GND
```

Una volta collegati tutti e tre i pin correttamente, il terminale si sblocca automaticamente con il boot di U-Boot.

---

### Step 3 — Dump Firmware SPI (CH341A)

**Flag:** `flag{SPI_DUMP_FW_DUMPED}`

Obiettivo: collegare il programmatore CH341A al chip flash **W25Q32** tramite test clip SOIC-8 e dumpare il firmware con `flashrom`.

**Pinout SOIC-8 W25Q32 — 6 sonde da collegare:**

| Pin chip | Segnale | Sonda CH341A |
|----------|---------|-------------|
| Pin 1 | /CS (Chip Select) | `fw-probe-mmrwej42` |
| Pin 2 | MISO / DO | `fw-probe-mmrwemv3` |
| Pin 4 | GND | `fw-probe-mmrwek3e` |
| Pin 5 | MOSI / DI | `fw-probe-mmrwelj4` |
| Pin 6 | CLK | `fw-probe-mmrwekvu` |
| Pin 8 | VCC (+3.3V) | `fw-probe-mmrweid6` |

Dopo il collegamento di tutte e 6 le sonde, nel terminale (tab **Local Machine — Kali**):

```bash
sudo flashrom -p ch341a_spi
# → identifica il chip W25Q32
sudo flashrom -p ch341a_spi -r firmware.bin
# → dump del firmware (animazione ~30s)
```

---

### Terminale — Flag Completo

**Flag finale:** `flag{b00t_r00t_h4sh_l34k_1nj3ct_sh3ll}`

Il terminale è diviso in due tab: **UART Console** (shell sul dispositivo) e **Local Machine** (Kali Linux).

Il flag è composto da **6 parti**, ognuna sbloccata scoprendo una vulnerabilità diversa:

---

#### Parte 1 — `b00t` (U-Boot bootargs inconsistency)

Nella UART Console, il boot mostra U-Boot. Esegui:

```
printenv
```

La variabile `bootargs` riporta `rootfstype=jffs2`, ma il kernel monta effettivamente un filesystem **squashfs** (visibile nel boot log con `VFS: Mounted root (squashfs filesystem)`). Questa inconsistenza è la prima vulnerabilità.

---

#### Parte 2 — `r00t` (Root shell via credenziali di default)

Il sistema si avvia direttamente con shell root. Verifica con:

```sh
whoami
# root

cat /etc/passwd
# root:x:0:0:root:/root:/bin/sh
# admin:x:500:500:admin:/tmp:/bin/sh
```

Le credenziali di default sono `root` / `sohoadmin`. Accesso root senza restrizioni.

---

#### Parte 3 — `h4sh` (Hash MD5 crackabile da /etc/shadow)

```sh
cat /etc/shadow
# root:$1$GTN.gpri$DlSyKvZKMR9A9Uj9e9wR3/:15771:0:99999:7:::
```

L'hash MD5-crypt (`$1$`) è debole. Sul tab **Local Machine**:

```bash
hashcat '$1$GTN.gpri$DlSyKvZKMR9A9Uj9e9wR3/' /usr/share/wordlists/rockyou.txt
# oppure
john --wordlist=/usr/share/wordlists/rockyou.txt hash.txt
```

La password crackata corrisponde a `sohoadmin`.

---

#### Parte 4 — `l34k` (Credenziali Wi-Fi in chiaro nella partizione config)

```sh
strings /dev/mtdblock3
```

Output rilevante:

```
TP-LINK_807C
WPA2-PSK
MyW1F1P@ssw0rd!
```

La partizione `config` (mtd3) contiene la password Wi-Fi in chiaro insieme all'hash MD5 dell'amministratore web.

---

#### Parte 5 — `1nj3ct` (CVE-2023-33538 — Command injection in httpd)

```sh
strings /usr/bin/httpd | grep -i exec
```

Output:

```
execFormatCmd
execFormatCmd("iwconfig %s essid %s", ifname, user_ssid)
```

La funzione `execFormatCmd` nel demone HTTP accetta input utente non sanificato come parametro SSID, consentendo command injection. Riferimento: **CVE-2023-33538**.

---

#### Parte 6 — `sh3ll` (Backdoor reverse shell)

```sh
ls /usr/bin/
# ...backdoorTest...

strings /usr/bin/backdoorTest
```

Output:

```
socket
connect
dup2
execl
/bin/sh
192.168.0.100
4444
```

Il binario `backdoorTest` è avviato al boot da `/etc/rc.d/rcS` (`/usr/bin/backdoorTest &`) e tenta connessioni reverse shell verso `192.168.0.100:4444`. Verificabile anche con:

```sh
ps
# 142 root  204 S  /usr/bin/backdoorTest

cat /etc/rc.d/rcS
# ...
# /usr/bin/backdoorTest &
```

Sul tab Local Machine, per intercettare la shell:

```bash
nc -lvp 4444
```

---

### Riepilogo Flag

| Step | Flag |
|------|------|
| Step 1 — Hardware | `flag{QCA9533_W25Q32PORTA_UART}` |
| Step 2 — UART | `flag{UART}` |
| Step 3 — SPI Dump | `flag{SPI_DUMP_FW_DUMPED}` |
| Terminale completo | `flag{b00t_r00t_h4sh_l34k_1nj3ct_sh3ll}` |

---

## Configuratore

Il configuratore si trova su `/settings` e permette di creare o modificare esercizi.

Puoi configurare:
- Immagine del PCB
- Componenti cliccabili (con hint e istruzioni)
- Pin del multimetro (tensione/resistenza)
- Pin UART e SPI
- Step e obiettivi (con dipendenze e parti del flag)
- Comandi del terminale virtuale

I preset si salvano in `src/data/presets/` e possono essere caricati dal selettore nella sidebar.
La configurazione corrente viene salvata automaticamente nel `localStorage`.

---

## Avvio e build

### Sviluppo locale

```bash
npm install
npm run dev
```

App disponibile su [http://localhost:3000](http://localhost:3000).

### Build produzione

```bash
npm run build
npm start
```

### Docker

Build dell'immagine:

```bash
docker build -t pcb-ctf .
```

Avvio del container:

```bash
docker run -p 3000:3000 pcb-ctf
```

Per eseguire in background:

```bash
docker run -d -p 3000:3000 --name pcb-ctf pcb-ctf
```

App disponibile su [http://localhost:3000](http://localhost:3000). L'immagine usa Node 20 su Alpine e builda sempre in produzione.
