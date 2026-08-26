# process2agent — Agent Guide

## 1. Projektuebersicht

**process2agent** ist eine clientseitige Web-App zur AI-Readiness-Bewertung von Geschäftsprozessen. Sie importiert BPMN-Prozessmodelle, führt durch ein geführtes Interview pro Prozessschritt und erzeugt druckbare AI-Readiness-Reports für Beratungssituationen.

### Kernprinzipien

1. **Client-Only:** Keine BPMN-Datei verlässt den Browser. Kein Upload, kein Backend. (LLM-Calls nur nach expliziter Nutzerkonfiguration.)
2. **LLM-Optional:** Die App funktioniert vollständig ohne LLM (regelbasiert). Provider: Anthropic API oder lokales Ollama.
3. **Mensch entscheidet:** Das System schlägt vor, der Nutzer bestätigt. Jede Entscheidung wird dokumentiert.
4. **Conservative Defaults:** Im Zweifel "Agent mit Freigabe", nicht "Agent autonom".
5. **Zielpositionierung:** Reports & Denkmaterial für AI-Consultants — bewusst KEINE Umsetzungsverfolgung/SAP-Integration.

---

## 2. Aktueller Projektstand

### Architektur-Schichten

| Schicht | Dateien | Zweck |
|---|---|---|
| App/Routing | `src/App.tsx` | View-Router (landing → import → assessment → report), Dialog-State, Autosave |
| Komponenten | `src/components/*.tsx` | UI; Workspace-Landing, BPMN-Viewer, Interview-Drawer, Report |
| Engine (pur) | `src/engine/*.ts` | Parsing, Enrichment, Automation-Level, LLM-Service, Summary — alle pure functions, getestet |
| State | `src/state/*.reducer.ts` | Zwei Reducer: `workspaceReducer` (Workspace/Prozesse) + `assessmentReducer` (aktuelles Assessment) |
| Persistenz | `src/storage/db.ts` | IndexedDB via `idb`; Workspace (Key `default`) + Processes mit Indizes |
| Daten | `src/data/*.ts` | `mappingRules.ts` (BPMN→Pattern), `navPatterns.ts` (Keyword-Muster) |
| Typen | `src/types/index.ts`, `src/types/workspace.ts` | Assessment-Typen / Workspace-Domäne |

### Wichtige Konzepte

- **Workspace:** Bereiche (Areas) enthalten Prozesse. Jeder Prozess = `ProcessEntry` mit BPMN-XML, Steps, Suggestions, Decisions, Summary, optional BusinessCase + SandboxTests.
- **Suggestion-Pipeline:** `bpmnParser` (DOMParser) → `domainEnrichment` (Mapping-Regeln + Keywords) → optional `llmService.analyzeBatch` (Anthropic/Ollama).
- **Automation-Level:** 4 Dimensionen (`dataStructure`, `decisionComplexity`, `systemAccess`, `exceptionRate`) → Stufe 0–3 via `automationLevel.computeAutomationLevel`.
- **Autosave:** Decisions werden mit 2s-Debounce in IndexedDB persistiert (`App.tsx`).
- **LLM-Config:** Doppelt gespeichert (localStorage-Fallback + Workspace-Settings) — Konsolidierung geplant (Phase 2).

---

## 3. Tech-Stack

| Komponente | Technologie |
|---|---|
| Framework | React 19 + TypeScript (strict) |
| BPMN | bpmn-js NavigatedViewer (Modeler-Umbau geplant, Phase 3) |
| State | React Context + `useReducer` (Zustand-Migration geplant, Phase 2) |
| Persistenz | IndexedDB via `idb` |
| Dokument-Extraktion | pdfjs-dist (Worker von CDN — Self-Hosting geplant), mammoth (DOCX) |
| Icons | lucide-react (KEINE Emojis im UI) |
| Build/Test | Vite 6 + Vitest (jsdom) |
| Report-Export | `window.print()` + `@media print` |

---

## 4. Befehle

```bash
npm install          # Abhängigkeiten installieren
npm run dev          # Dev-Server auf http://localhost:5173
npm run build        # Produktionsbuild (tsc -b && vite build) nach dist/
npm test             # Vitest einmalig ausführen
npm run test:watch   # Vitest im Watch-Modus
npx tsc --noEmit -p tsconfig.app.json   # TypeScript-Check ohne Build
```

Vor jedem Commit: `npm test` + Typecheck müssen grün sein.

---

## 5. Code-Style

- **UI-Texte:** Deutsch (Zielmarkt DACH). Kein Sprach-Mix (z.B. nicht "Reviewed" neben "Analysiert").
- **Code:** Englisch (Variablen, Funktionen, Typen).
- **TypeScript:** `strict: true`, kein `any`.
- **Icons:** Ausschließlich lucide-react — keine Emojis in UI-Strings.
- **Buttons:** Nur `primary-button` / `secondary-button` / `danger-button` Klassen verwenden.
- **Dialoge:** `ConfirmDialog`/`PromptDialog` aus `components/Dialogs.tsx` — niemals `window.prompt`/`window.confirm`.
- **CSS:** Plain CSS in `src/styles.css`, Design-Tokens unter `:root`. Tote Klassen vermeiden.
- **Animationen:** Dezent (≤250ms); `prefers-reduced-motion` respektieren.
- **Engine-Code:** Pure functions, keine React-Imports → jede neue Funktion bekommt einen Test.

---

## 6. Wichtige Design-Entscheidungen

- **Parser ohne bpmn-moddle:** Bewusst, DOMParser reicht für v2-Scope. (Graph-basierte Analyse kommt in Phase 3.)
- **Print-CSS statt jsPDF:** Robust, kein zusätzliches Paket.
- **Conservative Defaults:** Generische Task → `agent_with_approval`, nie `agent_autonomous`.
- **Lücken-Marker:** "Unklar"-Antworten erzeugen explizite Klärungsbedarf-Einträge im Report.
- **Bekannte Engine-Quirks (dokumentiert in Tests, Fixes geplant):**
  - Keyword-Matching per Substring: "prüfen" matcht in "Rechnung prüfen" vor dem Invoice-Pattern (`domainEnrichment.test.ts`)
  - BPMN-ID kann als Fallback-"Extension-Name" durchrutschen (`bpmnParser.test.ts`)
- **Statuswerte:** Aktuell 6 Status inkl. `implementing`/`live` — Reduktion auf 4 geplant (Positionierung: Denkmaterial, nicht Tracking).

---

## 7. Referenzdokumente

- **`process2agent_v1_spec.md`** — Historische Spezifikation (v1, teils überholt).
- **`MAPPING_TABLE.md`** — Kanonische Mapping-Referenz (Deutsch).
- **`docs/MAPPING_TABLE.md`** — Englische Übersetzung der Mapping-Tabelle.
- **`ROADMAP.md`** — Historische Roadmap (wird vom aktuellen Umsetzungsplan abgelöst).
- **`DESIGN_SPEC.md`** — Design-System ("Command Center" Dark Theme).

---

*Letzte Aktualisierung: 2026-08-26*
