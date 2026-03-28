# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LaTeX Master's thesis: "Empirical Evaluation of the Resilience of Novel S-Box Implementations Against Power Side-Channel Attacks" (Politecnico di Torino, 2020/2021). Covers AES cryptography, power side-channel attacks (SPA, DPA, CPA), alternative S-Box designs, and experimental results using ChipWhisperer.

## Build Commands

No Makefile exists. Build with latexmk or manual pdflatex+bibtex:

```bash
# Full build (recommended)
latexmk -pdf thesis.tex

# Manual build
pdflatex thesis.tex
bibtex thesis
pdflatex thesis.tex
pdflatex thesis.tex

# Build the separate summary document
cd summary && latexmk -pdf summary.tex
```

## Document Structure

- **thesis.tex** — Main document entry point, includes all chapters
- **preamble.tex** — Package imports, custom commands, document configuration
- **frontpage.tex** — Title page layout
- **bibliography.bib** — BibTeX references (~60 entries, `unsrt` style)
- **chapters/** — Chapter files numbered `00intro.tex` through `05conclusions.tex`
- **images/** — Figures including `results/traces_{100,1000,5000}/` for experimental plots
- **drawio/** — Source Draw.io diagrams (exported to PDF in `images/`)
- **summary/** — Self-contained summary document with its own `preamble.tex`

## Key Custom Commands (defined in preamble.tex)

- `\cw` — ChipWhisperer™
- `\aes`, `\aess`, `\aesss`, `\aessss` — AES-128, AES-192, AES-256, AES-128/192/256
- `\sbocs` — S-Box
- `\xaes`, `\xfone`, `\xftwo`, `\xfthree`, `\xhussain`, `\xozkaynak` — S-Box implementation names
- `\sca` — Side-Channel Analysis

## Notes

- Document class: `report` (11pt, A4). A commented-out `toptesi` class exists as alternative.
- Code listings use both `listings` and `minted` packages.
- Diagrams in `drawio/` are the editable sources; their PDF exports in `images/` are what LaTeX references.
