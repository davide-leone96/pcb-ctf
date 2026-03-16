# UART Probes

## Panoramica

Le **UART Probes** simulano l'adattatore USB-UART fisico usato nei CTF hardware reali per collegarsi alla console seriale di un dispositivo embedded. Il pannello dell'adattatore espone tre pin — TX, RX, GND — che devono essere collegati ai corrispondenti pin UART sulla PCB.

Una volta che le tre connessioni sono corrette e complete, il flag `uartConnected = true` viene impostato nell'`exerciseStore` e l'obiettivo di tipo `uart` corrente viene automaticamente completato.

---

## Struttura dell'Adattatore

L'adattatore UART virtuale ha tre pin:

| Pin Adattatore | Tipo | Connessione Corretta |
|---------------|------|----------------------|
| `adapter-tx` | Trasmissione adattatore | → pin PCB con `role: 'rx'` |
| `adapter-rx` | Ricezione adattatore | → pin PCB con `role: 'tx'` |
| `adapter-gnd` | Massa | → pin PCB con `role: 'gnd'` |

**La connessione è incrociata** (come nel protocollo seriale reale): TX dell'adattatore va sul RX del dispositivo e viceversa.

Lo stato delle connessioni è mantenuto nell'`exerciseStore`:

```typescript
uartConnections: Array<{ adapterPin: AdapterPin; pcbPinId: string | null }>;
// Stato iniziale:
[
  { adapterPin: 'adapter-tx',  pcbPinId: null },
  { adapterPin: 'adapter-rx',  pcbPinId: null },
  { adapterPin: 'adapter-gnd', pcbPinId: null },
]

activeAdapterPin: 'adapter-tx' | 'adapter-rx' | 'adapter-gnd' | null;
uartSnapTarget: string | null;
uartConnected: boolean;
```

---

## Workflow di Utilizzo

### 1. Selezione dello Strumento

Clic sull'icona UART Probes nella sidebar. Chiama `setActiveTool('probes')`, che resetta `activeAdapterPin` e `uartSnapTarget` ma **mantiene** le connessioni già effettuate.

### 2. Selezione del Pin Adattatore

Clic su uno dei tre pin dell'adattatore (TX, RX, GND). Chiama `selectAdapterPin(pin)`:

- Se il pin è già attivo → viene deselezionato
- Se il pin era già connesso a un PCB pin → viene prima disconnesso
- Il pin diventa `activeAdapterPin`

### 3. Connessione al Pin PCB

Con un pin adattatore attivo, avvicinarsi a un pin UART sulla PCB mostra lo snap target. Il clic chiama `hookUartProbe()`:

```typescript
hookUartProbe: () => {
  // Impedisce di collegare due adapter pin allo stesso PCB pin
  const alreadyUsed = uartConnections.find(
    c => c.pcbPinId === uartSnapTarget && c.adapterPin !== activeAdapterPin
  );
  if (alreadyUsed) return;

  // Aggiorna le connessioni
  const updated = uartConnections.map(c =>
    c.adapterPin === activeAdapterPin ? { ...c, pcbPinId: uartSnapTarget } : c
  );

  // Verifica se tutte le connessioni sono corrette
  const correctMapping = {
    'adapter-tx':  'rx',   // TX adattatore → RX dispositivo
    'adapter-rx':  'tx',   // RX adattatore → TX dispositivo
    'adapter-gnd': 'gnd',  // GND → GND
  };
  const allCorrect = updated.every(conn => {
    if (!conn.pcbPinId) return false;
    const pin = data.uartPins?.find(p => p.id === conn.pcbPinId);
    return pin?.role === correctMapping[conn.adapterPin];
  });

  set({ uartConnections: updated, uartConnected: allCorrect });

  // Se tutte corrette, completa l'objective corrente
  if (allCorrect) {
    if (currentObj?.type === 'uart') {
      get()._completeCurrentObjective();
    }
    // Completa anche obiettivi di tipo 'pin' con condizioni adapter-*
    else if (currentObj?.type === 'pin' && currentObj.pinConditions?.some(
      c => c.terminal?.startsWith('adapter-')
    )) {
      get()._completeCurrentObjective();
    }
  }

  // Verifica sempre le pin conditions dopo ogni hook UART
  get()._checkPinConditions();
}
```

### 4. Verifica del Completamento

La connessione è considerata valida (`uartConnected = true`) solo quando **tutte e tre le sonde** sono connesse ai pin corretti. Una connessione parziale (es. solo TX e RX ma non GND) non è sufficiente.

### 5. Disconnessione

Clic sul cavo di connessione o sul pin adattatore già connesso per scollegarlo. Chiama `unhookUartProbe(adapterPin)`, che riporta il `pcbPinId` corrispondente a `null` e imposta `uartConnected: false`.

---

## Relazione con il Terminal

Le UART Probes e il Terminal sono due strumenti distinti ma correlati:

1. **Le UART Probes** gestiscono la connessione fisica (simulata) al dispositivo
2. **Il Terminal** fornisce l'interfaccia interattiva per comunicare col dispositivo

La tab **UART Console** del Terminal rappresenta la sessione seriale sul dispositivo connesso. La connessione fisica (UART Probes) è concettualmente un prerequisito per l'accesso al terminale, ma a livello implementativo il Terminal può essere usato indipendentemente dalle UART Probes (entrambi sono strumenti nella sidebar, selezionabili separatamente).

---

## Tipo di Obiettivo `uart`

Un objective di tipo `uart` si completa automaticamente quando `hookUartProbe()` verifica che tutte e tre le connessioni siano corrette:

```typescript
if (stepMode === 'active') {
  if (currentObj?.type === 'uart') {
    get()._completeCurrentObjective();
  }
}
```

Non è richiesta nessuna azione aggiuntiva dello studente oltre al corretto collegamento fisico delle tre sonde.

---

## Tipo di Obiettivo `pin` con Condizioni Adattatore

Le pin conditions possono includere anche i pin dell'adattatore UART:

```typescript
interface PinCondition {
  terminal: 'probe1' | 'probe2' | 'adapter-tx' | 'adapter-rx' | 'adapter-gnd';
  pinId: string;
}
```

Questo permette di creare obiettivi misti che richiedono sia le sonde del multimetro che quelle UART collegate a pin specifici.

---

## Coesistenza con la Lente

La lente d'ingrandimento può essere attivata mentre le UART Probes sono attive, ma solo se **tutte e tre le connessioni** sono già effettuate. Se anche solo una è scollegata, l'attivazione della lente forza il cambio a tool `pointer`.

---

## Riferimenti

- **Store**: `src/store/exerciseStore.ts` — `selectAdapterPin()`, `hookUartProbe()`, `unhookUartProbe()`
- **Tipi pin UART**: `src/data/exercise.ts` — `UartPin` (con `role: 'tx' | 'rx' | 'gnd'`)
- **Componente UI**: pannello adattatore nella sidebar degli strumenti
