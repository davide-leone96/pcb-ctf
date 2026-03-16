# Installazione e Setup

## Prerequisiti

- **Node.js** 18 o superiore
- **npm** 9 o superiore
- Browser moderno (Chrome, Firefox, Edge)
- Git

---

## Clonare il Repository

```bash
git clone <repository-url>
cd pcb-ctf
```

---

## Installare le Dipendenze

```bash
npm install
```

---

## Avviare il Server di Sviluppo

```bash
npm run dev
```

Il server si avvia su `http://localhost:3000`.

---

## Struttura delle Route

| Route | Descrizione |
|-------|-------------|
| `http://localhost:3000/` | Simulator — modalita' studente |
| `http://localhost:3000/settings` | Settings — modalita' authoring |

---

## Build di Produzione

```bash
npm run build
npm run start   # Avvia il server di produzione
```

Il build genera un output **standalone** (`Next.js standalone output`) deployabile come container Docker o processo Node.js autonomo.

---

## Struttura delle Cartelle Principali

```
pcb-ctf/
├── src/
│   ├── app/          # Route Next.js (App Router)
│   │   ├── page.tsx  # Simulator (/)
│   │   ├── settings/ # Settings (/settings)
│   │   └── api/      # API routes
│   ├── components/   # Componenti React
│   ├── store/        # Zustand stores
│   ├── lib/          # Logica terminale (executor, loader, handlers)
│   ├── types/        # TypeScript types
│   └── data/         # Dati esercizio e configurazioni default
├── public/           # Asset statici (immagini PCB caricate)
└── docs/             # Questa documentazione
```

---

## Configurazione Iniziale

Al primo avvio, il simulatore usa la configurazione di default in `src/data/exercise.ts`. Questa include:

- Un esercizio con 3 step (Hardware Analysis → UART Connection → Terminal Challenge)
- PCB image: `public/images/pcb_v2.jpg`
- Terminale non configurato (da configurare in `/settings`)

Per creare il tuo esercizio, vai su `http://localhost:3000/settings` e segui la [guida authoring](../authoring/overview.md).

---

## Linting

```bash
npm run lint
```

Non e' configurato un test suite. La validazione avviene principalmente tramite TypeScript strict mode.

---

## Alias TypeScript

Il path alias `@/*` mappa su `./src/*`. Usabile in tutti i file TypeScript:

```typescript
import { useExerciseStore } from '@/store/exerciseStore';
import type { Exercise } from '@/data/exercise';
```
