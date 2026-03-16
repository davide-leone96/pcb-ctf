# Images API

Gestisce il caricamento e l'eliminazione delle immagini usate nel simulatore (immagini PCB e immagini dei custom tool).

**Directory di storage**: `public/images/`

---

## POST `/api/images/upload`

Carica un'immagine via multipart/form-data.

### Request

```
Content-Type: multipart/form-data

file: <binary image data>
```

### Risposta

```json
HTTP 200
{
  "path": "/images/pcb-upload-1704067200000.jpg",
  "filename": "pcb-upload-1704067200000.jpg"
}
```

Il `path` e' relativo alla directory `public/` ed e' usabile direttamente come `src` HTML o come valore di `Exercise.pcbImage`.

### Formati Supportati

- PNG
- JPG/JPEG
- SVG
- WebP

### Naming Convention

Il server genera automaticamente un nome univoco basato su timestamp per evitare collisioni.

---

## DELETE `/api/images/delete`

Elimina un'immagine dal server.

### Body

```json
{
  "path": "/images/pcb-upload-1704067200000.jpg"
}
```

### Risposta

```json
HTTP 200
{ "success": true }
```

`404` se l'immagine non esiste.

---

## Considerazioni di Sicurezza

- Il server valida che il path sia all'interno di `public/images/` prima di eliminare
- Non e' possibile eliminare file fuori dalla directory images tramite questa API

---

## Riferimenti

- **Routes**: `src/app/api/images/upload/route.ts`, `src/app/api/images/delete/route.ts`
- **Usato da**: `CustomToolsPanel` (upload immagini tool), tab Init di Settings (upload immagine PCB)
