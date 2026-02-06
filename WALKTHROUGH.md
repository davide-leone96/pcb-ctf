# Walkthrough - CTF Flag Completion

## Flag Finale
```
flag{b00t_r00t_h4sh_l34k_1nj3ct_sh3ll}
```

Il flag e' composto da 6 parti, ognuna scoperta completando uno step del penetration test sul router TP-Link WR841N.

Il terminale ha **due tab**:
- **UART Console** (verde) - connessione seriale al router, per esplorare il dispositivo
- **Local Machine** (blu) - macchina Kali locale, per analisi offline (hashcat, john, netcat)

La flag viene visualizzata in tempo reale nel pannello in alto a destra.

---

## Prerequisiti

1. Apri il terminale cliccando sull'icona **Terminal** nella sidebar sinistra
2. Il tab **UART Console** si attivera' automaticamente con la connessione UART a 115200 baud
3. La sequenza di boot partira' automaticamente

---

## STEP 1: b00t - U-Boot Bootargs Inconsistency

**Tab:** UART Console

**Obiettivo:** Scoprire l'inconsistenza nelle variabili di boot di U-Boot.

1. Quando appare il messaggio `Autobooting in 1 seconds`, hai **4 secondi** per interrompere il boot
2. Digita `tpl` e premi **Enter** per fermare l'autoboot
3. Apparira' il prompt U-Boot: `ar7100> `
4. Digita il comando:
   ```
   printenv
   ```
5. Osserva l'output: `bootargs` dice `rootfstype=jffs2`, ma il kernel effettivamente boota con `squashfs` (visibile nel log del kernel)
6. Questa inconsistenza potrebbe indicare una modifica non autorizzata al bootloader

**Flag part: `b00t`**

> Dopo aver esaminato l'ambiente U-Boot, digita `boot` per proseguire con il boot del kernel.

---

## STEP 2: r00t - Root Shell Access

**Tab:** UART Console

**Obiettivo:** Ottenere accesso root al sistema.

1. Dopo il boot del kernel, apparira' il prompt di login: `(none) login:`
2. Inserisci l'username:
   ```
   root
   ```
3. Apparira' `Password:`, inserisci la password:
   ```
   sohoadmin
   ```
4. Login effettuato! Accesso root ottenuto su BusyBox v1.01
5. Il prompt mostrera' la directory corrente: `/ # `

**Flag part: `r00t`**

---

## STEP 3: h4sh - Password Hash Cracking

**Tab:** UART Console + Local Machine

**Obiettivo:** Trovare l'hash della password e crackarlo sulla macchina locale.

### Fase 1 - Trovare l'hash (UART Console)
1. Leggi il file shadow:
   ```
   cat /etc/shadow
   ```
2. Vedrai l'hash MD5-crypt: `$1$GTN.gpri$DlSyKvZKMR9A9Uj9e9wR3/`
3. Annota l'hash

### Fase 2 - Crackare l'hash (Local Machine)
4. Passa al tab **Local Machine**
5. Usa hashcat per crackare l'hash:
   ```
   hashcat $1$GTN.gpri$DlSyKvZKMR9A9Uj9e9wR3/ /usr/share/wordlists/rockyou.txt
   ```
   Oppure usa John the Ripper:
   ```
   john shadow.txt
   ```
6. Il risultato rivela la password: `sohoadmin` (hash MD5-crypt con salt `GTN.gpri`)

**Flag part: `h4sh`**

---

## STEP 4: l34k - Config Partition Credential Leak

**Tab:** UART Console

**Obiettivo:** Estrarre credenziali dalla partizione di configurazione.

1. Prima, esamina le partizioni flash:
   ```
   cat /proc/mtd
   ```
2. Identifica la partizione `config` su `mtd3` (64k)
3. Analizza il contenuto binario della partizione config:
   ```
   strings /dev/mtdblock3
   ```
4. Nell'output troverai:
   - Username: `admin`
   - Hash MD5 non salato: `e10adc3949ba59abbe56e057f20f883e` (corrisponde a "123456")
   - SSID: `TP-LINK_807C`
   - Password WiFi WPA2 **in chiaro**: `MyW1F1P@ssw0rd!`
   - IP del gateway: `192.168.0.1`

**Flag part: `l34k`**

> **Bonus:** Puoi filtrare l'output con pipe: `strings /dev/mtdblock3 | grep admin`

---

## STEP 5: 1nj3ct - CVE-2023-33538 Command Injection

**Tab:** UART Console

**Obiettivo:** Scoprire la vulnerabilita' di command injection nel web server httpd.

1. Verifica che httpd sia in esecuzione:
   ```
   ps
   ```
2. Individua `/usr/bin/httpd` nella lista dei processi (PID 139)
3. Analizza il binario httpd:
   ```
   strings /usr/bin/httpd
   ```
4. Nell'output cerca la stringa critica:
   ```
   execFormatCmd("iwconfig %s essid %s", ifname, user_ssid)
   ```
5. Questa riga rivela la **CVE-2023-33538**: la funzione `execFormatCmd` passa l'input utente (`user_ssid`) direttamente a un comando di sistema senza sanitizzazione, permettendo **command injection** tramite il campo SSID

**Flag part: `1nj3ct`**

> **Approfondimento:** Puoi filtrare con `strings /usr/bin/httpd | grep exec` per trovare rapidamente la vulnerabilita'.

---

## STEP 6: sh3ll - Backdoor Reverse Shell

**Tab:** UART Console

**Obiettivo:** Scoprire la backdoor reverse shell nascosta nel firmware.

1. Esplora la directory `/usr/bin`:
   ```
   ls /usr/bin
   ```
2. Nota il file sospetto `backdoorTest` (non e' un binario standard di BusyBox)
3. Analizzalo con `file`:
   ```
   file /usr/bin/backdoorTest
   ```
4. L'output mostra che e' un ELF MIPS **not stripped** (insolito per un dispositivo embedded)
5. Esamina le stringhe nel binario:
   ```
   strings /usr/bin/backdoorTest
   ```
6. Troverai:
   - `socket`, `connect`, `dup2`, `execl` - pattern tipico di una reverse shell
   - `/bin/sh` - shell da eseguire
   - `192.168.0.100` - IP dell'attaccante
   - `4444` - porta di callback
7. Controlla anche lo script di avvio:
   ```
   cat /etc/rc.d/rcS
   ```
8. Vedrai `/usr/bin/backdoorTest &` - la backdoor viene avviata automaticamente al boot!

**Flag part: `sh3ll`**

> **Bonus (Local Machine):** Puoi verificare la reverse shell con netcat: `nc -lvp 4444`

---

## Riepilogo Flag

| # | Flag Part | Tab | Comando Chiave | Vulnerabilita' |
|---|-----------|-----|---------------|----------------|
| 1 | `b00t`    | UART | `printenv` (in U-Boot) | Bootargs inconsistency jffs2/squashfs |
| 2 | `r00t`    | UART | Login `root:sohoadmin` | Credenziali di default |
| 3 | `h4sh`    | Local | `hashcat <hash> <wordlist>` | Hash MD5-crypt debole |
| 4 | `l34k`    | UART | `strings /dev/mtdblock3` | Credenziali in chiaro nella config |
| 5 | `1nj3ct`  | UART | `strings /usr/bin/httpd` | CVE-2023-33538 command injection |
| 6 | `sh3ll`   | UART | `strings /usr/bin/backdoorTest` | Backdoor reverse shell supply chain |

## Flag Completo
```
flag{b00t_r00t_h4sh_l34k_1nj3ct_sh3ll}
```

---

## Comandi Utili

### UART Console (router)

| Comando | Descrizione |
|---------|-------------|
| `ls [-la] [path]` | Lista file e directory |
| `cd <path>` | Cambia directory |
| `cat <file>` | Leggi file di testo |
| `strings <file>` | Estrai stringhe da binari |
| `file <file>` | Identifica tipo di file |
| `grep <pattern> <file>` | Cerca pattern in un file |
| `find <path> -name <pattern>` | Cerca file per nome |
| `ps` | Lista processi |
| `mount` | Mostra filesystem montati |
| `cmd1 \| grep <pattern>` | Filtra output con pipe |
| `uname -a` | Info sistema |
| `ifconfig` | Info interfacce di rete |
| `help` | Lista comandi disponibili |

### Local Machine (Kali)

| Comando | Descrizione |
|---------|-------------|
| `hashcat <hash> <wordlist>` | Crack hash password |
| `john <hashfile>` | John the Ripper cracker |
| `nc -lvp <port>` | Netcat listener |
| `md5sum <hash>` | Reverse lookup MD5 |
| `ls, cd, pwd, cat` | Navigazione filesystem |
| `help` | Lista comandi disponibili |
