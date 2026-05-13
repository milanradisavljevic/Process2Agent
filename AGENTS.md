# process2agent — Agent Guide

## 1. Projektuebersicht

**process2agent** ist eine clientseitige Web-App zur AI-Readiness-Bewertung von Geschaeftsprozessen. Sie importiert BPMN-Prozessmodelle und fuehrt den Nutzer durch ein gefuehrtes Interview pro Prozessschritt. Das Ergebnis ist ein druckbarer AI-Readiness-Report.

### Kernprinzipien

1. **Client-Only:** Keine BPMN-Datei verlaesst den Browser. Kein Upload, kein Backend, kein Server-Log.
2. **LLM-Optional:** Die App funktioniert vollstaendig ohne LLM (rein regelbasiert). Ollama/Cloud-API ist v2-Scope.
3. **Mensch entscheidet:** Das System schlaegt vor, der Nutzer bestaetigt. Jede Entscheidung wird dokumentiert.
4. **Conservative Defaults:** Im Zweifel "Agent mit Freigabe", nicht "Agent autonom".

### Zielgruppe (v1)

Primaer: AI-Consultants und Prozessberater — als Live-Beratungswerkzeug in Kundengespraechen.
Sekundaer: Milan selbst — als Portfolio-Stueck, Gespraechsoeffner bei Bewerbungen.

---

## 2. Aktueller Projektstand (Stand: 2026-05-14)

### Was existiert

| Datei/Verzeichnis | Zweck |
|---|---|
| `src/App.tsx` | Root-Komponente, View-Router (import → assessment → report) |
| `src/components/BpmnViewer.tsx` | bpmn-js Wrapper; Instanz in `useRef`, kein Re-Render-Loop |
| `src/components/FileDropZone.tsx` | BPMN-Import per Drag-and-Drop oder Klick |
| `src/components/InterviewPanel.tsx` | Gefuehrtes Interview pro Prozessschritt (Pattern, Datenschutz, Komplexitaet) |
| `src/components/ReportPreview.tsx` | Druckbarer AI-Readiness-Report |
| `src/components/ScoreBar.tsx` | Echtzeit-Uebersicht der Bewertungsfortschritts |
| `src/components/ErrorBoundary.tsx` | React Error Boundary fuer unerwartete Laufzeitfehler |
| `src/engine/bpmnParser.ts` | BPMN-XML parsen via Browser `DOMParser` — kein bpmn-moddle |
| `src/engine/domainEnrichment.ts` | Keyword-Matching gegen `navPatterns.ts` |
| `src/engine/reportGenerator.ts` | Markdown-Report und `AssessmentSummary` erzeugen |
| `src/data/mappingRules.ts` | BPMN-Typ → Pattern-Zuordnung, Labels, Hints |
| `src/data/navPatterns.ts` | P2P-Domain-Patterns mit Keywords |
| `src/state/assessmentReducer.ts` | React `useReducer` fuer den Bewertungszustand |
| `src/types/index.ts` | Alle TypeScript-Interfaces und Union-Types |
| `src/styles.css` | Plain CSS (kein Tailwind) |
| `README.md` | Projektbeschreibung, Tech-Stack, Architektur-Diagramm |
| `MAPPING_TABLE.md` | Standalone-Mapping-Referenz fuer Vortraege und Artikel |
| `LICENSE` | MIT |
| `.gitignore` | node_modules, dist, Zone.Identifier |
| `process2agent_v1_spec.md` | Vollstaendige Spezifikation (892 Zeilen) |
| `subprozess_launchvorbereitung.bpmn` | Beispiel-BPMN-Datei zum Testen |

### Was noch aussteht (v2+)

| Feature | Begruendung fuer v2 |
|---|---|
| LLM-Vorschlaege (Ollama / Anthropic API) | Ablenkung fuer v1-Demo; regelbasiert reicht fuer Demos |
| YAML-Config-Export | v1 fokussiert auf Report als primaeren Output |
| Vercel/Netlify Deployment | Naechster Schritt nach GitHub-Repo |
| Unit-Tests | bpmnParser.ts und domainEnrichment.ts testen |
| Weitere BPMN-Templates (O2C, Invoice) | Nach P2P-Feedback |

---

## 3. Tech-Stack

| Komponente | Technologie |
|---|---|
| Framework | React 19 + TypeScript (strict) |
| BPMN-Rendering | bpmn-js (Camunda, MIT) |
| BPMN-Parsing | Browser `DOMParser` (kein SDK) |
| Styling | Custom CSS, plain (kein Tailwind) |
| State | React Context + `useReducer` |
| Build | Vite 6 |
| Report-Export | `window.print()` + `@media print` |

---

## 4. Build-Befehle

```bash
npm install        # Abhaengigkeiten installieren
npm run dev        # Dev-Server auf http://localhost:5173
npm run build      # Produktionsbuild nach dist/
npx tsc --noEmit   # TypeScript-Check ohne Build
npm run preview    # Produktionsbuild lokal vorschauen
```

---

## 5. Code-Style

- **UI-Texte:** Deutsch (Zielmarkt DACH, v1-Scope)
- **Code:** Englisch (Variablen, Funktionen, Typen)
- **TypeScript:** `strict: true`, kein `any` ohne Kommentar mit Begruendung
- **bpmn-js:** Instanz immer in `useRef`, nie in React-State
- **CSS:** Utility-Klassen in `styles.css`, keine Inline-Styles ausser dynamisch

---

## 6. Wichtige Design-Entscheidungen

- **Parser ohne bpmn-moddle:** Bewusst. `DOMParser` reicht fuer den v1-Scope, reduziert Bundle-Groesse.
- **Print-CSS statt jsPDF:** Robuster, kein zusaetzliches Paket, funktioniert in allen Browsern.
- **Conservative Defaults:** `agent_with_approval` als Default fuer generische Tasks — nicht `agent_autonomous`.
- **Luecken-Marker:** "Unklar"-Antworten erzeugen explizite Luecken im Report (wertvoller als Verdecken).

---

## 7. Referenzdokumente

- **`process2agent_v1_spec.md`** — Vollstaendige Spezifikation mit allen technischen Details.
- **`MAPPING_TABLE.md`** — Die Mapping-Tabelle als eigenstaendiges, zitierbares Dokument.
- **`README.md`** — Projektbeschreibung fuer GitHub.

---

*Letzte Aktualisierung: 2026-05-14*
