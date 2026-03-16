# Lavori Correlati e Confronto con Piattaforme Esistenti

## Panoramica

Questo documento analizza le piattaforme di formazione in cybersecurity esistenti e posiziona PCB-CTF rispetto ad esse. L'obiettivo e' evidenziare il gap che PCB-CTF intende colmare: la formazione pratica sulla sicurezza hardware attraverso simulazione interattiva nel browser, senza richiedere hardware fisico ne' infrastruttura server complessa.

---

## Piattaforme Analizzate

### HackTheBox (HTB)

**Tipo:** Piattaforma CTF online con macchine virtuali vulnerabili.

**Caratteristiche:**
- Macchine virtuali (Linux/Windows) accessibili via VPN
- Sfide categorizzate per difficolta' e dominio (web, crypto, forensics, pwn, hardware)
- Sistema di ranking e gamification
- Community attiva e write-up

**Punti di forza:** Ampio catalogo di sfide, ambiente realistico (VM complete), community.

**Limitazioni per la formazione hardware:**
- Le sfide "hardware" sono rare e tipicamente limitate a firmware analysis offline (file binari da analizzare)
- Non e' possibile simulare l'interazione fisica con un dispositivo (connessione UART, misura con multimetro, ispezione visiva della PCB)
- Richiede connessione VPN e macchine virtuali — overhead infrastrutturale significativo
- Non adatto a laboratori universitari con vincoli di rete (firewall, proxy)

### TryHackMe (THM)

**Tipo:** Piattaforma di apprendimento guidato con percorsi strutturati.

**Caratteristiche:**
- Percorsi didattici step-by-step ("rooms")
- Macchine virtuali accessibili via browser (AttackBox)
- Focus sull'apprendimento graduale, non solo sulla sfida
- Contenuto curato con spiegazioni teoriche

**Punti di forza:** Approccio pedagogico strutturato, bassa barriera d'ingresso, accessibilita' via browser.

**Limitazioni per la formazione hardware:**
- Nessun supporto per simulazione hardware
- Le room hardware-related sono puramente testuali (quiz, lettura di documentazione)
- Non e' possibile simulare strumenti di misura o connessioni fisiche
- Richiede abbonamento per accesso completo

### CTFd

**Tipo:** Framework open-source per organizzare competizioni CTF.

**Caratteristiche:**
- Self-hosted, altamente personalizzabile
- Gestione team, scoring, hint system
- Plugin ecosystem
- Supporto per challenge statiche (file, domande) e dinamiche (container)

**Punti di forza:** Flessibilita', open-source, community di sviluppatori.

**Limitazioni per la formazione hardware:**
- E' un framework per challenge management, non un simulatore
- Le challenge hardware sono tipicamente file binari da scaricare e analizzare offline
- Nessuna interattivita' con la PCB o gli strumenti
- Richiede infrastruttura server per challenge dinamiche

### DVRF (Damn Vulnerable Router Firmware)

**Tipo:** Firmware vulnerabile per esercitazione su dispositivi embedded.

**Caratteristiche:**
- Firmware per router reali (MIPS, ARM) con vulnerabilita' intenzionali
- Esercizi su buffer overflow, command injection, backdoor
- Emulabile con QEMU

**Punti di forza:** Realistico, copre vulnerabilita' firmware reali, open-source.

**Limitazioni per la formazione hardware:**
- Richiede conoscenze avanzate per il setup (cross-compilation, QEMU, GDB)
- Non copre la fase di accesso fisico al dispositivo (ispezione PCB, connessione UART)
- Nessuna interfaccia grafica — interazione solo da terminale
- Non adatto a studenti alle prime armi

### Attify Badge / Hardware CTF Kits

**Tipo:** Kit hardware fisici per formazione sulla sicurezza IoT.

**Caratteristiche:**
- PCB fisiche con interfacce UART, SPI, JTAG esposte
- Firmware vulnerabile preinstallato
- Guida passo-passo per le esercitazioni

**Punti di forza:** Esperienza tattile reale, copertura completa del workflow hardware.

**Limitazioni:**
- Costo per studente (hardware fisico + strumenti di misura)
- Logistica di distribuzione e manutenzione
- Non scalabile per classi numerose
- Rischio di danneggiamento hardware
- Un singolo kit copre un singolo scenario

---

## Tabella Comparativa

| Criterio | PCB-CTF | HackTheBox | TryHackMe | CTFd | DVRF | Kit Hardware |
|----------|---------|-----------|-----------|------|------|-------------|
| **Simulazione PCB interattiva** | Si | No | No | No | No | Si (reale) |
| **Strumenti di misura virtuali** | Si (multimetro, sonde UART, custom tools) | No | No | No | No | Si (reali) |
| **Terminale embedded simulato** | Si | Si (VM) | Si (VM) | No | Si (QEMU) | Si (reale) |
| **Esecuzione nel browser** | Si | Parziale (AttackBox) | Si (AttackBox) | Si (UI) | No | No |
| **Infrastruttura richiesta** | Node.js singolo | VPN + VM | Browser (cloud) | Server + containers | QEMU + toolchain | Hardware fisico |
| **Costo per studente** | Nessuno | Abbonamento | Abbonamento | Nessuno (self-hosted) | Nessuno | 50-200 EUR |
| **Setup time** | < 5 minuti | 15-30 min (VPN) | < 5 minuti | 30-60 min | 1-2 ore | Variabile |
| **Focus didattico hardware** | Primario | Marginale | Marginale | Nessuno | Firmware only | Primario |
| **Personalizzazione esercizi** | Si (authoring UI) | No | No (solo creatori) | Si (plugin) | Limitata | No |
| **Multi-utente / scoring** | No | Si | Si | Si | No | No |
| **Progressione guidata** | Si (step/objectives) | Parziale | Si (rooms) | No | No | Si (guide) |
| **Scalabilita'** | Alta (client-side) | Media (VM) | Alta (cloud) | Media (server) | Bassa | Bassa |
| **Open-source** | Si | No | No | Si | Si | No |

---

## Posizionamento di PCB-CTF

### Gap colmato

PCB-CTF si posiziona in un'area non coperta dalle piattaforme esistenti: la **simulazione interattiva dell'analisi hardware** in un ambiente completamente browser-based.

```
                    Realismo hardware
                         ^
                         |
    Kit Hardware  ●      |
                         |
                         |      ● PCB-CTF
    DVRF  ●              |
                         |
                         |
    ─────────────────────┼──────────────────> Accessibilita'
                         |
         HTB  ●          |         ● TryHackMe
                         |
              CTFd  ●    |
                         |
```

Le piattaforme esistenti offrono o alta accessibilita' (TryHackMe, CTFd — browser-based ma senza simulazione hardware) o alto realismo (kit fisici, DVRF — ma con barriere di setup e costo). PCB-CTF combina entrambi:

- **Accessibilita'**: nessun hardware da acquistare, nessun software da installare, nessuna VPN da configurare. Un browser e un server Node.js.
- **Realismo didattico**: lo studente riproduce il workflow completo di un penetration test hardware — ispezione visiva, analisi elettrica, connessione UART, esplorazione firmware — in un ambiente guidato.

### Limitazioni di PCB-CTF

| Limitazione | Impatto | Possibile evoluzione |
|------------|---------|---------------------|
| Nessun multi-utente | Un'istanza per autore/corso | Aggiunta autenticazione e sessioni utente |
| Nessun sistema di scoring | Non adatto a competizioni | Integrazione con framework CTFd |
| Simulazione non tattile | Lo studente non tocca hardware reale | Complementare con kit fisici per corsi avanzati |
| Scenario singolo per istanza | Un esercizio alla volta | Supporto multi-esercizio con routing |
| Nessuna analisi firmware reale | Il "firmware" e' un file statico servito dal server | Integrazione con tools di analisi client-side (es. binwalk.js) |

### Complementarita'

PCB-CTF non sostituisce le piattaforme esistenti ma le complementa:

- **Prima del lab fisico**: PCB-CTF prepara gli studenti al workflow hardware prima di accedere al kit fisico, riducendo il tempo necessario in laboratorio.
- **Dopo la teoria**: complementa i materiali teorici (slide, video) con un'esperienza pratica interattiva.
- **Alternativa accessibile**: per istituzioni senza budget per kit hardware, PCB-CTF offre un'esperienza formativa comparabile.
- **Valutazione**: l'autore puo' verificare le competenze degli studenti attraverso il completamento degli step e la scoperta dei flag.

---

## Riferimenti

- HackTheBox: https://www.hackthebox.com/
- TryHackMe: https://tryhackme.com/
- CTFd: https://ctfd.io/ (GitHub: https://github.com/CTFd/CTFd)
- DVRF: https://github.com/praetorian-inc/DVRF
- Attify Badge: https://www.attify.com/attify-badge
