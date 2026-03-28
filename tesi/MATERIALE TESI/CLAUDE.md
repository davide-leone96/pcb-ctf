# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **thesis writing workspace** for a Master's thesis at Politecnico di Torino (Cybersecurity). It contains research materials, reference theses, and an active LaTeX thesis project.

## Directory Structure

- **MyThesis/** — Active LaTeX thesis project (has its own CLAUDE.md with build commands and custom LaTeX commands)
- **template/** — Clean LaTeX thesis template derived from MyThesis, for starting new chapters
- **pdf/** — Reference theses used for analysis (SYC, ADL, DG, AG — all PoliTo Cybersecurity master's theses)
- **SYC_tesi_src.zip** — Source files of the SYC thesis (same thesis as MyThesis/)

## Key Context Files

- **CONTESTO_TESI.md** — Structural guidelines extracted from analyzing 4 reference theses: recommended chapter proportions, writing style rules, and thesis template structure
- **FONTI_STATO_ARTE.md** — Curated academic sources organized by topic for the State of the Art chapter, with DOIs and URLs (verify before use — knowledge cutoff applies)
- **STATO_ARTE_ANALISI.md** — Detailed analysis of the AG thesis's Background and State of the Art chapters, mapping themes to cited sources
- **contesto_AG_tesi.md** — Structural overview of the AG thesis (Alessandro Genova), whose advisor is the MyThesis author (Samuele Yves Cerini)

## Building the Thesis

```bash
cd MyThesis

# Full build
latexmk -pdf thesis.tex

# Manual build (pdflatex + bibtex cycle)
pdflatex thesis.tex && bibtex thesis && pdflatex thesis.tex && pdflatex thesis.tex

# Build the standalone summary
cd summary && latexmk -pdf summary.tex
```

## Writing Conventions

- The thesis is written in **English** following Politecnico di Torino conventions
- Context/planning documents (CONTESTO_TESI.md, etc.) are written in **Italian**
- Bibliography uses BibTeX with `unsrt` style (~60 entries in `bibliography.bib`)
- See CONTESTO_TESI.md for recommended chapter proportions and structural guidelines derived from 4 analyzed theses

## Additional Working Directories (Java BFF Projects)

This workspace also includes two Spring Boot BFF (Backend For Frontend) projects from the DWS (Digital Welfare Services) platform — both have their own CLAUDE.md files:

- **dws-bff-backoffice** — BFF for the backoffice portal
- **dws-bff-dipendenti** — BFF for the employees portal

These follow the same architecture: `Controller → Service → ServiceImpl → Generated MS API Client`, with OpenAPI code generation from YAML contracts in a `modules/openapi-contracts` git submodule. Common commands:

```bash
# Build (from either BFF project root)
mvn clean install -DskipTests

# Regenerate from OpenAPI specs
mvn clean generate-sources -DskipTests

# Format code
mvn spotless:apply

# Run tests
mvn test

# Run single test
mvn test -Dtest=ClassName
```
