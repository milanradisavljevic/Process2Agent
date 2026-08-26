# process2agent — Agent Guide

## 1. Projektuebersicht

**process2agent** ist eine clientseitige Web-App zur AI-Readiness-Bewertung von Geschäftsprozessen. Sie importiert BPMN-Prozessmodelle, führt durch ein geführtes Interview pro Prozessschritt und erzeugt druckbare AI-Readiness-Reports für Beratungssituationen.

### Kernprinzipien

1. **Client-Only:** Keine BPMN-Datei verlässt den Browser. Kein Upload, kein Backend, keine CDN-Runtime-Abhängigkeiten (Fonts/Worker sind gebündelt). LLM-Calls nur nach expliziter Nutzerkonfiguration.
2. **LLM-Optional:** Die App funktioniert vollständig ohne LLM (regelbasiert). Provider: Anthropic API oder lokales Ollama.
3. **Mensch entscheidet:** Das System schlägt vor, der Nutzer bestätigt. Jede Entscheidung wird dokumentiert.
4. **Conservative Defaults:** Im Zweifel "Agent mit Freigabe", nicht "Agent autonom".
5. **Zielpositionierung:** Reports & Denkmaterial für AI-Consultants — bewusst KEINE Umsetzungsverfolgung/SAP-Integration.

---

## 2. Aktueller Projektstand (nach Phase 2)

### Architektur-Schichten

| Schicht | Dateien | Zweck |
|---|---|---|
| Entry/Routing | `src/main.tsx`, `src/routes/AppRoutes.tsx` | HashRouter; Routen: `/` Landing · `/import` · `/process/:id` Assessment · `/process/:id/report`; Workspace-Load-Gate + `beforeunload`-Flush |
| Pages | `src/routes/{Landing,Import,Assessment,Report}Page.tsx` | Dünne Seitenkompositionen; Dialog-State ist seitenlokal |
| Komponenten | `src/components/*.tsx` | UI: WorkspaceLanding, BpmnViewer (Viewer), InterviewPanel (Drawer), ReportPreview, ResizableDrawer, Dialogs |
| Engine (pur) | `src/engine/*.ts` | bpmnParser, domainEnrichment, llmService, automationLevel, **processSummary (einzige Aggregat-Quelle)**, documentExtractor (+ lazy pdf/docx Extraktoren) — pure functions, getestet |
| Stores (Zustand) | `src/store/workspaceStore.ts`, `src/store/assessmentStore.ts`, `src/store/llmConfig.ts` | SSOT: Decisions leben AUSSCHLIESSLICH in `workspaceStore.processes[id].decisions`; assessmentStore hält nur UI-State (Index/Drawer/LLM-Status) |
| Persistenz | `src/storage/db.ts` | IndexedDB via `idb`; Export-Format v2.0 (liest 1.x+2.x, normalisiert Statuswerte) |
| Hooks | `src/hooks/useBpmnImport.ts` | Geteilter Import-/Demo-Flow für Landing + ImportPage |
| Daten | `src/data/mappingRules.ts`, `navPatterns.ts` | BPMN→Pattern-Regeln, Keyword-Muster |
| Styles | `src/styles/*.css` | Split nach Domäne (base/buttons/landing/assessment/drawer/dialogs/report/animations), Tokens in base.css |

### Wichtige Konzepte

- **Single Source of Truth:** Keine Decision-Kopien mehr. Mutationen laufen über `workspaceStore.updateProcess(id, updater)` → Summary + Status werden dort zentral neu abgeleitet.
- **Autosave:** Debounce-Scheduler im workspaceStore (2s). Flush bei Routenwechsel (`flushPendingPersists`) und `beforeunload`. Kein useEffect-Timing mehr.
- **Statusmigration:** Legacy-Statuswerte `implementing`/`live` → `validated` beim Laden/Import (`normalizeStatus`). Aktive Statuswerte: imported → analyzed → reviewed → validated.
- **Change Impact:** Immer aktiv (ehemaliges `changeImpactEnabled`-Flag entfernt).
- **Suggestion-Pipeline:** `bpmnParser` (DOMParser) → `domainEnrichment` (Regeln + Keywords) → optional `analyzeBatch` (Anthropic/Ollama), orchestriert von `assessmentStore.openProcess/startAnalysis`. Bei `provider==='none'` kein Fake-Analyzing-Screen.
- **Resume-Verhalten:** Rückkehr vom Report zum selben Prozess erhält Index/Drawer/LLM-Ergebnis (keine erneute Batch-Analyse).
- **Demo-Daten:** `demo_produktlaunch.bpmn` (4 Lanes, generische Tasks) und `demo_p2p_bestellung.bpmn` (spezialisierte Task-Typen + Gateway); beide per „Demo-Prozess laden"-Button importierbar und als Parser-Fixtures in Tests genutzt.

---

## 3. Tech-Stack

| Komponente | Technologie |
|---|---|
| Framework | React 19 + TypeScript (strict) |
| State | Zustand 5 |
| Routing | react-router 8 (HashRouter — statisches Hosting ohne Rewrites) |
| BPMN | bpmn-js NavigatedViewer (Modeler-Umbau geplant, Phase 3) |
| Persistenz | IndexedDB via idb |
| Dokument-Extraktion | pdfjs-dist + mammoth — ausschließlich dynamisch importiert (eigene Chunks); pdf.worker self-hosted via `?url` |
| Fonts | @fontsource-variable (DM Sans, JetBrains Mono) — kein Google-CDN |
| Icons | lucide-react (KEINE Emojis im UI) |
| Build/Test | Vite 6 + Vitest (jsdom), manualChunks: vendor-react / vendor-bpmn |

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

Vor jedem Commit: `npm test` + Typecheck müssen grün sein. Store-Tests mocken `storage/db` via `vi.mock`.

---

## 5. Code-Style

- **UI-Texte:** Deutsch (Zielmarkt DACH). Kein Sprach-Mix.
- **Code:** Englisch (Variablen, Funktionen, Typen).
- **TypeScript:** `strict: true`, kein `any`.
- **Icons:** Ausschließlich lucide-react — keine Emojis in UI-Strings.
- **Buttons:** Nur `primary-button` / `secondary-button` / `danger-button`.
- **Dialoge:** `ConfirmDialog`/`PromptDialog` aus `components/Dialogs.tsx` — niemals `window.prompt`/`window.confirm`.
- **CSS:** Plain CSS in `src/styles/*`, Design-Tokens in base.css unter `:root`. Selektor nur in einer Datei definieren.
- **Animationen:** Dezent (≤250ms); `prefers-reduced-motion` respektieren.
- **Engine-Code:** Pure functions, keine React-Imports → jede Funktion bekommt einen Test.
- **Imports:** Statisch oben im File; keine dynamischen Imports außer für Lazy-Chunks (pdf/docx).

---

## 6. Wichtige Design-Entscheidungen

- **Parser ohne bpmn-moddle** (noch): DOMParser reicht für aktuellen Scope. Graph-basierte Analyse + Voll-Editing via bpmn-js Modeler = Phase 3.
- **Print-CSS statt jsPDF.**
- **Conservative Defaults:** Generische Task → `agent_with_approval`, nie `agent_autonomous`.
- **Lücken-Marker:** "Unklar"-Antworten erzeugen Klärungsbedarf-Einträge im Report.
- **Bekannte Engine-Quirks (dokumentiert in Tests, Fixes geplant):**
  - Keyword-Matching per Substring: "prüfen" matcht in "Rechnung prüfen" vor dem Invoice-Pattern (`domainEnrichment.test.ts`)
  - BPMN-ID kann als Fallback-"Extension-Name" durchrutschen (`bpmnParser.test.ts`)
- **Report-Methodik-Anhang** wird aus den Mapping-Daten generiert — bleibt automatisch synchron zum Code.

---

## 7. Roadmap (aktuell)

1. **Phase 3 — UX/Design-Review & Redesign: ✅ erledigt (2026-08-26).** Findings-Katalog: `docs/reviews/FINDINGS.md`, Vorher/Nachher-Screenshots: `docs/reviews/{before,after}/`. Ergebnis: Token-Skalen (Typo/Spacing), Button-System (8px), Dark BPMN-Canvas + Legende, Sticky-Header, A11y (Kontrast/Fokus/ESC), ehrliche Analyzing-States, Landing/Import-Refresh. Screenshot-Tooling: `npx playwright test` (e2e/screenshots.spec.ts, `SHOT_TARGET=<dir>`).
2. **Multi-Provider-LLM (nächster Schritt):** OpenAI, DeepSeek, Qwen, Kimi, Mistral — alle OpenAI-kompatibel → generischer `callOpenAICompatible` + Preset-Tabelle (`data/providerPresets.ts`), `LLMConfig` verschlankt zu `{provider, model, apiKey, ollamaUrl}` inkl. Settings-Migration, Provider-Dropdown im LLMConfigPanel, Option „Benutzerdefiniert (OpenAI-kompatibel)" mit freier Base-URL. Voranalyse vorhanden (Session 2026-08-26).
3. **Phase 4 — Feature-Kern:** Portfolio-Dashboard (Cross-Prozess-Readiness), Export-Suite (Markdown/HTML/JSON), gestuftes Interview, Fragenkatalog-Generator.
4. **Später:** BPMN Voll-Editing (Modeler + graphAnalyzer), Workshop-Modus, AI-Act-Anhang, EN-i18n, Deployment.

---

## 8. Referenzdokumente

- **`process2agent_v1_spec.md`** — Historische Spezifikation (v1, teils überholt).
- **`MAPPING_TABLE.md`** — Kanonische Mapping-Referenz (Deutsch).
- **`docs/MAPPING_TABLE.md`** — Englische Übersetzung der Mapping-Tabelle.
- **`ROADMAP.md`** — Historisch (wird durch Abschnitt 7 hier abgelöst).
- **`DESIGN_SPEC.md`** — Design-System ("Command Center" Dark Theme).

---

*Letzte Aktualisierung: 2026-08-26*
