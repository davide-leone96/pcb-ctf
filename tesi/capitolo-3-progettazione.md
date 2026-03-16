# Capitolo 3 — Progettazione dell'architettura

## 3.1 Scelte tecnologiche

La fase di progettazione ha richiesto, anzitutto, una riflessione attenta sullo stack tecnologico da adottare. I vincoli di partenza erano chiari: la piattaforma doveva funzionare interamente nel browser, senza richiedere installazioni lato studente, e doveva essere sufficientemente flessibile da consentire agli autori di progettare esercizi eterogenei — dalla semplice ispezione visiva di un circuito stampato fino all'estrazione di firmware via protocollo SPI.

Si è optato per **Next.js 15** come framework applicativo, nella sua configurazione con App Router e output standalone. La scelta non è casuale: Next.js consente di gestire in un unico progetto sia le pagine interattive del simulatore sia le API REST necessarie alla persistenza delle configurazioni, evitando la complessità di mantenere un backend separato. La modalità standalone, in particolare, produce un bundle autocontenuto che semplifica notevolmente il deployment in ambienti containerizzati.

Per quanto riguarda la libreria di interfaccia, si è adottato **React 19** con **TypeScript**. La scelta di TypeScript è stata determinante per un progetto di questa complessità: il modello dati dell'esercizio coinvolge decine di interfacce interconnesse — pin, obiettivi, step, configurazioni di strumenti — e la tipizzazione statica ha permesso di intercettare intere classi di errori in fase di sviluppo piuttosto che a runtime, quando la diagnosi sarebbe stata sensibilmente più costosa.

Lo stile dell'interfaccia è gestito tramite **Tailwind CSS** nella versione 4, affiancato da componenti primitivi di **Radix UI** per gli elementi modali e i tooltip. Radix fornisce componenti headless — cioè privi di stile predefinito — che garantiscono accessibilità e comportamento corretto (gestione del focus, chiusura con Escape, overlay) senza imporre vincoli estetici. Questo approccio consente di mantenere un linguaggio visivo coerente con il resto dell'applicazione.

Per la gestione dello stato si è scelto **Zustand**, una libreria di state management che si distingue per la sua leggerezza e per l'assenza di boilerplate. A differenza di Redux, Zustand non richiede reducer, action creator o middleware complessi: lo stato è definito come un semplice oggetto JavaScript e le azioni sono funzioni che lo mutano direttamente. Questa semplicità è risultata particolarmente vantaggiosa in un contesto dove coesistono quattro store indipendenti, ciascuno con responsabilità ben definite.

La scelta di non adottare un database relazionale per la persistenza è stata intenzionale. Trattandosi di un'applicazione destinata all'uso didattico in sessioni singole, si è privilegiata la semplicità: le configurazioni degli esercizi vengono salvate come file JSON su disco (lato server) e in `localStorage` (lato client). Questo approccio elimina la necessità di un DBMS, riduce le dipendenze infrastrutturali e rende il progetto immediatamente eseguibile con un semplice `npm run dev`.


## 3.2 Architettura generale del sistema

L'applicazione è strutturata attorno a due modalità operative distinte, ciascuna servita da una route dedicata:

- La route principale (`/`) ospita il **simulatore**, ovvero l'ambiente in cui lo studente interagisce con il PCB virtuale, utilizza gli strumenti di misura e risolve progressivamente gli obiettivi dell'esercizio.
- La route `/settings` ospita il **pannello di authoring**, dove il docente o l'autore dell'esercizio definisce la disposizione dei componenti sul circuito, configura i pin, imposta gli obiettivi e progetta il comportamento del terminale.

Questa separazione non è soltanto logica ma anche strutturale. Le due modalità condividono il modello dati — la struttura `Exercise` e le interfacce correlate — ma operano su store Zustand differenti e non comunicano direttamente tra loro. Il flusso di dati tra authoring e simulazione avviene attraverso la persistenza: l'autore salva la configurazione (via API o localStorage), e il simulatore la carica all'avvio.

Dal punto di vista del rendering, il simulatore presenta un layout a griglia con tre aree principali: un pannello laterale sinistro con gli strumenti disponibili, un'area centrale che ospita alternativamente il visualizzatore PCB o il terminale, e un pannello superiore con le istruzioni dell'obiettivo corrente e l'indicatore di progresso della flag. Il passaggio tra PCB e terminale è mutuamente esclusivo — quando il terminale è attivo, il PCB viene nascosto e viceversa — una scelta dettata dalla volontà di mantenere l'interfaccia pulita e focalizzare l'attenzione dello studente sull'attività in corso.

Il pannello di authoring adotta una struttura analoga, con una sidebar laterale organizzata in tab tematiche (componenti, pin, terminale, strumenti) e un canvas centrale dove l'autore posiziona visivamente gli elementi sulla foto del PCB.

Le API REST, implementate come route handler di Next.js all'interno della directory `src/app/api/`, gestiscono la persistenza delle configurazioni, il caricamento dei preset, e l'upload di immagini e file firmware. Operano tutte su file system locale, coerentemente con la scelta di evitare dipendenze esterne.


## 3.3 Modello dei dati

Il modello dati costituisce il cuore progettuale della piattaforma. L'interfaccia principale, `Exercise`, rappresenta un esercizio completo e contiene al suo interno tutte le informazioni necessarie sia al rendering nel simulatore sia alla validazione del progresso dello studente.

### 3.3.1 Struttura dell'esercizio

Un esercizio è organizzato in **step** sequenziali, ciascuno dei quali contiene uno o più **obiettivi**. Ogni step rappresenta una fase dell'esercitazione — ad esempio "Identificare il chip di memoria flash" o "Estrarre il firmware" — e definisce una flag attesa (`expectedFlag`) che lo studente deve ricostruire completando gli obiettivi. Ogni obiettivo, a sua volta, contribuisce con un frammento di flag (`flagPart`); la flag finale dell'esercizio è la concatenazione ordinata di tutti i frammenti degli obiettivi completati.

Ogni obiettivo (`Objective`) è tipizzato secondo una delle cinque categorie supportate:

- **component**: richiede di identificare e cliccare un componente specifico sulla foto del PCB;
- **pin**: richiede di collegare le sonde del multimetro a pin specifici, verificando che i valori misurati soddisfino condizioni predefinite;
- **uart**: richiede di stabilire una connessione UART corretta tra l'adattatore e i pin del circuito;
- **terminal**: richiede di interagire con il terminale simulato per scoprire flag nascoste tramite l'esecuzione di comandi;
- **firmware-dump**: richiede di collegare le sonde SPI ai pin corrispondenti ed eseguire il dump del firmware.

Questa tassonomia copre le attività più comuni nell'analisi hardware reale, dalla ricognizione visiva all'estrazione di dati, offrendo un percorso didattico graduato.

Ogni obiettivo può inoltre contenere un array opzionale di **file allegati all'hint** (`hintFiles`): l'autore può associare documenti di supporto — datasheet, schemi elettrici, immagini di riferimento — al suggerimento dell'obiettivo, che lo studente potrà scaricare quando richiede l'hint.

### 3.3.2 Il sistema unificato dei pin

Un aspetto progettuale significativo riguarda la gestione dei pin. Il circuito simulato può contenere tre tipologie di pin, ciascuna con semantica e ruoli diversi:

- **Pin di misura** (`MeasurementPin`): rappresentano punti di test generici sul PCB, caratterizzati da un valore di tensione (`valueV`) e un valore di resistenza (`valueOhm`). Sono i pin con cui lo studente interagisce tramite il multimetro.

- **Pin UART** (`UartPin`): rappresentano i pin del bus seriale UART, ciascuno con un ruolo specifico (`tx`, `rx`, `gnd`, `vcc`). Il collegamento corretto richiede che lo studente rispetti la corrispondenza incrociata tra i pin dell'adattatore e quelli del circuito (il TX dell'adattatore va collegato all'RX del dispositivo e viceversa).

- **Pin SPI** (`FirmwareDumpPin`): rappresentano i pin del bus SPI utilizzato per la comunicazione con memorie flash, ciascuno con un ruolo tra `vcc`, `gnd`, `cs` (chip select), `clk` (clock), `mosi` (master out, slave in) e `miso` (master in, slave out).

Nonostante le differenze semantiche, tutti e tre i tipi condividono lo stesso sistema di coordinate e lo stesso meccanismo di overlay. Questa uniformità è resa possibile da un insieme di funzioni helper — `getAllPins()`, `getPinCoords()`, `getPinValues()` — che astraggono le differenze tra i tipi e restituiscono una vista unificata. Il vantaggio è duplice: il codice di rendering può trattare i pin in modo omogeneo, e il meccanismo di snap (aggancio automatico delle sonde ai pin vicini) funziona con un unico algoritmo indipendentemente dal tipo di pin.

### 3.3.3 Il sistema di coordinate

Tutte le posizioni degli elementi interattivi — componenti, pin, overlay — sono espresse in **coordinate normalizzate**, ovvero come percentuali della larghezza e dell'altezza del contenitore. Un pin posizionato a `[50, 30, 2, 2]` si trova al centro orizzontale del PCB, al 30% dall'alto, con dimensione pari al 2% del contenitore in entrambe le direzioni.

Questa scelta rende il layout intrinsecamente responsivo: al variare delle dimensioni della finestra, tutti gli elementi si riposizionano automaticamente mantenendo le proporzioni relative. La conversione da coordinate normalizzate a pixel avviene nel componente `PCBViewer`, che tiene traccia delle dimensioni reali del contenitore tramite `getBoundingClientRect()` e ricalcola le posizioni ad ogni ridimensionamento.


## 3.4 Gestione dello stato applicativo

La gestione dello stato rappresenta uno degli aspetti più delicati dell'architettura, dato il numero di interazioni simultanee che il simulatore deve gestire: posizione delle sonde, connessioni ai pin, stato del multimetro, progresso dell'esercizio, stato del terminale, e così via.

### 3.4.1 Architettura a store indipendenti

Si è adottata un'architettura a **quattro store Zustand indipendenti**, ciascuno con un ambito di responsabilità ben circoscritto:

| Store | Responsabilità |
|-------|---------------|
| `exerciseStore` | Stato runtime del simulatore: progresso step/obiettivi, selezione strumenti, connessioni sonde, flag scoperte, stato del terminale |
| `settingsStore` | Stato della modalità authoring: trasformazioni canvas, componenti e pin in fase di editing, configurazione degli strumenti |
| `terminalSettingsStore` | Editor della configurazione terminale: componenti terminale, tab, comandi, filesystem, sequenze di boot, flag |
| `presetStore` | Gestione dei preset: salvataggio e caricamento di bundle che combinano configurazione esercizio e terminale |

La scelta di mantenere gli store separati e privi di un reducer comune è stata ponderata. In un sistema come Redux, la presenza di un root reducer centralizzato facilita la coordinazione ma introduce accoppiamento: ogni azione deve attraversare un singolo punto di ingresso, e la modifica di uno store può avere effetti collaterali su altri. Con Zustand, ogni store è autocontenuto e può essere consumato indipendentemente dai componenti che ne hanno bisogno, riducendo i re-render non necessari.

### 3.4.2 Coordinazione tra store

L'assenza di un reducer comune non implica l'assenza di coordinazione. Quando è necessaria una comunicazione tra store — ad esempio, per tracciare se la configurazione corrente è stata modificata rispetto al preset caricato — si utilizzano le **subscription** di Zustand.

Il caso più rilevante riguarda il `presetStore`, che si sottoscrive ai cambiamenti di `settingsStore` e `terminalSettingsStore` per determinare lo stato "dirty" (modificato ma non salvato). La sottoscrizione confronta per referenza i campi rilevanti — componenti, step, pin, comandi, filesystem — e ignora i campi puramente di interfaccia come lo zoom del canvas o l'elemento attualmente selezionato. Un meccanismo di guardia impedisce che il caricamento di un preset venga erroneamente interpretato come una modifica: durante il caricamento, un flag `isLoading` disabilita temporaneamente il rilevamento dei cambiamenti.

Questa coordinazione è esplicita e tracciabile, a differenza di pattern più opachi come gli event bus globali. Ogni sottoscrizione è dichiarata in modo visibile nel codice del presetStore, rendendo immediatamente comprensibile quali cambiamenti vengano osservati e quale effetto producano.

### 3.4.3 Persistenza dello stato

La persistenza segue strategie diverse a seconda dello store:

- **`settingsStore`** utilizza una persistenza manuale: l'autore salva esplicitamente la configurazione tramite un'azione che serializza lo stato in JSON e lo scrive in `localStorage` (chiave `pcb-ctf-exercise-config`), oltre a inviarlo al server via API per la scrittura su file.

- **`terminalSettingsStore`** adotta una strategia ibrida. Lo stato di draft dell'editor viene persistito automaticamente in `localStorage` tramite il middleware `persist` di Zustand (chiave `pcb-ctf-terminal-settings-draft`), garantendo che il lavoro in corso sopravviva al refresh della pagina. La configurazione terminale "applicata" — quella effettivamente usata dal simulatore — viene scritta in una chiave separata (`pcb-ctf-terminal-config`).

- **`exerciseStore`** non prevede persistenza: il suo stato è interamente transiente. L'esercizio viene caricato ad ogni avvio dalla configurazione salvata, e il progresso dello studente si resetta con il refresh della pagina. Questa scelta riflette la natura "da laboratorio" della piattaforma, dove ogni sessione è indipendente.

- **`presetStore`** persiste unicamente l'identificativo del preset attivo (chiave `pcb-ctf-active-preset`), per ripristinare la selezione nel menu a tendina dopo un ricaricamento della pagina.

### 3.4.4 Migrazione dei dati

Un aspetto che merita menzione è la gestione della retrocompatibilità. Il sistema dei terminali è stato inizialmente progettato con una singola configurazione monolitica; in una fase successiva, si è evoluto verso un'architettura modulare a componenti multipli. La funzione di merge del middleware `persist` gestisce trasparentemente la migrazione: se rileva uno stato nel formato precedente (senza l'array `terminalComponents`), lo converte automaticamente nel nuovo formato, avvolgendo i dati esistenti in un componente predefinito. Questo approccio ha evitato la necessità di script di migrazione esterni e ha garantito la continuità per chi aveva già configurazioni salvate.


## 3.5 Progettazione del sistema terminale

Il terminale simulato è, senza dubbio, il sottosistema più complesso dell'intera piattaforma. A differenza degli strumenti di misura — che operano con interazioni puntuali (collegare una sonda, leggere un valore) — il terminale deve simulare un ambiente interattivo completo, con filesystem, comandi, vincoli di accesso e una sequenza di boot che replica il comportamento di un dispositivo reale.

### 3.5.1 Principi di progettazione

La decisione fondamentale, presa nelle fasi iniziali del progetto, è stata quella di implementare un terminale **interamente lato client**, senza alcuna esecuzione reale di comandi. Ogni interazione è gestita da un motore di esecuzione configurabile che interpreta le definizioni dei comandi contenute nella configurazione JSON.

Questa scelta comporta limitazioni evidenti — lo studente non può eseguire comandi arbitrari, ma solo quelli previsti dall'autore — ma offre vantaggi decisivi per il contesto d'uso:

1. **Sicurezza**: nessun rischio di code injection o di accesso non autorizzato a risorse del server;
2. **Determinismo**: il comportamento del terminale è completamente prevedibile e riproducibile;
3. **Portabilità**: l'applicazione non dipende da un sistema operativo specifico per l'esecuzione dei comandi;
4. **Controllo didattico**: l'autore ha il pieno controllo su quali comandi sono disponibili in ogni fase dell'esercizio.

### 3.5.2 Architettura modulare

Il sistema terminale adotta un'architettura a **componenti modulari**: un esercizio può contenere più terminali indipendenti, ciascuno con il proprio set di tab, comandi, filesystem e flag. Un terminale potrebbe simulare la console UART di un router, un altro il terminale di una macchina Kali Linux utilizzata per l'analisi.

Ogni componente terminale (`TerminalComponent`) incapsula:

- un insieme di **tab**, ciascuno con il proprio contesto di esecuzione;
- un **filesystem simulato** con directory e file;
- una **sequenza di boot** opzionale con stadi animati;
- un **sistema di flag** con parti da scoprire progressivamente;
- un set di **comandi** con vincoli, output e side effect.

### 3.5.3 Pipeline di esecuzione dei comandi

L'esecuzione di un comando nel terminale attraversa una pipeline a quattro stadi:

**1. Parsing**: l'input dell'utente viene suddiviso in nome del comando e argomenti.

**2. Validazione dei vincoli** (`constraints`): prima dell'esecuzione, il sistema verifica un insieme di condizioni che il comando potrebbe imporre:
  - vincolo di **percorso**: il comando è disponibile solo in determinate directory;
  - vincolo di **permessi**: richiede un utente specifico (es. root);
  - vincolo di **prerequisiti**: richiede che altri comandi siano già stati eseguiti o che specifiche flag siano state scoperte;
  - vincolo di **argomenti**: numero e formato degli argomenti;
  - vincolo di **stato**: disponibilità limitata a specifici stadi di boot.

Se un vincolo non è soddisfatto, il comando non viene eseguito e viene restituito un messaggio di errore contestuale.

**3. Generazione dell'output**: se i vincoli sono soddisfatti, il sistema produce l'output secondo il tipo configurato per il comando. Sono supportati sei tipi di output, descritti in dettaglio nel capitolo successivo.

**4. Applicazione dei side effect**: dopo l'esecuzione, il comando può produrre effetti collaterali — sblocco di flag, cambiamento dello stadio di boot, modifica del percorso corrente. Questi effetti vengono restituiti al componente React, che li propaga allo store e aggiorna di conseguenza l'interfaccia.

### 3.5.4 Il filesystem simulato

Il filesystem è implementato come una struttura a due livelli: un record di **directory** che mappa ogni percorso alla lista dei suoi figli diretti, e un record di **file** che mappa ogni percorso completo ai metadati del file (contenuto, permessi, proprietario, dimensione).

La configurazione supporta una notazione compatta ad albero (`tree`) che viene automaticamente "appiattita" dal loader in fase di caricamento. L'autore può così definire la struttura del filesystem in modo leggibile:

```json
{
  "tree": {
    "bin": { "busybox": "...", "sh": "..." },
    "etc": { "passwd": "root:x:0:0:..." },
    "var": { "log": { "syslog": "..." } }
  }
}
```

Il loader converte questa struttura nidificata nel formato piatto atteso dal motore di esecuzione, calcolando automaticamente le entry di ogni directory.

### 3.5.5 La sequenza di boot

Per gli esercizi che simulano l'accesso a dispositivi embedded, il terminale supporta una sequenza di boot animata. La sequenza è definita come un elenco di **stadi**, ciascuno con un identificativo, un set di righe da visualizzare, una durata di animazione e un eventuale stadio successivo.

L'animazione riproduce il flusso di un boot reale: le righe di log appaiono progressivamente, con un intervallo calcolato dividendo la durata totale dello stadio per il numero di righe. Alcuni stadi prevedono interazione — ad esempio, uno stadio di tipo "login" attende che lo studente inserisca le credenziali corrette prima di procedere — replicando il comportamento di un accesso seriale via UART a un dispositivo di rete. Per gli stadi interattivi è supportato un meccanismo di **auto-progressione con timeout** (`autoProgressTimeout`): se lo studente non interagisce entro un intervallo configurabile, lo stadio avanza automaticamente a quello successivo, replicando il comportamento di un bootloader che prosegue il boot dopo un countdown di inattività.

### 3.5.6 Il sistema di flag

Il terminale implementa un meccanismo di **flag progressive**: la flag completa è suddivisa in parti (`FlagPart`), ciascuna associata a un identificativo e a un frammento di testo. Lo studente scopre le parti esplorando il filesystem e eseguendo i comandi giusti; l'interfaccia mostra in tempo reale il progresso, visualizzando i frammenti già scoperti e sostituendo con punti interrogativi quelli ancora da trovare.

Lo sblocco di una flag avviene tramite i side effect dei comandi: quando un comando prevede `unlockFlags` tra i suoi effetti collaterali, il sistema aggiunge gli identificativi corrispondenti all'elenco delle flag scoperte, a patto che non siano già presenti. Lo sblocco può anche essere condizionale — ad esempio, subordinato al fatto che lo studente si trovi in una directory specifica o abbia già scoperto un'altra flag.

Quando tutte le parti sono state scoperte, il sistema notifica l'exerciseStore, che a sua volta verifica se l'obiettivo terminale corrente è da considerarsi completato.


## 3.6 Flusso dati tra authoring e simulazione

Il flusso di dati tra le due modalità operative della piattaforma è unidirezionale e mediato dalla persistenza. Non esiste comunicazione diretta tra gli store della modalità settings e quelli della modalità simulazione; il contratto tra le due parti è rappresentato dalle interfacce TypeScript condivise.

Il flusso si articola in tre fasi:

**Fase 1 — Authoring**: il docente configura l'esercizio attraverso il pannello settings. Le modifiche vengono accumulate negli store `settingsStore` e `terminalSettingsStore` come oggetti "draft" — versioni editabili delle entità finali. Quando l'autore è soddisfatto, invoca l'azione di salvataggio, che serializza lo stato in formato `Exercise` e `TerminalConfig`, lo scrive in localStorage e, tramite le API REST, lo persiste su file.

**Fase 2 — Persistenza**: le configurazioni vengono salvate come file JSON nella directory `src/data/`: `exercise.override.json` per la configurazione dell'esercizio, e una struttura analoga per il terminale. I preset — bundle che combinano entrambe le configurazioni — vengono salvati nella sottodirectory `presets/`, con un file indice che ne tiene traccia.

**Fase 3 — Simulazione**: all'avvio del simulatore, l'hook `useExerciseConfig()` carica la configurazione dell'esercizio dalla API (`/api/config/load`), che a sua volta legge il file JSON dal disco. L'hook `useTerminalConfig()` opera in modo analogo per la configurazione del terminale, con la possibilità di risolvere uno specifico componente terminale per identificativo.

Una caratteristica utile del sistema è la **sincronizzazione in tempo reale**: l'hook `useTerminalConfig()` si sottoscrive agli eventi `storage` del browser e a un evento personalizzato `terminal-config-updated`. Questo significa che, se l'autore modifica la configurazione del terminale nella tab settings e la applica, il simulatore aperto in un'altra tab del browser riceve automaticamente la nuova configurazione senza necessità di ricaricare la pagina — una funzionalità particolarmente comoda durante lo sviluppo iterativo di un esercizio.

### 3.6.1 Il sistema di preset

I preset rappresentano il meccanismo principale per il riutilizzo e la distribuzione degli esercizi. Un preset è un bundle immutabile al momento della creazione che contiene sia la configurazione dell'esercizio sia quella del terminale, corredato di metadati (nome, descrizione, data di creazione).

La gestione dei preset è affidata a un set di API REST dedicate che operano su file JSON nella directory `src/data/presets/`. Un file indice (`index.json`) mantiene l'elenco dei preset disponibili con i relativi metadati, mentre ciascun preset è salvato in un file separato identificato da uno slug generato dal nome.

Un aspetto degno di nota è la gestione delle immagini del PCB: al salvataggio di un preset, l'immagine corrente viene copiata in un percorso dedicato al preset, garantendone la sopravvivenza anche se l'autore carica successivamente un'immagine diversa. Questa strategia assicura che ogni preset sia autocontenuto e riproducibile.
