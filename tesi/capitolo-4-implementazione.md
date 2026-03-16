# Capitolo 4 — Implementazione

## 4.1 Il visualizzatore PCB interattivo

Il componente centrale del simulatore è il **PCBViewer**, responsabile del rendering della fotografia del circuito stampato e di tutti gli elementi interattivi sovrapposti: pin, sonde, fili, componenti cliccabili e lente di ingrandimento. La complessità di questo componente deriva dalla necessità di gestire simultaneamente molteplici livelli di interazione, ciascuno con il proprio comportamento di input e la propria logica di rendering.

> **Figura 4.1** — Interfaccia principale del simulatore: a sinistra la sidebar con gli strumenti, al centro il PCBViewer con overlay dei componenti e pin, in alto le istruzioni dell'obiettivo corrente. *(Screenshot da inserire)*

### 4.1.1 Sistema di overlay e conversione delle coordinate

Il PCBViewer opera come un contenitore di coordinate. L'immagine del PCB occupa l'intera area disponibile, e sopra di essa vengono posizionati — tramite posizionamento CSS assoluto — gli overlay dei componenti, i pin, gli strumenti trascinabili e i fili di collegamento.

La conversione tra coordinate normalizzate (percentuali) e pixel avviene ad ogni render e ad ogni ridimensionamento della finestra. Il componente mantiene un riferimento alle dimensioni reali del contenitore (`containerDims`), ottenute tramite `getBoundingClientRect()`, e utilizza queste dimensioni come fattore di scala. Un pin definito alla posizione `[25, 60]` nella configurazione verrà renderizzato al 25% della larghezza e al 60% dell'altezza del contenitore, indipendentemente dalla risoluzione dello schermo.

I pin sono renderizzati come piccoli indicatori circolari semi-trasparenti, la cui visibilità dipende dallo strumento attivo: i pin di misura appaiono solo con il multimetro, i pin UART solo con le sonde UART, i pin SPI solo con lo strumento di firmware dump. Questa stratificazione contestuale mantiene l'interfaccia pulita e guida lo studente verso le interazioni pertinenti.

### 4.1.2 Meccanismo di snap

L'interazione sonda-pin utilizza un meccanismo di **snap** (aggancio automatico) che scatta quando una sonda trascinata si avvicina sufficientemente a un pin compatibile. Il raggio di aggancio è calcolato dinamicamente come il massimo tra 15 pixel e metà della larghezza del pin, adattandosi così a diverse risoluzioni e dimensioni di visualizzazione.

Quando il cursore entra nel raggio di aggancio di un pin, lo store viene aggiornato con l'identificativo del pin candidato (`snapTarget`), e il pin corrispondente viene evidenziato visivamente con un'animazione pulsante. Se l'utente rilascia la sonda in questo stato, la connessione viene stabilita e il filo assume un tracciato fisso. Il filtraggio dei pin per tipo — necessario perché le sonde del multimetro non devono agganciarsi ai pin UART e viceversa — viene gestito a monte, nel calcolo del pin più vicino.

### 4.1.3 Rendering dei fili

I fili che collegano le sonde ai pin sono renderizzati come **curve di Bézier quadratiche** all'interno di un elemento SVG sovrapposto all'intera area del PCB. La scelta delle curve di Bézier, piuttosto che segmenti rettilinei, produce un aspetto visivamente più naturale, evocativo di un cavo fisico che segue una traiettoria morbida.

I fili seguono una distinzione visiva tra stato attivo e connesso: durante il trascinamento, il filo dalla sonda al cursore è tratteggiato e semi-trasparente, suggerendo una connessione potenziale; una volta stabilita la connessione, il filo diventa continuo e completamente opaco. La codifica cromatica è specifica per ogni tipo di strumento: il multimetro usa rosso e nero per le due sonde, le connessioni UART seguono i colori convenzionali del bus seriale (verde per TX, giallo per RX, grigio per GND), e i fili SPI utilizzano una palette a sei colori distinti per i ruoli VCC, GND, CS, CLK, MOSI e MISO.

### 4.1.4 La lente di ingrandimento

Lo strumento magnifier implementa una lente di ingrandimento circolare che consente allo studente di esaminare da vicino i dettagli del PCB — la serigrafia dei componenti, le sigle dei chip, le piste del circuito. L'implementazione sfrutta la proprietà CSS `background-image` con `background-size` scalata per il fattore di zoom e `background-position` calcolata in funzione della posizione del cursore, ottenendo così un effetto lente in tempo reale senza duplicare il DOM.

La lente può essere ancorata in una posizione fissa tramite un click, liberando il cursore per altre interazioni — una funzionalità utile quando lo studente vuole leggere un'etichetta mentre consulta le istruzioni. Il raggio della lente e il livello di zoom sono configurabili dall'autore dell'esercizio, permettendo di calibrare lo strumento in base alla risoluzione dell'immagine del PCB.

> **Figura 4.2** — Lente di ingrandimento attiva sulla fotografia del PCB, che mostra i dettagli della serigrafia di un chip. *(Screenshot da inserire)*

Un aspetto non banale dell'implementazione riguarda il rendering del contenuto "sotto" la lente. Non è sufficiente zoomare l'immagine di sfondo: anche i pin, i fili e gli overlay dei componenti devono apparire ingranditi coerentemente all'interno dell'area della lente. Questo viene gestito da un componente dedicato (`LensContentLayer`) che ricalcola le posizioni di tutti gli elementi visibili applicando la stessa trasformazione di scala e offset della lente.


## 4.2 Strumenti di analisi hardware

### 4.2.1 Il multimetro

Il multimetro digitale è il primo strumento che lo studente incontra tipicamente in un esercizio. La sua implementazione replica il comportamento di un multimetro reale, con due sonde (rossa e nera), un display a cristalli liquidi e un selettore di modalità (tensione o resistenza).

Il componente è trascinabile — l'utente lo posiziona sulla scrivania virtuale afferrando l'header — e presenta due "manici" per le sonde, anch'essi trascinabili. La lettura sul display segue regole che riflettono il funzionamento reale dello strumento:

- In **modalità tensione con una sola sonda** collegata, il display mostra la tensione assoluta del pin rispetto a un riferimento implicito di massa.
- In **modalità tensione con entrambe le sonde**, il display mostra la differenza di potenziale V(rossa) − V(nera), con il segno che indica la polarità.
- In **modalità resistenza**, entrambe le sonde devono essere collegate; il display mostra la somma delle resistenze dei pin connessi, con la visualizzazione "OL" (overload) oltre una soglia configurabile.

Per conferire realismo alla simulazione, il valore visualizzato è affetto da un **rumore digitale** di ±0.04 unità, aggiornato ogni 400 millisecondi tramite un intervallo periodico. Questo piccolo accorgimento riproduce l'instabilità tipica delle ultime cifre di un multimetro reale e contribuisce a rendere l'esperienza più credibile.

> **Figura 4.3** — Multimetro digitale con le due sonde collegate a pin del PCB. Il display mostra la lettura di tensione con il rumore digitale simulato. *(Screenshot da inserire)*

### 4.2.2 L'adattatore UART

L'adattatore UART simula un convertitore USB-seriale, lo strumento che nella pratica reale viene utilizzato per stabilire una comunicazione seriale con il dispositivo target. L'interfaccia mostra un corpo rettangolare con quattro slot per i pin dell'adattatore: TX, RX, GND e VCC (quest'ultimo disabilitato nell'implementazione corrente).

L'interazione richiede che lo studente colleghi ciascun pin dell'adattatore al corrispondente pin sul PCB, rispettando la logica di connessione incrociata propria del protocollo UART: il pin TX dell'adattatore deve essere collegato al pin RX del dispositivo, e il pin RX dell'adattatore al pin TX del dispositivo. La massa (GND) va collegata a GND.

La **validazione** del collegamento avviene in fase di hook: quando lo studente rilascia una sonda su un pin, il sistema confronta il ruolo della sonda con il ruolo del pin di destinazione. Se il ruolo non corrisponde secondo la mappatura prevista (TX→RX, RX→TX, GND→GND), la connessione viene rifiutata e la sonda torna alla posizione di partenza. Questo meccanismo offre un feedback immediato senza rivelare esplicitamente la soluzione, incoraggiando lo studente a ragionare sulla logica del protocollo.

Una volta completate tutte le connessioni richieste, l'adattatore può **attivare automaticamente un terminale**, simulando l'apertura di una sessione seriale sul dispositivo.

> **Figura 4.4** — Adattatore UART con le sonde TX, RX e GND correttamente collegate ai pin del PCB secondo la logica di crossover. *(Screenshot da inserire)* L'identificativo del componente terminale da lanciare è configurabile dall'autore tramite il campo `terminalComponentId` nella configurazione dell'adattatore UART.

### 4.2.3 Il firmware dumper SPI

Lo strumento di firmware dump replica il processo di estrazione del contenuto di una memoria flash SPI — un'operazione comune nell'analisi hardware reale, dove si utilizza un programmatore come il Bus Pirate o il CH341A per leggere il chip di memoria.

L'interfaccia presenta sei sonde colorate, una per ciascun segnale del bus SPI (VCC, GND, CS, CLK, MOSI, MISO), disposte in una griglia etichettata. Lo studente deve trascinare ciascuna sonda sul pin corrispondente del PCB, rispettando la corrispondenza di ruolo: la sonda CLK va sul pin CLK, la sonda MISO sul pin MISO, e così via.

La validazione supporta due modalità, a seconda della configurazione dell'esercizio. La modalità predefinita è **role-based**: ogni sonda ha un ruolo SPI e il pin di destinazione deve avere lo stesso ruolo — se lo studente tenta di collegare la sonda CS al pin CLK, la connessione viene rifiutata. In alternativa, l'autore può definire un mapping esatto tramite il campo `requiredConnections`, specificando per ogni sonda l'identificativo preciso del pin a cui deve essere collegata. Questa seconda modalità è utile quando il PCB presenta pin che non corrispondono ai ruoli SPI standard.

Il flusso operativo dello strumento prevede diverse fasi. Una volta completati tutti i collegamenti, il comportamento dipende dalla configurazione: se il firmware dump è associato a un componente terminale (tramite `terminalComponentId`), il sistema lancia automaticamente il terminale *prima* di abilitare il dump, richiedendo allo studente di completare i comandi terminale come prerequisito. L'interfaccia mostra un messaggio esplicito ("Complete terminal commands first") e il pulsante di dump resta disabilitato fino al completamento della sfida terminale. Questo flusso replica scenari realistici in cui l'analista deve prima interagire con il dispositivo via terminale per identificare il chip di memoria, e solo successivamente procedere con l'estrazione.

> **Figura 4.5** — Firmware dumper SPI con le sonde collegate e la barra di progresso del dump in corso. *(Screenshot da inserire)*

Quando il dump viene avviato, una **barra di progresso** animata simula il trasferimento dei dati. La durata è configurabile (campo `dumpDurationSec`) e al termine viene mostrato un riquadro di conferma con il pulsante per scaricare il file firmware — un file binario reale, caricato dall'autore tramite l'apposita API di upload. Il download e il proseguimento dell'esercizio sono gestiti dall'azione `dismissFirmwareDumpDownload()`, che separa deliberatamente il completamento del dump dalla progressione dell'obiettivo, permettendo allo studente di visualizzare e scaricare il file prima che il flusso avanzi.


## 4.3 Il terminale simulato

L'implementazione del terminale traduce in codice l'architettura descritta nel capitolo precedente. Il sistema si compone di tre moduli principali — il loader della configurazione, l'esecutore dei comandi e gli handler dei comandi built-in — coordinati dal componente React `Terminal.tsx`.

### 4.3.1 Il loader della configurazione

La classe `TerminalConfigLoader` è responsabile della preparazione della configurazione terminale per l'uso a runtime. Il processo di caricamento si articola in quattro fasi sequenziali:

1. **Appiattimento dell'albero**: la struttura `tree` nidificata del filesystem viene convertita nel formato piatto a due record (directory e file) utilizzato dal motore di esecuzione. Un albero `{ "etc": { "passwd": "root:..." } }` diventa le entry `/etc` nelle directory e `/etc/passwd` nei file.

2. **Normalizzazione dei file**: le stringhe abbreviate vengono espanse in oggetti `FileNode` completi, con permessi predefiniti (`-rw-r--r--`), proprietario (`root`), e dimensione calcolata dal contenuto.

3. **Calcolo delle entry di directory**: per ogni directory, il loader scansiona tutte le chiavi dei record directory e file per determinarne i figli diretti, eliminando la necessità per l'autore di specificarli manualmente.

4. **Costruzione della mappa dei comandi**: i comandi globali vengono uniti a quelli specifici di ogni tab, applicando i vincoli predefiniti del tab (`defaultConstraints`) a ogni comando che non definisce i propri. Vengono inoltre registrati gli alias, che permettono di definire nomi alternativi per lo stesso comando.

Il risultato è un oggetto cacheable che espone metodi per accedere a comandi, filesystem, sequenze di boot e flag per qualunque tab.

### 4.3.2 L'esecutore dei comandi

La classe `TerminalCommandExecutor` implementa la pipeline di esecuzione in quattro stadi descritta nel capitolo precedente. L'aspetto più interessante riguarda la molteplicità dei tipi di output supportati, che conferiscono al terminale simulato una flessibilità notevole.

**Output statico**: il tipo più semplice, restituisce un array di stringhe predefinito. È adatto a comandi il cui output non dipende dal contesto — ad esempio un banner di benvenuto o un messaggio di aiuto.

**Output condizionale**: il sistema valuta una catena di condizioni e restituisce l'output del primo ramo soddisfatto. Le condizioni possono verificare il valore di un argomento, il percorso corrente, l'esistenza di un file, lo stato di una flag, o il valore di una variabile di stato. Questo tipo permette di costruire comandi che si comportano diversamente in base al contesto — ad esempio, un comando `strings` che restituisce output diversi a seconda del file analizzato.

**Output template**: utilizza stringhe con segnaposto `{{variabile}}` che vengono sostituiti a runtime. Le variabili possono essere statiche (valori fissi), calcolate (da funzioni registrate), casuali (valore in un intervallo) o derivate dallo stato (variabili di ambiente). Questo tipo è utile per output parametrici come prompt personalizzati o messaggi che includono informazioni dinamiche.

**Output lookup**: confronta un argomento del comando con una tabella di associazioni (per uguaglianza, contenimento o regex) e restituisce l'output corrispondente, o un output predefinito se nessuna chiave corrisponde. Questo tipo è particolarmente efficace per simulare comandi come `file` o `hexdump`, il cui output dipende interamente dall'argomento fornito.

**Output dinamico e script**: invocano funzioni JavaScript personalizzate registrate nel contesto dell'esecutore. La differenza tra i due è sottile: `dynamic` passa argomenti aggiuntivi alla funzione, mentre `script` la invoca senza parametri. Queste modalità rappresentano la valvola di sfogo del sistema, consentendo all'autore di implementare comportamenti che non rientrano negli altri tipi.

### 4.3.3 I comandi built-in

Il terminale include implementazioni pure JavaScript di sette comandi standard di un sistema Unix: `ls`, `cd`, `cat`, `pwd`, `grep`, `find` e `clear`. Questi comandi operano sul filesystem simulato e producono output coerente con le rispettive controparti reali.

L'implementazione di `ls`, ad esempio, supporta i flag `-l` (formato lungo, con permessi, proprietario e dimensione) e `-a` (inclusione dei file nascosti). L'output in formato lungo replica la formattazione caratteristica di un sistema Linux:

```
drwxr-xr-x  1 root root  4096 Jan 15 10:30 bin
-rw-r--r--  1 root root   234 Jan 15 10:30 passwd
```

Il comando `grep` implementa la ricerca con espressioni regolari, con supporto per la ricerca case-insensitive e l'indicazione del numero di riga. Il comando `find` effettua una discesa ricorsiva nelle directory a partire dal percorso specificato, con supporto per il filtraggio per nome (con wildcard) e per tipo (file o directory).

> **Figura 4.6** — Terminale simulato durante la sequenza di boot U-Boot, con il prompt interattivo per l'accesso alla shell del bootloader. *(Screenshot da inserire)*

Il comando `clear` merita una menzione per il suo meccanismo: restituisce un marker speciale (`__CLEAR__`) che il componente React intercetta e interpreta come istruzione di svuotare la cronologia visualizzata, anziché come output da visualizzare.

Tutti i comandi built-in vengono registrati nell'esecutore tramite la funzione `registerBuiltinHandlers()`, che associa ciascun nome di comando alla funzione handler corrispondente.

### 4.3.4 La sequenza di boot

L'implementazione della sequenza di boot è interamente gestita dal componente React `Terminal.tsx` attraverso un effetto che si attiva ad ogni cambio di tab o di stadio.

Per ogni stadio della sequenza, il componente calcola l'intervallo temporale tra le righe dividendo la durata totale per il numero di righe da visualizzare, e utilizza un `setInterval` per aggiungerle progressivamente alla cronologia. Al termine dell'animazione, se lo stadio prevede una transizione automatica (campo `nextStage`), viene programmato il passaggio allo stadio successivo con un ritardo di 500 millisecondi.

Alcuni stadi sono gestiti in modo speciale con logica hardcoded nel componente:

- Lo stadio `uboot_wait` attende la pressione del tasto Invio per procedere, simulando il classico prompt "Hit any key to stop autoboot" dei bootloader U-Boot.
- Lo stadio `login` attende l'inserimento di un nome utente valido.
- Lo stadio `password` verifica le credenziali inserite e, in caso di successo, sblocca automaticamente una flag e procede allo stadio `shell`.

A questi si aggiunge il supporto per l'**auto-progressione con timeout** (`autoProgressTimeout`): se configurato, uno stadio interattivo avanza automaticamente dopo un periodo di inattività dello studente. L'input dell'utente annulla il timeout in corso, permettendo l'interazione manuale. Questo meccanismo replica il comportamento tipico di un bootloader U-Boot, che prosegue automaticamente il boot se nessun tasto viene premuto entro il countdown.

Questa gestione mista — parte configurabile, parte hardcoded — riflette un compromesso pragmatico: gli stadi speciali richiedono una logica di interazione che sarebbe eccessivamente complessa da esprimere in formato dichiarativo, mentre gli stadi generici (animazione di righe di log, transizioni automatiche) sono perfettamente serviti dalla configurazione JSON.

### 4.3.5 Persistenza dello stato del terminale

Un problema ricorrente nelle single-page application riguarda la perdita di stato quando un componente viene smontato e rimontato. Nel caso del terminale, questo avviene ogni volta che lo studente passa dal terminale al PCB e viceversa: React smonta il componente `Terminal` e ne perde lo stato interno.

La soluzione adottata utilizza **variabili a livello di modulo** — dichiarate al di fuori del componente React, nello scope del file — per conservare la cronologia, il percorso corrente, la cronologia dei comandi e lo stadio di boot di ciascun tab. Quando il componente viene rimontato, inizializza il proprio stato da queste variabili persistenti, ripristinando esattamente la situazione precedente.

Questa tecnica, per quanto poco ortodossa rispetto al pattern convenzionale di gestione dello stato tramite store, è particolarmente efficace in questo contesto: il dato è specifico del componente e non ha bisogno di essere condiviso con altri, ma deve sopravvivere ai cicli di mount/unmount.


## 4.4 Il pannello di authoring

Il pannello di authoring (`/settings`) rappresenta l'interfaccia con cui i docenti progettano gli esercizi. La sua struttura riflette il modello dati dell'esercizio, organizzando le funzionalità in sezioni tematiche accessibili tramite una sidebar laterale a tab.

### 4.4.1 Organizzazione dell'interfaccia

> **Figura 4.7** — Pannello di authoring: a sinistra la sidebar con le tab Init/Challenge, al centro il canvas interattivo con la fotografia del PCB e gli overlay trascinabili dei componenti e dei pin. *(Screenshot da inserire)*

La sidebar è divisa in due tab principali: **Init** e **Challenge**.

Un'aggiunta recente è il meccanismo di **selezione dalla sidebar con evidenziazione sul canvas**: cliccando su un componente o un pin nell'elenco della sidebar, l'elemento corrispondente viene evidenziato sul canvas con un bordo e un'animazione distinti, facilitando l'individuazione visiva di elementi su PCB complessi. Lo store mantiene gli identificativi `selectedComponentId` e `selectedPinId` per gestire questa correlazione bidirezionale tra lista e canvas.

La tab **Init** contiene tutto ciò che riguarda la configurazione iniziale del circuito:

- **Componenti**: aggiunta e posizionamento dei componenti hardware sul PCB. L'autore seleziona un punto sull'immagine, definisce nome e tipo del componente, e il sistema crea un overlay cliccabile alle coordinate normalizzate corrispondenti.

- **Pin**: definizione dei punti di misura, dei pin UART e dei pin SPI. Per i pin di misura, l'autore specifica i valori elettrici (tensione, resistenza) con la possibilità di definire intervalli anziché valori fissi. Per i pin UART e SPI, l'autore assegna i ruoli corrispondenti.

- **Terminale**: editor completo per i componenti terminale, descritto in dettaglio nella sezione successiva.

- **Strumenti**: configurazione degli strumenti built-in (raggio e zoom della lente, parametri dell'adattatore UART, durata del dump firmware) e gestione dei gruppi di strumenti.

La tab **Challenge** contiene la definizione della struttura didattica dell'esercizio: gli step, i loro obiettivi, le condizioni di completamento e i frammenti di flag. Per ogni tipo di obiettivo è disponibile un popup di configurazione dedicato che espone i campi pertinenti — ad esempio, l'obiettivo terminale mostra un selettore per il componente terminale e le condizioni di boot stage, mentre l'obiettivo firmware-dump mostra la configurazione delle sonde SPI. Ogni popup include inoltre un componente **HintFilesUpload** che consente all'autore di allegare file scaricabili al suggerimento dell'obiettivo (datasheet, schemi, immagini di riferimento).

Nel simulatore, il componente **HintButton** visualizza il suggerimento dell'obiettivo in una modale che, oltre al testo, presenta i link per il download dei file allegati. I nomi dei file vengono estratti dal percorso di upload rimuovendo il prefisso timestamp, in modo da presentare all'utente il nome originale del documento.

### 4.4.2 Il canvas interattivo

Il canvas delle impostazioni mostra l'immagine del PCB con sovrapposti gli handle trascinabili di componenti e pin. L'autore può zoomare, ruotare e traslare la vista per posizionare con precisione gli elementi, e i popup di configurazione degli obiettivi vengono renderizzati come overlay posizionati in modo assoluto alle coordinate dell'obiettivo selezionato.

Le trasformazioni del canvas (zoom, rotazione, traslazione) sono gestite interamente nello `settingsStore` e non influenzano le coordinate normalizzate degli elementi, che rimangono espresse in percentuale rispetto all'immagine non trasformata.

### 4.4.3 L'editor del terminale

L'editor del terminale, implementato nel componente `TerminalSettingsPanel`, offre un'interfaccia strutturata per la configurazione di tutti gli aspetti del sistema terminale. L'editor è organizzato in quattro sezioni:

- **Comandi**: elenco e editor dei comandi per ogni tab. Ogni comando è configurabile per tipo di handler (built-in, custom, dynamic, script), output, vincoli e side effect. Un popup dedicato (`CommandEditorPopup`) fornisce un form dettagliato con campi condizionali in base al tipo selezionato.

- **Flag**: definizione delle parti della flag terminale, ciascuna con identificativo, frammento di testo, descrizione e suggerimento. La flag completa è la concatenazione delle parti nell'ordine definito.

- **Boot**: configurazione degli stadi della sequenza di boot, con possibilità di riordinamento, definizione delle righe di output, durata e transizioni.

- **Filesystem**: editor ad albero del filesystem simulato, con supporto per la creazione di directory e file, modifica del contenuto, e assegnazione di permessi e proprietario.

A complemento dell'editor, un pannello di **anteprima** (`TerminalPreviewPanel`) mostra la configurazione in formato YAML — utile per una visione d'insieme — e un terminale funzionante in anteprima che permette all'autore di testare i comandi senza uscire dalle impostazioni.

> **Figura 4.8** — Editor del terminale nel pannello di authoring, con la sezione comandi e l'anteprima YAML della configurazione. *(Screenshot da inserire)*


## 4.5 API e persistenza dei dati

### 4.5.1 Architettura delle API

Le API REST sono implementate come **Route Handler** di Next.js, un pattern che permette di definire endpoint HTTP direttamente nelle directory dell'applicazione senza un server separato. Ogni route handler è un file TypeScript che esporta funzioni corrispondenti ai metodi HTTP supportati.

Le API si dividono in cinque gruppi funzionali:

**Configurazione dell'esercizio** (`/api/config/`):
- `GET /api/config/load`: legge il file `exercise.override.json` dalla directory `src/data/` e lo restituisce come JSON. Se il file non esiste, restituisce un 404 che il client interpreta come assenza di configurazione personalizzata, ricadendo sui dati predefiniti.
- `POST /api/config/save`: riceve il JSON della configurazione e lo scrive su file, sovrascrivendo il contenuto precedente.

**Configurazione del terminale** (`/api/terminal-config/`):
- La struttura è analoga alla configurazione dell'esercizio. Il formato supporta sia una singola `TerminalConfig` sia un array di componenti terminale nel formato bundle, garantendo compatibilità sia con il vecchio che con il nuovo formato modulare.

**Preset** (`/api/presets/`):
- `GET /api/presets`: restituisce l'indice dei preset, letto dal file `index.json`.
- `POST /api/presets`: crea un nuovo preset. Il processo include la generazione di uno slug univoco dal nome, la copia dell'immagine PCB in un percorso dedicato al preset, la scrittura del file JSON del preset e l'aggiornamento dell'indice.
- `GET /api/presets/[id]`: carica un preset specifico dal suo file JSON.
- `PUT /api/presets/[id]`: aggiorna un preset esistente con la configurazione corrente.
- `DELETE /api/presets/[id]`: elimina il file del preset e rimuove la voce dall'indice.

Un modulo helper condiviso (`_helpers.ts`) centralizza le operazioni comuni: lettura e scrittura dell'indice, risoluzione del percorso di un preset, generazione degli slug, e copia delle immagini.

**Hint** (`/api/hints/`):
- `POST /api/hints/upload`: gestisce l'upload multipart di file allegati ai suggerimenti degli obiettivi (fino a 50 MB per file), salvandoli nella directory `public/uploads/hints/` con un prefisso timestamp per evitare collisioni.
- `POST /api/hints/delete`: rimuove un file hint dato il suo percorso, con protezione contro la cancellazione di file esterni alla directory dedicata.

**Media** (`/api/images/`, `/api/firmware/`):
- `POST /api/images/upload`: gestisce l'upload multipart di immagini per i componenti, salvandole nella directory `public/uploads/`.
- `DELETE /api/images/delete`: rimuove un file immagine dato il suo percorso.
- `POST /api/firmware/upload`: gestisce l'upload di file firmware binari, salvandoli con un nome che include un timestamp per evitare collisioni.

### 4.5.2 Strategia di persistenza

L'intero sistema di persistenza si basa su **file JSON nel filesystem locale** e su **localStorage nel browser**. Questa scelta architetturale, motivata dalla natura didattica e single-user della piattaforma, elimina la complessità di un database e rende il progetto autocontenuto.

Il flusso di salvataggio segue un percorso che attraversa tre livelli:

1. **Stato in memoria** (store Zustand): rappresenta la versione corrente e modificabile della configurazione, aggiornata in tempo reale dalle interazioni dell'utente.

2. **localStorage**: funge da cache lato client. Ogni salvataggio scrive la configurazione serializzata in una chiave dedicata, permettendo il ripristino rapido al caricamento della pagina senza necessità di una chiamata API.

3. **File su disco**: la versione "canonica" della configurazione, scritta tramite le API REST. Questo livello garantisce la persistenza anche dopo la cancellazione del localStorage e permette di versionare le configurazioni tramite Git.

I preset aggiungono un quarto livello, raggruppando configurazione dell'esercizio e del terminale in un unico file che funge da snapshot riproducibile. La separazione tra configurazione "attiva" (quella su cui l'autore sta lavorando) e preset "salvati" (snapshot immutabili) consente un workflow flessibile: l'autore può sperimentare liberamente sapendo di poter sempre tornare a una versione salvata.

### 4.5.3 Sincronizzazione real-time

Un aspetto che merita attenzione è il meccanismo di sincronizzazione tra la modalità di authoring e il simulatore quando entrambi sono aperti in tab diverse del browser. L'hook `useTerminalConfig()` si sottoscrive all'evento `storage` del browser — emesso automaticamente quando una tab scrive in localStorage — e a un evento personalizzato `terminal-config-updated` per la sincronizzazione nella stessa tab. Quando viene rilevata una modifica, l'hook ricarica la configurazione e il terminale si aggiorna automaticamente.

Questo meccanismo rende il ciclo di sviluppo degli esercizi particolarmente fluido: l'autore può tenere aperte le impostazioni in una tab e il simulatore in un'altra, applicare una modifica alla configurazione del terminale e verificarne immediatamente l'effetto nel simulatore, senza ricaricare la pagina.


## 4.6 Il sistema di completamento dell'esercizio

### 4.6.1 Flussi di completamento degli obiettivi

Il completamento di un obiettivo segue percorsi diversi a seconda del tipo, ma converge in tutti i casi sull'azione interna `_completeCurrentObjective()` dello store:

- Gli **obiettivi di tipo component** si completano al click sullo hotspot corrispondente, verificato tramite il confronto tra l'identificativo del componente cliccato e quello atteso dall'obiettivo.

- Gli **obiettivi di tipo pin** si completano quando le connessioni delle sonde soddisfano le condizioni definite in `pinConditions`. Il sistema supporta sia la logica AND (tutte le condizioni devono essere soddisfatte) sia la logica OR (almeno una condizione è sufficiente), configurabile tramite il campo `pinLogic`.

- Gli **obiettivi di tipo uart** si completano quando tutte le connessioni richieste tra l'adattatore e il PCB sono state stabilite correttamente. La verifica avviene nell'azione `hookUartProbe()`, che ad ogni nuova connessione controlla se tutti i pin dell'adattatore sono collegati ai pin corrispondenti del circuito.

- Gli **obiettivi di tipo terminal** si completano quando tutte le flag elencate in `bootStageConditions.unlockedFlags` sono state scoperte all'interno del terminale. La verifica avviene nell'azione `addTerminalDiscovery()`, che dopo ogni nuova scoperta controlla se l'insieme delle flag richieste è un sottoinsieme delle flag effettivamente scoperte.

- Gli **obiettivi di tipo firmware-dump** seguono un percorso articolato in più fasi. Dopo il collegamento delle sonde e l'eventuale completamento dei comandi terminale (se configurato), lo studente avvia il dump e scarica il file. L'obiettivo si completa solo dopo il download, tramite l'azione `dismissFirmwareDumpDownload()`, che verifica lo stato corrente e decide se completare direttamente l'obiettivo o se lanciare un terminale per ulteriori analisi.

### 4.6.2 Reset dello stato alla transizione tra step

Un aspetto rilevante del flusso di completamento riguarda la **pulizia dello stato** alla transizione tra uno step e il successivo. Quando lo studente avanza al prossimo step — sia avviandolo dalla schermata educativa sia completando lo step corrente — il sistema esegue un reset completo di tutti gli strumenti: le sonde del multimetro vengono scollegate, le connessioni UART e SPI azzerate, il terminale chiuso, la lente disattivata, e la sidebar riportata allo strumento puntatore. Questo comportamento garantisce che ogni step inizi da uno stato pulito, evitando che connessioni residue dallo step precedente interferiscano con gli obiettivi successivi o generino confusione nello studente.

### 4.6.3 Progressione della flag

Durante l'esecuzione dell'esercizio, la flag viene costruita progressivamente. Ogni step completato contribuisce con il proprio `flagPart`; per gli step con obiettivi terminale, il contributo include sia il `flagPart` dell'obiettivo sia il `terminalCurrentFlag` — il frammento parziale della flag terminale, aggiornato in tempo reale man mano che lo studente scopre le singole parti.

L'interfaccia visualizza questa progressione in modo chiaro: i frammenti già scoperti appaiono in evidenza, quelli ancora da scoprire sono rappresentati da una sequenza di caratteri di sostituzione. Questo approccio fornisce allo studente un'indicazione del progresso senza rivelare il contenuto delle parti mancanti.

### 4.6.4 Il dialogo di completamento

Al completamento dell'ultimo step, il sistema verifica la flag complessiva e mostra un **dialogo di completamento** configurabile. Il dialogo può includere:

- un titolo e una descrizione personalizzati;
- un pulsante per copiare la flag negli appunti;
- un pulsante di redirect verso un URL esterno (ad esempio, una piattaforma di valutazione);
- un pulsante per scaricare un file (ad esempio, un certificato di completamento o un report).

La configurabilità del dialogo consente di adattare la piattaforma a diversi contesti d'uso — da un esercizio standalone con autocorrezione a un modulo integrato in un sistema di e-learning più ampio.
