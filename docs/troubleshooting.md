# Troubleshooting & FAQ

## Problemi Comuni

### Simulator non carica

**Sintomo**: Pagina bianca, errori console

**Cause Possibili**:
1. Dependencies non installate → `npm install`
2. Porta 3000 occupata → `npm run dev` usa porta diversa
3. Errore compilazione → controlla console per errori TypeScript

**Soluzione**:
```bash
npm install
npm run dev
```

---

### Terminale non risponde ai comandi

**Sintomo**: Digito comando ma niente accade

**Cause Possibili**:
1. Terminal config non caricata
2. Boot sequence non finita
3. Comando non definito nella config

**Soluzione**:
1. Aspetta fine boot sequence
2. Controlla che il comando sia definito in `/settings` → Terminal tab
3. Ricarica pagina (F5)

---

### Flag non si sbloccano

**Sintomo**: Eseguo comando corretto ma niente

**Cause Possibili**:
1. Comando esatto non corrisponde → maiuscole/minuscole
2. Prerequisiti non completati
3. Flag non collegato al comando

**Soluzione**:
1. Leggi attentamente il comando richiesto
2. Verifica che tutti i prerequisiti siano completati
3. Nel tab Terminal di `/settings`, verifica che il comando abbia `unlockFlags`

---

### PCB non mostra componenti

**Sintomo**: Canvas vuoto, niente componenti visibili

**Cause Possibili**:
1. Immagine PCB non caricata
2. Componenti fuori dalle coordinate normalizzate (0-100)
3. Zoom canvas troppo piccoloin

**Soluzione**:
1. Nel tab Init di `/settings`, carica immagine PCB
2. Aggiungi componenti e posizionali (0-100 range)
3. Usa zoom button per visualizzare meglio

---

### Preset non salva

**Sintomo**: Clicco save ma niente accade

**Cause Possibili**:
1. Nessuna modifica da salvare
2. Errore API `/api/presets/*`
3. Browser storage disabilitato

**Soluzione**:
1. Assicurati di aver fatto modifiche (asterisco * accanto nome)
2. Controlla console browser per errori
3. Attiva localStorage nelle impostazioni browser

---

## FAQ

### Come resetto l'esercizio?

Ricarica la pagina (F5) o chiudi il browser.

### Come posso testare il mio esercizio?

1. Salva in Settings (`/settings`)
2. Vai al Simulator (`/`)
3. Interagisci con il tuo esercizio
4. Se ci sono errori, torna a Settings e correggi

### Posso usare caratteri speciali nei flag?

Sì, ma evita caratteri che causano problemi JSON (", \, etc). Usa escape: `\"quote\"`

### Come aggiungo un timeout a un comando?

Non è supportato direttamente (tutto è sincrono). Usa boot stages per simulare delayed output.

### Posso avere comandi con output dinamico?

Sì, usa handler `"dynamic"` o `"script"` nella terminal config.

### Come rievailo i dati di localStorage?

```javascript
// Console browser (F12):
localStorage.getItem('pcb-ctf-terminal-settings-draft')
localStorage.clear()  // cancella tutto
```

### Cosa significa "dirty" accanto al preset?

Significa che hai fatto modifiche non salvate. Clicca "Save" per salvare.

### Come condivido un esercizio?

1. In Settings, clicca "Export Preset"
2. Scarica file JSON
3. Condividi il file
4. L'altro autore clicca "Import Preset" e carica il file

