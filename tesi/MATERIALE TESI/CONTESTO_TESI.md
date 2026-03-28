# CONTESTO_TESI.md — Linee Guida per la Scrittura di una Tesi Magistrale

> Documento generato dall'analisi di 4 tesi magistrali del Politecnico di Torino (area Cybersecurity / Hardware Security). Da usare come istruzione per un agente AI che deve generare una nuova tesi su un argomento diverso.

---

## Tesi analizzate

| ID | Autore | Titolo | Anno | Pagine | Rif. Bibl. |
|----|--------|--------|------|--------|------------|
| SYC | Samuele Yves Cerini | Empirical Evaluation of the Resilience of Novel S-Box Implementations Against Power Side-Channel Attacks | 2020/2021 | ~75 | 60 |
| ADL | Antonio De Luca | Leveraging Deep Learning Techniques for Cross-Family Side-Channel Attacks on 8-bit Microcontrollers | 2022/2023 | ~112 | 89 |
| DG | Davide Giuffrida | A FOSS-Based Toolchain for Automated Hardware Trojan Injection in RISC-V Architectures | 2023/2024 | ~92 | 62 |
| AG | Alessandro Genova | Vulnerability Assessment of Low-Cost IoT Devices: Towards a Virtual Hardware Security Training Environment | 2025 | ~123 | 32 |

Tutte sono tesi magistrali del Politecnico di Torino, scritte in inglese, nel dominio cybersecurity/hardware security.

---

## 1. TEMPLATE DI STRUTTURA CONSIGLIATO

### 1.1 Schema generale dei capitoli

```
Frontmatter:
  - Pagina titolo (istituzione, corso, titolo, autore, advisor, co-advisor, data)
  - Abstract (~1-1.5 pagine)
  - Acknowledgements (~0.5-1 pagina)
  - Table of Contents
  - List of Figures
  - List of Tables

Corpo:
  Cap. 1 - Introduction                          (~2 pagine)
  Cap. 2 - Background                            (~10-16 pagine)
  Cap. 3 - State of the Art                       (~6-14 pagine)
  Cap. 4 - Contributions / Methodology / Development  (~6-22 pagine)
  Cap. 5 - Experimental Results                   (~8-54 pagine)
  Cap. 6 - Conclusions                            (~2-3 pagine)

Backmatter:
  - Appendici (opzionali: bootlog, dati grezzi, codice)
  - Bibliografia (~3-6 pagine, 32-89 voci)
```

### 1.2 Proporzioni raccomandate (sul corpo della tesi)

| Sezione | Peso raccomandato | Range osservato |
|---------|-------------------|-----------------|
| Introduction | 2-3% | 2-3% |
| Background | 15-25% | 13-21% |
| State of the Art | 8-15% | 8-15% |
| Contributions/Methodology | 15-25% | 8-36% |
| Experimental Results | 25-45% | 7-44% |
| Conclusions | 2-4% | 2-3% |

**Regola generale**: Background + State of the Art non devono superare il 40% del corpo. Il nucleo della tesi (metodologia + risultati) deve essere almeno il 40-50%.

### 1.3 Profondita di annidamento delle sezioni

- Massimo **3 livelli** di profondita: Capitolo > Sezione > Sottosezione (es. 5.1.3)
- Ogni sezione dovrebbe avere almeno 2 sottosezioni (se ne ha una sola, meglio integrarla nella sezione padre)
- Ogni sottosezione dovrebbe essere lunga almeno mezza pagina

---

## 2. STRUTTURA DETTAGLIATA DI OGNI COMPONENTE

### 2.1 Abstract

**Posizione**: dopo la pagina titolo, prima degli acknowledgements (o viceversa — entrambi gli ordini sono accettabili).

**Lunghezza**: 1-1.5 pagine.

**Schema obbligatorio** (5 blocchi):
1. **Contesto**: 2-3 frasi che inquadrano il dominio e la rilevanza del problema
2. **Problema**: cosa non funziona / cosa manca nella letteratura
3. **Contributo**: cosa fa questa tesi per risolvere il problema
4. **Metodo**: strumenti, approccio sperimentale (1-2 frasi)
5. **Risultati**: sintesi dei principali findings

L'abstract deve essere **autocontenuto**: leggibile e comprensibile senza il resto della tesi.

### 2.2 Acknowledgements

- Tono personale (unica sezione non accademica)
- Struttura tipica: supervisor/team -> famiglia -> amici -> partner
- Breve (0.5-1 pagina)
- Posizione: prima o dopo l'abstract

### 2.3 Introduzione (Cap. 1)

**Lunghezza**: ~2 pagine. Deve essere concisa e incisiva.

**Schema obbligatorio** (5 paragrafi):
1. **Contesto ampio**: inquadramento del dominio (1 paragrafo)
2. **Problema specifico**: restringimento al gap che la tesi affronta (1 paragrafo)
3. **Contributo**: cosa fa questa tesi, in modo chiaro e diretto (1 paragrafo)
4. **Risultati anticipati**: breve preview dei principali findings (1 paragrafo, opzionale)
5. **Outline**: struttura del documento capitolo per capitolo (1 paragrafo)

**Formula per l'outline** (usata in tutte le tesi analizzate):
> "The remainder of this document is organized as follows. Chapter 2 provides... Chapter 3 reviews... Chapter 4 presents... Chapter 5 details... Finally, Chapter 6 summarizes..."

### 2.4 Background (Cap. 2)

**Scopo**: fornire al lettore tutte le conoscenze tecniche necessarie per comprendere i capitoli successivi, senza presupporre competenze specifiche del dominio.

**Organizzazione**: per tema, con approccio bottom-up (dal generale al particolare).

**Linee guida**:
- Ogni concetto avanzato deve essere costruito su fondamenta spiegate in precedenza
- Non è uno stato dell'arte: non critica la letteratura, ma espone concetti consolidati
- Includere definizioni formali quando necessario
- Utilizzare esempi pratici per rendere concreti i concetti astratti
- Includere figure e diagrammi per concetti complessi

### 2.5 State of the Art (Cap. 3)

**Scopo**: posizionare il lavoro nel contesto della letteratura esistente e identificare i gap che la tesi intende colmare.

**Organizzazione preferita**: per tema/gap (non cronologica). Ogni sotto-sezione affronta un aspetto diverso del panorama.

**Schema efficace** (osservato nelle tesi analizzate):
1. Contesto progettuale/istituzionale (se applicabile)
2. Survey delle soluzioni/piattaforme/tecniche esistenti, con analisi critica
3. **Identificazione esplicita dei gap** (sezione dedicata, es. "Identified Gaps")
4. Fattori tecnici rilevanti per il problema

**Best practice**:
- Ogni lavoro citato deve essere analizzato criticamente (non solo descritto)
- I gap devono essere formulati in modo da preparare il terreno per i contributi del Cap. 4
- Lo stato dell'arte funziona come "ponte" tra background teorico e contributi
- Includere tabelle comparative quando si confrontano più soluzioni/piattaforme

### 2.6 Contributi / Metodologia (Cap. 4)

**Scopo**: presentare cosa fa la tesi e come lo fa.

**Schema**:
1. **Motivazioni**: perché questo lavoro è necessario (collegamento ai gap del Cap. 3)
2. **Approccio**: descrizione dell'architettura/framework/metodologia proposta
3. **Dettagli implementativi**: setup sperimentale, strumenti, scelte di design
4. **Criteri di valutazione**: metriche e modalità di validazione

**Linee guida**:
- Giustificare ogni scelta di design con riferimenti allo stato dell'arte
- Descrivere il setup con dettaglio sufficiente alla riproducibilità
- Se la metodologia è complessa, partire da un overview generale poi dettagliare ogni componente

### 2.7 Risultati Sperimentali (Cap. 5)

**Scopo**: presentare i risultati ottenuti con evidenze.

**Organizzazione** (due pattern osservati):
- **Per dispositivo/caso di studio** (AG): ogni caso segue il workflow completo
- **Per metrica/esperimento** (SYC, ADL, DG): risultati raggruppati per tipo di analisi

**Best practice**:
- Ogni esperimento deve dichiarare: motivazione, ipotesi, metodo, risultato, interpretazione
- Supportare ogni affermazione con evidenze (grafici, tabelle, output, log)
- Includere una **tabella riassuntiva** dei risultati chiave
- Documentare anche i **risultati negativi** e i fallimenti (onestà intellettuale)
- Usare grafici per rendere i risultati immediatamente leggibili
- Per brevità, è lecito omettere grafici ridondanti ("for the sake of brevity")

### 2.8 Conclusioni (Cap. 6)

**Lunghezza**: 2-3 pagine.

**Schema obbligatorio** (2 sezioni):

**6.1 Summary / Comments**:
- Ricapitolazione dei risultati principali
- Collegamento ai gap identificati nello stato dell'arte
- Conferma/confutazione delle ipotesi iniziali
- NON introdurre nuove informazioni

**6.2 Future Work**:
- 3-6 direzioni di sviluppo futuro
- Ogni direzione con breve spiegazione del perché e del come
- Organizzate per priorità o per ambito

### 2.9 Appendici

- Usare per materiale supplementare che appesantirebbe il testo principale
- Esempi: bootlog completi, codice sorgente esteso, dati grezzi, configurazioni
- Ogni appendice deve essere referenziata nel testo principale

### 2.10 Bibliografia

- **32-89 voci** è il range osservato (50-70 è un buon target)
- Formato **IEEE numerico** con parentesi quadre [1], [2], ...
- Includere un mix di: articoli su rivista, atti di conferenza, libri, risorse web
- Per le risorse web: indicare sempre URL e data di ultimo accesso

---

## 3. LINEE GUIDA DI STILE E FORMATTAZIONE

### 3.1 Registro linguistico

- **Lingua**: inglese accademico formale
- **Persona**: prevalentemente **terza persona impersonale** e **passivo** ("it was observed", "the analysis reveals")
- **"We" autoriale**: accettabile nelle sezioni sperimentali ("we observed", "our approach"), ma con moderazione
- **Mai** usare "I" nel corpo del testo (solo negli Acknowledgements)
- **Tempo verbale**:
  - **Presente indicativo**: per definizioni, descrizioni tecniche, affermazioni generali ("AES is based on...", "The S-Box implements...")
  - **Passato semplice**: per risultati sperimentali e lavori precedenti ("The results confirmed...", "Kocher demonstrated...")
  - **Presente perfetto**: per stato dell'arte ("Recent research has shown...")
  - **Futuro semplice**: per anticipare sezioni successive ("will be detailed in Chapter 5")

### 3.2 Citazioni bibliografiche

- **Sistema numerico** tra parentesi quadre: `[1]`, `[14]`, `[32, p. 422]`
- Citazioni con pagina specifica quando si fa riferimento a un'affermazione precisa: `[6, p. 194]`
- Formule per introdurre le fonti nel testo:
  - "as proposed by [Cognome] in [n]"
  - "[Cognome] et al. [n] demonstrated that..."
  - "according to [n], ..."
- Citazioni multiple: `[16] [17]` oppure `[16, 17]`
- Densità: 2-4 citazioni per pagina nei capitoli di background/SotA

### 3.3 Figure

- **Numerazione**: `Capitolo.Numero` (es. Figure 2.1, Figure 5.3)
- **Caption**: sempre presente, descrittiva, posizionata **sotto** la figura
- **Riferimento nel testo**: obbligatorio, con formule come:
  - "as shown in Figure X.Y"
  - "see Fig. X.Y"
  - "as depicted in Figure X.Y"
- **List of Figures**: presente all'inizio del documento
- **Tipologie**: diagrammi, schematici, screenshot, grafici di risultati, fotografie (PCB, setup)
- **Quantità osservata**: 7-60 figure per tesi

### 3.4 Tabelle

- **Numerazione**: `Capitolo.Numero` (es. Table 3.1, Table 5.1)
- **Caption**: sempre presente, posizionata **sopra** la tabella
- **Riferimento nel testo**: obbligatorio ("as summarized in Table X.Y")
- **List of Tables**: presente all'inizio del documento
- Usare tabelle per: confronti, parametri sperimentali, risultati numerici, survey comparative
- **Quantità osservata**: 1-8 tabelle per tesi

### 3.5 Elenchi puntati e numerati

- **Elenchi puntati** (bullet points): per enumerare proprietà, requisiti, categorie, risultati
- **Elenchi numerati**: per sequenze procedurali, passi ordinati di algoritmi
- Pattern frequente: **termine in grassetto** + due punti + spiegazione:
  > - **Bijection**: An S-Box S(n,m) is said to be bijective if...
- Gli elenchi devono essere introdotti da una frase completa seguita da due punti
- Elenchi annidati: accettabili ma max 2 livelli

### 3.6 Paragrafi

- **Lunghezza media**: 8-15 righe nelle sezioni teoriche, 3-8 righe nelle sezioni sperimentali
- Mai paragrafi di una sola frase
- Ogni paragrafo deve avere un'idea principale chiara
- Usare paragrafi più brevi quando si alternano con figure, tabelle o blocchi di codice

### 3.7 Note a piè di pagina

- Usare per definizioni tecniche supplementari che interromperebbero il flusso
- Numerate progressivamente
- Non abusarne: max 1-2 per pagina

### 3.8 Codice sorgente e output

- Presentare in blocchi monospace (listing) con numerazione delle righe
- Numerare i listing: "Listing 1", "Listing 2", ...
- Referenziare nel testo: "as reported in Listing X"
- Per output di terminale/log: usare blocchi verbatim come evidenza sperimentale

### 3.9 Transizioni tra sezioni

- Ogni capitolo deve iniziare con un breve paragrafo introduttivo che ne spiega lo scopo
- Le transizioni tra capitoli devono collegare logicamente il contenuto precedente al successivo
- Usare frasi ponte alla fine dei capitoli per guidare il lettore

---

## 4. CHECKLIST DELLE BEST PRACTICE

### Struttura e organizzazione
- [ ] La tesi segue lo schema: Intro > Background > SotA > Contributi > Risultati > Conclusioni
- [ ] L'introduzione contiene: contesto, problema, contributo, outline
- [ ] L'outline dell'introduzione descrive ogni capitolo
- [ ] Il background fornisce tutte le conoscenze necessarie senza presupporle
- [ ] Lo stato dell'arte identifica esplicitamente i gap nella letteratura
- [ ] I gap del SotA sono direttamente collegati ai contributi della tesi
- [ ] Le conclusioni hanno sezioni separate per summary e future work
- [ ] Le appendici sono referenziate nel testo principale

### Progressione narrativa
- [ ] Ogni capitolo costruisce sulle conoscenze del precedente
- [ ] I concetti vengono introdotti prima di essere utilizzati
- [ ] L'arco narrativo è coerente: gap → proposta → risultati → conferma/confutazione
- [ ] Non ci sono "salti" concettuali che richiedano conoscenze non introdotte

### Rigore scientifico
- [ ] Ogni esperimento dichiara: motivazione, ipotesi, metodo, risultato, interpretazione
- [ ] I risultati sono supportati da evidenze (grafici, tabelle, dati)
- [ ] I risultati negativi e i limiti sono documentati onestamente
- [ ] Le conclusioni non sovra-interpretano i risultati
- [ ] Il setup sperimentale è descritto con dettaglio sufficiente alla riproducibilità
- [ ] Le scelte di design sono giustificate

### Formattazione
- [ ] Tutte le figure hanno caption e sono referenziate nel testo
- [ ] Tutte le tabelle hanno caption e sono referenziate nel testo
- [ ] Le citazioni usano il formato numerico [n] in modo coerente
- [ ] List of Figures e List of Tables sono presenti
- [ ] La numerazione delle sezioni è coerente (Capitolo.Sezione.Sottosezione)
- [ ] I blocchi di codice sono numerati e referenziati

### Stile
- [ ] Registro formale e coerente in tutto il documento
- [ ] Nessun uso di "I" nel corpo del testo
- [ ] Tempi verbali coerenti (presente per teoria, passato per risultati)
- [ ] Citazioni con pagina specifica quando si riferisce a un'affermazione precisa
- [ ] Elenchi puntati introdotti da frasi complete
- [ ] Paragrafi di lunghezza adeguata (né troppo corti né troppo lunghi)

---

## 5. PATTERN RICORRENTI CHE FUNZIONANO BENE

### 5.1 Progressione didattica incrementale
Tutte le tesi costruiscono le competenze del lettore in modo incrementale. Ogni concetto avanzato è fondato su spiegazioni precedenti. Il lettore con conoscenze generali di informatica può seguire l'intero percorso.

### 5.2 Esempi pratici integrati nella teoria
Le tesi più efficaci (SYC, ADL) includono dimostrazioni pratiche all'interno dei capitoli teorici (es. attacchi SPA con codice annotato). Questo trasforma concetti astratti in osservazioni tangibili.

### 5.3 Collegamento costante teoria-pratica
Le metriche teoriche introdotte nel background/SotA vengono poi verificate o discusse alla luce dei risultati sperimentali, creando un arco narrativo coerente.

### 5.4 Tabella riassuntiva dei risultati
Tutte le tesi includono almeno una tabella che sintetizza i risultati chiave, fungendo da "take-away" immediato per il lettore.

### 5.5 Onestà intellettuale
I limiti del lavoro sono riconosciuti esplicitamente: risultati negativi documentati, margini di errore discussi, limitazioni del setup dichiarate. Le future work partono da questi limiti.

### 5.6 Uso giudizioso della brevità
Quando i risultati sono ridondanti o ripetitivi, l'autore può legittimamente ometterne una parte ("for the sake of brevity"), concentrandosi sui casi più significativi.

### 5.7 Survey comparative con analisi critica
Nello stato dell'arte, le soluzioni esistenti non sono solo elencate ma analizzate criticamente, evidenziando punti di forza, limiti e gap. Tabelle comparative sono particolarmente efficaci.

### 5.8 Trasparenza e riproducibilità
Le tesi migliori forniscono codice sorgente su GitHub, dichiarano i parametri sperimentali, e descrivono il setup con sufficiente dettaglio da poter essere replicato.

---

## 6. ISTRUZIONI PER L'AGENTE

Quando ricevi documentazione su un nuovo argomento e devi generare una tesi:

1. **Identifica** il dominio, il problema e il contributo principale
2. **Struttura** la tesi seguendo il template del paragrafo 1
3. **Rispetta** le proporzioni raccomandate tra i capitoli
4. **Applica** le linee guida di stile del paragrafo 3
5. **Verifica** la checklist del paragrafo 4 prima di considerare il lavoro completo
6. **Usa** i pattern del paragrafo 5 per massimizzare la qualità

### Priorità assolute:
- L'arco narrativo deve essere coerente: gap → proposta → risultati → conferma
- Ogni affermazione deve essere supportata da evidenze o citazioni
- Il background deve rendere la tesi comprensibile senza conoscenze pregresse del dominio
- I risultati devono essere presentati con onestà, inclusi limiti e fallimenti
- Lo stile deve essere formale, coerente e professionale in tutto il documento
