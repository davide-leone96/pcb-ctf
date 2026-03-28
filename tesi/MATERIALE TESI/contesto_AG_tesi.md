# Contesto - Tesi di Alessandro Genova (AG_tesi.pdf)

## Informazioni generali

- **Titolo**: "Vulnerability Assessment of Low-Cost IoT Devices: Towards a Virtual Hardware Security Training Environment"
- **Autore**: Alessandro Genova
- **Istituzione**: Politecnico di Torino — Cybersecurity National Lab (CINI)
- **Corso**: Master Degree in Cybersecurity
- **Data**: Dicembre 2025
- **Advisor**: Samuele Yves Cerini
- **Co-Advisor**: Nicolò Maunero
- **Progetto di riferimento**: ARTIC (Affordable, Reusable and Truly Interoperable Cyber ranges), Spoke 4 di Fondazione SERICS

---

## Struttura della tesi

| Cap. | Titolo | Pagine | Descrizione |
|------|--------|--------|-------------|
| 1 | Introduction | 9-10 | Problema: dispositivi IoT low-cost insicuri + gap educativo nella hardware security |
| 2 | Background | 11-26 | Fondamenti di hardware security, sistemi embedded, strumenti di analisi |
| 3 | State of the Art | 27-34 | Panorama della formazione in hardware security, CTF, gap identificati |
| 4 | Contributions | 35-40 | Framework CTF proposto, artefatti raccolti, piattaforma di training virtuale |
| 5 | Experimental Results | 41-93 | Analisi di sicurezza di 3 dispositivi IoT reali |
| 6 | Conclusions | 95-96 | Sintesi dei risultati e lavori futuri |
| A-C | Appendici | 97-120 | Bootlog completi dei 3 dispositivi analizzati |

---

## Obiettivo duplice della tesi

1. **Vulnerability Assessment**: valutare la sicurezza di dispositivi IoT consumer low-cost reali (interfacce hardware, firmware, protocolli di rete, app companion)
2. **Formazione**: trasformare i risultati in risorse educative per ambienti di training virtuale (cyber range / CTF browser-based) che non richiedano hardware fisico

---

## Capitolo 2 — Background (sintesi)

### 2.1 Fondamenti di Hardware Security
Tre concetti interconnessi (tassonomia di Paolo Prinetto):
- **Hardware Security**: protezione dei componenti hardware da vulnerabilita e attacchi
- **Hardware-based Security**: uso dell'hardware per proteggere software/firmware/dati (TPM, TEE, secure boot, ARM TrustZone, Intel SGX, PUF)
- **Hardware Trust**: verifica di autenticita e provenienza dei componenti hardware (anti-contraffazione, PUF)

### 2.2 Sistemi Embedded
- Architetture SoC, componenti COTS, storage non volatile (SPI NOR Flash)
- Partizioni MTD, filesystem comuni (SquashFS, JFFS2)
- Architetture CPU (MIPS, ARM), bootloader U-Boot
- RTOS vs sistemi Linux-based

### 2.3 Strumenti di analisi
- **Hardware**: multimetro, analizzatore logico, programmatore CH341A, PCBite, saldatura
- **Software**: binwalk, Ghidra, flashrom, minicom/screen, Wireshark, Frida, mitmproxy
- **Metodologia**: identificazione interfacce -> connessione -> dump firmware -> analisi statica/dinamica -> ricerca vulnerabilita

---

## Capitolo 3 — State of the Art (dettaglio completo)

### 3.1 Progetti nazionali abilitanti
- **SERICS** (SEcurity and RIghts in the CyberSpace): partnership estesa PNRR per cybersecurity
- **ARTIC**: progetto sotto Spoke 4 di SERICS, focalizzato su cyber range economici, scalabili e interoperabili (containerizzazione, microservizi, digital twin)

### 3.2 Panorama della formazione in hardware security

#### 3.2.1 Conferenze e corsi professionali
Costi elevati (da centinaia a migliaia di euro):
- Black Hat USA: 2-4 giorni, €3810-€5200
- DEF CON: 2-4 giorni, €2165-€2770
- Hardwear.io NL: 3 giorni, €2810
- S4X: 2 giorni, €3075+tax
- SANS Institute: 3-6 giorni, €4935-€8230
- UKRISE: gratuito ma riservato a PhD/postdoc UK

#### 3.2.2 CTF e competizioni hardware (panoramica)
- **eCTF (MITRE)**: competizione gratuita in due fasi (creazione sistema sicuro + attacco), interamente online con board fornite
- **RHme (Riscure/Keysight)**: sfide su board Arduino-class, side-channel, fault injection; materiali archiviati online
- **HHV DEF CON**: Hardware Hacking Village, alcune edizioni remote (DC28, DC29, DC32), altre solo in presenza; archivi GitHub disponibili
- **Microcorruption**: piattaforma online per reverse engineering firmware MSP430, con debugger interattivo; architettura datata, nessuna simulazione PCB
- **CSAW ESC**: competizione universitaria con qualificazioni remote; talvolta richiede hardware (ChipWhisperer Nano, Arduino)
- **Google CTF**: archivi pubblici su GitHub, non specificamente hardware-centric
- **Hardwear.io / Hardware CTF**: competizioni in presenza con bench attrezzati (Quarkslab, Ledger); costo conferenza $200-$850 + training opzionale ~$3250
- **Hack The Box**: categoria hardware con signal capture e firmware; orientamento primario su software CTF
- **OWASP IoTGoat**: distribuzione firmware OpenWrt vulnerabile per formazione, eseguibile su QEMU
- **Hackropole**: archivi sfide FCSC (Francia), task hardware con segnali radio, tracce side-channel

Tre pattern di distribuzione materiali:
1. **Bench hardware on-site** (conferenze, HHV, Hardwear.io)
2. **Kit hardware distribuiti** (eCTF MITRE, RHme)
3. **Archivi file-based** (firmware, capture logiche, write-up)

#### 3.2.3 Gap identificati nel campo
1. **Assenza di simulazioni browser-based full-stack**: nessuna piattaforma replica l'esperienza di interazione con PCB reale in modo visuale e guidato con strumenti virtuali
2. **Costi elevati e barriere logistiche**: conferenze, corsi e CTF live richiedono spese significative (registrazione, viaggio, alloggio, kit hardware)
3. **Riproducibilita parziale dei materiali**: archivi post-evento non possono riprodurre completamente l'interazione live con strumenti e dispositivi
4. **Focus architetturale ristretto**: molte piattaforme si basano su architetture specifiche (MSP430, Arduino, ChipWhisperer) che non riflettono la diversita dell'ecosistema IoT moderno

Trade-off fondamentale: **realismo vs accessibilita vs riproducibilita**. Non esiste attualmente una soluzione browser-based che combini interazione realistica con dispositivi, strumentazione e struttura pedagogica.

### 3.3 Fattori di exploitabilita nei dispositivi IoT low-cost
1. **Interfacce debug esposte** (UART, JTAG, SWD): UART e il vettore piu sfruttabile (>45% dei dispositivi vulnerabili a estrazione firmware); conflitto tra sicurezza e necessita di troubleshooting/RMA
2. **Storage non volatile accessibile e segreti hard-coded**: flash SPI/NOR non cifrate, dump in chiaro di credenziali e configurazioni
3. **Assenza di Root of Trust e Secure Boot**: costi elevati di TPM, TrustZone, Secure Enclave impediscono adozione su IoT economici
4. **Vulnerabilita firmware, rete e aggiornamenti**: software obsoleto, OTA non autenticati, componenti COTS con flaw noti (~80% dei produttori), rischio BORE (Break Once, Run Everywhere)
5. **Accessibilita fisica e side-channel**: assenza di contromisure (constant-time, masking, EM shielding, glitch detector) nei dispositivi low-cost

---

## Capitolo 4 — Contributi

### 4.1 Motivazioni
Colmare il gap tra formazione software-oriented (CTF accessibili) e hardware security (costosa, richiede equipment fisico). Creare un entry point per principianti tramite ambiente browser-based.

### 4.2 Indagine e documentazione
Analisi sistematica di dispositivi IoT low-cost: interfacce debug non protette, storage accessibile, assenza secure boot, canali di comunicazione insicuri, struttura firmware, design prone a backdoor. Corpus riproducibile di materiali tecnici.

### 4.3 Artefatti raccolti
- Firmware images e binari (dump flash completi)
- Sequenze di boot e tracce console (bootlog annotati)
- File di configurazione e snapshot filesystem
- Log operativi e catture di rete
- Output di reverse engineering (Ghidra, Binwalk)
- Artefatti app mobile (API endpoint, intercettazione traffico)
- Immagini PCB ad alta risoluzione con annotazioni
- Log di strumentazione e troubleshooting
- Documentazione vulnerabilita e exploitabilita

### 4.4 Framework CTF proposto
- **Realismo**: artefatti e comportamenti estratti da dispositivi reali
- **Accessibilita**: ambiente browser-based gratuito con interazioni simulate
- **Progressione pedagogica**: percorsi a livelli (base -> intermedio -> avanzato)

Strumenti virtuali simulati:
- Multimetro (tensione, continuita, resistenza)
- Terminale UART (replay bootlog, comandi interattivi)
- Programmatore CH341A (retrieval firmware)
- Helper PCBite (guida wiring, overlay visivi)
- Viewer catture logiche (tracce pre-registrate)

Prototipo Cyber Range sviluppato da un collega nell'ambito del progetto ARTIC.

---

## Capitolo 5 — Risultati sperimentali (dispositivi analizzati)

### 5.1 TP-Link WR841N (Router)
- Identificazione pin UART e connessione
- Bootlog e informazioni di sistema
- Flash dump e estrazione password root (via CH341A + SOP8 clip)
- Interazione con U-Boot, accesso shell Linux
- Modifica password WiFi e router
- Analisi processo di boot e script di inizializzazione
- Analisi binario httpd, test CVE-2023-33538
- Recovery tramite programmazione flash esterna
- Analisi servizi di rete
- **Supply-chain attack via inserimento backdoor**

### 5.2 Ezviz C6N (Telecamera IoT)
- Scoperta hardware e interfacce (PCB, UART)
- Processo di boot e ambiente U-Boot
- Onboarding e network scanning
- Dump flash e analisi partizioni
- Analisi binari con Ghidra
- Autenticazione LAN Live View e scambio crittografico
- **Analisi stream RTSP e consegna video in chiaro (plaintext)**
- Architettura app e componenti nativi
- Comunicazioni cloud e SSL Pinning

### 5.3 Mi Router 4C (Router Xiaomi)
- Identificazione storage e hardware
- UART e boot log
- Enumerazione servizi di rete
- Dump flash e analisi
- Abilitazione UART
- Timing echo-back UART
- Possibili debolezze e analisi runtime

---

## Capitolo 6 — Conclusioni

### Risultati principali
- La maggioranza dei dispositivi IoT low-cost presenta vulnerabilita ricorrenti: interfacce debug non protette, autenticazione debole, assenza di secure boot, firmware insicuro/obsoleto, comunicazioni non cifrate
- Questi problemi creano percorsi di attacco multipli: accesso non autorizzato, manipolazione firmware, intercettazione dati, inserimento backdoor
- Il corpus di artefatti raccolti serve come base per piattaforme di training accessibili

### Lavori futuri
- Espansione della raccolta di artefatti con ulteriori dispositivi
- Implementazione della piattaforma CTF interattiva che sfrutti tutti gli artefatti raccolti
- Obiettivo: abbassare le barriere d'ingresso alla hardware security

---

## Keywords / temi principali
`IoT security`, `hardware hacking`, `vulnerability assessment`, `embedded systems`, `UART`, `JTAG`, `SPI flash`, `firmware extraction`, `reverse engineering`, `secure boot`, `supply-chain attack`, `CTF`, `cyber range`, `hardware security training`, `ARTIC`, `SERICS`, `binwalk`, `Ghidra`, `U-Boot`
