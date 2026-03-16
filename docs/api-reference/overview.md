# API Reference — Panoramica

## Architettura API

PCB-CTF usa Next.js App Router con API routes per la persistenza dei dati su file system. Tutti gli endpoint sono sotto `src/app/api/` e seguono la convenzione Next.js Route Handlers.

Non e' richiesta autenticazione — l'app e' progettata per uso locale o in ambienti protetti.

---

## Endpoint Disponibili

| Metodo | Path | Descrizione |
|--------|------|-------------|
| `GET` | `/api/config/load` | Carica configurazione esercizio PCB |
| `POST` | `/api/config/save` | Salva configurazione esercizio PCB |
| `GET` | `/api/terminal-config/load` | Carica configurazione terminale |
| `POST` | `/api/terminal-config/save` | Salva configurazione terminale |
| `GET` | `/api/presets` | Lista tutti i preset |
| `POST` | `/api/presets` | Crea nuovo preset |
| `GET` | `/api/presets/{id}` | Carica preset specifico |
| `PUT` | `/api/presets/{id}` | Aggiorna preset esistente |
| `DELETE` | `/api/presets/{id}` | Elimina preset |
| `POST` | `/api/images/upload` | Carica immagine (multipart) |
| `DELETE` | `/api/images/delete` | Elimina immagine |
| `POST` | `/api/firmware/upload` | Carica file firmware |

---

## File System di Backend

I dati vengono persisti in:

```
src/data/
  exercise.override.json     ← config esercizio PCB salvata
  terminal-config.json       ← config terminale salvata
  presets/
    index.json               ← lista preset
    {id}.json                ← singolo preset

public/
  images/                    ← immagini PCB e tool caricate
  uploads/                   ← file firmware caricati
```

---

## Formato Risposta

Tutte le API restituiscono JSON con HTTP status code appropriati:

- `200 OK` — operazione riuscita
- `400 Bad Request` — payload non valido
- `404 Not Found` — risorsa non trovata
- `500 Internal Server Error` — errore server

---

## Sezioni Dettagliate

- [Config API](./config.md) — salva/carica configurazione PCB
- [Terminal Config API](./terminal-config.md) — salva/carica terminale
- [Presets API](./presets.md) — CRUD preset
- [Images API](./images.md) — upload/delete immagini
- [Firmware API](./firmware.md) — upload firmware
