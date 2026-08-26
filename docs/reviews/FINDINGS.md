# UX-Review — Findings (Stand: Phase 3 Baseline, 2026-08-26)

Basis: Screenshots in `docs/reviews/before/` (6 Zustände × 2 Viewports) + Code-Audit.
Jedes Finding hat eine Priorität (P1 = blocker für "wirkt professionell", P2 = klarer Gewinn, P3 = Nice-to-have) und ein Ziel-WP.

## A — Globale Systeme

| # | Finding | Prio | WP |
|---|---|---|---|
| A1 | **29 verschiedene `font-size`-Werte** (`.65rem`–`clamp(5.5rem)`), keine Skala → inkonsistente Hierarchie | P1 | WP3 |
| A2 | **Kontrast:** `--text-muted #5c6478` auf `--bg-surface` ≈ 3,0:1 (< WCAG AA 4,5:1), trägt aber viel Kleintext (Karten-Metas, Badges, Hints) | P1 | WP4 |
| A3 | **Pill-Buttons (9999px)** wirken datiert; 3 verschiedene Höhen/Glow-Shadow-Mix | P1 | WP3 |
| A4 | Kein durchgängiges `:focus-visible` (nur 2 Regeln in drawer.css) | P1 | WP4 |
| A5 | Spacing ad hoc (Werte von `.15rem` bis `4rem` ohne Raster) | P2 | WP3 |
| A6 | `--text-secondary` für Labels UND Fließtext — keine rollenbasierte Zuordnung | P3 | WP3 |

## B — Landing / Workspace

| # | Finding | Prio | WP |
|---|---|---|---|
| B1 | **Bug:** Area-Icon rendert Literal-String `"folder"` als Chip (`{area.icon}` ist ein String-Feld) | P1 | WP5a |
| B2 | **Doppelte Empty-States:** „Noch keine Prozesse in diesem Bereich" (Area) + „Keine Prozesse im Workspace" (global) gleichzeitig sichtbar | P1 | WP5a |
| B3 | Grammatik: „1 Bereiche" / „1 Prozesse" — keine Singular-Form | P2 | WP5a |
| B4 | Header: 5 Aktionen mit gemischter Hierarchie; riesiger `Mein Workspace`-Titel (bis 3,4rem) verbraucht vertikale Fläche ohne Informationsgewinn | P2 | WP5a |
| B5 | Collapse-Chevron ist Text-Glyph `▾` statt Icon | P3 | WP5a |
| B6 | Prozesskarte: „0 Quick Wins" als einziger Metrik-Chip ist Rauschen; `min-height: 12rem` leert die Karte | P2 | WP5a |

## C — Import

| # | Finding | Prio | WP |
|---|---|---|---|
| C1 | **Kein Rückweg** zum Workspace (kein Header/Button auf `/import`) | P1 | WP5a |
| C2 | Hero: 900-weight Gradient-Wortmarke (bis 5,5rem) = klassische KI-Landing-Ästhetik; viel Leerfläche ohne Inhalt | P1 | WP5a |
| C3 | Kein „So funktioniert es" — Nutzer weiß nicht, was nach dem Import passiert | P2 | WP5a |

## D — Assessment

| # | Finding | Prio | WP |
|---|---|---|---|
| D1 | **BPMN-Canvas ist weiß** — bricht das Dark-Theme (DESIGN_SPEC fordert explizit dunklen Canvas); größter einzelner visuellen Bruch | P1 | WP5b |
| D2 | **Keine Legende** unter dem Diagramm (Farbcodierung unerklärt; steht so in DESIGN_SPEC) | P1 | WP5b |
| D3 | Header nicht sticky; beim Scrollen im Grid verliert man Kontext | P2 | WP5b |
| D4 | Score-Badges klein und rechts verortet; Mono-Zahlen könnten die „Command Center"-Identität tragen | P2 | WP5b |
| D5 | „BPMN.io"-Wasserzeichen unten rechts im Canvas (Default) | P3 | WP5b |

## E — Drawer (Interview)

| # | Finding | Prio | WP |
|---|---|---|---|
| E1 | **Pattern-Karten brechen bei 480px:** Titel umbrochen über 3 Zeilen, Icon schwebt isoliert rechts, Beschreibung winzig — schwächster Screen der App | P1 | WP5c |
| E2 | Sektions-Rhythmus inkonsistent (Boxes vs. Question-Blocks vs. Details mischen Paddings/Borders) | P2 | WP5c |
| E3 | ESC schließt Drawer nicht; kein Fokus-Management beim Öffnen | P1 | WP4 |
| E4 | Empfehlungsbox ist gut — kann als klarer Anker gestärkt werden | P3 | WP5c |

## F — Report

| # | Finding | Prio | WP |
|---|---|---|---|
| F1 | Text-Bug: „KI-geeignet,0 Schritte" — fehlendes Leerzeichen im Executive-Summary-Template | P1 | WP5c |
| F2 | Donut mit nur „offen" (19/19) = massiver Orang-Ring — wirkt wie Fehler; Neutral-State nötig | P2 | WP5c |
| F3 | Lane-Liste in der Meta-Zeile wird bei 4+ Lanes sehr lang | P3 | WP5c |

## G — Analyzing / States

| # | Finding | Prio | WP |
|---|---|---|---|
| G1 | AnalyzingView zeigt Fake-Fortschrittsschritte mit fixen Timern (nur noch bei echtem LLM-Warten sichtbar, aber weiterhin erfunden) | P2 | WP6 |
| G2 | Workspace-Load nutzt AnalyzingView mit Text „19 Schritte werden von der KI bewertet" beim allerersten Start (falscher Kontext) | P2 | WP6 |

## Bewusste Nicht-Änderungen (aus Phase 1, dokumentiert)
- Count-Up / Stagger-Animationen bleiben entfernt (DESIGN_SPEC wird hier korrigiert)
- Kein Framework-/CSS-Stack-Wechsel; Tokens werden unter bestehenden Klassennamen getauscht
- Inhaltliches Interview-Staging (15 Felder → Stufen) = Phase 4, hier nur visuelle Hierarchie
