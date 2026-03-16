# Lente d'Ingrandimento (Magnifier)

## Panoramica

La **Magnifier** è uno strumento di visualizzazione che ingrandisce un'area circolare della PCB, permettendo di leggere etichette dei componenti, numeri di serie, valori di resistori e altri dettagli che sarebbero illeggibili alla scala normale.

La lente è implementata come un overlay circolare con canvas rendering scalato: l'area sotto il cursore (o alla posizione ancorata) viene ri-renderizzata a un livello di zoom superiore all'interno di un cerchio sovrapposto alla PCB.

---

## Parametri della Lente

Lo stato della lente è mantenuto nell'`exerciseStore`:

```typescript
lensRadius: number;         // raggio in pixel (default: 120, range: 50–200)
lensZoomLevel: number;      // fattore di zoom (default: 2.5, range: 1.5–5)
lensVisible: boolean;       // se la lente è attiva
lensIsAnchored: boolean;    // se la posizione è fissa (non segue il mouse)
lensAnchorPosition: { x: number; y: number } | null;  // posizione fissa
```

I range sono forzati dallo store:
- `setLensRadius(r)` → clamp a `[50, 200]`
- `setLensZoomLevel(z)` → clamp a `[1.5, 5]`

---

## Modalità di Utilizzo

### Modalità Mobile (default all'attivazione)

La lente **segue il cursore** del mouse. L'utente sposta il mouse sulla PCB e la lente mostra l'area sotto di esso ingrandita.

### Modalità Ancorata

La lente viene **fissata** a una posizione specificata. L'utente può continuare a usare altri strumenti (es. il multimetro) mentre la lente è ancorata su un'area di interesse.

`toggleLensAnchor()` alterna tra le due modalità:
```typescript
toggleLensAnchor: () => {
  if (lensIsAnchored) {
    set({ lensIsAnchored: false, lensAnchorPosition: null });
  } else {
    set({ lensIsAnchored: true, lensAnchorPosition: mousePosition });
  }
}
```

---

## Attivazione della Lente

La lente si attiva tramite `toggleLensVisible()` dalla sidebar (pulsante magnifier). L'attivazione e' **indipendente dal tool corrente**: la lente puo' essere attivata e disattivata con qualsiasi strumento attivo, senza restrizioni.

```typescript
toggleLensVisible: () => {
  if (lensVisible) {
    set({ lensVisible: false });
  } else {
    const initialPosition = lensAnchorPosition || mousePosition || { x: 400, y: 300 };
    set({
      lensVisible: true,
      lensIsAnchored: true,
      lensAnchorPosition: initialPosition,
      mousePosition: initialPosition,
    });
  }
}
```

---

## Interattivita'

La lente ancorata e' **sempre manipolabile** (draggable) indipendentemente dal tool attivo. Il campo `isLensInteractive` in `PCBViewer.tsx` e' impostato a `true` senza condizioni:

```typescript
const isLensInteractive = true;
```

Questo significa che l'utente puo' trascinare la lente mentre usa il multimetro, le sonde UART, o qualsiasi altro strumento.

---

## Relazione con Altri Strumenti

La magnifier e' un **overlay indipendente** che coesiste con qualsiasi tool attivo:

- Con il **Pointer**: modalita' esplorazione libera, lente mobile per scandire la PCB
- Con il **Multimetro**: lente ancorata su un pin mentre si leggono valori
- Con le **UART Probes**: lente ancorata su un punto mentre si collegano le sonde
- Con il **Terminale**: la lente resta visibile (anche se il viewer mostra il terminale)

La lente non cambia lo strumento attivo: e' un toggle indipendente nella sidebar.

---

## Obiettivi e la Magnifier

La magnifier non è direttamente associata a un `ObjectiveType` specifico. È uno strumento ausiliario: aiuta lo studente a leggere informazioni visive sulla PCB (etichette dei chip, valori dei componenti, numeri di serie) necessarie per completare obiettivi di tipo `component` o per trovare informazioni da inserire nel terminale.

Alcuni esercizi possono richiedere esplicitamente di usare la lente per leggere un'etichetta — ma il completamento dell'obiettivo avviene comunque tramite il click sul componente o tramite il terminale.

---

## Riferimenti

- **Store**: `src/store/exerciseStore.ts` — `toggleLensVisible()`, `toggleLensAnchor()`, `setLensRadius()`, `setLensZoomLevel()`
- **Componente UI**: rendering della lente in `PCBViewer.tsx` con canvas overlay
