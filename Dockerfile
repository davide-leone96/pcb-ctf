# === Fase 1: Builder ===
# Usiamo un'immagine Node.js leggera basata su Alpine Linux
FROM node:20-alpine AS builder

# Impostiamo la directory di lavoro all'interno del container
WORKDIR /app

# Copiamo i file di gestione delle dipendenze
# Questo passaggio viene messo in cache da Docker e rieseguito solo se package.json cambia
COPY package*.json ./

# Installiamo le dipendenze di produzione e sviluppo
RUN npm install

# Copiamo il resto del codice sorgente dell'applicazione
COPY . .

# Eseguiamo il build di produzione
# Questo genererà la cartella .next/standalone grazie alla configurazione precedente
RUN npm run build


# === Fase 2: Production Runner ===
# Ripartiamo da un'immagine pulita per mantenere le dimensioni finali ridotte
FROM node:20-alpine AS runner
WORKDIR /app

# Impostiamo l'ambiente su "produzione"
ENV NODE_ENV=production
# Opzionale: disabilita la telemetria di Next.js
# ENV NEXT_TELEMETRY_DISABLED 1

# Creiamo un utente non-root per motivi di sicurezza
RUN addgroup --system --gid 1001 nextjs
RUN adduser --system --uid 1001 nextjs

# Copiamo l'output standalone dalla fase di build
# Il flag --chown imposta il proprietario dei file sull'utente non-root che abbiamo creato
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./

# Copiamo le cartelle 'public' e '.next/static' che sono necessarie per i file statici
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static

# Passiamo al nostro utente non-root
USER nextjs

# Esponiamo la porta su cui Next.js gira di default
EXPOSE 3000

# Il comando per avviare l'applicazione in produzione
# Next.js include un file server.js ottimizzato nell'output standalone
CMD ["node", "server.js"]