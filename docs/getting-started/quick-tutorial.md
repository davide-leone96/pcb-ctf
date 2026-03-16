# Quick Tutorial — Creare il Primo Esercizio (Come Autore)

## Obiettivo

Creare un esercizio minimo funzionante in meno di 15 minuti: una PCB con un componente, un obiettivo di tipo `component`, e un flag.

---

## Passo 1: Aprire Settings

Aprire `http://localhost:3000/settings`.

---

## Passo 2: Caricare l'Immagine PCB

Tab **Init** → "Upload PCB Image":

1. Cliccare il pulsante di upload
2. Selezionare un'immagine PCB (PNG/JPG)
3. Attendere il caricamento

L'immagine appare nel canvas a destra.

---

## Passo 3: Aggiungere un Componente

Tab **Init** → "+ Add Component":

- **Name**: "Main Chip"
- **Instruction**: "Identifica il chip principale sulla PCB"
- **Hint**: "E' il componente piu' grande al centro"
- **Flag Part**: "ch1p"

Il componente appare sul canvas. Trascinarlo sopra il chip principale nell'immagine PCB.

---

## Passo 4: Definire uno Step e un Obiettivo

Tab **Challenge** → "+ Add Step":

- **Title**: "Hardware Identification"
- **Description**: "Identifica i componenti principali della scheda"
- **Available Tools**: selezionare `pointer`, `magnifier`

Nello step creato → "+ Add Objective":

- **Name**: "Find Main Chip"
- **Type**: `component`
- **Component**: selezionare "Main Chip"
- **Instruction**: "Clicca sul chip principale"
- **Hint**: "E' il quadrato nero piu' grande"
- **Flag Part**: `ch1p`

---

## Passo 5: Salvare

Cliccare **Save** nella sidebar. La configurazione viene inviata alle API e salvata.

---

## Passo 6: Testare nel Simulatore

1. Aprire `http://localhost:3000` in un'altra tab
2. Cliccare "Avvia Step"
3. Cliccare sul componente "Main Chip" nella PCB
4. Verificare che il flag `ch1p` si sblocchi nel Flag Panel
5. Inserire la flag `flag{ch1p}` e verificare

---

## Passo 7: Aggiungere il Terminale (Opzionale)

Per aggiungere un obiettivo terminale:

Tab **Terminal** → sezione Flags → "+ Add Flag Part":
- **ID**: "uart"
- **Value**: "_uart"

Sezione Boot Stages → "+ Add Stage":
- **ID**: "shell"
- **Lines**: `["root@device:~# "]`
- **isFinal**: true

Sezione Tabs → seleziona la tab UART → "+ Add Command":
- **Name**: "cat /etc/version"
- **Handler**: custom
- **Output**: `{ "type": "static", "text": "v1.0.0" }`
- **Unlock Flags**: selezionare "uart"

Tab **Challenge** → Aggiungi un secondo step con obiettivo `terminal`:
- **Boot Stage Conditions**: `[{ bootStageId: "shell", unlockedFlags: ["uart"] }]`
- **Flag Part**: `_uart`

Salvare e applicare la terminal config.

---

## Riassunto

In 7 passi hai creato:
- Una PCB con immagine e componente interattivo
- Uno step con obiettivo di tipo `component`
- Un flag che si sblocca al click sul componente

Per esercizi piu' complessi, consulta:
- [Creare un Esercizio](../authoring/exercises.md) — guida completa
- [Use Cases](../use-cases/) — esempi reali di esercizi CTF hardware
