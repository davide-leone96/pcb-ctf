# Indice

---

## Introduzione
- Contesto: sicurezza dei sistemi embedded e IoT
- Il problema: barriera d'ingresso alla formazione hardware
- Obiettivo della tesi e contributo proposto
- Struttura del documento

*Pagine stimate: 3–4 · Stato: scritto*

---

## Capitolo 1 — Stato dell'arte

1.1 Sicurezza hardware e analisi di PCB
  - Attacchi side-channel, reverse engineering hardware, estrazione firmware
  - Interfacce di debug: UART, SPI, JTAG

1.2 Capture The Flag: dalla cybersecurity software all'hardware
  - Panoramica sulle piattaforme CTF esistenti (CTFd, PicoCTF, RHme)
  - Limiti delle piattaforme attuali per scenari hardware

1.3 Simulazione e virtualizzazione per la didattica
  - Laboratori virtuali e remote labs
  - Approcci esistenti alla simulazione di circuiti e PCB

1.4 Tecnologie web per applicazioni interattive
  - Single Page Applications e framework moderni
  - State management per UI complesse

*Pagine stimate: 8–10 · Stato: da scrivere*

---

## Capitolo 2 — Analisi dei requisiti

2.1 Contesto operativo e attori del sistema
  - Lo studente
  - L'autore (docente / progettista)

2.2 Requisiti funzionali
  - 2.2.1 Simulazione del circuito stampato (RF-01 – RF-03)
  - 2.2.2 Strumenti di misura (RF-04 – RF-07)
  - 2.2.3 Terminale simulato (RF-08 – RF-13)
  - 2.2.4 Struttura dell'esercizio (RF-14 – RF-17)
  - 2.2.5 Authoring e configurazione (RF-18 – RF-23)
  - 2.2.6 Lancio automatico del terminale (RF-24)
  - 2.2.7 Allegati agli hint (RF-25)

2.3 Requisiti non funzionali
  - 2.3.1 Accessibilità e distribuzione (RNF-01 – RNF-02)
  - 2.3.2 Usabilità (RNF-03 – RNF-05)
  - 2.3.3 Prestazioni (RNF-06 – RNF-07)
  - 2.3.4 Manutenibilità e estensibilità (RNF-08 – RNF-10)
  - 2.3.5 Sicurezza (RNF-11 – RNF-12)

2.4 Casi d'uso principali
  - 2.4.1 Casi d'uso dello studente (CU-01 – CU-06)
  - 2.4.2 Casi d'uso dell'autore (CU-07 – CU-10)

2.5 Vincoli e assunzioni (V-01 – V-05)

*Pagine stimate: 5–6 · Stato: scritto*

---

## Capitolo 3 — Progettazione dell'architettura

3.1 Scelte tecnologiche
  - Next.js 15 con App Router e output standalone
  - React 19, TypeScript, Tailwind CSS 4, Radix UI
  - Zustand per lo state management
  - Persistenza su file JSON e localStorage

3.2 Architettura generale del sistema
  - Modalità simulatore (route `/`) e modalità authoring (route `/settings`)
  - Layout a griglia del simulatore: sidebar, PCBViewer/Terminal, istruzioni
  - API REST come route handler di Next.js

3.3 Modello dei dati
  - 3.3.1 Struttura dell'esercizio: Step, Objective, cinque tipologie di obiettivi, file allegati agli hint
  - 3.3.2 Il sistema unificato dei pin: MeasurementPin, UartPin, FirmwareDumpPin
  - 3.3.3 Il sistema di coordinate normalizzate (percentuali)

3.4 Gestione dello stato applicativo
  - 3.4.1 Architettura a quattro store Zustand indipendenti
  - 3.4.2 Coordinazione tra store tramite subscription (dirty tracking)
  - 3.4.3 Persistenza dello stato: localStorage, file, middleware persist
  - 3.4.4 Migrazione dei dati (formato monolitico → modulare)

3.5 Progettazione del sistema terminale
  - 3.5.1 Principi di progettazione: esecuzione interamente lato client
  - 3.5.2 Architettura modulare: componenti terminale indipendenti
  - 3.5.3 Pipeline di esecuzione dei comandi (4 stadi)
  - 3.5.4 Il filesystem simulato (struttura ad albero → formato piatto)
  - 3.5.5 La sequenza di boot (stadi animati, interazione, transizioni, auto-progressione)
  - 3.5.6 Il sistema di flag progressive (sblocco, condizioni, completamento)

3.6 Flusso dati tra authoring e simulazione
  - Fase 1: Authoring (draft → serializzazione)
  - Fase 2: Persistenza (file JSON, localStorage)
  - Fase 3: Simulazione (hook di caricamento, sincronizzazione real-time)
  - 3.6.1 Il sistema di preset (bundle, autocontenimento, copia immagini)

*Pagine stimate: 8–10 · Stato: scritto*

---

## Capitolo 4 — Implementazione

4.1 Il visualizzatore PCB interattivo
  - 4.1.1 Sistema di overlay e conversione delle coordinate
  - 4.1.2 Meccanismo di snap (aggancio automatico sonda-pin)
  - 4.1.3 Rendering dei fili (curve di Bézier quadratiche in SVG)
  - 4.1.4 La lente di ingrandimento (zoom CSS, ancoraggio, LensContentLayer)

4.2 Strumenti di analisi hardware
  - 4.2.1 Il multimetro (due sonde, modalità V/Ohm, rumore digitale)
  - 4.2.2 L'adattatore UART (crossover TX/RX, validazione, auto-lancio terminale)
  - 4.2.3 Il firmware dumper SPI (doppia validazione, flusso terminale-first, dismissFirmwareDumpDownload)

4.3 Il terminale simulato
  - 4.3.1 Il loader della configurazione (4 fasi: flatten, normalize, compute, build)
  - 4.3.2 L'esecutore dei comandi (6 tipi di output: statico, condizionale, template, lookup, dinamico, script)
  - 4.3.3 I comandi built-in (ls, cd, cat, pwd, grep, find, clear)
  - 4.3.4 La sequenza di boot (animazione, stadi speciali, credenziali, auto-progressione)
  - 4.3.5 Persistenza dello stato del terminale (variabili a livello di modulo)

4.4 Il pannello di authoring
  - 4.4.1 Organizzazione dell'interfaccia (tab Init/Challenge, sottosezioni, selezione sidebar con evidenziazione canvas)
  - 4.4.2 Il canvas interattivo (zoom, rotazione, traslazione, handle trascinabili)
  - 4.4.3 L'editor del terminale (comandi, flag, boot, filesystem, anteprima YAML)

4.5 API e persistenza dei dati
  - 4.5.1 Architettura delle API (config, terminal-config, presets, hints, media)
  - 4.5.2 Strategia di persistenza (tre livelli: store, localStorage, file)
  - 4.5.3 Sincronizzazione real-time (eventi storage, evento custom)

4.6 Il sistema di completamento dell'esercizio
  - 4.6.1 Flussi di completamento degli obiettivi (5 percorsi)
  - 4.6.2 Reset dello stato alla transizione tra step
  - 4.6.3 Progressione della flag (flagPart + terminalCurrentFlag)
  - 4.6.4 Il dialogo di completamento (configurabile: copia, redirect, download)

*Pagine stimate: 10–12 · Stato: scritto*

---

## Capitolo 5 — Caso di studio

5.1 Progettazione dell'esercizio
  - 5.1.1 Struttura dell'esercizio (2 step formali + fase terminale auto-lanciata)
  - 5.1.2 Configurazione del terminale (UART Console con boot U-Boot, Local Machine)
  - 5.1.3 Configurazione degli strumenti (lente, UART, firmware dump, dialogo)

5.2 Walkthrough dello studente
  - 5.2.1 Fase 1 — Ricognizione del PCB (identificazione componenti, firmware dump)
  - 5.2.2 Fase 2 — Connessione UART (crossover, auto-lancio terminale)
  - 5.2.3 Fase 3 — Esplorazione del terminale (6 flag progressive: boot, root, hash, leak, injection, backdoor)

5.3 Configurazione lato autore
  - 5.3.1 Creazione dell'esercizio (caricamento PCB, posizionamento componenti/pin)
  - 5.3.2 Configurazione del terminale (filesystem, comandi, boot, flag)
  - 5.3.3 Salvataggio come preset (bundle autocontenuto, copia immagine)

*Pagine stimate: 6–8 · Stato: scritto*

---

## Capitolo 6 — Validazione e discussione

6.1 Criteri di valutazione
  - 6.1.1 Copertura dei concetti didattici (tabella: fase → strumento → concetto)
  - 6.1.2 Fedeltà della simulazione (rumore, validazione, boot, filesystem)
  - 6.1.3 Espressività del sistema di authoring (scenari configurabili)

6.2 Confronto con soluzioni esistenti
  - Tabella comparativa: CTFd/PicoCTF, RHme, Remote Labs, PCB-CTF

6.3 Limitazioni
  - Assenza di esecuzione reale
  - Scenari non coperti (JTAG, I²C, side-channel)
  - Singolo utente, persistenza limitata
  - Validazione empirica non ancora effettuata

6.4 Sviluppi futuri
  - Multi-utente e scoring
  - Integrazione con hardware reale (approccio ibrido)
  - Nuovi protocolli e strumenti
  - Terminale con LLM
  - Persistenza del progresso e analytics

*Pagine stimate: 5–6 · Stato: scritto*

---

## Conclusioni
- Sintesi del contributo e dei principi guida
- Risultati architetturali e di implementazione
- Validazione tramite il caso di studio
- Posizionamento nel panorama formativo
- Riflessioni finali

*Pagine stimate: 2–3 · Stato: scritto*

---

## Bibliografia

*Stato: da compilare (citazioni da verificare)*

---

## Appendice A — Struttura JSON di un esercizio completo

A.1 Schema dell'esercizio (`Exercise`)
A.2 Tipi enumerati (ObjectiveType, Tool, UartRole, SpiRole)
A.3 Sistema di coordinate
A.4 Esempio completo (estratto dal caso di studio)

## Appendice B — Schema configurazione terminale

B.1 Struttura principale (`TerminalConfig`)
B.2 Configurazione del tab (`TabConfig`) e stadi speciali della sequenza di boot
B.3 Definizione di un comando (`CommandDefinition`)
  - B.3.1 Vincoli del comando (`CommandConstraints`)
  - B.3.2 Tipi di output (statico, condizionale, template, lookup, dinamico, script)
  - B.3.3 Controllo delle condizioni (`ConditionCheck`)
B.4 Struttura del filesystem (`FilesystemStructure`) e processo di normalizzazione
B.5 Sistema di flag (`FlagSystem`)
B.6 Contesto di esecuzione (`CommandContext`)
B.7 Risultato dell'esecuzione (`CommandExecutionResult`)
B.8 Esempio: configurazione del tab UART Console

*Pagine stimate: 8–10 · Stato: scritto*

---

### Riepilogo pagine

| Sezione | Pagine | Stato |
|---------|--------|-------|
| Introduzione | 3–4 | **Scritto** |
| Cap. 1 — Stato dell'arte | 8–10 | Da scrivere |
| Cap. 2 — Analisi dei requisiti | 5–6 | **Scritto** |
| Cap. 3 — Progettazione | 8–10 | **Scritto** |
| Cap. 4 — Implementazione | 10–12 | **Scritto** |
| Cap. 5 — Caso di studio | 6–8 | **Scritto** |
| Cap. 6 — Validazione | 5–6 | **Scritto** |
| Conclusioni | 2–3 | **Scritto** |
| Appendici | 8–10 | **Scritto** |
| **Totale** | **~55–69** | |
