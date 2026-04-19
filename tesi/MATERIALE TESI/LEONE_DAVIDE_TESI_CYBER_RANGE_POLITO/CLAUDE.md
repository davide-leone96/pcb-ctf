# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LaTeX source for **Davide Leone's** Master's thesis at Politecnico di Torino (Cybersecurity):
_"Design and Implementation of an Interactive Web-Based Cyber Range for Hardware Security Training"_ (Academic Year 2025/2026).

Supervisor: Alessandro Savino. Co-supervisor: Samuele Yves Cerini.

The thesis documents **PCB-CTF / ARTIC** — a browser-based hardware-security CTF simulator (the implementation lives at the repo root `pcb-ctf/`, not here). The case study chapter analyzes a TP-Link WR841N router.

Written in **English**. Planning/context documents in the parent `MATERIALE TESI/` directory are in **Italian** — see `../CLAUDE.md`, `../CONTESTO_TESI.md`, `../FONTI_STATO_ARTE.md`, and `indice.md` (the authoritative chapter outline and page budget).

## Build

```bash
# Full build (resolves TOC, LOF, LOT, bibliography)
latexmk -pdf thesis.tex

# Manual cycle
pdflatex thesis.tex && bibtex thesis && pdflatex thesis.tex && pdflatex thesis.tex

# Clean auxiliary files
latexmk -c           # keep PDF
latexmk -C           # also remove PDF
```

`preamble.tex` loads `minted`, which requires `-shell-escape` if any `\begin{minted}` environment is added. Current chapters use `lstlisting` (no shell-escape needed) — if you switch to `minted`, build with `pdflatex -shell-escape thesis.tex` or `latexmk -pdf -shell-escape thesis.tex`.

## Structure

- `thesis.tex` — master file. Includes `preamble`, `frontpage`, `ack`, `summary` (abstract), then chapters 00–07, appendices A–B, and the bibliography.
- `preamble.tex` — all package loads and **custom macros** (use these consistently across chapters):
  - `\pcbctf{}` → small-caps PCB-CTF, `\artic{}` → small-caps ARTIC
  - `\nextjs`, `\reactjs`, `\zustand`, `\typescript`, `\tailwind`, `\radixui` → typewriter tech names
- `chapters/` — one `.tex` per chapter; numbering matches `indice.md`:
  - `00intro`, `01background`, `02stateoftheart`, `03contributions` (= Requirements), `04architecture`, `05implementation`, `06casestudy`, `07conclusions`, `appendixA` (exercise JSON schema), `appendixB` (terminal config schema)
- `images/` — all figures; `\graphicspath{{./images/}}` is set in the preamble, so `\includegraphics{foo}` is enough (no subdirectory prefix).
- `bibliography.bib` — BibTeX, `unsrt` style (entries appear in citation order, not alphabetical).
- `summary.tex` — abstract, **not** a standalone summary document (the parent `CLAUDE.md`'s `cd summary && latexmk` instruction applies to `MyThesis/`, not to this project).
- `DL_tesi_comments_rel001.pdf` — supervisor review/comments to address.

Chapter `.aux`, `.log`, `.fls`, `.fdb_latexmk`, `.bbl`, `.blg`, `.toc`, `.lof`, `.lot` are build artifacts — safe to delete and regenerate.

## Writing Conventions

- Citations use the `\cite{key}` form backed by `bibliography.bib` (BibTeX). New entries are appended in citation order since `unsrt` is order-sensitive for the printed bibliography — but references inside `.bib` can be ordered however is convenient.
- Chapters use `\label{chap:...}`, sections `\label{sec:...}`, subsections `\label{subsec:...}`, figures `\label{fig:...}` — follow the existing prefix convention when adding labels.
- When referring to the platform in prose, always use `\pcbctf{}` or `\artic{}` (never plain "PCB-CTF"), and the tech-stack macros (`\nextjs`, etc.) for consistency with the rest of the document.
- Diagrams in chapters use TikZ directly (no external `.tex` fragments). `arrows.meta`, `positioning`, `shapes.geometric`, `fit`, `calc`, and `backgrounds` libraries are already loaded.
- `indice.md` records the target page budget per chapter and the structural rationale (ratios derived from `../CONTESTO_TESI.md`). Consult it before restructuring or adding major sections.
