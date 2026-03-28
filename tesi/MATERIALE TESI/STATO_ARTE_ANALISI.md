# STATO_ARTE_ANALISI.md — Analisi Stato dell'Arte e Mappatura Bibliografia (AG_tesi.pdf)

> Estratto dalla tesi di Alessandro Genova: "Vulnerability Assessment of Low-Cost IoT Devices: Towards a Virtual Hardware Security Training Environment" (Politecnico di Torino, Dicembre 2025).

---

## 1. MAPPA TEMATICA

La tesi organizza il materiale di contesto su **due capitoli**: un **Background** (Cap. 2, pp. 11-26) con i fondamenti tecnici, e uno **State of the Art** vero e proprio (Cap. 3, pp. 27-34) con il posizionamento nel panorama esistente. Entrambi sono rilevanti per la costruzione dello stato dell'arte di una nuova tesi.

---

### CAPITOLO 2 — BACKGROUND

#### 2.1 Fondamenti di Hardware Security

##### 2.1.1 Il ruolo dell'hardware nella cybersecurity
**Argomento**: Tassonomia tripartita di Prinetto: Hardware Security, Hardware-based Security, Hardware Trust.

**Sintesi**: L'hardware è l'ultimo livello di difesa. Hardware Security protegge i componenti fisici; Hardware-based Security usa l'hardware per proteggere software/dati (TPM, TEE, secure boot, ARM TrustZone, Intel SGX, PUF); Hardware Trust verifica autenticità e provenienza dei componenti. I tre concetti sono interdipendenti.

**Fonti citate**:
- [26] Prinetto (2020) — tassonomia hardware security

---

##### 2.1.2 Minacce e motivazioni degli avversari
**Argomento**: Threat landscape hardware: attori, motivazioni, impatto sul ciclo di vita dei dispositivi.

**Sintesi**: Gli avversari perseguono guadagno finanziario, spionaggio, sabotaggio. Le minacce coprono l'intero ciclo di vita (design → fabbricazione → deployment → dismissione). Supply-chain compromise, hardware Trojan, contraffazione. Impatto: clonazione firmware, propagazione malware, danni fisici (Stuxnet). Mitigazione: diversificazione supply-chain, logic locking, secure boot, identità dispositivo.

**Fonti citate**:
- [2] Antonakakis et al. — Mirai Botnet (USENIX 2017)
- [9] Cheruvu et al. (2020) — Demystifying IoT Security
- [11] Falliere et al. (2010) — Stuxnet Dossier
- [19] Kocher et al. (2019) — Spectre Attacks
- [22] Lipp et al. (2020) — Meltdown
- [30] Tehranipoor et al. (2023) — Hardware Security Training

---

##### 2.1.3 Aspetti tecnici del compromesso hardware
**Argomento**: Tecniche di estrazione segreti, side-channel analysis, fault injection, contromisure.

**Sintesi**: Tre categorie di estrazione: non-invasiva (UART dump, OTA intercept), invasiva (decapsulazione, chip-off), semi-invasiva (CH341A in-situ, cold-boot attacks). Side-channel: SPA, DPA, CPA. Fault injection: voltage/clock glitching, Rowhammer, laser. Contromisure: constant-time execution, masking, EM shielding, FIPS 140-3 TVLA.

**Fonti citate**:
- [6] Bhunia & Tehranipoor (2019) — Hardware Security: A Hands-on Learning Approach
- [8] Brier et al. (2004) — Correlation Power Analysis
- [13] Halderman et al. (2009) — Cold-Boot Attacks
- [18] Kim et al. (2014) — Rowhammer
- [20] Kocher et al. (1999) — Differential Power Analysis
- [27] Russell & Van Duren (2018) — Practical IoT Security
- [32] van Woudenberg & O'Flynn (2022) — The Hardware Hacking Handbook

---

#### 2.2 Fondamenti dei Sistemi Embedded

##### 2.2.1-2.2.2 Definizione e componenti comuni
**Argomento**: Cosa sono i sistemi embedded, architetture SoC, componenti COTS, interfacce debug.

**Sintesi**: Sistemi specializzati con vincoli di potenza/costo/dimensione. SoC integrano CPU, GPU, DSP, crittografia, memoria. Uso estensivo di componenti COTS e interfacce standard (UART, JTAG/SWD) che creano superfici di attacco condivise. Riuso di bootloader (U-Boot), OS (Linux, RTOS), SDK vendor.

**Fonti citate**: nessuna citazione esplicita.

---

##### 2.2.3 Tipi di storage non volatile
**Argomento**: SPI NOR, Raw NAND, SPI NAND, eMMC/UFS, EEPROM, OTP/eFuses.

**Sintesi**: Classificazione delle memorie non volatili nei dispositivi embedded, con caratteristiche di capacità, interfaccia, e accessibilità. SPI NOR (1-64MB) è la più comune e facilmente accessibile via test clip. eFuses sono critiche per Root of Trust (ROTPK, JTAG disable).

**Fonti citate**:
- [32] van Woudenberg & O'Flynn (2022) — p. 89, accesso a SPI NOR via SOIC-8

---

##### 2.2.4 Partizioni MTD e filesystem
**Argomento**: Sottosistema MTD di Linux, JFFS2, SquashFS, strumenti di estrazione.

**Sintesi**: MTD espone il comportamento erase-before-write della Flash. JFFS2: filesystem journaling per Flash raw con compressione, wear-leveling, garbage collection. SquashFS: filesystem read-only compresso per partizioni di sistema. Strumenti: jefferson (JFFS2), sasquatch (SquashFS).

**Fonti citate**: nessuna citazione esplicita.

---

##### 2.2.5 Architetture CPU e modelli di memoria
**Argomento**: ARM (Cortex-M, Cortex-A), MIPS, RISC-V, Xtensa, AVR/PIC.

**Sintesi**: ARM domina IoT moderno. MIPS presente in router legacy. RISC-V emergente in design low-power. Xtensa in ESP32. Differenze nei modelli di memoria: MMU (Cortex-A), MPU (Cortex-M), segmentazione fissa (MIPS).

**Fonti citate**: nessuna citazione esplicita.

---

##### 2.2.6 U-Boot
**Argomento**: Bootloader universale open-source per sistemi embedded.

**Sintesi**: U-Boot inizializza hardware, fornisce console UART, gestisce variabili ambiente, supporta boot flessibile. Shell interattiva permette ispezione/modifica memoria e Flash. Nei dispositivi consumer: UART sbloccato e assenza di secure boot rendono triviale il compromesso con accesso fisico.

**Fonti citate**: nessuna citazione esplicita.

---

##### 2.2.7 RTOS vs sistemi Linux-based
**Argomento**: Trade-off tra RTOS (RT-Thread, eCos, FreeRTOS) e Linux per IoT.

**Sintesi**: RTOS per latenza deterministica su MCU vincolati (<1MB RAM). Linux per gateway/edge con funzionalità ricche. Architetture ibride: Linux su core principale + RTOS su co-processore.

**Fonti citate**: nessuna citazione esplicita.

---

#### 2.3 Strumenti di Analisi Hardware e Software

##### 2.3.1 Strumentazione hardware
**Argomento**: Multimetri, analizzatori logici, adattatori UART, programmatori Flash, PCBite, ChipWhisperer.

**Sintesi**: Toolkit completo per hardware hacking: multimetro per identificazione pin, analizzatore logico per cattura bus seriali, USB-UART per console, CH341A per dump Flash, PCBite per contatto non distruttivo, ChipWhisperer per SCA e fault injection.

**Fonti citate**:
- [3] Aodrulez — BlueTag (discovery JTAG)

---

##### 2.3.2 Toolchain software
**Argomento**: flashrom, binwalk, Ghidra, Frida, Wireshark, hashcat, openssl.

**Sintesi**: Pipeline modulare: acquisizione firmware (flashrom + CH341A), unpacking (binwalk, allyourbase), analisi entropia, disassembly (Ghidra), instrumentazione dinamica (Frida), cattura rete (Wireshark/PCAPDroid), recovery password (hashcat), ispezione certificati (openssl).

**Fonti citate**:
- [1] 8051Enthusiast — allyourbase (firmware base-address finder)

---

##### 2.3.3 Metodologia e fasi procedurali
**Argomento**: Workflow di analisi embedded in fasi riproducibili.

**Sintesi**: 5 fasi: (1) Ricognizione preliminare (OSINT, FCC filing, CVE/NVD); (2) Ricognizione on-board non invasiva (identificazione UART/JTAG con multimetro); (3) Acquisizione firmware (in-situ via test clip, chip-off, bootloader-mediated, OTA intercept); (4) Analisi statica (binwalk, Ghidra, strings, certificati); (5) Analisi dinamica (packet capture, MITM, Frida, emulazione QEMU, fuzzing).

**Fonti citate**: nessuna citazione esplicita (ma metodologia consolidata nel campo).

---

### CAPITOLO 3 — STATE OF THE ART

#### 3.1 Progetti nazionali abilitanti
**Argomento**: SERICS e ARTIC come contesto istituzionale e progettuale.

**Sintesi**: SERICS è una partnership estesa PNRR per cybersecurity. ARTIC (Spoke 4 di SERICS) ingegnerizza cyber range economici, scalabili e interoperabili tramite containerizzazione, microservizi e digital twin. Questa tesi applica i principi ARTIC al dominio embedded/IoT security training.

**Fonti citate**: nessuna citazione formale (progetto istituzionale descritto narrativamente).

---

#### 3.2 Panorama della formazione in hardware security

##### 3.2.1 Conferenze e corsi professionali
**Argomento**: Costi e offerta formativa delle principali conferenze/corsi di hardware security.

**Sintesi**: La formazione professionale è costosa (€2.000-€8.000+). Le principali sedi: Black Hat USA (€3.810-€5.200), DEF CON (€2.165-€2.770), Hardwear.io NL (€2.810), S4X (€3.075+tax), SANS (€4.935-€8.230). UKRISE offre formazione gratuita ma riservata a PhD/postdoc UK. Target: professionisti esperti, spesso finanziati dai datori di lavoro.

**Fonti citate**:
- [7] Black Hat USA 2025 Training
- [10] DEF CON Training Las Vegas 2025
- [15] Hardwear.io Netherlands 2025 Training
- [28] S4 Events — S4x25 Training
- [29] SANS Institute — Cyber Security Courses
- [31] UKRISE 2025 HW Security Training Roadshow

---

##### 3.2.2 CTF e competizioni hardware
**Argomento**: Survey di 11 piattaforme/competizioni hardware CTF.

**Sintesi**: Analisi dettagliata di: eCTF (MITRE, gratuito, online), RHme (Riscure/Keysight, Arduino-class), HHV DEF CON (alcune edizioni remote), Microcorruption (online, MSP430, architettura datata), CSAW ESC (universitario), Google CTF (archivi pubblici), Hardwear.io/Hardware CTF (in-person, $200-$850 + training $3.250), Hack The Box (categoria hardware), OWASP IoTGoat (firmware OpenWrt vulnerabile su QEMU), Hackropole (archivi FCSC Francia). Tre pattern di distribuzione: bench on-site, kit hardware distribuiti, archivi file-based.

**Fonti citate**: nessuna citazione numerata esplicita in questa sezione (le piattaforme sono descritte narrativamente con URL e dettagli).

---

##### 3.2.3 Gap identificati nel campo
**Argomento**: Lacune strutturali e pedagogiche nel panorama della formazione hardware security.

**Sintesi**: Quattro gap principali:
1. **Assenza di simulazioni browser-based full-stack**: nessuna piattaforma replica l'interazione con PCB reale in modo visuale e guidato
2. **Costi elevati e barriere logistiche**: conferenze/corsi/CTF live richiedono investimenti significativi
3. **Riproducibilità parziale**: archivi post-evento non possono riprodurre l'interazione live
4. **Focus architetturale ristretto**: molte piattaforme usano architetture non rappresentative dell'IoT moderno (MSP430, Arduino)

Trade-off fondamentale: **realismo vs accessibilità vs riproducibilità**.

**Fonti citate**: nessuna citazione numerata (analisi critica originale dell'autore).

---

#### 3.3 Fattori di exploitability nei dispositivi IoT low-cost

##### 3.3.1 Interfacce debug esposte (UART, JTAG, SWD)
**Argomento**: Vulnerabilità delle interfacce debug lasciate accessibili nei prodotti finali.

**Sintesi**: Test pad e pin header rimangono accessibili per necessità di manufacturing/RMA, creando un conflitto tra sicurezza e workflow operativi. UART è il vettore più sfruttabile (>45% dei dispositivi vulnerabili). eFuses e Authenticated Debug vengono spesso omessi per mantenere l'accesso al troubleshooting.

**Fonti citate**:
- [5] Bakhshi et al. (2024) — Review of IoT Firmware Vulnerabilities (p. 9)
- [6] Bhunia & Tehranipoor (2019) — Hardware Security (contesto sulle interfacce)
- [14] Haq et al. (2023) — Survey on IoT & Embedded Device Firmware Security (p. 9)

---

##### 3.3.2 Storage non volatile accessibile e segreti hard-coded
**Argomento**: Flash SPI/NOR non cifrate che espongono firmware, credenziali e configurazioni.

**Sintesi**: Le memorie Flash esterne nei dispositivi budget non sono cifrate per vincoli di risorse e QoS. Il dump in chiaro rivela segreti e vulnerabilità latenti che possono estendersi all'intera linea di prodotti del costruttore.

**Fonti citate**:
- [5] Bakhshi et al. (2024) — p. 9
- [14] Haq et al. (2023) — p. 9

---

##### 3.3.3 Assenza di Root of Trust e Secure Boot
**Argomento**: Mancanza di meccanismi hardware di trust nei dispositivi IoT economici.

**Sintesi**: I dispositivi IoT più economici omettono secure boot e root of trust per ridurre costi e complessità. Processori con sicurezza avanzata (Apple Secure Enclave, ARM TrustZone, TPM) hanno barriere di adozione: costi di produzione, rischio supply chain, complessità software.

**Fonti citate**:
- [9] Cheruvu et al. (2020) — p. 12
- [17] Khan et al. (2024) — Novel Trusted Hardware-Based Framework for IoT (p. 3)

---

##### 3.3.4 Vulnerabilità firmware, rete e aggiornamenti
**Argomento**: Software obsoleto, API insicure, OTA non autenticati, segreti hard-coded.

**Sintesi**: Assenza di aggiornamenti a lungo termine. ~80% dei produttori distribuisce firmware con flaw derivanti da librerie terze parti. Credenziali default/hard-coded (es. Mirai Botnet 2016). Rischio BORE (Break Once, Run Everywhere) quando un singolo segreto è condiviso tra milioni di dispositivi.

**Fonti citate**:
- [5] Bakhshi et al. (2024) — p. 7
- [9] Cheruvu et al. (2020) — p. 441 (BORE)
- [14] Haq et al. (2023) — p. 2

---

##### 3.3.5 Accessibilità fisica e side-channel
**Argomento**: Assenza di protezioni anti-tamper e contromisure SCA/FI nei dispositivi low-cost.

**Sintesi**: Dispositivi IoT low-cost privi di: constant-time implementations, masking, EM shielding (contro SCA), glitch detector, tamper-resistant packaging (contro FI). Virtualmente tutti i dispositivi IoT sono vulnerabili a fault injection.

**Fonti citate**:
- [6] Bhunia & Tehranipoor (2019) — p. 194
- [30] Tehranipoor et al. (2023) — p. 200
- [32] van Woudenberg & O'Flynn (2022) — p. 147

---

## 2. BIBLIOGRAFIA COMPLETA (ordinata per numero, come nella tesi)

| # | Autore(i) | Titolo | Tipo | Anno | DOI/URL |
|---|-----------|--------|------|------|---------|
| [1] | 8051Enthusiast | allyourbase: Firmware base-address finder | Repository GitHub | 2025 | https://github.com/8051Enthusiast/allyourbase |
| [2] | Antonakakis, M. et al. | Understanding the Mirai Botnet | Conferenza (USENIX Security '17) | 2017 | https://www.usenix.org/conference/usenixsecurity17/technical-sessions/presentation/antonakakis |
| [3] | Aodrulez | blueTag | Repository GitHub | 2025 | https://github.com/Aodrulez/blueTag |
| [4] | Qualcomm Atheros | QCA9531 802.11n 2x2 2.4 GHz Premium SOC Data Sheet | Datasheet | 2013 | https://skytech.ir/DownLoad/File/7809_QCA9531-BL3A.pdf |
| [5] | Bakhshi, T., Ghita, B., Kuzminykh, I. | A Review of IoT Firmware Vulnerabilities and Auditing Techniques | Articolo (Sensors) | 2024 | doi:10.3390/s24020708 |
| [6] | Bhunia, S. & Tehranipoor, M. | Hardware Security: A Hands-on Learning Approach | Libro (Morgan Kaufmann) | 2019 | ISBN: 978-0-12-812477-2 |
| [7] | Black Hat | Black Hat USA 2025: Hardware and IoT Training Track | Sito web | 2025 | https://blackhat.com/us-25/training/schedule/index.html |
| [8] | Brier, É., Clavier, C., Olivier, F. | Correlation Power Analysis with a Leakage Model | Conferenza (CHES 2004, LNCS 3156) | 2004 | doi:10.1007/978-3-540-28632-5_2 |
| [9] | Cheruvu, S., Kumar, A., Smith, N., Wheeler, D.M. | Demystifying Internet of Things Security | Libro (Apress) | 2020 | doi:10.1007/978-1-4842-2896-8 |
| [10] | DEF CON Communications | DEF CON Training Las Vegas 2025 | Sito web | 2025 | https://training.defcon.org/collections/def-con-training-las-vegas-2025 |
| [11] | Falliere, N., O'Murchu, L., Chien, E. | W32.Stuxnet Dossier | Report tecnico (Symantec) | 2010 | URL disponibile |
| [12] | GigaDevice | GD25Q127C Datasheet | Datasheet | 2018 | https://web.archive.org/web/20181202185943/https://www.gigadevice.com/datasheet/gd25q127c/ |
| [13] | Halderman, J.A. et al. | Lest We Remember: Cold-Boot Attacks on Encryption Keys | Articolo (Comm. ACM 52.5) | 2009 | doi:10.1145/1506409.1506429 |
| [14] | Haq, S.U., Singh, Y., Sharma, A., Gupta, R., Gupta, D. | A survey on IoT & embedded device firmware security | Articolo (Discover) | 2023 | — |
| [15] | Hardwear.io | Hardwear.io Netherlands 2025 Training | Sito web | 2025 | https://hardwear.io/netherlands-2025/training.php |
| [16] | Hikvision | DS-3E1310P-EIM Introduccion de Mantenimiento de Producto | Documentazione tecnica | — | URL Scribd |
| [17] | Khan, M., Hatami, M., Zhao, W., Chen, Y. | A Novel Trusted Hardware-Based Scalable Security Framework for IoT Edge Devices | Articolo (Discover IoT) | 2024 | — |
| [18] | Kim, Y. et al. | Flipping Bits in Memory Without Accessing Them: DRAM Disturbance Errors | Articolo (ACM SIGARCH 42.3) | 2014 | doi:10.1145/2678373.2665726 |
| [19] | Kocher, P. et al. | Spectre Attacks: Exploiting Speculative Execution | Conferenza (IEEE S&P 2019) | 2019 | doi:10.1109/SP.2019.00002 |
| [20] | Kocher, P.C., Jaffe, J., Jun, B. | Differential Power Analysis | Conferenza (CRYPTO '99, LNCS 1666) | 1999 | doi:10.1007/3-540-48405-1_25 |
| [21] | KostasEreksonas | TP Link TL-WR841N router cybersecurity analysis | Repository GitHub | 2024 | https://github.com/KostasEreksonas/tp-link-tl-wr841n-security-analysis |
| [22] | Lipp, M. et al. | Meltdown: Reading Kernel Memory From User Space | Articolo (Comm. ACM 63.6) | 2020 | doi:10.1145/3357033 |
| [23] | Microchip | PIC32 Family Reference Manual | Documentazione tecnica | 2015 | URL Microchip |
| [24] | Microchip | PIC32MZ Address Translation | Documentazione tecnica | 2023 | URL Microchip |
| [25] | MIPS | Memory Map and the MIPS Privileged Resource Architecture | Documentazione tecnica | 2018 | https://training.mips.com/basic_mips/PDF/Memory_Map.pdf |
| [26] | Prinetto, P. | Hardware Security, Vulnerabilities, and Attacks: A Comprehensive Taxonomy | Conferenza (ITASEC 2020) | 2020 | https://iris.polito.it/handle/11583/2838903 |
| [27] | Russell, B. & Van Duren, D. | Practical Internet of Things Security (2nd ed.) | Libro (Packt) | 2018 | ISBN: 978-1-78862-582-1 |
| [28] | S4 Events | S4x25 Training | Sito web | 2025 | https://s4xevents.com/s4x25-training/ |
| [29] | SANS Institute | SANS Cyber Security Courses: Offensive Operations | Sito web | 2025 | URL SANS |
| [30] | Tehranipoor, M., Anandakumar, N.N., Farahmandi, F. | Hardware Security Training, Hands-on! | Libro (Springer) | 2023 | doi:10.1007/978-3-031-31034-8 |
| [31] | UKRISE | UKRISE 2025 Hardware Security Training Roadshow | Sito web | 2025 | https://www.ukrise.org/2025-hw-security-training-roadshow/ |
| [32] | van Woudenberg, J. & O'Flynn, C. | The Hardware Hacking Handbook | Libro (No Starch Press) | 2022 | ISBN: 978-1-59327-874-8 |

---

## 3. MAPPA FONTI PER SEZIONE

### Fonti più citate (ricorrenza trasversale)

| Fonte | Sezioni in cui appare | Ruolo |
|-------|----------------------|-------|
| [6] Bhunia & Tehranipoor (2019) | 2.1.3, 3.3.1, 3.3.5 | Riferimento primario su hardware security |
| [32] van Woudenberg & O'Flynn (2022) | 2.1.3, 2.2.3, 3.3.5 | Riferimento primario su hardware hacking pratico |
| [9] Cheruvu et al. (2020) | 2.1.2, 3.3.3, 3.3.4 | Riferimento primario su IoT security |
| [5] Bakhshi et al. (2024) | 3.3.1, 3.3.2, 3.3.4 | Survey vulnerabilità firmware IoT |
| [14] Haq et al. (2023) | 3.3.1, 3.3.2, 3.3.4 | Survey sicurezza firmware embedded |
| [30] Tehranipoor et al. (2023) | 2.1.2, 3.3.5 | Formazione pratica hardware security |

### Fonti per categoria

**Libri di riferimento (pilastri):**
- [6] Bhunia & Tehranipoor — Hardware Security: teoria e pratica
- [9] Cheruvu et al. — IoT Security: architettura e deployment
- [27] Russell & Van Duren — Practical IoT Security
- [30] Tehranipoor et al. — Hardware Security Training
- [32] van Woudenberg & O'Flynn — Hardware Hacking Handbook

**Articoli accademici (fondamentali):**
- [2] Mirai Botnet — caso studio IoT insecurity
- [5] Bakhshi et al. — survey firmware vulnerabilities (2024, molto recente)
- [8] Brier et al. — CPA (fondamento side-channel)
- [13] Halderman et al. — Cold-Boot Attacks
- [14] Haq et al. — survey firmware security
- [17] Khan et al. — trusted hardware framework IoT
- [18] Kim et al. — Rowhammer
- [19] Kocher et al. — Spectre
- [20] Kocher et al. — DPA (fondamento side-channel)
- [22] Lipp et al. — Meltdown
- [26] Prinetto — tassonomia hardware security

**Report tecnici:**
- [11] Falliere et al. — Stuxnet Dossier

**Risorse formative (conferenze/corsi):**
- [7] Black Hat, [10] DEF CON, [15] Hardwear.io, [28] S4X, [29] SANS, [31] UKRISE

**Strumenti e repository:**
- [1] allyourbase, [3] BlueTag, [21] KostasEreksonas (analisi TP-Link)

**Datasheet e documentazione tecnica:**
- [4] QCA9531, [12] GD25Q127C, [16] Hikvision, [23] PIC32, [24] PIC32MZ, [25] MIPS

---

## 4. NOTE DI RIUTILIZZO PER LA NUOVA TESI

### Temi direttamente riutilizzabili

| Tema | Rilevanza | Come riadattare | Fonti chiave da mantenere |
|------|-----------|-----------------|--------------------------|
| **Tassonomia Hardware Security** (Prinetto) | ALTA — fondamento concettuale universale | Utilizzabile come è, eventualmente aggiornando con sviluppi post-2020 | [26] Prinetto |
| **Threat landscape hardware** | ALTA — contesto motivazionale | Riadattare con focus sul dominio specifico della nuova tesi; aggiornare con incidenti recenti | [2], [9], [11], [19], [22] |
| **Tecniche di compromesso hardware** (SCA, FI, estrazione) | ALTA — background tecnico essenziale | Mantenere struttura, approfondire le tecniche rilevanti per la nuova tesi | [6], [8], [13], [18], [20], [32] |
| **Sistemi embedded: architetture e storage** | MEDIA — dipende dal focus della nuova tesi | Selezionare solo le architetture e memorie rilevanti per i dispositivi analizzati | [4], [23], [24], [25] |
| **U-Boot e bootloader** | MEDIA-ALTA — se la nuova tesi analizza dispositivi con U-Boot | Riutilizzabile come è per tesi su vulnerability assessment IoT | — |
| **Metodologia di analisi** (fasi procedurali) | ALTA — workflow riproducibile | Framework metodologico da adottare e personalizzare | [1], [3] |
| **Gap nella formazione HW security** | BASSA-MEDIA — solo se la nuova tesi ha componente educativa | Aggiornare con eventuali nuove piattaforme emerse dopo 2025 | [7], [10], [15], [28], [29], [30], [31] |
| **Exploitability IoT low-cost** | ALTA — per qualsiasi tesi su IoT security | Nucleo dello stato dell'arte; verificare se ci sono survey più recenti di [5] e [14] | [5], [6], [9], [14], [17], [30], [32] |
| **RTOS vs Linux** | BASSA — solo se rilevante per i dispositivi analizzati | Sintetizzare in un paragrafo se non centrale | — |

### Fonti da aggiornare o sostituire

| Fonte | Motivo | Azione suggerita |
|-------|--------|-----------------|
| [7], [10], [15], [28], [29], [31] — Siti conferenze 2025 | Costi e programmi cambiano ogni anno | Aggiornare con edizioni dell'anno corrente |
| [5] Bakhshi et al. (2024) | Survey recente ma potrebbe avere aggiornamenti | Verificare se esiste versione aggiornata o survey concorrente |
| [14] Haq et al. (2023) | Survey datata 2023 | Cercare survey più recenti su firmware security |
| [21] KostasEreksonas | Analisi specifica TP-Link WR841N | Sostituire con analisi del dispositivo specifico della nuova tesi |
| [4], [12], [16], [23], [24], [25] — Datasheet | Specifici per i dispositivi di AG | Sostituire con datasheet dei dispositivi della nuova tesi |

### Fonti da mantenere assolutamente

Queste fonti sono "pilastri" della letteratura hardware security e sono rilevanti indipendentemente dal dispositivo specifico analizzato:

1. **[6] Bhunia & Tehranipoor (2019)** — testo di riferimento su hardware security
2. **[9] Cheruvu et al. (2020)** — IoT security completo
3. **[26] Prinetto (2020)** — tassonomia fondamentale
4. **[30] Tehranipoor et al. (2023)** — hardware security training
5. **[32] van Woudenberg & O'Flynn (2022)** — hardware hacking pratico
6. **[2] Antonakakis et al. (2017)** — Mirai, caso studio fondamentale
7. **[20] Kocher et al. (1999)** — DPA, fondamento teorico
8. **[8] Brier et al. (2004)** — CPA, fondamento teorico
9. **[13] Halderman et al. (2009)** — Cold-Boot, fondamento
10. **[19] Kocher et al. (2019)** — Spectre, impatto sistemico
