# Capitolo 5 — Caso di studio

Per verificare le capacità espressive della piattaforma e illustrarne concretamente l'uso, è stato progettato un esercizio CTF completo basato sull'analisi di un dispositivo reale: il router TP-Link WR841N, un dispositivo consumer ampiamente diffuso e frequentemente utilizzato nella ricerca sulla sicurezza dei dispositivi embedded.

La scelta di questo dispositivo non è casuale. Il WR841N è stato oggetto di numerosi studi e disclosure di vulnerabilità nel corso degli anni, il che lo rende un soggetto ideale per un esercizio didattico: è sufficientemente semplice da essere accessibile a studenti senza esperienza pregressa, ma presenta una superficie di attacco abbastanza ampia da consentire un percorso formativo articolato, che spazia dall'ispezione visiva del circuito stampato fino all'analisi delle vulnerabilità del software.


## 5.1 Progettazione dell'esercizio

### 5.1.1 Struttura dell'esercizio

L'esercizio è articolato in due step formali, corrispondenti alle fasi di analisi hardware, seguiti da una fase di esplorazione terminale che si attiva automaticamente al completamento della connessione UART:

**Step 1 — Hardware Analysis.** Lo studente deve identificare visivamente i componenti principali sulla fotografia del PCB del router: il System-on-Chip (SoC) QCA953x e la memoria EPROM. Successivamente, deve collegare le sonde del firmware dumper ai pin della memoria per estrarre il firmware. Questo step introduce le competenze fondamentali di ricognizione fisica e di interazione con i bus di comunicazione.

**Step 2 — UART.** Lo studente deve individuare i pin della porta seriale UART sul circuito e collegare l'adattatore USB-to-serial rispettando la logica del protocollo: TX dell'adattatore su RX del dispositivo, RX su TX, GND su GND. Il completamento di questo step — che attesta la corretta comprensione del protocollo — innesca automaticamente l'apertura del terminale simulato, grazie alla configurazione `terminalComponentId` dell'adattatore UART.

**Fase terminale (auto-lanciata).** Il terminale, avviato automaticamente dopo la connessione UART, riproduce il comportamento del router TP-Link con una sequenza di boot realistica (U-Boot → kernel Linux → login). Il componente terminale è configurato con un sistema di sei flag progressive che guidano l'analisi:

1. *Boot Analysis* — analisi delle variabili d'ambiente del bootloader U-Boot tramite il comando `printenv`, alla ricerca di inconsistenze nella configurazione (ad esempio, `rootfstype=jffs2` nel bootloader mentre il kernel monta un filesystem SquashFS);
2. *Root Access* — ottenimento dell'accesso root tramite credenziali di default del dispositivo (`root` / `sohoadmin`);
3. *Hash Cracking* — esame del file `/etc/shadow` per estrarre gli hash delle password e utilizzo del tab "Local Machine" per crackarli con strumenti come `hashcat`;
4. *Data Leak* — analisi delle partizioni del dispositivo con il comando `strings` per estrarre credenziali WiFi e configurazioni in chiaro dalla partizione di configurazione;
5. *Command Injection* — analisi del binario del web server (`/usr/bin/httpd`) per individuare funzioni vulnerabili a injection di comandi;
6. *Backdoor Discovery* — identificazione di processi sospetti tramite `ps` e analisi di binari anomali in `/usr/bin/`.

Ogni scoperta sblocca un frammento della flag terminale; al completamento di tutti e sei, la flag composta `flag{b00t_r00t_h4sh_l34k_1nj3ct_sh3ll}` viene rivelata. Questa architettura — step formali per l'interazione hardware, fase terminale auto-lanciata per l'analisi software — sfrutta il meccanismo di auto-lancio descritto nel Capitolo 4 (§4.2.2) per collegare fluidamente le due fasi dell'esercizio.

### 5.1.2 Configurazione del terminale

Il terminale dell'esercizio è configurato con due tab:

- **UART Console**: simula la connessione seriale al dispositivo. Include una sequenza di boot completa che riproduce fedelmente l'output del bootloader U-Boot del QCA953x (banner, inizializzazione RAM, checksum del kernel) seguito dal boot Linux con i messaggi del kernel. Il filesystem replica la struttura reale del WR841N: directory `/etc` con `passwd`, `shadow`, `inittab`; `/proc` con `cpuinfo`, `mtd`, `meminfo`; `/web/oem/model.conf` con il modello e la versione del firmware.

- **Local Machine**: simula la macchina di analisi dello studente, con strumenti come `hashcat` e `john` disponibili per il cracking degli hash estratti dal dispositivo target.

### 5.1.3 Configurazione degli strumenti

L'esercizio utilizza la seguente configurazione degli strumenti:

- La **lente di ingrandimento** è configurata con raggio 90px e zoom 2.4x, parametri calibrati sulla risoluzione della fotografia del PCB utilizzata.
- L'**adattatore UART** è configurato con persistenza post-connessione e con associazione al componente terminale, in modo che il terminale si apra automaticamente dopo il collegamento.
- Il **firmware dumper** utilizza due sonde (GND e VCC) con mapping esatto verso pin specifici, durata del dump di 1 secondo, e un file firmware binario reale (`fw_test.bin`) scaricabile dallo studente.
- Il **dialogo di completamento** mostra un messaggio di congratulazioni con la possibilità di copiare la flag.


## 5.2 Walkthrough dello studente

Si descrive di seguito il percorso tipico di uno studente che affronta l'esercizio, evidenziando le interazioni con la piattaforma in ciascuna fase.

### 5.2.1 Fase 1 — Ricognizione del PCB

> **Figura 5.1** — Schermata educativa del primo step, con la descrizione dell'esercizio e il pulsante per avviare la fase attiva. *(Screenshot da inserire)*

Lo studente accede alla piattaforma e visualizza la schermata educativa del primo step, che introduce il contesto dell'esercizio. Dopo aver letto le istruzioni, avvia lo step e si trova di fronte alla fotografia del PCB del router.

> **Figura 5.2** — PCB del TP-Link WR841N nel simulatore, con la lente di ingrandimento posizionata sul SoC QCA953x e il componente evidenziato dopo l'identificazione. *(Screenshot da inserire)*

Utilizzando la lente di ingrandimento, esamina il circuito alla ricerca dei componenti descritti nelle istruzioni. Identifica il SoC cliccando sull'area corrispondente — il sistema evidenzia il componente e rivela il primo frammento della flag. Ripete l'operazione per la memoria EPROM.

Per il terzo obiettivo dello step, seleziona lo strumento firmware dump dalla sidebar. Due sonde appaiono sullo schermo; lo studente le trascina sui pin indicati. Quando entrambe le sonde sono correttamente collegate (il meccanismo di snap facilita il posizionamento), il pulsante "DUMP FIRMWARE" si abilita. Avvia il dump, osserva la barra di progresso, e al termine scarica il file binario del firmware. L'ultimo frammento della flag dello step viene rivelato.

### 5.2.2 Fase 2 — Connessione UART

> **Figura 5.3** — Adattatore UART con le sonde collegate ai pin del PCB: la connessione incrociata TX→RX è evidenziata dai fili colorati. *(Screenshot da inserire)*

Nel secondo step, lo studente deve stabilire la connessione seriale. Seleziona lo strumento UART e trascina le sonde dell'adattatore sui pin del PCB. Se tenta di collegare TX su TX, la connessione viene rifiutata — un feedback immediato che lo invita a riflettere sulla logica del protocollo. Dopo aver individuato il mapping corretto (TX→RX, RX→TX, GND→GND), la connessione viene stabilita e il terminale si apre automaticamente.

### 5.2.3 Fase 3 — Esplorazione del terminale

> **Figura 5.4** — Terminale simulato durante la sequenza di boot del WR841N, con i messaggi del bootloader U-Boot e l'inizializzazione del kernel Linux. *(Screenshot da inserire)*

Il terminale mostra la sequenza di boot del dispositivo: il banner U-Boot, l'inizializzazione dell'hardware, il caricamento del kernel. Lo studente osserva il flusso dei messaggi, che replica fedelmente quello di un dispositivo reale.

Arrivato al prompt U-Boot (`U-Boot> `), esegue il comando `printenv` per esaminare le variabili d'ambiente del bootloader. Nota che `rootfstype=jffs2` mentre il kernel successivamente monta un filesystem SquashFS — un'inconsistenza che suggerisce una modifica non autorizzata. Questo sblocca il primo frammento della flag terminale.

Dopo il boot del kernel, il dispositivo presenta un prompt di login. Lo studente prova le credenziali di default: `root` come utente e `sohoadmin` come password. L'accesso viene concesso e il secondo frammento viene sbloccato.

Con l'accesso root, lo studente esamina il file `/etc/shadow` per estrarre gli hash delle password. Passa al tab "Local Machine" e utilizza `hashcat` per crackare l'hash MD5. Scopre la password in chiaro e sblocca il terzo frammento.

Prosegue con l'analisi delle partizioni: `strings /dev/mtdblock3` rivela credenziali WiFi e configurazioni in chiaro nella partizione di configurazione — un classico esempio di data leak in dispositivi embedded. Quarto frammento sbloccato.

L'analisi del web server (`strings /usr/bin/httpd | grep exec`) rivela la presenza di funzioni vulnerabili a command injection come `execFormatCmd`. Quinto frammento.

Infine, il comando `ps` rivela un processo sospetto. L'analisi del binario `/usr/bin/backdoorTest` con `strings` e `file` ne conferma la natura malevola. Sesto e ultimo frammento sbloccato.

La flag terminale è ora completa; il sistema combina i frammenti degli step precedenti con quelli del terminale per costruire la flag finale dell'esercizio. Lo studente la inserisce nel dialogo di validazione e riceve la conferma del completamento.

> **Figura 5.5** — Terminale con la flag progressiva completata e il dialogo di completamento dell'esercizio con la flag finale. *(Screenshot da inserire)*


## 5.3 Configurazione lato autore

### 5.3.1 Creazione dell'esercizio

> **Figura 5.6** — Pannello di authoring con la fotografia del PCB del WR841N e i componenti posizionati tramite drag-and-drop. *(Screenshot da inserire)*

La configurazione dell'esercizio descritto è stata interamente realizzata tramite il pannello di authoring della piattaforma, senza modifiche dirette ai file JSON.

Il processo è partito dal caricamento della fotografia del PCB nella tab "Immagine" delle impostazioni. L'autore ha poi posizionato i componenti cliccabili (SoC, EPROM) direttamente sull'immagine tramite drag-and-drop, regolando le dimensioni degli overlay fino a coprire le aree corrette del circuito.

I pin di misura e i pin UART sono stati posizionati in modo analogo, ciascuno con il ruolo e i valori elettrici appropriati. Per il firmware dump, l'autore ha configurato le sonde e caricato il file binario tramite l'apposito pannello.

### 5.3.2 Configurazione del terminale

> **Figura 5.7** — Editor del terminale con la configurazione dei comandi del tab UART Console e la struttura del filesystem del WR841N. *(Screenshot da inserire)*

La configurazione del terminale ha rappresentato la parte più laboriosa. L'autore ha utilizzato l'editor strutturato per:

- definire la struttura del filesystem tab per tab, creando le directory e i file che replicano il sistema del WR841N;
- configurare i comandi built-in (ls, cd, cat, pwd, grep, find, clear) con i vincoli di boot stage appropriati — ad esempio, i comandi del filesystem sono disponibili solo nello stadio `shell`, non nel prompt U-Boot;
- creare i comandi custom (`printenv`, `version`, `strings`, `ps`, `hashcat`) con i rispettivi output statici, condizionali o lookup;
- definire i side effect di sblocco flag per ciascun comando chiave;
- configurare la sequenza di boot con gli stadi U-Boot, kernel, login e shell.

L'anteprima integrata ha permesso di testare iterativamente il comportamento del terminale durante la configurazione, verificando che i comandi producano l'output atteso e che le flag si sblocchino correttamente.

### 5.3.3 Salvataggio come preset

Al termine della configurazione, l'esercizio è stato salvato come preset con il nome "CTF-1" e la descrizione "TP-LINK". Il sistema ha creato automaticamente una copia dell'immagine del PCB dedicata al preset, garantendo che l'esercizio sia riproducibile anche se l'immagine di lavoro viene successivamente modificata.

Il preset così creato può essere caricato in qualsiasi istanza della piattaforma, permettendo al docente di distribuire l'esercizio ai propri studenti con un semplice file JSON, oppure di condividerlo con colleghi che utilizzano la stessa piattaforma.
