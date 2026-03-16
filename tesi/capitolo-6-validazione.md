# Capitolo 6 — Validazione e discussione

## 6.1 Criteri di valutazione

La validazione di una piattaforma didattica presenta sfide metodologiche specifiche: l'efficacia formativa è intrinsecamente difficile da misurare in modo quantitativo, poiché dipende da variabili quali il livello di partenza degli studenti, il contesto di utilizzo e la qualità degli esercizi proposti. In assenza di un campione statisticamente significativo di utenti — la piattaforma è stata sviluppata nell'ambito di questo lavoro di tesi e non è ancora stata sottoposta a una sperimentazione su larga scala — la validazione si articola su tre assi qualitativi: la copertura dei concetti didattici, la fedeltà della simulazione rispetto all'esperienza reale, e l'espressività del sistema di authoring.

### 6.1.1 Copertura dei concetti didattici

Il percorso formativo coperto dalla piattaforma abbraccia le fasi principali dell'analisi hardware di un dispositivo embedded:

| Fase dell'analisi | Strumento/funzionalità | Concetto didattico |
|---|---|---|
| Ricognizione fisica | Lente di ingrandimento, click su componenti | Identificazione dei chip, lettura delle sigle |
| Misurazioni elettriche | Multimetro (tensione, resistenza) | Individuazione dei livelli logici, test di continuità |
| Identificazione interfacce | Pin UART (TX, RX, GND) | Riconoscimento dei bus di comunicazione seriale |
| Connessione seriale | Adattatore UART con crossover | Protocollo UART, logica TX/RX incrociata |
| Estrazione firmware | Sonde SPI (6 segnali) | Bus SPI, ruoli dei segnali, dump della memoria flash |
| Analisi bootloader | Terminale con boot sequence | U-Boot, variabili d'ambiente, configurazione del boot |
| Accesso al sistema | Login con credenziali | Credenziali di default, hardening insufficiente |
| Analisi del filesystem | Comandi built-in (ls, cat, grep, find) | Struttura di un sistema Linux embedded |
| Cracking di password | Tab "Local Machine" con hashcat | Hash MD5, attacchi dizionario, `/etc/shadow` |
| Analisi delle vulnerabilità | Comandi strings, ps | Command injection, backdoor, data leak |

Questa copertura corrisponde al percorso tipico descritto nei testi di riferimento sull'analisi hardware, come "The Hardware Hacking Handbook" (Jasper van Woudenberg, Colin O'Flynn) e "Practical IoT Hacking" (Fotios Chantzis et al.), coprendo le fasi dalla ricognizione fisica fino all'analisi delle vulnerabilità software.

Un'area non coperta dalla piattaforma nella sua versione attuale è quella degli attacchi side-channel (analisi di consumo energetico, emissioni elettromagnetiche, timing attack) e del protocollo JTAG, che richiederebbero un livello di simulazione significativamente più complesso e che sono tipicamente affrontati in fasi avanzate della formazione.

### 6.1.2 Fedeltà della simulazione

La simulazione implementata opera necessariamente a un livello di astrazione superiore rispetto all'interazione con hardware reale. Tuttavia, diversi accorgimenti contribuiscono a ridurre il divario percettivo:

- Il **rumore digitale** del multimetro riproduce l'instabilità tipica delle ultime cifre di uno strumento reale, insegnando implicitamente allo studente a interpretare le letture con la corretta incertezza.
- La **validazione basata sui ruoli** delle connessioni UART e SPI obbliga lo studente a ragionare sulla logica dei protocolli, non semplicemente a "indovinare" il collegamento corretto.
- La **sequenza di boot** del terminale replica fedelmente l'output di un dispositivo reale, con tempi di animazione calibrati per risultare credibili.
- Il **filesystem** include file e directory coerenti con il sistema operativo del dispositivo simulato, non placeholder generici.

Il limite principale riguarda l'assenza di variabilità: in un dispositivo reale, le misurazioni sono soggette a rumore ambientale, i collegamenti possono essere intermittenti, e il comportamento del sistema può variare tra sessioni. La simulazione, per sua natura deterministica, non cattura questa complessità. Questa è una limitazione consapevole, non un difetto: in fase didattica, il determinismo è un vantaggio, poiché consente allo studente di concentrarsi sui concetti senza le frustrazioni legate a problemi di contatto o interferenze.

### 6.1.3 Espressività del sistema di authoring

Il sistema di authoring è stato progettato per consentire la creazione di esercizi eterogenei senza modifiche al codice sorgente. Per valutarne l'espressività, consideriamo la varietà di scenari configurabili:

- **Esercizi di sola ricognizione**: step con obiettivi di tipo "component", dove lo studente identifica i chip utilizzando la lente di ingrandimento. Non richiedono terminale né connessioni.
- **Esercizi di misura elettrica**: step con obiettivi di tipo "pin", dove lo studente utilizza il multimetro per individuare livelli logici o verificare continuità.
- **Esercizi di connessione**: step con obiettivi UART o firmware-dump, focalizzati sulla comprensione dei protocolli di comunicazione.
- **Esercizi di analisi terminale**: step con obiettivi terminale complessi, sequenze di boot multi-stadio, flag condizionali.
- **Esercizi combinati**: step che integrano strumenti fisici e terminale, come nell'esercizio del caso di studio.

Il sistema di sei tipi di output del terminale (statico, condizionale, template, lookup, dinamico, script) consente di simulare una gamma molto ampia di comportamenti, dalla semplice restituzione di testo fisso fino all'esecuzione di logica arbitraria via funzioni JavaScript.

I vincoli sui comandi (percorso, permessi, prerequisiti, argomenti, stadio di boot) permettono di costruire percorsi didattici guidati dove la disponibilità dei comandi evolve con il progresso dello studente, riducendo il rischio che salti fasi o arrivi a risultati senza aver compreso i passaggi intermedi.


## 6.2 Confronto con soluzioni esistenti

Per contestualizzare il contributo di PCB-CTF, è utile confrontarlo con le piattaforme e gli approcci didattici esistenti nel campo della sicurezza hardware.

| Caratteristica | CTFd / PicoCTF | RHme (Riscure) | Remote Labs | **PCB-CTF** |
|---|---|---|---|---|
| Simulazione hardware | No | No (hardware reale) | Parziale | Sì |
| Interazione con PCB | No | Sì (fisico) | Via webcam | Sì (virtuale) |
| Strumenti simulati | No | No (reali) | Reali via rete | Sì |
| Terminale embedded | No | No | Sì (SSH) | Sì (simulato) |
| Accessibilità browser | Sì | No | Parziale | Sì |
| Costo per studente | Zero | Hardware (~€50+) | Infrastruttura | Zero |
| Scalabilità | Alta | Bassa | Media | Alta |
| Authoring no-code | Parziale | No | No | Sì |
| Determinismo | N/A | No | No | Sì |
| Sicurezza server | N/A | N/A | Rischio | Nessun rischio |

**CTFd e PicoCTF** sono piattaforme CTF general-purpose, eccellenti per sfide software (web, crypto, reverse engineering) ma prive di qualsiasi componente di interazione hardware. Lo studente affronta sfide di analisi firmware come esercizi di reverse engineering puro, senza il contesto dell'hardware che lo ospita.

**RHme (Riscure Hack me)** è una board hardware dedicata alla formazione sulla sicurezza, che richiede l'acquisto fisico del dispositivo. Offre un'esperienza autentica ma con costi e logistica che ne limitano la scalabilità.

**I laboratori remoti** (come quelli offerti da alcune università e organizzazioni di formazione) forniscono accesso a hardware reale via rete, ma richiedono infrastruttura dedicata, manutenzione, e presentano limiti di concorrenza e disponibilità.

PCB-CTF si posiziona in una nicchia non coperta dalle soluzioni esistenti: offre un'interazione visiva e strumentale con l'hardware — assente nelle piattaforme CTF tradizionali — in un formato completamente virtualizzato che non richiede hardware fisico né infrastruttura server complessa.


## 6.3 Limitazioni

Nonostante i risultati raggiunti, la piattaforma presenta limitazioni che è necessario riconoscere.

**Assenza di esecuzione reale.** Il terminale simula, non esegue. Lo studente non può lanciare comandi arbitrari, ma solo quelli previsti dall'autore. Questo implica che la piattaforma non può replicare l'esperienza esplorativa aperta tipica di un'analisi reale, dove il percorso è spesso non lineare e guidato dall'intuizione. Per mitigare questa limitazione, il sistema di output condizionale e lookup consente all'autore di prevedere un insieme ragionevolmente ampio di input, ma la copertura non potrà mai essere completa.

**Scenari non coperti.** Come già accennato, i protocolli JTAG, I²C, e CAN non sono attualmente supportati. Gli attacchi side-channel — analisi di potenza, timing, fault injection — richiederebbero un paradigma di simulazione fondamentalmente diverso e non rientrano nell'ambito di questo lavoro.

**Singolo utente.** La piattaforma non supporta sessioni concorrenti con autenticazione, scoring, o classifiche. In un contesto di competizione CTF, queste funzionalità sarebbero essenziali.

**Persistenza limitata.** Il progresso dello studente non viene salvato tra le sessioni. Questo è coerente con l'uso in laboratorio, ma limita l'adozione in contesti di e-learning dove lo studente potrebbe voler riprendere un esercizio in un momento successivo.

**Validazione empirica.** La piattaforma non è ancora stata sottoposta a una sperimentazione formale con studenti. La valutazione presentata in questo capitolo è qualitativa e basata sull'analisi delle funzionalità; una validazione quantitativa dell'efficacia didattica richiederebbe uno studio controllato con gruppi di studenti, pre-test e post-test, che costituisce un naturale sviluppo futuro.


## 6.4 Sviluppi futuri

I limiti identificati suggeriscono diverse direzioni di evoluzione:

**Supporto multi-utente e scoring.** L'aggiunta di un sistema di autenticazione e di una classifica trasformerebbe la piattaforma da strumento didattico individuale a piattaforma CTF competitiva, adatta a eventi e competizioni. Questo richiederebbe l'introduzione di un database per la persistenza degli utenti e dei punteggi, e una logica di timing per la classifica.

**Integrazione con hardware reale.** Un'evoluzione particolarmente interessante sarebbe la possibilità di alternare fasi simulate e fasi su hardware reale all'interno dello stesso esercizio. Ad esempio, lo studente potrebbe completare la ricognizione e le misurazioni in simulazione, e poi passare a un laboratorio remoto per l'estrazione fisica del firmware. Questo approccio ibrido combinerebbe i vantaggi della simulazione (sicurezza, scalabilità, determinismo) con l'autenticità dell'esperienza su hardware reale.

**Nuovi protocolli e strumenti.** L'architettura del sistema di pin e strumenti è già predisposta per l'estensione. Protocolli come JTAG e I²C potrebbero essere aggiunti come nuovi tipi di pin e strumenti, riutilizzando il meccanismo di connessione role-based e il sistema di validazione esistente.

**Terminale con LLM.** Un'evoluzione del terminale potrebbe integrare un modello linguistico per gestire comandi non previsti dall'autore, generando risposte plausibili e coerenti con il contesto simulato. Questo amplierebbe significativamente l'esperienza esplorativa dello studente, pur mantenendo il controllo sull'output dei comandi chiave per la progressione dell'esercizio.

**Persistenza del progresso e analytics.** Il salvataggio del progresso dello studente, combinato con analytics sull'utilizzo (tempo per obiettivo, comandi tentati, errori più frequenti), fornirebbe dati preziosi sia allo studente — per riprendere il lavoro — sia al docente — per identificare i punti di difficoltà e migliorare gli esercizi.
