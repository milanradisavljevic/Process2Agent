# process2agent — Roadmap

> Stand: 2026-05-14 · Autor: Milan Radisavljevic
>
> Diese Roadmap basiert auf dem Quality-Check vom 2026-05-14 und priorisiert nach Wertschöpfung für Portfolio und Consulting-Einsatz.

---

## ✅ Phase 1: Portfolio-Ready (abgeschlossen)

| Task | Status | Wert |
|------|--------|------|
| README.md mit Architektur-Diagramm | ✅ Done | Portfolio |
| MAPPING_TABLE.md als zitierbares Dokument | ✅ Done | Portfolio + Vorträge |
| MIT-Lizenz + .gitignore | ✅ Done | Open Source |
| Unused Dependencies entfernt | ✅ Done | Technische Sauberkeit |
| Alle 10 Patterns im Interview wählbar | ✅ Done | UX-Korrektheit |
| AGENTS.md aktualisiert | ✅ Done | Projekt-Doku |
| GitHub-Repo veröffentlicht | ✅ Done | Sichtbarkeit |
| Umlaute korrigiert (57+ Stellen) | ✅ Done | Professionalität |
| Premium UX-Redesign (Dark Landing, Pattern-Icons) | ✅ Done | Wow-Faktor |

---

## 🔧 Phase 2: Validierung (empfohlen: nächste Woche)

**Ziel:** Der Parser funktioniert mit echten BPMN-Exporten aus Signavio, Camunda und BPMN.io.

### 2.1 `<documentation>`-Extraktion ⭐ Hohe Priorität

**Was:** BPMN-Elemente enthalten oft `<documentation>`-Tags mit wertvollen Beschreibungen (z.B. "Finale Verkaufsargumentation für Handelspartner"). Der Parser ignoriert sie aktuell.

**Warum wertvoll:** Verbessert die Suggestion-Qualität des Domain-Enrichment deutlich. Im Interview als aufklappbarer Kontext anzeigen ("Prozessdokumentation: ..."). Differenzierungsmerkmal gegenüber generischen Tools.

**Aufwand:** ~2h (bpmnParser.ts + InterviewPanel.tsx)

**Scope:**
- `bpmnParser.ts`: `<documentation>`-Element als optionales Feld in `ProcessElement` extrahieren
- `InterviewPanel.tsx`: Documentation als collapsible Info-Box unter dem Element-Namen anzeigen
- `domainEnrichment.ts`: Documentation-Text in das Keyword-Matching einbeziehen

### 2.2 Prozess-Level-Summary ⭐ Mittlere Priorität

**Was:** Nach dem BPMN-Import eine Zusammenfassung anzeigen: "16 Schritte erkannt · 12 matchen P2P-Muster · 3 haben technische Namen."

**Warum wertvoll:** Gibt dem Nutzer sofort Vertrauen in den Parser. Zeigt, dass die App "verstanden hat" was geladen wurde.

**Aufwand:** ~1h (App.tsx Header erweitern, domainEnrichment.ts Match-Count zurückgeben)

### 2.3 Zweite Test-BPMN ⭐ Mittlere Priorität

**Was:** Eine BPMN mit `<userTask>`, `<serviceTask>`, `<exclusiveGateway>` — nicht nur generische `<task>`. Die spezialisierten Mapping-Regeln in `mappingRules.ts` sind aktuell ungetestet.

**Aufwand:** ~30min (BPMN-Datei erstellen oder aus Camunda-Beispielen nehmen)

### 2.4 Echte Signavio-BPMN validieren ⭐ Kritisch für Demo-Tauglichkeit

**Was:** Einen anonymisierten Prozess-Export aus der Praxis (Stiegl-Zeit oder öffentliche BPMN-Sammlung) durch den Parser laufen lassen. Bruchstellen dokumentieren und fixen.

**Warum kritisch:** Die Test-BPMN ist von Claude generiert — echte Signavio-Exporte haben andere XML-Strukturen (Signavio-Extensions, `signavio:signavioMetaData`, andere Namespace-Präfixe).

**Aufwand:** ~3–5h je nach Anzahl der Bruchstellen

---

## 🚀 Phase 3: Demo & Sichtbarkeit (Wochen 3–4)

### 3.1 Vercel/Netlify Deployment

**Was:** Static Site Deployment. Die App braucht kein Backend — ein `npm run build` + Deploy-Link reicht.

**Warum jetzt:** Ein klickbarer Demo-Link auf LinkedIn und im CV ist 10× wertvoller als ein GitHub-Repo-Link.

**Aufwand:** ~30min

### 3.2 Screenshot / GIF für README

**Was:** Screenshot der Landing-Page und des Interview-Panels (mit geladenem Beispiel-BPMN). GIF wäre noch besser (Screencast: Datei laden → Interview → Report).

**Tools:** Loom (kostenlos), OBS, oder macOS Screenshot-Tool + Giphy Capture.

### 3.3 Case Study: docs/CASE_STUDY_P2P.md

**Was:** Vollständiger Durchlauf des P2P-Prozesses mit Screenshots, Entscheidungen und generiertem Report. Das Dokument für Bewerbungsgespräche.

**Aufwand:** ~2h (Inhalt) + Screenshots

### 3.4 LinkedIn-Artikel

**Was:** "Wie ich BPMN-Prozesse in AI-Agent-Workflows übersetze" — kurz (800 Wörter), mit Link zur Demo und zum Repo.

---

## 🔬 Phase 4: Vertiefung (ab Monat 2, nur bei Nachfrage)

*Nur angehen, wenn sich echtes Interesse zeigt (GitHub-Stars, Meetup-Feedback, Bewerbungsgespräche).*

| Feature | Aufwand | Bedingung |
|---------|---------|-----------|
| YAML-Config-Export | 3–5h | Nachfrage von AI-Consultants |
| LLM-Stufe 3 (Ollama opt-in) | 8–12h | Stabiler v1-Betrieb, Datenschutz-Konzept fertig |
| Weitere Templates (O2C, Onboarding) | 4–8h pro Template | Nach P2P-Feedback in Kundengesprächen |
| DSGVO-Interview vertiefen | 3–5h | Konkretes Datenschutz-Mandat |
| Englische Lokalisierung | 5–8h | Internationales Interesse |
| Unit-Tests (bpmnParser, domainEnrichment) | 3–5h | Wenn codebase wächst |

---

## Nicht umsetzen (bewusste Entscheidungen)

| Feature | Grund |
|---------|-------|
| Template-Matching auf Prozess-Ebene | "80% match zu P2P" ist konzeptuell gut, aber Nutzen im Demo-Kontext gering. Keyword-Matching reicht. |
| BPMN-Editor integrieren | Eigene Tools (Camunda, Signavio) sind besser. Out-of-scope. |
| Login / Backend / Cloud-Sync | Widerspricht der Privacy-Positionierung. Kein SaaS. |
| Token-Kosten-Schätzung | Ohne echtes Prompt-Design spekulativ. |
| Multi-Prozess-Vergleich | Nice-to-have, nicht differenzierend. |

---

*Letzte Aktualisierung: 2026-05-14*
