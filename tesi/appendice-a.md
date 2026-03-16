# Appendice A — Struttura JSON di un esercizio completo

Si riporta di seguito lo schema completo della struttura dati `Exercise`, che rappresenta la configurazione di un esercizio nella piattaforma PCB-CTF. Per ciascun campo viene indicato il tipo, l'obbligatorietà e una descrizione sintetica del ruolo all'interno del sistema.

Lo schema è presentato in formato annotato, dove ogni campo è accompagnato da un commento esplicativo. I valori tra parentesi angolari (`<...>`) indicano il tipo atteso; i campi contrassegnati con `?` sono opzionali.

---

## A.1 Schema dell'esercizio (`Exercise`)

```jsonc
{
  // ── Immagine del PCB ──────────────────────────────────────────────
  "pcbImage": "<string>",
  // Percorso dell'immagine del circuito stampato (relativo a /public).
  // Esempio: "/images/pcb_v2.jpg"

  // ── Flag iniziale ─────────────────────────────────────────────────
  "initialFlag": "<string>",
  // Template della flag visualizzato allo studente prima che inizi a
  // scoprire i frammenti. I caratteri '?' vengono progressivamente
  // sostituiti dai flagPart degli obiettivi completati.
  // Esempio: "flag{????????????????}"

  // ── Step dell'esercizio ───────────────────────────────────────────
  "steps": [
    {
      "id": "<string>",
      // Identificatore univoco dello step.
      // Generato con il pattern: "step-" + timestamp base36 + random.

      "title": "<string>",
      // Titolo dello step, visualizzato nell'intestazione del simulatore.

      "description": "<string>",
      // Testo descrittivo mostrato nella schermata educativa iniziale
      // dello step, prima che lo studente avvii la fase attiva.

      "expectedFlag": "<string>",
      // Flag completa attesa per questo step. Viene confrontata con la
      // concatenazione dei flagPart degli obiettivi per verificare il
      // completamento. Esempio: "flag{CPU-123EPROMDUMP}"

      "availableTools?": ["<Tool>"],
      // Lista degli strumenti disponibili durante lo step.
      // Valori ammessi: "pointer", "magnifier", "multimeter",
      //                 "probes", "firmware-dump".
      // Se omesso, tutti gli strumenti sono disponibili.

      "objectives": [
        {
          "id": "<string>",
          // Identificatore univoco dell'obiettivo.

          "name": "<string>",
          // Nome dell'obiettivo, visualizzato nel pannello laterale
          // e nel tracker di progressione.

          "type?": "<ObjectiveType>",
          // Tipologia dell'obiettivo. Determina il meccanismo di
          // completamento. Valori ammessi:
          //   "component"     — click su un componente del PCB
          //   "pin"           — connessione sonde a pin specifici
          //   "uart"          — connessione UART corretta (crossover)
          //   "terminal"      — scoperta di flag nel terminale
          //   "firmware-dump" — dump firmware SPI completato
          // Se omesso, il tipo è "component" (default implicito).

          "componentId?": "<string>",
          // Per type="component": ID del componente hardware collegato.
          // Il click sull'overlay del componente completa l'obiettivo.

          "instruction": "<string>",
          // Istruzione testuale mostrata allo studente quando
          // l'obiettivo è attivo.

          "hint": "<string>",
          // Suggerimento opzionale, rivelabile dallo studente.

          "flagPart": "<string>",
          // Frammento di flag sbloccato al completamento dell'obiettivo.
          // La concatenazione ordinata dei flagPart di tutti gli
          // obiettivi di uno step deve corrispondere a expectedFlag.

          "coords": ["<number>", "<number>", "<number>", "<number>"],
          // Coordinate normalizzate [x%, y%, width%, height%] dell'area
          // cliccabile sul PCB. Per obiettivi non spaziali (terminal,
          // uart) si usa [0, 0, 0, 0].

          // ── Campi specifici per type="pin" / type="uart" ──────────

          "pinConditions?": [
            {
              "pinId": "<string>",
              // ID del pin sul PCB che deve essere collegato.

              "terminal": "<string>"
              // Identificatore della sonda che deve collegare il pin.
              // Per UART: "adapter-tx", "adapter-rx", "adapter-gnd"
              // Per firmware-dump: "fw-probe:<probeId>"
              // Per multimetro: "probe1", "probe2"
            }
          ],

          "pinLogic?": "<'AND' | 'OR'>",
          // Operatore logico tra le pinConditions.
          // "AND" (default): tutte le condizioni devono essere soddisfatte.
          // "OR": almeno una condizione è sufficiente.

          // ── Campi specifici per type="terminal" ───────────────────

          "bootStageConditions?": [
            {
              "bootStageId": "<string>",
              // ID dello stadio di boot associato (informativo).

              "unlockedFlags": ["<string>"],
              // Lista di ID flag del terminale che devono essere
              // scoperte per completare l'obiettivo. L'obiettivo
              // si completa quando TUTTI i flag elencati sono stati
              // sbloccati tramite i sideEffects dei comandi.

              "hint": "<string>"
              // Suggerimento per lo stadio (informativo).
            }
          ],

          "terminalComponentId?": "<string>",
          // ID del componente terminale da attivare quando questo
          // obiettivo diventa corrente.

          "requiresUart?": "<boolean>",
          // Se true, il terminale non si avvia finché la connessione
          // UART non è stata stabilita.

          "terminalPersistent?": "<boolean>",
          // Se true, il terminale non può essere chiuso dalla toolbar
          // una volta attivato per questo obiettivo.

          // ── Campi specifici per type="firmware-dump" ──────────────

          "customToolId?": "<string>",
          // ID del custom tool di tipo firmware-dump collegato
          // all'obiettivo.

          // ── File allegati all'hint ──────────────────────────────

          "hintFiles?": ["<string>"]
          // Array di percorsi di file scaricabili associati al
          // suggerimento dell'obiettivo. I file vengono caricati
          // dall'autore tramite POST /api/hints/upload e salvati
          // in /public/uploads/hints/ con prefisso timestamp.
          // Esempio: ["/uploads/hints/hint-1772839791936-datasheet.pdf"]
        }
      ]
    }
  ],

  // ── Componenti hardware cliccabili ────────────────────────────────
  "components": [
    {
      "id": "<string>",
      "name": "<string>",
      "instruction": "<string>",
      "hint": "<string>",
      "flagPart": "<string>",
      "coords": ["<number>", "<number>", "<number>", "<number>"]
      // Stessa semantica dell'obiettivo: overlay cliccabile sul PCB
      // con coordinate normalizzate in percentuale.
    }
  ],

  // ── Pin di misura ─────────────────────────────────────────────────
  "pins": [
    {
      "id": "<string>",
      "valueV": "<number>",     // Tensione in Volt letta dal multimetro
      "valueOhm": "<number>",   // Resistenza in Ohm letta dal multimetro
      "coords": ["<number>", "<number>", "<number>", "<number>"]
    }
  ],

  // ── Pin UART ──────────────────────────────────────────────────────
  "uartPins": [
    {
      "id": "<string>",
      "role": "<UartRole>",     // "tx" | "rx" | "gnd" | "vcc"
      "label": "<string>",     // Etichetta visiva, es. "TX (3.3V)"
      "coords": ["<number>", "<number>", "<number>", "<number>"]
    }
  ],

  // ── Pin SPI per firmware dump (opzionale) ─────────────────────────
  "firmwareDumpPins?": [
    {
      "id": "<string>",
      "role": "<SpiRole>",     // "vcc" | "gnd" | "cs" | "clk" | "mosi" | "miso"
      "label": "<string>",
      "coords": ["<number>", "<number>", "<number>", "<number>"]
    }
  ],

  // ── Percorso firmware caricato (opzionale) ────────────────────────
  "firmwarePath?": "<string>",
  // Percorso del file firmware sul server, usato dal firmware dumper
  // built-in. Esempio: "/uploads/firmware-1772839791936-fw_test.bin"

  // ── Gruppi di strumenti (opzionale) ───────────────────────────────
  "toolGroups?": [
    {
      "id": "<string>",
      "name": "<string>",
      "toolIds": ["<string>"]
      // ID degli strumenti che possono essere attivi contemporaneamente.
      // Gli strumenti nello stesso gruppo coesistono; strumenti non in
      // alcun gruppo sono mutuamente esclusivi.
    }
  ],

  // ── Configurazione strumenti built-in (opzionale) ─────────────────
  "toolConfig?": {

    "magnifier?": {
      "defaultRadius": "<number>",      // Raggio in pixel della lente
      "defaultZoomLevel": "<number>"    // Fattore di zoom (es. 2.4)
    },

    "uartConnector?": {
      "persistAfterConnection": "<boolean>",
      // Se true, il connettore resta visibile dopo la connessione.

      "visibleInSteps": ["<string>"],
      // ID degli step in cui il connettore resta visibile.

      "terminalComponentId?": "<string>",
      // Terminale da avviare automaticamente dopo connessione UART.

      "terminalDefaultTab?": "<string>"
      // Tab del terminale da attivare (es. "uart").
    },

    "terminal?": {
      "requiresUart": "<boolean>",
      "persistent": "<boolean>",
      "bootStageConditions": [
        {
          "bootStageId": "<string>",
          "unlockedFlags": ["<string>"],
          "hint": "<string>"
        }
      ]
    },

    "firmwareDump?": {
      "probes": [
        {
          "id": "<string>",
          "role": "<SpiRole>",      // "vcc" | "gnd" | "cs" | "clk" | "mosi" | "miso"
          "label": "<string>",
          "color": "<string>"       // Colore hex del filo nel simulatore
        }
      ],
      "requiredConnections?": [
        { "probeId": "<string>", "pinId": "<string>" }
      ],
      // Mapping esplicito sonda→pin. Deprecato: la validazione
      // avviene ora per ruolo (probe.role == pin.role).

      "filePath": "<string>",          // Percorso del file firmware
      "fileName": "<string>",          // Nome file mostrato nel download
      "dumpDurationSec": "<number>",   // Durata progress bar in secondi

      "terminalComponentId?": "<string>",
      // Terminale da avviare dopo il completamento del dump.

      "terminalDefaultTab?": "<string>"
    }
  },

  // ── Dialogo di completamento (opzionale) ──────────────────────────
  "completionDialog?": {
    "title": "<string>",
    "description": "<string>",

    "redirectUrl": "<string>",          // URL per pulsante di redirect
    "redirectLabel": "<string>",        // Etichetta del pulsante

    "downloadFilePath": "<string>",     // Percorso file scaricabile
    "downloadLabel": "<string>",        // Etichetta pulsante download
    "downloadFileName": "<string>",     // Nome file per l'utente

    "showCopyFlag": "<boolean>"         // Mostra pulsante copia flag
  }
}
```


## A.2 Tipi enumerati

Per completezza, si riportano i tipi enumerati utilizzati nello schema.

### ObjectiveType

| Valore | Descrizione |
|---|---|
| `component` | Completamento tramite click su un componente del PCB |
| `pin` | Completamento tramite connessione di sonde a pin specifici |
| `uart` | Completamento tramite connessione UART corretta (crossover TX/RX) |
| `terminal` | Completamento tramite scoperta di flag nel terminale simulato |
| `firmware-dump` | Completamento tramite dump firmware SPI |

### Tool

| Valore | Descrizione |
|---|---|
| `pointer` | Cursore standard per interazione con il PCB |
| `magnifier` | Lente di ingrandimento per ispezione visiva |
| `multimeter` | Multimetro digitale (tensione e resistenza) |
| `probes` | Adattatore UART (TX, RX, GND) |
| `firmware-dump` | Programmatore SPI per estrazione firmware |

### UartRole

| Valore | Tensione tipica | Resistenza tipica |
|---|---|---|
| `tx` | 3.3 V | 50 Ω |
| `rx` | 3.3 V | 10 kΩ |
| `gnd` | 0 V | 0 Ω |
| `vcc` | 5.0 V | 0 Ω |

### SpiRole

| Valore | Descrizione | Colore nel simulatore |
|---|---|---|
| `vcc` | Alimentazione | `#EF4444` (rosso) |
| `gnd` | Massa | `#6B7280` (grigio) |
| `cs` | Chip Select | `#A855F7` (viola) |
| `clk` | Clock | `#3B82F6` (blu) |
| `mosi` | Master Out, Slave In | `#F59E0B` (ambra) |
| `miso` | Master In, Slave Out | `#10B981` (verde) |


## A.3 Sistema di coordinate

Tutte le coordinate nel JSON dell'esercizio utilizzano il **sistema normalizzato a percentuale** descritto nel Capitolo 3 (§3.3.3). Il formato è un array di quattro numeri:

```
[x%, y%, width%, height%]
```

dove `x%` e `y%` rappresentano la posizione dell'angolo superiore sinistro dell'area rispetto alle dimensioni del contenitore, e `width%` e `height%` ne definiscono le dimensioni. La conversione in pixel avviene a runtime nel componente `PCBViewer` in base alle dimensioni effettive del contenitore.

Per obiettivi non spaziali (tipo `terminal`, `uart`), le coordinate sono convenzionalmente impostate a `[0, 0, 0, 0]`.


## A.4 Esempio completo

Si riporta un estratto semplificato della configurazione dell'esercizio del caso di studio (Capitolo 5), con due step: identificazione dei componenti e connessione UART.

```json
{
  "pcbImage": "/images/preset-ctf-1.png",
  "initialFlag": "flag{????????????????}",
  "steps": [
    {
      "id": "step-1",
      "title": "Hardware Analysis",
      "description": "Identificare i componenti principali sulla board...",
      "expectedFlag": "flag{CPU-123EPROMDUMP}",
      "availableTools": ["pointer", "magnifier", "multimeter", "firmware-dump"],
      "objectives": [
        {
          "id": "obj-cpu",
          "name": "CPU",
          "type": "component",
          "componentId": "comp-cpu",
          "instruction": "Identifica il System-on-Chip QCA953x...",
          "hint": "Ha una forma quadrata, è il chip più grande.",
          "flagPart": "CPU-123",
          "coords": [32.07, 49.91, 10.98, 16.11]
        },
        {
          "id": "obj-eprom",
          "name": "EPROM",
          "type": "component",
          "componentId": "comp-eprom",
          "instruction": "Individua la memoria EPROM...",
          "hint": "Ha una forma rettangolare.",
          "flagPart": "EPROM",
          "coords": [60.43, 51.07, 11.11, 28.24]
        },
        {
          "id": "obj-dump",
          "name": "Firmware Dump",
          "type": "pin",
          "instruction": "Collega le sonde del firmware dumper...",
          "hint": "GND e VCC devono corrispondere ai pin indicati.",
          "flagPart": "DUMP",
          "coords": [0, 0, 0, 0],
          "pinConditions": [
            { "pinId": "pin-m-2", "terminal": "fw-probe:fw-probe-vcc" },
            { "pinId": "pin-m-1", "terminal": "fw-probe:fw-probe-gnd" }
          ],
          "pinLogic": "AND"
        }
      ]
    },
    {
      "id": "step-2",
      "title": "UART Connection",
      "description": "Collegare l'adattatore UART ai pin corretti...",
      "expectedFlag": "flag{PIN-M-1,_PIN-M-2,_PIN-M-3}",
      "availableTools": ["magnifier", "multimeter", "probes"],
      "objectives": [
        {
          "id": "obj-uart",
          "name": "Connessione UART",
          "type": "pin",
          "instruction": "Collega TX→RX, RX→TX, GND→GND...",
          "hint": "Ricorda il crossover.",
          "flagPart": "PIN-M-1,_PIN-M-2,_PIN-M-3",
          "coords": [0, 0, 0, 0],
          "pinConditions": [
            { "pinId": "pin-m-1", "terminal": "adapter-rx" },
            { "pinId": "pin-m-2", "terminal": "adapter-tx" },
            { "pinId": "pin-m-3", "terminal": "adapter-gnd" }
          ],
          "pinLogic": "AND"
        }
      ]
    }
  ],
  "components": [
    {
      "id": "comp-cpu",
      "name": "CPU",
      "instruction": "",
      "hint": "",
      "flagPart": "CPU",
      "coords": [32.07, 49.91, 10.98, 16.11]
    },
    {
      "id": "comp-eprom",
      "name": "EPROM",
      "instruction": "",
      "hint": "",
      "flagPart": "EPROM",
      "coords": [60.43, 51.07, 11.11, 28.24]
    }
  ],
  "pins": [
    { "id": "pin-m-1", "valueV": 3.3, "valueOhm": 89,  "coords": [3.06, 42.93, 2, 2] },
    { "id": "pin-m-2", "valueV": 0,   "valueOhm": 0,   "coords": [2.94, 46.25, 2, 2] },
    { "id": "pin-m-3", "valueV": 0,   "valueOhm": 0,   "coords": [2.94, 50.07, 2, 2] }
  ],
  "uartPins": [],
  "toolConfig": {
    "magnifier": { "defaultRadius": 90, "defaultZoomLevel": 2.4 },
    "uartConnector": {
      "persistAfterConnection": true,
      "visibleInSteps": ["step-2"],
      "terminalComponentId": "tc-terminal-1"
    },
    "firmwareDump": {
      "probes": [
        { "id": "fw-probe-gnd", "role": "gnd", "label": "GND", "color": "#6B7280" },
        { "id": "fw-probe-vcc", "role": "vcc", "label": "VCC", "color": "#EF4444" }
      ],
      "filePath": "/uploads/firmware-fw_test.bin",
      "fileName": "fw_test.bin",
      "dumpDurationSec": 1,
      "terminalComponentId": "tc-terminal-1"
    }
  },
  "completionDialog": {
    "title": "Exercise Completed!",
    "description": "Congratulations, you have successfully completed all objectives.",
    "redirectUrl": "",
    "redirectLabel": "Next Exercise",
    "downloadFilePath": "",
    "downloadLabel": "Download File",
    "downloadFileName": "",
    "showCopyFlag": true
  }
}
```
