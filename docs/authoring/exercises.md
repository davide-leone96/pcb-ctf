# Creare un Esercizio

## Struttura di un Esercizio

Un esercizio PCB-CTF è la combinazione di tre elementi configurabili indipendentemente:

1. **Configurazione PCB** — componenti, pin, step e obiettivi (tab Init + Challenge)
2. **Configurazione Terminale** — boot sequence, comandi, filesystem, flag (tab Terminal)
3. **Custom Tools** (opzionale) — strumenti aggiuntivi (tab Tools)

I tre elementi vengono poi unificati in un **Preset** che può essere salvato, condiviso e ricaricato.

---

## Fase 1: Configurare la PCB

### 1.1 Caricare l'Immagine

Nella tab **Init**, caricare un'immagine PNG o JPG della PCB reale o sintetica. L'immagine viene salvata in `public/images/` tramite `POST /api/images/upload`.

L'immagine è il riferimento visivo su cui verranno posizionati componenti e pin. Le coordinate di ogni elemento sono espresse in **percentuale** (0-100) rispetto alle dimensioni del contenitore.

### 1.2 Aggiungere Componenti

Ogni `HardwareComponent` rappresenta un chip, resistore, condensatore o altro elemento fisicamente presente sulla PCB. Proprietà editabili:

```typescript
interface DraftComponent {
  id: string;          // generato automaticamente: "comp-6bn8zz"
  name: string;        // "AR9100 SoC", "W25Q64 Flash"
  instruction: string; // testo mostrato allo studente quando l'obiettivo e' attivo
  hint: string;        // suggerimento aggiuntivo
  flagPart: string;    // frammento della flag sbloccato al click
  coords: [x, y, w, h]; // posizione normalizzata sulla PCB
}
```

I componenti possono essere posizionati visivamente trascinandoli sulla canvas o inserendo manualmente i valori di coordinate.

### 1.3 Aggiungere Pin di Misurazione

I pin di misurazione sono i punti che lo studente misura con il multimetro:

```typescript
interface DraftPin {
  id: string;
  pinType: 'custom' | 'tx' | 'rx' | 'gnd' | 'vcc';
  label: string;           // "VCC", "GND", "CLK"
  shape: 'circle' | 'square';
  size: number;
  coords: [x, y];
  voltageMode: 'fixed' | 'range';
  voltageFixed: number;    // es. 5.0 per VCC
  resistanceMode: 'fixed' | 'range';
  resistanceFixed: number; // es. 1000 per un resistore da 1kOhm
}
```

### 1.4 Aggiungere Pin UART

I pin UART sono i punti di connessione per le UART Probes:

```typescript
interface UartPin {
  id: string;
  role: 'tx' | 'rx' | 'gnd' | 'vcc';
  label: string;   // "TX", "RX", "GND"
  coords: [x, y, w, h];
}
```

La validazione UART nel simulatore si basa sul campo `role`: l'adattatore TX deve connettersi a un pin con `role: 'rx'` e viceversa (crossover).

---

## Fase 2: Definire Step e Obiettivi

Nella tab **Challenge**, creare la sequenza di step e obiettivi.

### Step

```typescript
interface DraftStep {
  id: string;
  title: string;        // "Boot Analysis"
  description: string;  // testo educativo, mostrato prima dell'avvio dello step
  availableTools: Tool[]; // ['pointer', 'magnifier', 'multimeter']
  objectives: DraftObjective[];
}
```

Il campo `availableTools` controlla quali strumenti sono selezionabili durante lo step. Se omesso, tutti i tool sono disponibili.

### Obiettivi

```typescript
interface DraftObjective {
  id: string;
  name: string;
  type: ObjectiveType;  // 'component' | 'uart' | 'terminal' | 'pin' | 'firmware-dump'
  componentId: string;  // per type='component': ID del componente target
  customToolId: string; // per type='firmware-dump': ID del custom tool
  pinConditions: PinCondition[];
  pinLogic: 'AND' | 'OR';
  instruction: string;
  hint: string;
  flagPart: string;     // frammento della flag sbloccato al completamento
  coords: [x, y, w, h]; // per type='component': area popup sulla canvas
  bootStageConditions: BootStageCondition[];  // per type='terminal'
}
```

---

## Fase 3: Configurare il Terminale

Nella tab **Terminal**, configurare il sistema terminale. Vedi [Terminal Config](./terminal-config/setup.md) per la documentazione completa.

Elementi essenziali:
- **Flag Parts** — frammenti della flag sbloccabili via comandi
- **Boot Stages** — sequenza di avvio animata
- **Comandi** — risposte a input dell'utente per ciascuna tab
- **Filesystem** — struttura ad albero navigabile

---

## Fase 4: Testare l'Esercizio

1. Salvare la configurazione (pulsante "Save" nella sidebar)
2. Aprire il simulatore: `http://localhost:3000`
3. Verificare il comportamento:
   - Boot sequence corretta?
   - Componenti cliccabili nelle posizioni giuste?
   - Comandi rispondono correttamente?
   - Flag si sbloccano al momento giusto?
   - Flag finale si assembla correttamente?
4. Correggere eventuali discrepanze tornando a `/settings`

---

## Generazione degli ID

Tutti gli ID sono generati con la convenzione:

```typescript
const generateId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
// Esempi: "comp-6bn8zz", "obj-m2p9q", "cmd-abc12"
```

---

## Best Practices

- **Descrizioni chiare**: L'istruzione dell'obiettivo deve indicare esattamente cosa fare.
- **Progressione difficoltà**: Step iniziali semplici (identificare componenti), step avanzati con analisi terminale e custom tools.
- **Comandi realistici**: Usare nomi Linux/U-Boot reali (`printenv`, `cat`, `ls`, `dd`) per un'esperienza educativa autentica.
- **Flag semanticamente significativi**: `b00t`, `r00t`, `h4sh` — il formato leetspeak e' comune nei CTF.
- **Hint progressivi**: Guidare senza svelare completamente la soluzione.
