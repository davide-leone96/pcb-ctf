# Scelte Architetturali e Decisioni Progettuali

## Panoramica

Questo documento raccoglie le principali decisioni architetturali prese durante la progettazione e lo sviluppo di PCB-CTF, spiegando il contesto, le alternative considerate e le motivazioni che hanno guidato ogni scelta.

---

## 1. Simulazione Client-Side Pura (Nessun Backend Reale)

### Decisione

L'intero sistema terminale — comandi, filesystem, boot sequence, flag unlock — e' simulato interamente nel browser. Non viene mai eseguito un vero processo shell o una connessione di rete reale.

### Motivazione

- **Sicurezza**: una piattaforma educativa CTF non puo' esporre una shell reale agli studenti. Ogni interazione e' confinata nel browser.
- **Riproducibilita'**: ogni studente vede esattamente lo stesso output per gli stessi comandi. Non ci sono variazioni dovute all'ambiente di esecuzione.
- **Portabilita'**: non servono container Docker, VM o ambienti Linux. L'applicazione gira su qualsiasi sistema con un browser moderno.
- **Controllo totale**: l'autore dell'esercizio decide esattamente quali comandi esistono, quale output producono, e quali flag sbloccano. Non ci sono comportamenti inattesi.

### Alternative scartate

- **Container Docker con shell reale**: complessita' infrastrutturale elevata, rischi di sicurezza, impossibilita' di controllare precisamente l'output.
- **WebSocket a un backend che esegue comandi**: latenza di rete, necessita' di sandboxing, scalabilita' limitata dal numero di connessioni.

### Conseguenze

- L'output di ogni comando deve essere definito dichiarativamente nella configurazione.
- I comandi builtin (`ls`, `cd`, `cat`, ecc.) sono reimplementati in JavaScript puro.
- Il filesystem e' una struttura dati in memoria, non un vero filesystem.

---

## 2. Architettura Full-Stack Monolitica (Next.js)

### Decisione

Frontend e backend risiedono nello stesso progetto Next.js. Le API routes sono co-locate con i componenti React.

### Motivazione

- **Semplicita' di deployment**: un singolo processo Node.js serve sia il frontend sia le API. Non servono reverse proxy, CORS configuration o deployment multipli.
- **Sviluppo rapido**: una modifica al tipo `Exercise` si propaga automaticamente sia ai componenti UI sia alle API routes, garantendo coerenza.
- **Standalone output**: `next build` produce un bundle autonomo che include server e frontend, deployabile come singolo container.

### Alternative scartate

- **Frontend separato (Vite/CRA) + API separata (Express)**: duplicazione dei tipi, complessita' di deployment, necessita' di gestire CORS.
- **Backend-as-a-Service (Firebase, Supabase)**: dipendenza da servizi esterni, costi, complessita' per un'applicazione che richiede solo persistenza locale su file.

### Conseguenze

- Le API routes usano il filesystem locale (`src/data/`) per la persistenza, non un database.
- Il deploy richiede un singolo processo Node.js con accesso in scrittura alla cartella `src/data/` e `public/`.

---

## 3. Persistenza su Filesystem (Nessun Database)

### Decisione

Le configurazioni degli esercizi, le configurazioni terminale e i preset sono salvati come file JSON su disco (`src/data/`). Non viene utilizzato alcun database.

### Motivazione

- **Semplicita'**: nessuna dipendenza esterna (MySQL, PostgreSQL, MongoDB). L'applicazione e' self-contained.
- **Portabilita'**: i file JSON sono leggibili, versionabili con Git, e trasferibili tra ambienti semplicemente copiando la cartella.
- **Caso d'uso**: PCB-CTF e' tipicamente usato in contesti educativi con un singolo autore e pochi studenti contemporanei. Non servono le garanzie di concorrenza di un database relazionale.
- **Debugging**: l'autore puo' ispezionare e modificare manualmente i file JSON in caso di necessita'.

### Layout dei file

```
src/data/
  exercise.override.json         # Configurazione esercizio corrente
  presets/
    index.json                   # Registro dei preset disponibili
    {preset-id}.json             # Bundle completo (Exercise + TerminalConfig)
public/
  images/                        # Immagini PCB e custom tools caricate
  uploads/                       # File firmware caricati
```

### Alternative scartate

- **SQLite**: avrebbe offerto query strutturate ma aggiunto complessita' (ORM, migrations) senza benefici reali per dati essenzialmente documenti JSON.
- **localStorage only**: non persisterebbe tra dispositivi o sessioni del server. Usato solo come cache lato client.

### Conseguenze

- Non c'e' supporto nativo per accesso concorrente in scrittura (accettabile per il caso d'uso single-author).
- Il backup consiste nel copiare la cartella `src/data/`.

---

## 4. Store Indipendenti senza Root Reducer

### Decisione

Lo stato globale e' distribuito in quattro store Zustand indipendenti (`exerciseStore`, `settingsStore`, `terminalSettingsStore`, `presetStore`) senza un reducer centralizzato.

### Motivazione

- **Separazione per dominio**: ogni store gestisce un ambito ben definito. Lo store del simulatore non conosce lo stato dell'editor settings e viceversa.
- **Evoluzione indipendente**: aggiungere un campo allo store settings non impatta lo store exercise.
- **Performance**: ogni componente sottoscrive solo i campi necessari. Un cambio nel `terminalSettingsStore` non causa re-render nei componenti che usano solo `exerciseStore`.
- **Semplicita'**: nessun boilerplate di actions/reducers/slices. Ogni store e' una singola chiamata a `create()`.

### Coordinazione cross-store

La coordinazione avviene tramite tre meccanismi:

1. **Zustand subscriptions** — `presetStore` sottoscrive `settingsStore` e `terminalSettingsStore` per il dirty tracking.
2. **localStorage events** — il simulatore ascolta `StorageEvent` per ricaricare la configurazione quando l'autore salva in `/settings`.
3. **Lettura diretta** — `presetStore.captureCurrentConfig()` chiama `getState()` sugli altri store per catturare uno snapshot.

### Alternative scartate

- **Redux con root reducer**: avrebbe centralizzato lo stato ma introdotto boilerplate significativo (slices, action creators, selectors, middleware).
- **React Context**: inadeguato per stato complesso e frequentemente mutato — causerebbe re-render a cascata su tutto il subtree.

---

## 5. Coordinate Normalizzate (0-100) per la PCB

### Decisione

Tutte le posizioni di componenti, pin e overlay sulla PCB sono espresse come percentuali (0-100) del container, non come pixel assoluti. Il formato e' `[x, y, width, height]` nel campo `coords`.

### Motivazione

- **Indipendenza dalla risoluzione**: la stessa configurazione funziona con immagini PCB di qualsiasi dimensione.
- **Responsive**: al ridimensionamento della finestra, le posizioni si adattano automaticamente.
- **Riutilizzabilita'**: un esercizio configurato su un monitor 1920x1080 funziona identicamente su un laptop 1366x768.
- **Semplicita' concettuale**: "il pin e' al 25% da sinistra e al 50% dall'alto" e' piu' intuitivo di "il pin e' a 375px da sinistra".

### Conversione a pixel

```typescript
// In PCBViewer.tsx
const pixelX = (component.coords[0] / 100) * containerWidth;
const pixelY = (component.coords[1] / 100) * containerHeight;
const pixelW = (component.coords[2] / 100) * containerWidth;
const pixelH = (component.coords[3] / 100) * containerHeight;
```

### Alternative scartate

- **Pixel assoluti**: legati alla risoluzione dell'immagine originale. Cambiare immagine richiederebbe ricalcolare tutte le posizioni.
- **Coordinate relative all'immagine**: simile alle percentuali ma meno standardizzato.

---

## 6. Pipeline Sincrona del Terminale

### Decisione

L'intera pipeline di esecuzione dei comandi terminale — parsing, validazione constraint, esecuzione handler, applicazione side effects — e' completamente sincrona. Non ci sono `Promise`, `async/await` o callback.

### Motivazione

- **Determinismo**: ogni comando produce il suo output immediatamente, senza race condition o stati intermedi.
- **Semplicita' di debug**: lo stack trace e' lineare. Un breakpoint nel `validateConstraints()` mostra esattamente il flusso.
- **Coerenza con React**: gli aggiornamenti di stato (`set()`) in Zustand sono sincroni. Una pipeline sincrona garantisce che lo stato sia consistente dopo ogni comando.
- **Nessuna necessita' di async**: non ci sono operazioni I/O reali (network, filesystem) — tutto e' in memoria.

### Pipeline

```
Input → parse → findCommand → validateConstraints → executeHandler → applySideEffects → output
```

### Conseguenze

- I comandi non possono simulare operazioni asincrone nativamente. Il "delay" della boot sequence e' gestito esternamente in `Terminal.tsx` tramite `setInterval`/`setTimeout`, non nella pipeline di esecuzione.

---

## 7. Persistenza dello Stato Terminale tramite Variabili di Modulo

### Decisione

Lo stato delle sessioni terminale (cronologia output, directory corrente, history comandi) e' mantenuto in variabili JavaScript a livello di modulo (`let persistedUartHistory`, ecc.), non in uno store Zustand ne' in `useState`.

### Motivazione

Il `Terminal.tsx` viene smontato quando l'utente seleziona un altro strumento (multimetro, sonde UART, ecc.) e rimontato quando torna al terminale. Con `useState`, lo stato andrebbe perso ad ogni smontaggio. Con Zustand, lo stato sarebbe globale e potenzialmente interferente.

Le variabili di modulo sopravvivono ai cicli mount/unmount di React perche' risiedono nello scope del modulo ES, non nel componente. Sono sincronizzate con lo stato React tramite `useEffect`:

```typescript
let persistedUartHistory: HistoryLine[] | null = null;

useEffect(() => {
  persistedUartHistory = uartHistory;
}, [uartHistory]);
```

### Alternative scartate

- **Zustand store dedicato**: avrebbe funzionato ma aggiunto un quinto store solo per dati UI transitori.
- **`useRef` persistente**: non sopravvive al completo unmount del componente.
- **Rendering condizionale con `display: none`**: avrebbe mantenuto lo stato ma tenuto in memoria componenti non visibili, peggiorando le performance.

---

## 8. Configurazione Dichiarativa del Terminale (JSON)

### Decisione

Ogni comportamento del terminale — comandi, output, vincoli, side effects, filesystem, boot sequence — e' definito in un oggetto JSON (`TerminalConfig`) interpretato a runtime. Non c'e' codice imperativo specifico per esercizio.

### Motivazione

- **Separazione contenuto/logica**: l'autore dell'esercizio non deve scrivere codice. Configura tutto tramite l'interfaccia `/settings` o modificando il JSON direttamente.
- **Portabilita'**: un esercizio e' un file JSON. Puo' essere condiviso, versionato, e importato in un'altra istanza di PCB-CTF.
- **Validazione**: il `TerminalConfigLoader` valida la struttura al caricamento, segnalando errori di configurazione prima che lo studente li incontri.
- **Preset system**: i preset raggruppano Exercise + TerminalConfig in un unico bundle JSON, rendendo triviale salvare e caricare configurazioni complete.

### Struttura della configurazione

```
TerminalConfig
  ├── metadata (nome, versione, descrizione)
  ├── tabs[] (UART Console, Local Machine)
  │   ├── commands[] (CommandDefinition)
  │   ├── filesystem (tree → directories + files)
  │   ├── bootSequence (stages[])
  │   └── defaultConstraints
  ├── flags (FlagSystem)
  ├── globalCommands[]
  └── customFunctions
```

---

## 9. Cinque Tipi di Obiettivo Distinti

### Decisione

Gli obiettivi dell'esercizio sono classificati in cinque tipi (`ObjectiveType`), ciascuno con una logica di completamento specifica:

| Tipo | Logica di completamento |
|------|------------------------|
| `component` | Lo studente clicca sul componente corretto nella PCB |
| `pin` | Lo studente collega le sonde del multimetro ai pin corretti (con logica AND/OR) |
| `uart` | Lo studente collega correttamente TX, RX e GND dell'adattatore UART |
| `terminal` | Lo studente scopre tutti i flag richiesti tramite comandi nel terminale |
| `firmware-dump` | Lo studente completa un'estrazione firmware tramite custom tool |

### Motivazione

La tassonomia riflette le fasi tipiche di un penetration test hardware:

1. **Ispezione visiva** → `component` (identificare chip, connettori, punti di test)
2. **Analisi elettrica** → `pin` (misurare tensioni, resistenze)
3. **Connessione fisica** → `uart` (collegare l'adattatore seriale)
4. **Analisi software** → `terminal` (esplorare il filesystem, estrarre informazioni)
5. **Estrazione firmware** → `firmware-dump` (dump della flash via SPI/JTAG)

Ogni tipo e' gestito da una funzione specifica nell'`exerciseStore`:
- `selectComponent()` per `component`
- `_checkPinConditions()` per `pin`
- `hookUartProbe()` per `uart`
- `addTerminalDiscovery()` per `terminal`
- `completeFirmwareDump()` per `firmware-dump`

---

## 10. Separazione Simulator / Settings

### Decisione

L'applicazione ha due modalita' completamente separate, accessibili da route diverse:

- `/` — **Simulator**: l'ambiente dello studente
- `/settings` — **Settings**: l'ambiente dell'autore

### Motivazione

- **Ruoli distinti**: lo studente non deve vedere ne' poter accedere agli strumenti di configurazione. L'autore ha bisogno di un'interfaccia completamente diversa (canvas drag-and-drop, editor YAML, preview terminale).
- **Store separati**: il Simulator usa `exerciseStore` (runtime), Settings usa `settingsStore` + `terminalSettingsStore` (editing). Non condividono stato in modo diretto.
- **Comunicazione asincrona**: le modifiche dell'autore raggiungono il simulatore solo dopo il salvataggio (tramite API + localStorage event), non in tempo reale.

### Comunicazione tra le due modalita'

```
Settings → POST /api/config/save → filesystem
Settings → localStorage.setItem('pcb-ctf-terminal-config', ...)
           ↓ StorageEvent
Simulator ← useTerminalConfig() ascolta e ricarica
```

---

## 11. Custom Tools come First-Class Feature

### Decisione

Gli strumenti personalizzati (`CustomTool`) hanno lo stesso livello di integrazione degli strumenti builtin (multimetro, sonde UART, lente). Appaiono nella sidebar, supportano probe con snap ai pin, e possono avere obiettivi dedicati (`firmware-dump`).

### Motivazione

- **Estensibilita'**: gli scenari CTF hardware reali usano strumenti diversi (analizzatori logici, programmatori flash, bus pirate). L'autore deve poter simulare qualsiasi strumento.
- **Coerenza UX**: un custom tool si comporta come un tool builtin — probe draggabili, connessione ai pin, letture visualizzate nell'header.
- **Integrazione con obiettivi**: il tipo `firmware-dump` permette di creare esercizi che richiedono l'uso di un tool specifico con le connessioni corrette.

### Tipi di output supportati

| OutputType | Descrizione |
|-----------|-------------|
| `none` | Nessun output (tool puramente visuale) |
| `numeric` | Lettura numerica (es. tensione, resistenza) |
| `leds` | Indicatori LED (es. attivita' bus) |
| `connection-status` | Stato della connessione |
| `firmware-dump` | Estrazione firmware con progress bar |

---

## 12. Struttura Componenti per Feature

### Decisione

I componenti React sono organizzati per feature (`features/exercise/`, `features/settings/`), non per tipo (`buttons/`, `modals/`, `forms/`).

### Motivazione

- **Colocazione**: tutti i componenti relativi al simulatore sono nella stessa cartella. Aggiungere un nuovo strumento richiede di lavorare in una sola directory.
- **Navigabilita'**: trovare il componente del multimetro significa cercare in `features/exercise/Multimeter.tsx`, non in `tools/Multimeter.tsx` + `modals/MultimeterModal.tsx` + `panels/MultimeterPanel.tsx`.
- **Isolamento**: i componenti settings non importano mai dai componenti exercise e viceversa. La separazione fisica rinforza la separazione logica.

### Struttura

```
src/components/
  features/
    exercise/         # Componenti simulatore (studente)
      PCBViewer.tsx
      Terminal.tsx
      Multimeter.tsx
      CustomToolRenderer.tsx
      ...
    settings/         # Componenti authoring (autore)
      SettingsSidebar.tsx
      SettingsCanvas.tsx
      TerminalSettingsPanel.tsx
      CustomToolsPanel.tsx
      ...
  layout/             # Componenti strutturali condivisi
    Sidebar.tsx
  ui/                 # Primitive Radix UI stilizzate
    button.tsx
    dialog.tsx
    tooltip.tsx
```

---

## Riepilogo Decisioni

| # | Decisione | Motivazione principale |
|---|-----------|----------------------|
| 1 | Simulazione client-side pura | Sicurezza e riproducibilita' |
| 2 | Next.js monolitico | Semplicita' di deployment |
| 3 | Persistenza su filesystem | Zero dipendenze esterne |
| 4 | Store Zustand indipendenti | Separazione per dominio |
| 5 | Coordinate normalizzate 0-100 | Indipendenza dalla risoluzione |
| 6 | Pipeline sincrona | Determinismo e semplicita' |
| 7 | Variabili di modulo per stato terminale | Persistenza tra mount/unmount |
| 8 | Configurazione dichiarativa JSON | Separazione contenuto/logica |
| 9 | Cinque tipi di obiettivo | Riflette le fasi di un pentest hardware |
| 10 | Separazione Simulator/Settings | Ruoli distinti studente/autore |
| 11 | Custom tools first-class | Estensibilita' degli scenari |
| 12 | Componenti organizzati per feature | Colocazione e navigabilita' |
