# Introduzione

## Contesto

La sicurezza dei sistemi embedded pervade ormai ogni aspetto della vita quotidiana. Router domestici, telecamere di sorveglianza, dispositivi medici, sistemi di controllo industriale: tutti condividono una caratteristica comune, ovvero la presenza di hardware programmabile il cui firmware può contenere vulnerabilità critiche. Gli attacchi a dispositivi IoT sono in costante crescita, e i report annuali delle principali aziende di cybersecurity documentano un panorama preoccupante: credenziali di default non modificabili, comunicazioni in chiaro, backdoor intenzionali, e firmware privo di meccanismi di aggiornamento sicuro.

In questo scenario, la capacità di analizzare un dispositivo a livello hardware — ispezionarne il circuito stampato, identificare le interfacce di debug, estrarre e analizzare il firmware — rappresenta una competenza sempre più richiesta nel campo della sicurezza informatica. Tuttavia, la formazione in questo ambito presenta sfide specifiche che la distinguono dalla tradizionale formazione sulla sicurezza software.

## Il problema

L'insegnamento delle tecniche di analisi hardware soffre di una barriera d'ingresso significativamente più alta rispetto alla controparte software. Mentre uno studente può iniziare a praticare il penetration testing web con un browser e una macchina virtuale, l'analisi hardware richiede attrezzature fisiche — multimetri, analizzatori logici, adattatori UART e SPI, programmatori di memorie flash — il cui costo complessivo non è trascurabile. A questo si aggiunge la necessità di disporre del dispositivo target stesso, con il rischio concreto di danneggiarlo durante le fasi di apprendimento.

Le piattaforme CTF (Capture The Flag) hanno rivoluzionato la formazione nella sicurezza software, offrendo ambienti sicuri e gamificati dove gli studenti possono esercitarsi senza rischi. Tuttavia, l'estensione di questo modello all'hardware si è rivelata problematica. Le soluzioni esistenti ricadono tipicamente in due categorie: le piattaforme puramente software, che propongono sfide di reverse engineering di firmware senza interazione con l'hardware fisico, e i laboratori remoti, che offrono accesso a dispositivi reali ma con costi infrastrutturali elevati e scalabilità limitata.

Manca, ad oggi, una soluzione intermedia che consenta di simulare in modo fedele l'interazione fisica con un circuito stampato — l'uso degli strumenti di misura, il collegamento delle sonde, l'estrazione del firmware — in un ambiente completamente virtuale, accessibile da un semplice browser.

## Obiettivo della tesi

Il presente lavoro propone la progettazione e l'implementazione di **PCB-CTF**, una piattaforma web interattiva per la formazione sulla sicurezza hardware in formato Capture The Flag. La piattaforma consente agli studenti di interagire con un circuito stampato virtuale attraverso strumenti simulati — multimetro digitale, adattatore UART, programmatore SPI, terminale embedded — replicando il flusso di lavoro di un'analisi hardware reale, dal riconoscimento visivo dei componenti fino all'estrazione e all'analisi del firmware.

L'obiettivo non è sostituire l'esperienza pratica su hardware reale, ma fornire un complemento didattico che permetta di acquisire le competenze concettuali e metodologiche prima di accedere al laboratorio fisico, riducendo la curva di apprendimento e il rischio di danneggiamento delle attrezzature.

La piattaforma si articola in due modalità operative: un **simulatore** per gli studenti, dove il percorso didattico è strutturato in step con obiettivi progressivi e flag da scoprire, e un **pannello di authoring** per i docenti, che consente di progettare esercizi personalizzati senza modificare il codice sorgente, utilizzando un editor visuale e un sistema di configurazione dichiarativa.

## Contributo

I principali contributi di questo lavoro sono:

1. La progettazione di un'architettura web che consente la simulazione interattiva di strumenti di misura hardware (multimetro, sonde UART, programmatore SPI) con feedback visivo realistico, interamente lato client.

2. L'implementazione di un terminale simulato configurabile che riproduce il comportamento di un sistema embedded — sequenza di boot, filesystem, comandi — senza eseguire codice sul server, garantendo sicurezza e determinismo.

3. La realizzazione di un sistema di authoring che consente ai docenti di creare esercizi completi attraverso un'interfaccia grafica, definendo il layout del PCB, gli strumenti disponibili, la struttura del terminale e il percorso didattico, senza richiedere competenze di programmazione.

4. La validazione della piattaforma attraverso un caso di studio basato su un dispositivo reale (TP-Link WR841N), che dimostra la capacità del sistema di replicare un percorso di analisi hardware completo.

## Struttura del documento

La tesi è organizzata come segue.

Il **Capitolo 1** offre una panoramica sullo stato dell'arte nella sicurezza hardware, sulle piattaforme CTF esistenti, sugli approcci alla simulazione per la didattica e sulle tecnologie web utilizzate.

Il **Capitolo 2** presenta l'analisi dei requisiti funzionali e non funzionali della piattaforma, i casi d'uso principali e i vincoli progettuali.

Il **Capitolo 3** descrive la progettazione dell'architettura: le scelte tecnologiche, il modello dei dati, la gestione dello stato applicativo, la progettazione del sistema terminale e il flusso di dati tra le modalità di authoring e simulazione.

Il **Capitolo 4** dettaglia l'implementazione dei componenti principali: il visualizzatore PCB interattivo, gli strumenti di analisi hardware, il terminale simulato, il pannello di authoring e le API di persistenza.

Il **Capitolo 5** presenta un caso di studio completo basato sull'analisi del router TP-Link WR841N, illustrando il percorso dello studente e la configurazione lato autore.

Il **Capitolo 6** discute i risultati ottenuti, confronta la piattaforma con le soluzioni esistenti, ne analizza le limitazioni e propone direzioni di sviluppo futuro.

Chiudono il lavoro le **conclusioni**, che sintetizzano il contributo e le riflessioni finali.
