# Indice della Tesi

**Titolo:** Progettazione e Implementazione di un Cyber Range Interattivo basato su Web per la Formazione in Hardware Security

**Candidato:** Davide Leone
**Relatore:** Prof. Paolo Ernesto Prinetto
**Correlatori:** Samuele Yves Cerini, Nicolo Maunero
**Istituzione:** Politecnico di Torino - DAUIN
**Corso di Laurea:** Laurea Magistrale in Ingegneria Informatica / Cybersecurity

---

## Struttura del documento

### Materiale preliminare
- Frontespizio
- Ringraziamenti
- Abstract (inglese)
- Sommario (italiano)
- Indice
- Elenco delle figure
- Elenco delle tabelle

---

### Introduzione (4-5 pagine)

- Contesto: crescita esponenziale dei dispositivi IoT e criticita della sicurezza hardware
- Problema: barriere di accesso alla formazione in hardware security (costi elevati, attrezzature fisiche, rischio di danneggiamento, assenza di piattaforme intermedie tra CTF software e laboratori fisici)
- Obiettivo della tesi: progettazione e implementazione di una piattaforma web interattiva (cyber range) che simula l'analisi hardware di circuiti stampati in formato CTF
- Contributi principali (sintesi)
- Struttura del documento

---

### Capitolo 1 - Fondamenti di Sicurezza Hardware (12-15 pagine)

Capitolo di background che fornisce le basi teoriche necessarie alla comprensione del lavoro.

#### 1.1 Il ruolo dell'hardware nella cybersecurity
- Superficie di attacco hardware vs software
- Tassonomia delle minacce hardware (modello di Prinetto)
- Motivazioni degli avversari e modelli di attacco

#### 1.2 Sistemi embedded e architetture comuni
- Definizione e componenti tipici (SoC, memorie, interfacce)
- Architetture CPU comuni nei dispositivi IoT (ARM, MIPS)
- Tipi di memoria non volatile (NOR/NAND Flash, EEPROM)
- Partizioni MTD e filesystem embedded (SquashFS, JFFS2)

#### 1.3 Interfacce di debug e comunicazione
- UART: principi, identificazione pin, comunicazione seriale
- SPI: protocollo, ruoli dei segnali (CS, CLK, MOSI, MISO)
- JTAG: cenni e confronto con UART/SPI
- Il bootloader U-Boot: ruolo, variabili d'ambiente, interazione

#### 1.4 Strumenti per l'analisi hardware
- Strumentazione fisica: multimetro, analizzatore logico, adattatori USB-to-Serial, programmatori di memoria (CH341A)
- Toolchain software: binwalk, flashrom, Ghidra, hashcat, strings
- Metodologia di analisi: fasi procedurali dall'ispezione visiva all'estrazione firmware

#### 1.5 Fattori di vulnerabilita nei dispositivi IoT a basso costo
- Interfacce di debug esposte (UART presente in >45% dei dispositivi)
- Storage non cifrato e credenziali hardcoded
- Assenza di Secure Boot e Root of Trust
- Vulnerabilita firmware e aggiornamenti OTA insicuri

---

### Capitolo 2 - Stato dell'Arte (10-12 pagine)

Posizionamento del lavoro nel panorama esistente, identificazione dei gap.

#### 2.1 Contesto istituzionale
- Progetto SERICS (PNRR) e Spoke 4
- Progetto ARTIC e obiettivi formativi

#### 2.2 Formazione professionale in hardware security
- Corsi professionali (Black Hat, SANS): costi e barriere (3.000-8.000 EUR)
- Certificazioni e programmi accademici esistenti

#### 2.3 Piattaforme CTF e competizioni hardware
- CTF software: CTFd, PicoCTF, Hack The Box, TryHackMe
- CTF hardware: eCTF (MITRE), RHme (Riscure), CSAW ESC
- Piattaforme IoT: Microcorruption, OWASP IoTGoat, DVRF, Attify Badge
- Limiti: focus su architetture legacy (MSP430), assenza di simulazione PCB

#### 2.4 Laboratori remoti e cyber range
- Laboratori remoti: iLab (MIT), WebLab-Deusto, VISIR, LabsLand
- Cyber range: KYPO, CyRIS, CyTrONE, DETER/Emulab
- Simulatori di circuiti: Falstad, Tinkercad, Wokwi
- Framework di emulazione firmware: QEMU, Firmadyne, FirmAE, Avatar

#### 2.5 Gap identificati
1. Nessuna piattaforma offre simulazione interattiva completa di PCB nel browser
2. Costi elevati e barriere logistiche impediscono formazione su larga scala
3. Le piattaforme esistenti coprono o solo software CTF o solo laboratorio fisico
4. Mancanza di strumenti no-code per la creazione di esercizi hardware
5. Trade-off irrisolto tra realismo, accessibilita e riproducibilita

---

### Capitolo 3 - Analisi dei Requisiti (8-10 pagine)

Specifica formale dei requisiti derivata dall'analisi dei gap.

#### 3.1 Contesto operativo e attori
- Studente: fruitore del simulatore
- Autore/Docente: configuratore degli esercizi
- Modello single-user per istanza

#### 3.2 Requisiti funzionali
- Simulazione PCB interattiva (visualizzazione, identificazione componenti, lente d'ingrandimento)
- Strumenti di misura (multimetro digitale con modalita tensione/resistenza)
- Connessione UART (adattatore con validazione crossover TX/RX)
- Estrazione firmware SPI (6 sonde colorate con validazione role-based)
- Terminale simulato (filesystem virtuale, sequenze di boot, flag progressive, tab multipli, vincoli sui comandi)
- Struttura esercizio a step con 5 tipi di obiettivo (component, pin, uart, terminal, firmware-dump)
- Sistema di authoring visuale (editor canvas drag-and-drop, editor terminale, preview, preset)

#### 3.3 Requisiti non funzionali
- Accessibilita: zero installazione (solo browser), deployment con singolo artefatto Docker
- Usabilita: feedback visivo, istruzioni e hint contestuali, design responsivo
- Performance: esecuzione interamente client-side, indipendenza dal server durante la simulazione
- Manutenibilita: tipizzazione statica (TypeScript), architettura modulare, configurazione dichiarativa
- Sicurezza: nessuna esecuzione di comandi server-side, isolamento delle sessioni

#### 3.4 Casi d'uso
- Casi d'uso studente: esplorazione PCB, misurazione elettrica, connessione UART, estrazione firmware, esplorazione terminale, completamento esercizio
- Casi d'uso autore: configurazione PCB, definizione esercizio, configurazione terminale, gestione preset

#### 3.5 Vincoli e assunzioni

---

### Capitolo 4 - Progettazione dell'Architettura (12-15 pagine)

Scelte architetturali, modello dei dati, design dei sottosistemi.

#### 4.1 Stack tecnologico
- Next.js 15 (App Router, standalone output): motivazioni della scelta
- React 19, TypeScript 5: type safety e modularita
- Tailwind CSS 4, Radix UI: accessibilita e design system
- Zustand 5: gestione stato leggera senza boilerplate
- Persistenza JSON su filesystem (nessun database)

#### 4.2 Architettura generale del sistema
- Due route principali: simulatore (`/`) e pannello di authoring (`/settings`)
- Layout a tre pannelli del simulatore
- API REST tramite Next.js Route Handler
- Separazione netta tra simulatore e configuratore

#### 4.3 Modello dei dati
- Struttura `Exercise`: step, obiettivi, componenti, pin, configurazione tool
- Tipi di obiettivo e relative condizioni di completamento
- Sistema di pin unificato (MeasurementPin, UartPin, FirmwareDumpPin)
- Sistema di coordinate normalizzate in percentuale

#### 4.4 Architettura dello stato applicativo
- `exerciseStore`: stato runtime del simulatore (progresso, tool attivi, connessioni sonde, flag)
- `settingsStore`: stato dell'interfaccia di authoring (canvas, editing componenti/pin)
- `terminalSettingsStore`: configurazione terminale in editing (componenti, tab, comandi, filesystem, boot, flag)
- `presetStore`: gestione preset (CRUD, dirty tracking tramite sottoscrizioni Zustand)
- Strategia di persistenza a tre livelli (store in-memory, localStorage, filesystem via API)

#### 4.5 Progettazione del sistema terminale simulato
- Principi: esecuzione interamente client-side, determinismo, portabilita
- Modularita: componenti terminale multipli e indipendenti per esercizio
- Pipeline di esecuzione comandi: parsing, validazione vincoli, generazione output, applicazione side effect
- 6 tipi di output: static, conditional, template, lookup, dynamic, script
- Filesystem a due livelli (directories + files), auto-flattening da notazione ad albero
- Sequenze di boot con stage animati e gestione speciale (uboot_wait, login, password)
- Sistema flag progressivo con unlock condizionali

#### 4.6 Flusso dati tra authoring e simulazione
- Tre fasi: authoring (draft in store) -> persistenza (JSON + localStorage) -> simulazione (caricamento via hook)
- Sincronizzazione in tempo reale tra tab settings e simulatore (StorageEvent + evento custom)
- Sistema preset: bundle immutabili esercizio + terminale con copia indipendente dell'immagine PCB

---

### Capitolo 5 - Implementazione (14-18 pagine)

Dettagli implementativi dei componenti principali.

#### 5.1 Visualizzatore PCB interattivo
- Sistema di overlay e conversione coordinate normalizzate -> pixel
- Visualizzazione contestuale dei pin in base al tool attivo
- Meccanismo di snap automatico (raggio dinamico)
- Rendering dei fili con curve di Bezier quadratiche in SVG
- Lente d'ingrandimento con CSS background-image e layer di contenuto interno

#### 5.2 Strumenti di analisi hardware simulati
- Multimetro digitale: due sonde, modalita V/Ohm, rumore digitale realistico, regole di lettura differenziale
- Adattatore UART: layout 4 pin, validazione crossover, auto-lancio terminale
- SPI Firmware Dumper: 6 sonde colorate, validazione role-based, barra di progresso animata, integrazione con terminale

#### 5.3 Terminale simulato
- TerminalConfigLoader: processo di inizializzazione in 4 fasi (flatten, normalize, compute, build)
- CommandExecutor: implementazione dei 6 tipi di output con catena di valutazione
- Comandi built-in (ls, cd, cat, pwd, grep, find, clear) con supporto flag
- Sequenze di boot: gestione stage con display animato a intervalli, handling speciale per countdown, login, password
- Persistenza stato a livello di modulo per preservare cronologia e stato tra mount/unmount

#### 5.4 Pannello di authoring
- Organizzazione interfaccia: sidebar (Init, Challenge), canvas interattivo
- Editor drag-and-drop per posizionamento componenti e pin
- Editor terminale: sezioni per comandi, flag, boot stage, filesystem
- Preview integrato in formato YAML

#### 5.5 API e persistenza dati
- Endpoint REST: /api/config, /api/terminal-config, /api/presets, /api/hints, /api/images, /api/firmware
- Persistenza a tre livelli: store in-memory, localStorage, filesystem
- Sincronizzazione real-time tramite hook useTerminalConfig() con listener StorageEvent

#### 5.6 Sistema di completamento esercizio
- Cinque percorsi di completamento (uno per tipo di obiettivo)
- Transizione tra step con reset completo dello stato
- Progressione flag: concatenazione flagPart + terminalCurrentFlag
- Dialog di completamento configurabile

---

### Capitolo 6 - Caso di Studio: Analisi del Router TP-Link WR841N (8-10 pagine)

Validazione della piattaforma attraverso un esercizio completo basato su un dispositivo reale.

#### 6.1 Scelta del dispositivo e motivazioni
- TP-Link WR841N: diffusione, vulnerabilita documentate, disponibilita di analisi di riferimento

#### 6.2 Struttura dell'esercizio
- Step 1 - Analisi Hardware: identificazione SoC (QCA953x), EPROM, connettore SPI
- Step 2 - Connessione UART: collegamento adattatore con crossover corretto
- Fase terminale (auto-lanciata): 6 flag progressive

#### 6.3 Configurazione del terminale simulato
- Tab UART Console: boot sequence realistico (U-Boot -> kernel -> login), filesystem simulato del WR841N
- Tab Local Machine: workstation dell'analista con hashcat
- Comandi custom con output condizionali e unlock flag

#### 6.4 Le sei sfide terminale
- Boot Analysis: `printenv` in U-Boot, anomalie nelle variabili bootloader
- Root Access: credenziali di default (root/sohoadmin)
- Hash Cracking: estrazione /etc/shadow, crack MD5 con hashcat
- Data Leak: `strings /dev/mtdblock3`, credenziali in chiaro nelle partizioni
- Command Injection: analisi `strings /usr/bin/httpd`, funzioni vulnerabili
- Backdoor Discovery: processo sospetto in `ps`, analisi binario con `strings`

#### 6.5 Configurazione tramite pannello di authoring
- Workflow completo di configurazione senza editing manuale di JSON
- Posizionamento componenti/pin, definizione filesystem e comandi, boot sequence, flag

---

### Capitolo 7 - Validazione e Discussione (8-10 pagine)

Valutazione qualitativa e posizionamento rispetto alle soluzioni esistenti.

#### 7.1 Criteri di valutazione

#### 7.2 Copertura pedagogica
- Percorso in 10 passi: dalla ricognizione fisica alla scoperta di vulnerabilita
- Confronto con i workflow di riferimento ("Hardware Hacking Handbook", "Practical IoT Hacking")
- Protocolli e tecniche non coperti: side-channel, JTAG, I2C, CAN

#### 7.3 Fedelta della simulazione
- Punti di forza: rumore digitale nel multimetro, validazione role-based, boot realistici, filesystem coerente
- Limitazione: determinismo (assenza di variabilita stocastica dell'ambiente reale)

#### 7.4 Espressivita dell'authoring
- Tipologie di esercizi supportati: ricognizione, misura elettrica, connessione protocolli, analisi terminale, combinati
- Flessibilita del sistema di output e vincoli

#### 7.5 Analisi comparativa
- Tabella comparativa: PCB-CTF vs CTFd/PicoCTF vs RHme vs Laboratori remoti
- Dimensioni di confronto: simulazione HW, interazione PCB, strumenti simulati, terminale, accessibilita browser, costo per studente, scalabilita, authoring no-code, determinismo, sicurezza server
- Posizionamento: colma il gap tra CTF software e laboratori fisici

#### 7.6 Limitazioni riconosciute
1. Nessuna esecuzione arbitraria di comandi (terminale limitato a comandi pre-configurati)
2. Copertura protocolli: JTAG, I2C, CAN non supportati
3. Single-user: assenza di multi-utente, scoring, leaderboard
4. Nessuna persistenza del progresso studente
5. Assenza di validazione empirica su coorti di studenti

#### 7.7 Sviluppi futuri
1. Multi-utente con scoring e leaderboard
2. Integrazione ibrida simulazione-hardware (connessione con laboratori remoti)
3. Nuovi protocolli (JTAG, I2C, CAN)
4. Terminale con generazione dinamica di risposte per comandi imprevisti
5. Persistenza del progresso e analytics per i docenti

---

### Conclusioni (2-3 pagine)

- Sintesi del contributo: piattaforma web che rende accessibile la formazione in hardware security
- Due principi guida: fedelta dell'interazione e configurabilita dichiarativa
- Risultati chiave: simulazione realistica degli strumenti, emulazione terminale convincente, authoring no-code efficace
- Successo architetturale: quattro store Zustand, persistenza JSON, coordinate normalizzate
- Validazione tramite caso di studio TP-Link WR841N
- Bilancio tra limitazioni riconosciute e direzioni di evoluzione

---

### Appendice A - Schema JSON della configurazione esercizio (5-6 pagine)
- A.1 Schema completo annotato
- A.2 Enumerazioni (ObjectiveType, Tool, UartRole, SpiRole)
- A.3 Sistema di coordinate normalizzate
- A.4 Esempio semplificato di esercizio a due step

### Appendice B - Schema della configurazione terminale (5-6 pagine)
- B.1 Struttura TerminalConfig
- B.2 TabConfig e filesystem
- B.3 CommandDefinition (handler, vincoli, output, side effect)
- B.4 FilesystemStructure (formato albero e formato piatto)
- B.5 FlagSystem
- B.6 Strutture runtime (CommandContext, CommandExecutionResult)
- B.7 Esempio dettagliato (tab UART Console del caso di studio)

---

## Stima delle pagine

| Sezione | Pagine stimate |
|---------|---------------|
| Materiale preliminare | 5-6 |
| Introduzione | 4-5 |
| Cap. 1 - Fondamenti di Sicurezza Hardware | 12-15 |
| Cap. 2 - Stato dell'Arte | 10-12 |
| Cap. 3 - Analisi dei Requisiti | 8-10 |
| Cap. 4 - Progettazione dell'Architettura | 12-15 |
| Cap. 5 - Implementazione | 14-18 |
| Cap. 6 - Caso di Studio | 8-10 |
| Cap. 7 - Validazione e Discussione | 8-10 |
| Conclusioni | 2-3 |
| Appendice A | 5-6 |
| Appendice B | 5-6 |
| Bibliografia | 3-4 |
| **Totale** | **96-120** |

---

## Note sulla struttura

### Rapporti rispettati (da CONTESTO_TESI.md)
- **Background + Stato dell'Arte** (Cap. 1 + Cap. 2): 22-27 pagine ~ 25-28% del corpo -> rispetta il vincolo <= 40%
- **Metodologia + Risultati** (Cap. 3 + Cap. 4 + Cap. 5 + Cap. 6): 42-53 pagine ~ 48-55% del corpo -> rispetta il vincolo >= 40-50%
- **Bibliografia stimata**: 50-70 riferimenti (range conforme 32-89)

### Differenze rispetto alla tesi AG (Genova)
- La tesi AG si focalizza sull'analisi di vulnerabilita di dispositivi reali e propone il framework come contributo
- Questa tesi e complementare: parte dai gap identificati e si concentra sulla progettazione, implementazione e validazione della piattaforma stessa
- Il caso di studio qui e funzionale alla dimostrazione della piattaforma, non all'analisi del dispositivo

### Allineamento con le tesi di riferimento
- Struttura in 7 capitoli + appendici, conforme al pattern osservato nelle tesi SYC, ADL, AG, DG
- Progressione didattica incrementale: dai fondamenti alla validazione
- Capitolo di implementazione dettagliato (conforme a DG e AG)
- Appendici tecniche con schemi JSON (specifiche del dominio)
