# Approccio Pedagogico

## Panoramica

PCB-CTF implementa un modello didattico strutturato per l'insegnamento della sicurezza hardware. L'approccio e' basato su tre principi: **progressione guidata** (lo studente avanza attraverso fasi incrementali), **feedback immediato** (ogni azione corretta sblocca un frammento della flag), e **scaffolding adattivo** (hint e istruzioni supportano lo studente senza fornire la soluzione).

Questo documento analizza il design pedagogico della piattaforma, il mapping tra le fasi dell'esercizio e le competenze acquisite, e i meccanismi di supporto all'apprendimento.

---

## Modello a Fasi: Dal Fisico al Logico

La struttura degli esercizi PCB-CTF ricalca il workflow operativo di un penetration tester hardware. L'ordine delle fasi non e' casuale: rispecchia la sequenza che un analista seguirebbe davanti a un dispositivo embedded sconosciuto.

### Fase 1: Ispezione Visiva (`ObjectiveType: 'component'`)

**Competenza:** Riconoscimento dei componenti elettronici su una PCB.

Lo studente osserva l'immagine ad alta risoluzione della PCB e identifica i componenti rilevanti (chip, connettori, punti di test, antenne). Lo strumento **Lente d'ingrandimento** (`magnifier`) permette di zoomare su aree specifiche.

**Cosa impara lo studente:**
- Riconoscere chip (SoC, flash, RAM) dal package e dalle sigle
- Identificare connettori di debug (UART, JTAG, SPI header)
- Leggere le serigrafie sulla PCB per orientarsi

**Meccanismo di completamento:** lo studente clicca sull'area corretta della PCB (coordinate normalizzate dell'obiettivo). L'`exerciseStore.selectComponent()` verifica che il click cada nell'area dell'obiettivo e completa l'objective.

### Fase 2: Analisi Elettrica (`ObjectiveType: 'pin'`)

**Competenza:** Uso di strumenti di misura per identificare segnali elettrici.

Lo studente usa il **multimetro virtuale** per misurare tensioni e resistenze sui pin della PCB. Deve collegare le sonde (rossa e nera) ai pin corretti per ottenere le letture attese.

**Cosa impara lo studente:**
- Identificare pin di alimentazione (VCC, GND) tramite tensione
- Distinguere pin attivi da pin non connessi
- Usare la modalita' Ohm per verificare continuita'

**Meccanismo di completamento:** l'obiettivo definisce `pinConditions` con logica AND o OR. L'`exerciseStore._checkPinConditions()` verifica che le sonde siano collegate ai pin specificati.

### Fase 3: Connessione Fisica (`ObjectiveType: 'uart'`)

**Competenza:** Collegamento di un adattatore UART-USB a un dispositivo target.

Lo studente collega le tre sonde dell'adattatore UART (TX, RX, GND) ai pin corrispondenti sulla PCB. Deve rispettare la mappatura incrociata (TX dell'adattatore → RX del dispositivo e viceversa).

**Cosa impara lo studente:**
- Il protocollo UART e il significato di TX, RX, GND
- La necessita' di incrociare TX/RX tra adattatore e dispositivo
- L'importanza della massa comune (GND)

**Meccanismo di completamento:** `exerciseStore.hookUartProbe()` verifica che tutte le connessioni richieste siano corrette. Supporta anche obiettivi `pin` con condizioni `adapter-*`.

### Fase 4: Analisi Software (`ObjectiveType: 'terminal'`)

**Competenza:** Navigazione del sistema operativo di un dispositivo embedded via terminale.

Lo studente interagisce con il **terminale simulato** per esplorare il filesystem del dispositivo, leggere configurazioni, estrarre credenziali e scoprire vulnerabilita'. Deve eseguire comandi specifici che sbloccano flag.

**Cosa impara lo studente:**
- Comandi Linux di base (`ls`, `cat`, `grep`, `find`)
- Struttura del filesystem di un router embedded
- Dove cercare informazioni sensibili (`/etc/passwd`, `/etc/shadow`, boot args)
- Come interrompere il bootloader per accedere a U-Boot

**Meccanismo di completamento:** i comandi con `sideEffects.unlockFlags` sbloccano flag ID. L'`exerciseStore.addTerminalDiscovery()` verifica che tutti i flag richiesti dalle `bootStageConditions` dell'obiettivo siano stati scoperti.

### Fase 5: Estrazione Firmware (`ObjectiveType: 'firmware-dump'`)

**Competenza:** Uso di strumenti specializzati per estrarre il firmware da un chip.

Lo studente configura un **custom tool** (es. programmatore flash) collegando le sonde ai pin corretti (CS, MISO, MOSI, CLK, VCC, GND) e avvia l'estrazione. Il risultato e' un file firmware scaricabile.

**Cosa impara lo studente:**
- I protocolli di comunicazione con chip di memoria (SPI, JTAG)
- La mappatura dei pin di un programmatore flash
- Il concetto di firmware dump e le successive fasi di analisi

**Meccanismo di completamento:** `exerciseStore.completeFirmwareDump()` verifica che le `requiredConnections` del `FirmwareDumpConfig` siano tutte soddisfatte.

---

## Progressione Didattica: StepMode

Ogni step dell'esercizio attraversa tre stati (`StepMode`) che implementano un ciclo di apprendimento:

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  EDUCATION MODE                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Titolo dello step                                 │  │
│  │ Descrizione educativa (teoria, contesto)          │  │
│  │                                                   │  │
│  │ Lo studente legge, il simulatore e' disabilitato  │  │
│  │                                                   │  │
│  │              [ Avvia Step → ]                     │  │
│  └───────────────────────────────────────────────────┘  │
│                         │                               │
│                         ▼                               │
│  ACTIVE MODE                                            │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Istruzione obiettivo corrente                     │  │
│  │ Hint disponibile (su richiesta)                   │  │
│  │                                                   │  │
│  │ Il simulatore e' abilitato: lo studente           │  │
│  │ interagisce con PCB, strumenti, terminale         │  │
│  │                                                   │  │
│  │ Obiettivi completati in sequenza:                 │  │
│  │   [x] Obj 1  [x] Obj 2  [ ] Obj 3  [ ] Obj 4   │  │
│  └───────────────────────────────────────────────────┘  │
│                         │                               │
│                         ▼                               │
│  COMPLETED MODE                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Flag assemblata: flag{b00t_r00t_????_????}        │  │
│  │                                                   │  │
│  │ Lo studente inserisce la flag completa            │  │
│  │ per avanzare allo step successivo                 │  │
│  │                                                   │  │
│  │ Input: [________________]  [ Verifica → ]         │  │
│  └───────────────────────────────────────────────────┘  │
│                         │                               │
│                         ▼                               │
│              STEP SUCCESSIVO (o fine esercizio)          │
└─────────────────────────────────────────────────────────┘
```

### Education Mode

Lo studente riceve il contesto teorico prima di agire. Il campo `description` dello `Step` contiene il materiale educativo: cosa sta per fare, perche' e' importante, quali concetti sono coinvolti. Il simulatore e' **disabilitato** (`isSimulatorEnabled = false`) — lo studente non puo' interagire con la PCB fino a quando non clicca "Avvia Step".

**Principio pedagogico:** *pre-training* — presentare i concetti prima della pratica riduce il carico cognitivo durante l'attivita'.

### Active Mode

Lo studente interagisce attivamente con il simulatore. Gli obiettivi vengono presentati uno alla volta, in sequenza. Ogni obiettivo ha:

- **Istruzione** (`instruction`): cosa deve fare lo studente
- **Hint** (`hint`): suggerimento disponibile su richiesta

Il campo `availableTools` dello step limita gli strumenti utilizzabili, focalizzando l'attenzione sullo strumento pertinente alla fase corrente.

**Principio pedagogico:** *scaffolding* — la struttura a obiettivi sequenziali guida lo studente senza dargli la soluzione. L'hint e' disponibile ma non imposto.

### Completed Mode

Lo step e' completato quando tutti gli obiettivi sono stati raggiunti. La flag si assembla progressivamente: ogni obiettivo contribuisce con il suo `flagPart`. Lo studente deve inserire la flag completa per avanzare.

**Principio pedagogico:** *verifica dell'apprendimento* — la flag non e' solo un premio ma una conferma che lo studente ha completato tutti i passaggi richiesti. L'inserimento manuale (non automatico) forza lo studente a consolidare il risultato.

---

## Meccanismi di Supporto

### Sistema di Hint

Ogni obiettivo ha un campo `hint` che fornisce un suggerimento contestuale. L'hint e' nascosto dietro un bottone (`HintButton.tsx`) e viene rivelato solo su richiesta esplicita dello studente.

**Design rationale:** l'hint e' uno strumento di ultimo ricorso, non una guida passo-passo. Lo studente e' incoraggiato a tentare prima di chiedere aiuto. La separazione tra `instruction` (sempre visibile) e `hint` (su richiesta) implementa il principio dello *scaffolding progressivo*.

### Flag Progressiva

La flag si costruisce incrementalmente. Dopo ogni obiettivo completato, il display mostra la flag parziale con `?` per i frammenti mancanti:

```
Dopo obiettivo 1: flag{b00t_????_????}
Dopo obiettivo 2: flag{b00t_r00t_????}
Dopo obiettivo 3: flag{b00t_r00t_h4sh}
```

**Design rationale:** il feedback visivo immediato gratifica lo studente e segnala il progresso. I `?` indicano quanti obiettivi rimangono senza rivelare il contenuto.

### Istruzioni Contestuali

Il pannello istruzioni (`InstructionsPanel.tsx`) mostra in tempo reale:

- Il titolo dello step corrente
- L'obiettivo attuale con la sua istruzione
- Lo stato di avanzamento (obiettivo X di N)

Le istruzioni cambiano automaticamente quando un obiettivo viene completato, guidando lo studente al passo successivo.

---

## Mapping Competenze-Obiettivi

| ObjectiveType | Competenza Tecnica | Strumento | Fase del Pentest |
|--------------|-------------------|-----------|-----------------|
| `component` | Riconoscimento componenti PCB | Puntatore, Lente | Ricognizione |
| `pin` | Analisi segnali elettrici | Multimetro | Analisi |
| `uart` | Connessione interfaccia debug | Sonde UART | Accesso |
| `terminal` | Navigazione sistema embedded | Terminale | Sfruttamento |
| `firmware-dump` | Estrazione firmware | Custom Tool | Estrazione |

Questa tassonomia ricalca la metodologia OWASP IoT Testing e le best practice di NIST per la valutazione della sicurezza dei dispositivi IoT, adattate a un contesto didattico.

---

## Personalizzazione dell'Esperienza Didattica

L'autore dell'esercizio ha il controllo completo sull'esperienza didattica attraverso l'interfaccia `/settings`:

### Livello di difficolta'

- **Principiante**: pochi obiettivi per step, hint dettagliati, `availableTools` limitati allo strumento necessario.
- **Intermedio**: piu' obiettivi, hint generici, tutti gli strumenti disponibili.
- **Avanzato**: obiettivi complessi con condizioni multiple (`pinLogic: 'AND'`), hint criptici, strumenti custom.

### Copertura tematica

L'autore sceglie quali fasi includere nell'esercizio:

- Solo ispezione visiva → step con obiettivi `component`
- Analisi completa → step con tutti e cinque i tipi di obiettivo
- Focus terminale → step con obiettivi `terminal` e filesystem virtuale ricco

### Scenari multipli

Grazie al **sistema di preset**, l'autore puo' preparare configurazioni diverse per gruppi di studenti o sessioni di laboratorio:

```
Preset "Lab 1 - Introduzione"   → Solo component + pin
Preset "Lab 2 - UART"           → Component + pin + uart
Preset "Lab 3 - Completo"       → Tutti i tipi di obiettivo
Preset "Esame finale"           → Hint minimali, tutti gli strumenti
```

---

## Considerazioni sulla Valutazione

PCB-CTF fornisce all'autore indicatori impliciti di completamento:

- **Flag per step**: ogni step ha una `expectedFlag` che lo studente deve inserire correttamente.
- **Progressione sequenziale**: lo studente non puo' saltare step o obiettivi.
- **Tempo di completamento**: sebbene non tracciato automaticamente, l'autore puo' osservare il progresso durante la sessione di laboratorio.

Il sistema attuale non include:
- Logging delle azioni dello studente
- Score basato su tempo o tentativi
- Confronto tra studenti (leaderboard)

Questi aspetti sono volutamente assenti per mantenere il focus sull'apprendimento piuttosto che sulla competizione, ma rappresentano possibili estensioni future.
