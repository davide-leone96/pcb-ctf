# TP-Link WR841N - Walkthrough Challenge

## Step 1: Identificazione Hardware

**Flag: `flag{QCA9533_W25Q32}`**

1. Seleziona lo strumento **Lente di ingrandimento** dalla toolbar
2. Clicca sul **chip grande quadrato** (SoC) sulla PCB per identificare il **QCA9533**
3. Clicca sul **chip piccolo rettangolare** (flash SPI) per identificare il **W25Q32**

---

## Step 2: Connessione UART e Analisi Vulnerabilita

**Flag: `flag{UART}`**

1. Seleziona il **Multimetro** per misurare i pin UART:
   - Pin TX idles a ~3.3V
   - Pin GND a 0V con resistenza ~0 Ohm
2. Seleziona le **Probe UART** dalla toolbar
3. Collega le sonde ai pin corretti:
   - **Adapter TX** -> Pin RX del dispositivo
   - **Adapter RX** -> Pin TX del dispositivo
   - **Adapter GND** -> Pin GND del dispositivo

---

## Step 3: Dump Firmware SPI (CH341A)

**Flag: `flag{SPI_DUMP_FW_DUMPED}`**

### 3a. Collegamento sonde SPI

1. Seleziona lo strumento **Firmware Dump** dalla toolbar
2. Collega tutte le 6 sonde del CH341A ai pin SOIC-8 del W25Q32:
   - VCC (Pin 8)
   - GND (Pin 4)
   - /CS (Pin 1)
   - CLK (Pin 6)
   - MOSI/DI (Pin 5)
   - MISO/DO (Pin 2)
3. Avvia il dump e attendi il completamento della progress bar

### 3b. Terminale CH341A

Si apre automaticamente il terminale CH341A dopo il dump.

4. Identifica il chip flash:
   ```
   sudo flashrom -p ch341a_spi
   ```
   Output: `Found Winbond flash chip "W25Q32.V" (4096 kB, SPI) on ch341a_spi.`

5. Dumpa il firmware:
   ```
   sudo flashrom -p ch341a_spi -r firmware.bin -VV -c W25Q32.V
   ```
   Output: `Reading flash... done.`

---

## Step 4: Console UART - Analisi Completa

**Flag: `flag{b00t_r00t_h4sh_l34k_1nj3ct_sh3ll}`**

Il terminale UART si attiva dopo la connessione UART (Step 2). Ha due tab: **UART Console** e **Local Machine**.

### Flag 1: b00t (U-Boot bootargs inconsistency)

Il terminale parte nel bootloader U-Boot (prompt `ar7100>`).

1. Esegui `printenv` per visualizzare le variabili del bootloader
   - Nota l'incoerenza: U-Boot dichiara `rootfstype=jffs2` ma il kernel usa `squashfs`

### Flag 2: _r00t (Root shell access)

2. Esegui `boot` per avviare il kernel Linux
   - Si avvia la sequenza di boot fino al prompt `login:`
3. Digita `root` come username
   - Appare il prompt `Password:`
4. Digita `sohoadmin` come password
   - Accesso root ottenuto (prompt `/ #`)

### Flag 3: _h4sh (Password hash cracking)

5. Nella UART Console, leggi l'hash della password root:
   ```
   cat /etc/shadow
   ```
   Output: `root:$1$GTN.gpri$DlSyKvZKMR9A9Uj9e9wR3/::::`

6. Passa al tab **Local Machine** e cracka l'hash:
   ```
   hashcat -m 500 -a 0 $1$GTN.gpri$DlSyKvZKMR9A9Uj9e9wR3/ wordlist.txt
   ```
   Oppure:
   ```
   john shadow.txt
   ```

### Flag 4: _l34k (Config partition credential leak)

7. Torna al tab **UART Console** e analizza la partizione config:
   ```
   strings /dev/mtdblock3
   ```
   Output: credenziali admin e chiave WPA in chiaro

### Flag 5: _1nj3ct (CVE-2023-33538 command injection)

8. Analizza il binario httpd per la vulnerabilita SSID injection:
   ```
   strings /usr/bin/httpd
   ```
   Output: `execFormatCmd("iwconfig %s essid %s"...)` - nessuna sanitizzazione dell'SSID

### Flag 6: _sh3ll (Backdoor reverse shell)

9. Analizza il binario backdoorTest:
   ```
   strings /usr/bin/backdoorTest
   ```
   Output: sorgente della reverse shell MIPS con connessione a 192.168.0.100:4444
