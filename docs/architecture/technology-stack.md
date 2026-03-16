# Stack Tecnologico

## Panoramica

PCB-CTF e' costruito su uno stack JavaScript/TypeScript moderno, orientato alla produttivita' dello sviluppatore e alla semplicita' di deployment. La scelta delle tecnologie riflette tre requisiti fondamentali: (1) un'applicazione web interattiva con rendering lato client, (2) API routes per la persistenza dei dati senza un backend separato, (3) un sistema di componenti UI accessibile e personalizzabile.

---

## Framework e Runtime

### Next.js 15 (App Router)

**Ruolo:** Framework full-stack che unifica frontend React e API backend in un unico progetto.

**Versione:** 15.4.5

Next.js e' stato scelto come framework principale per diversi motivi:

- **App Router**: il routing basato su filesystem (`src/app/`) elimina la necessita' di configurare un router manuale. Le pagine (`/` e `/settings`) e le API routes (`/api/*`) coesistono nello stesso progetto.
- **API Routes**: le route handler (`route.ts`) forniscono endpoint HTTP senza richiedere un server Express o Fastify separato. Questo semplifica l'architettura: un singolo processo Node.js serve sia il frontend che le API di persistenza.
- **Standalone Output**: la configurazione `output: 'standalone'` in `next.config.ts` genera un bundle autonomo deployabile come container Docker o processo Node.js, senza dipendere dalla cartella `node_modules` completa.
- **Server Components**: sebbene PCB-CTF sia prevalentemente un'applicazione client-side, il layout root (`layout.tsx`) e' un Server Component che gestisce il markup HTML iniziale.

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};
```

### Node.js 18+

**Ruolo:** Runtime JavaScript lato server.

Node.js esegue il server Next.js e le API routes. La versione minima 18 e' richiesta per il supporto nativo di `fetch`, `Request`, `Response` e le Web API usate dalle route handler di Next.js 15.

---

## Libreria UI e Rendering

### React 19

**Ruolo:** Libreria di rendering dell'interfaccia utente.

**Versione:** 19.1.0

React 19 e' la versione piu' recente, adottata per:

- **Concurrent rendering**: supporto nativo per transizioni e rendering interrompibile, utile per le animazioni del terminale e il drag-and-drop nel canvas settings.
- **Hooks moderni**: `useCallback`, `useMemo`, `useEffect`, `useRef` sono usati estensivamente per gestire lo stato locale dei componenti complessi (`Terminal.tsx`, `PCBViewer.tsx`, `SettingsCanvas.tsx`).
- **Composizione tramite componenti**: l'architettura a componenti permette di isolare le responsabilita' (un componente per ogni strumento, un componente per ogni popup editor, ecc.).

### Radix UI

**Ruolo:** Primitive UI accessibili e non stilizzate.

**Pacchetti utilizzati:**
- `@radix-ui/react-dialog` — Finestre modali (popup obiettivi, editor comandi, dialoghi di completamento)
- `@radix-ui/react-alert-dialog` — Dialoghi di conferma (eliminazione preset, reset configurazione)
- `@radix-ui/react-tooltip` — Tooltip informativi (bottoni toolbar, stati connessione)
- `@radix-ui/react-slot` — Composizione polimorfica (pattern `asChild` nei bottoni)

Radix UI e' stato scelto rispetto a librerie di componenti complete (Material UI, Ant Design, Chakra UI) per tre motivi:

1. **Accessibilita' integrata**: ogni primitiva gestisce automaticamente focus trapping, keyboard navigation, ARIA attributes e screen reader support.
2. **Zero styling imposto**: i componenti Radix non portano CSS proprio. Questo permette di stilizzarli interamente con Tailwind CSS, mantenendo coerenza visiva.
3. **Composizione**: il pattern `asChild` tramite `Slot` permette di passare le props Radix a qualsiasi elemento figlio, evitando wrapper div inutili.

Esempio di integrazione con Tailwind CSS:

```typescript
// src/components/ui/dialog.tsx
import * as DialogPrimitive from "@radix-ui/react-dialog"

function DialogContent({ className, children, ...props }) {
  return (
    <DialogPrimitive.Content
      className={cn(
        "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out ...",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  )
}
```

### Lucide React

**Ruolo:** Libreria di icone SVG.

**Versione:** 0.536.0

Lucide React fornisce icone vettoriali come componenti React. E' utilizzato in oltre 20 file del progetto per icone di strumenti, azioni, stati e navigazione:

```typescript
import { Monitor, Wifi, Zap, Lightbulb, Download, Upload, Terminal } from 'lucide-react';

// Uso come componente con sizing via className
<Monitor className="h-6 w-6" />
```

Lucide e' stato preferito a Font Awesome e Heroicons per il peso ridotto (tree-shakeable), la coerenza stilistica e la tipizzazione TypeScript nativa (`LucideIcon` type).

---

## State Management

### Zustand 5

**Ruolo:** Libreria di state management globale.

**Versione:** 5.0.7

Zustand gestisce tutto lo stato condiviso dell'applicazione attraverso quattro store indipendenti (`exerciseStore`, `settingsStore`, `terminalSettingsStore`, `presetStore`).

Le motivazioni della scelta rispetto alle alternative:

| Criterio | Zustand | Redux Toolkit | React Context |
|----------|---------|--------------|---------------|
| Boilerplate | Minimo (una funzione `create()`) | Medio (slices, reducers, actions) | Basso ma verboso per stato complesso |
| Performance | Sottoscrizioni granulari per selector | Simile con `useSelector` | Re-render dell'intero subtree al cambio |
| Middleware | `persist` per localStorage | Piu' ricco (thunk, saga) | Nessuno nativo |
| Dimensione bundle | ~1 KB | ~10 KB | 0 (built-in) |
| Accesso esterno | `getState()` da qualsiasi punto | `store.getState()` | Solo dentro il tree React |

Zustand e' particolarmente adatto a PCB-CTF perche':

- **Store indipendenti**: ogni store evolve autonomamente senza un root reducer centralizzato. Questo riflette la separazione netta tra Simulator e Settings.
- **Accesso fuori da React**: `exerciseStore.getState()` e' usato dal `presetStore` per catturare la configurazione corrente, senza passare per hooks React.
- **Middleware `persist`**: il `terminalSettingsStore` usa il middleware `persist` di Zustand per serializzare automaticamente lo stato in `localStorage`, permettendo all'autore di chiudere il browser e riprendere il lavoro.
- **Sottoscrizioni granulari**: ogni componente sottoscrive solo i campi dello store che gli servono, evitando re-render inutili.

```typescript
// Creazione di uno store Zustand
const useExerciseStore = create<ExerciseState>((set, get) => ({
  activeTool: 'pointer',
  setActiveTool: (tool) => set({ activeTool: tool }),
  // ...
}));

// Uso in un componente (sottoscrizione granulare)
const activeTool = useExerciseStore(state => state.activeTool);
```

---

## Styling

### Tailwind CSS 4

**Ruolo:** Framework CSS utility-first.

**Versione:** 4.1.16

Tailwind CSS e' il sistema di styling principale. Ogni componente e' stilizzato inline tramite classi utility:

```tsx
<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-700 text-gray-400 hover:bg-gray-600" />
```

Tailwind CSS 4 introduce il plugin PostCSS dedicato (`@tailwindcss/postcss`) che sostituisce il vecchio approccio con `tailwind.config.js`. La configurazione PostCSS e' minimale:

```javascript
// postcss.config.mjs
const config = {
  plugins: ["@tailwindcss/postcss"],
};
```

La configurazione Tailwind estende il tema con animazioni personalizzate specifiche per PCB-CTF:

```javascript
// tailwind.config.mjs — keyframes custom
keyframes: {
  "probe-pulse": {
    '0%, 100%': { transform: 'scale(1)', opacity: '1' },
    '50%': { transform: 'scale(1.2)', opacity: '0.7' },
  },
}
```

L'animazione `probe-pulse` e' usata per evidenziare i pin attivi durante il collegamento delle sonde.

### class-variance-authority (CVA)

**Ruolo:** Sistema di varianti per componenti UI.

**Versione:** 0.7.1

CVA permette di definire varianti tipizzate per i componenti, combinando classi base con varianti condizionali:

```typescript
// src/components/ui/button.tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all ...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive: "bg-destructive text-white shadow-xs hover:bg-destructive/90",
        outline: "border bg-background shadow-xs hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3",
        lg: "h-10 rounded-md px-6",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)
```

### clsx + tailwind-merge (utility `cn()`)

**Ruolo:** Composizione condizionale di classi CSS con risoluzione conflitti Tailwind.

La funzione `cn()` e' il pattern centrale per la composizione di classi in tutto il progetto:

```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- **`clsx`** — Concatena classi condizionalmente: `clsx('base', isActive && 'active', variant === 'primary' && 'bg-blue-500')`
- **`tailwind-merge`** — Risolve conflitti tra classi Tailwind: `twMerge('px-4 px-6')` produce `'px-6'`, non `'px-4 px-6'`

La combinazione dei due garantisce che i componenti accettino `className` come prop senza conflitti con gli stili interni.

### tw-animate-css

**Ruolo:** Preset di animazioni CSS per Tailwind.

Fornisce animazioni predefinite (`animate-in`, `animate-out`, `fade-in-0`, `zoom-in-95`) usate nei componenti Radix UI per le transizioni di apertura/chiusura di dialog e tooltip.

---

## Linguaggio e Toolchain

### TypeScript 5

**Ruolo:** Linguaggio di programmazione con tipizzazione statica.

TypeScript e' configurato in **strict mode** (`"strict": true` in `tsconfig.json`), che attiva tutti i controlli di tipo piu' rigorosi. Questo garantisce type-safety a compile-time su:

- Interfacce dati (`Exercise`, `TerminalConfig`, `CustomTool`)
- Props dei componenti React
- Parametri e ritorni delle funzioni dello store
- Payload delle API routes

Il path alias `@/*` mappa su `./src/*` per import leggibili:

```typescript
import { useExerciseStore } from '@/store/exerciseStore';
import type { Exercise } from '@/data/exercise';
```

### ESLint

**Ruolo:** Linter per qualita' del codice.

Configurato tramite `eslint-config-next` per le regole specifiche di Next.js (import React non necessari, link ottimizzati, ecc.). Eseguibile con `npm run lint`.

---

## Utilita' Aggiuntive

### js-yaml

**Ruolo:** Serializzazione e parsing YAML.

**Versione:** 4.1.1

Utilizzato nel pannello `TerminalConfigPreview` per l'import/export della configurazione terminale in formato YAML. L'autore puo' esportare la configurazione corrente come YAML leggibile, modificarla in un editor esterno, e reimportarla:

```typescript
// In SettingsCanvas.tsx
import yaml from 'js-yaml';

const serializeConfig = () => {
  const config = exportAsTerminalConfig();
  return yaml.dump(config, { indent: 2, lineWidth: 120, noRefs: true });
};

const handleImport = () => {
  const parsed = yaml.load(editorContent);
  loadFromTerminalConfig(parsed);
};
```

### react-terminal-ui

**Ruolo:** Dipendenza non utilizzata.

**Nota:** Questa libreria e' presente nel `package.json` ma **non viene importata** in nessun file del progetto. Il terminale di PCB-CTF e' interamente custom-built in `Terminal.tsx` usando componenti React nativi, stato module-level e le classi `TerminalConfigLoader`/`TerminalCommandExecutor`. La dipendenza potrebbe essere stata valutata durante lo sviluppo iniziale e poi sostituita dall'implementazione custom.

---

## Mappa delle Dipendenze

```
                    ┌──────────────────┐
                    │     Next.js 15   │  Framework full-stack
                    │   (App Router)   │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
       ┌──────▼──────┐  ┌───▼───┐  ┌──────▼──────┐
       │  React 19   │  │ API   │  │  TypeScript  │
       │  (Client)   │  │Routes │  │   5 (Lang)   │
       └──────┬──────┘  └───┬───┘  └─────────────┘
              │              │
    ┌─────────┼─────────┐   │ Persistenza
    │         │         │   │ su filesystem
┌───▼───┐ ┌──▼──┐ ┌───▼────┐
│Zustand│ │Radix│ │Tailwind│
│   5   │ │ UI  │ │ CSS 4  │
│(State)│ │(A11y)│ │(Style) │
└───────┘ └──┬──┘ └───┬────┘
             │        │
          ┌──▼──┐  ┌──▼──────────┐
          │Lucide│  │CVA + clsx + │
          │React │  │tailwind-merge│
          │(Icons)│ │(Variants)   │
          └──────┘ └─────────────┘
```

---

## Riepilogo Versioni

| Tecnologia | Versione | Categoria |
|-----------|----------|-----------|
| Next.js | 15.4.5 | Framework |
| React | 19.1.0 | UI Library |
| TypeScript | 5.x | Linguaggio |
| Zustand | 5.0.7 | State Management |
| Tailwind CSS | 4.1.16 | Styling |
| Radix UI | varie | UI Primitives |
| CVA | 0.7.1 | Component Variants |
| clsx | 2.1.1 | Class Composition |
| tailwind-merge | 3.3.1 | Class Conflict Resolution |
| lucide-react | 0.536.0 | Icone |
| js-yaml | 4.1.1 | YAML Parsing |
| ESLint | 9.x | Linting |
| PostCSS | 8.5.6 | CSS Processing |
| Node.js | 18+ | Runtime |
