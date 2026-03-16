# Il Tuo Primo Esercizio (Come Studente)

## Panoramica

Questa guida descrive come completare l'esercizio di default incluso nell'installazione di PCB-CTF. E' composto da 3 step che coprono le principali funzionalita' del simulatore.

---

## Step 1: Hardware Analysis

### Obiettivo

Identificare i componenti principali della PCB: CPU, memoria ROM e connettore UART.

### Procedura

1. Aprire il simulatore: `http://localhost:3000`
2. Cliccare **"Avvia Step"** per iniziare
3. Selezionare lo strumento **Magnifier** dalla sidebar
4. Passare il cursore sulla PCB per leggere le etichette dei chip

**Trovare la CPU**:
- Il chip piu' grande al centro della scheda
- Clic su di esso quando lo strumento **Pointer** e' attivo
- Flag sbloccato: `STM32F4`

**Trovare la ROM**:
- Chip piu' piccolo vicino alla CPU (8 piedini)
- Clic su di esso
- Flag sbloccato: `|75xx`

**Trovare il Connettore UART**:
- Gruppo di 3-4 pin in basso a destra
- Clic su di esso
- Flag sbloccato: `_UART_OK`

**Flag completa**: `flag{STM32F4|75xx_UART_OK}`

Inserire la flag nel campo e cliccare "Verifica".

---

## Step 2: UART Connection

### Obiettivo

Collegare le sonde UART dell'adattatore ai pin del dispositivo.

### Procedura

1. Il simulatore avanza automaticamente allo Step 2
2. Cliccare **"Avvia Step"**
3. Selezionare **UART Probes** dalla sidebar
4. Identificare i pin UART sulla PCB (TX, RX, GND)
5. Collegare le sonde seguendo la regola del **crossover**:

```
Adattatore TX  →  Pin RX del dispositivo
Adattatore RX  →  Pin TX del dispositivo
Adattatore GND →  Pin GND del dispositivo
```

**Come collegare**:
1. Clic su "TX" nell'adattatore (diventa attivo)
2. Clic sul pin "RX" sulla PCB (snap automatico)
3. Ripetere per RX e GND

Quando tutte e tre le connessioni sono corrette, la flag si sblocca automaticamente:

**Flag completa**: `flag{UART_CONNECTED}`

---

## Step 3: Terminal Challenge

### Obiettivo

Esplorare il sistema embedded via terminale UART e scoprire tutti i flag nascosti.

### Procedura

1. Avanzare allo Step 3
2. Selezionare **Terminal** dalla sidebar
3. Attendere la fine della boot sequence (U-Boot → Linux → shell)

**Obiettivo 3.1 — Boot Analysis**:
```
ar7100> printenv
```
Il comando mostra le variabili di boot. Flag `b00t` sbloccato.

**Obiettivo 3.2 — Root Access**:
```
OpenWrt login: root
(premere Enter senza password)
root@router:~#
```
Flag `_r00t` sbloccato.

**Obiettivo 3.3 — Hash Cracking** (tab Local Machine):
```
# Prima nel tab UART Console:
root@router:~# cat /etc/shadow

# Poi nel tab Local Machine:
kali@local:~$ hashcat -m 500 <hash> rockyou.txt
```
Flag `_h4sh` sbloccato.

**Obiettivo 3.4 — Data Leak**:
```
root@router:~# strings /dev/mtdblock3
```
Flag `_l34k` sbloccato.

**Obiettivo 3.5 — Command Injection**:
```
root@router:~# strings /usr/bin/httpd | grep exec
```
Flag `_1nj3ct` sbloccato.

**Obiettivo 3.6 — Backdoor Discovery**:
```
root@router:~# ps
root@router:~# strings /usr/bin/backdoorTest
```
Flag `_sh3ll` sbloccato.

**Flag completa**: `flag{b00t_r00t_h4sh_l34k_1nj3ct_sh3ll}`

---

## Esercizio Completato

Congratulazioni! Hai completato tutti e 3 gli step, coprendo:
- Identificazione hardware su PCB
- Connessione seriale UART
- Analisi di un sistema embedded via terminale
