# Modello di Sicurezza

## Panoramica

PCB-CTF e' una piattaforma educativa progettata per ambienti controllati (laboratori universitari, corsi di formazione). Il modello di sicurezza si basa su un principio fondamentale: **nessuna esecuzione di codice reale**. L'intera simulazione avviene nel browser dello studente, senza connessioni a shell remote, container o macchine virtuali.

Questo documento analizza le proprieta' di sicurezza della piattaforma, le protezioni implementate nelle API routes, e i rischi residui con le relative mitigazioni.

---

## Principio Architetturale: Simulazione Pura

La scelta architetturale piu' rilevante per la sicurezza e' la **simulazione client-side pura** del terminale (documentata in [Design Decisions](./design-decisions.md), decisione #1).

### Cosa non viene mai eseguito

- **Nessuna shell reale**: i comandi digitati dallo studente (`ls`, `cat`, `grep`, ecc.) non invocano mai un processo di sistema operativo. Sono interpretati da funzioni JavaScript pure (`terminal-builtin-handlers.ts`).
- **Nessuna connessione di rete**: la "connessione UART" e' simulata visivamente. Non esiste una connessione seriale o socket reale.
- **Nessun filesystem reale**: il filesystem del terminale e' una struttura dati in memoria (`FilesystemStructure`), completamente isolata dal filesystem del server.
- **Nessun codice arbitrario**: i comandi custom (`handler: 'custom'`) producono output dichiarativo (statico, template, lookup). Le `customFunctions` registrate sono funzioni JavaScript predefinite nel codice sorgente, non codice inserito dall'utente.

### Implicazioni

Uno studente non puo':
- Accedere al filesystem del server
- Eseguire comandi di sistema
- Stabilire connessioni di rete dal terminale simulato
- Effettuare privilege escalation
- Modificare la configurazione dell'esercizio dal simulatore

---

## Sicurezza delle API Routes

Le API routes (`src/app/api/`) sono l'unico punto di contatto tra il client e il filesystem del server. Ogni route e' analizzata di seguito.

### Upload Immagini (`POST /api/images/upload`)

**Protezioni implementate:**

| Protezione | Dettaglio |
|-----------|-----------|
| Whitelist MIME type | Solo `image/jpeg`, `image/png`, `image/webp` accettati |
| Limite dimensione | 20 MB massimo per file |
| Sanitizzazione filename | `filename.replace(/[^a-zA-Z0-9_-]/g, '_')` — rimuove caratteri speciali |
| Prefisso timestamp | `{timestamp}-{sanitized_name}` — previene collisioni |
| Directory fissa | Scrittura solo in `public/images/` |

### Eliminazione Immagini (`DELETE /api/images/delete`)

**Protezioni implementate:**

| Protezione | Dettaglio |
|-----------|-----------|
| Validazione input | Verifica che `imagePath` sia una stringa non vuota |
| Lista protetta | Le immagini di sistema (`pcb.jpg`, `pcb_v1.png`, ecc.) non possono essere eliminate |
| Protezione path traversal | Il path risolto viene verificato: deve iniziare con la directory `public/images/`. Sequenze `../` vengono bloccate |
| ENOENT silenzioso | Se il file non esiste, la risposta e' comunque 200 (idempotente) |

### Upload Firmware (`POST /api/firmware/upload`)

**Protezioni implementate:**

| Protezione | Dettaglio |
|-----------|-----------|
| Limite dimensione | 50 MB massimo per file |
| Sanitizzazione filename | Stessa logica delle immagini |
| Prefisso | `firmware-{timestamp}-{sanitized_name}` |
| Directory fissa | Scrittura solo in `public/uploads/` |

**Nota:** a differenza dell'upload immagini, non viene applicata una whitelist MIME type. Questo e' intenzionale: i file firmware possono avere formati binari arbitrari.

### Configurazione Esercizio (`POST /api/config/save`)

**Protezioni implementate:**

| Protezione | Dettaglio |
|-----------|-----------|
| Path fisso | Scrittura solo su `src/data/exercise.override.json` |
| Formato JSON | Il body viene parsato come JSON — dati non-JSON vengono rifiutati |

### Configurazione Terminale (`POST /api/terminal-config/save`)

**Protezioni implementate:**

| Protezione | Dettaglio |
|-----------|-----------|
| Path fisso | Scrittura solo su `src/data/terminal.override.json` |
| Formato JSON | Il body viene parsato come JSON |

### Preset (`/api/presets/*`)

**Protezioni implementate:**

| Protezione | Dettaglio |
|-----------|-----------|
| Path costruito server-side | `getPresetPath(id)` costruisce il path da `src/data/presets/{id}.json` |
| Immagini protette | `copyImageForPreset()` verifica una lista di immagini di sistema non copiabili |
| Cleanup automatico | L'aggiornamento di un preset elimina la vecchia immagine associata |

---

## Assenza di Autenticazione

PCB-CTF **non implementa alcun meccanismo di autenticazione o autorizzazione**. Le API routes sono accessibili a chiunque possa raggiungere il server.

### Motivazione

La piattaforma e' progettata per ambienti controllati:

- **Laboratorio universitario**: il server e' accessibile solo dalla rete locale del laboratorio.
- **Singola istanza per corso**: ogni corso/esercitazione ha la propria istanza.
- **Autore = amministratore**: chi accede a `/settings` e' implicitamente autorizzato a modificare la configurazione.

### Rischi in ambienti non controllati

Se la piattaforma fosse esposta su Internet senza protezioni aggiuntive:

| Rischio | Impatto | Mitigazione consigliata |
|---------|---------|------------------------|
| Accesso non autorizzato a `/settings` | Un attaccante potrebbe modificare l'esercizio | Reverse proxy con autenticazione (es. nginx + basic auth) |
| Sovrascrittura configurazione via API | Perdita della configurazione corrente | Backup periodico di `src/data/` |
| Upload di file malevoli | File salvati in `public/` accessibili via HTTP | Whitelist MIME type (gia' presente per immagini) |

---

## Superficie di Attacco

### Vettori analizzati

| Vettore | Stato | Note |
|---------|-------|------|
| **Command Injection** | Non applicabile | I comandi del terminale non vengono mai eseguiti come processi di sistema |
| **Path Traversal** | Mitigato | Le API di eliminazione immagini verificano il path risolto. Le API di scrittura usano path fissi |
| **XSS (Cross-Site Scripting)** | Mitigato da React | React esegue l'escape automatico dell'output. L'output del terminale e' renderizzato come testo, non come HTML |
| **SQL Injection** | Non applicabile | Non viene utilizzato alcun database |
| **CSRF** | Rischio basso | Le API sono stesse-origin (Next.js). In assenza di autenticazione, CSRF ha impatto limitato |
| **Denial of Service** | Rischio medio | Nessun rate limiting sulle API. Upload ripetuti potrebbero riempire il disco |
| **File Upload malevolo** | Rischio basso | Le immagini hanno whitelist MIME type. I file firmware non hanno restrizioni di tipo |

### Dati sensibili

PCB-CTF **non gestisce dati sensibili**:

- Nessuna credenziale utente (no login, no password)
- Nessun dato personale degli studenti
- Nessun token API o chiave segreta
- Le "credenziali" nel filesystem virtuale del terminale (es. `root:admin123` in `/etc/passwd`) sono contenuto didattico fittizio

---

## Isolamento dei Dati

### Filesystem del server

Le API routes scrivono solo in due directory:

```
src/data/                    # Configurazioni JSON
  exercise.override.json
  terminal.override.json
  presets/
    index.json
    {id}.json

public/                      # File statici
  images/                    # Immagini caricate
  uploads/                   # File firmware
```

Nessuna API route puo' scrivere al di fuori di queste directory. I path sono costruiti server-side concatenando directory fisse con nomi sanitizzati.

### localStorage del browser

Lo stato lato client e' isolato per dominio (same-origin policy del browser):

```
pcb-ctf-exercise-config          # JSON configurazione esercizio
pcb-ctf-terminal-config          # JSON configurazione terminale
pcb-ctf-terminal-settings-draft  # Draft editor terminale
pcb-ctf-active-preset            # ID preset corrente
```

Questi dati non contengono informazioni sensibili e sono accessibili solo dallo stesso dominio.

---

## Raccomandazioni per il Deployment

Per un deployment in ambiente di produzione o semi-pubblico:

1. **Reverse proxy con autenticazione** — Proteggere `/settings` e le API `/api/*` con basic auth o OAuth tramite nginx/Caddy.
2. **Rate limiting** — Applicare limiti sulle API di upload per prevenire riempimento disco.
3. **Backup automatico** — Schedulare il backup di `src/data/` per prevenire perdita dati accidentale.
4. **HTTPS** — Servire l'applicazione su HTTPS per proteggere i dati in transito.
5. **Read-only per studenti** — Se possibile, servire `/` (simulatore) e `/settings` su porte o path diversi, limitando l'accesso settings solo all'autore.
