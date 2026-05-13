# process2agent v1 -- Spezifikation

**AI-Readiness Assessment fuer Geschaeftsprozesse**

Version: 1.0-draft
Datum: 2026-05-13
Autor: Milan Radisavljevic (Architektur), Claude (Spezifikation)
Status: Entwurf zur Validierung

---

## 1. Projektuebersicht

### 1.1 Was process2agent ist

Eine clientseitige Web-App, die BPMN-Prozessmodelle importiert und durch ein gefuehrtes Interview pro Prozessschritt bewertet, wo KI-Agenten sinnvoll einsetzbar sind, wo Menschen im Loop bleiben muessen und wo Datenschutz lokales Routing erzwingt. Das Ergebnis ist ein AI-Readiness-Report als druckbares PDF/Markdown und eine maschinenlesbare YAML-Konfiguration.

### 1.2 Was process2agent nicht ist

- Kein Prozess-Editor (Modellierung findet in Signavio, Camunda Modeler o.Ae. statt)
- Keine Agent-Runtime (die App fuehrt keine Agents aus)
- Kein Compliance-Zertifikat (die App dokumentiert menschliche Entscheidungen, sie ersetzt keinen DPO)
- Kein generischer BPMN-Parser fuer beliebige Diagramme (v1 arbeitet template-basiert)
- Kein SaaS mit Login, Accounts oder serverseitiger Datenspeicherung

### 1.3 Zielgruppe

Primaer: AI-Consultants und Prozessberater, die fuer Kunden eine erste Machbarkeitsanalyse erstellen ("Wo lohnt sich KI in diesem Prozess?"). Das Tool beschleunigt die Analysephase, es ersetzt sie nicht.

Sekundaer: Prozessmanager in KMU, die intern pruefen wollen, welche ihrer dokumentierten Ablaeufe KI-Potenzial haben.

Tertiaer: Milan selbst -- als Portfolio-Stueck, Gespraechsoeffner bei Bewerbungen und Grundlage fuer Vortraege.

### 1.4 Strategische Positionierung

Open-Source-Kern auf GitHub (MIT-Lizenz). Die Mapping-Tabelle und das Assessment-Framework sind frei verfuegbar. Monetarisierung (falls gewuenscht) ueber Beratungsleistungen, nicht ueber Software-Lizenzen. Die App ist die Demo, nicht das Produkt.

---

## 2. Architektur

### 2.1 Systemgrenzen

```
+-------------------------------------------------------+
|  Browser (Client-Only, kein Backend)                   |
|                                                        |
|  +------------------+    +-------------------------+   |
|  | BPMN-Import      |    | Template-Engine         |   |
|  | (bpmn-moddle)    |--->| (3-5 Referenzprozesse)  |   |
|  +------------------+    +-------------------------+   |
|           |                         |                  |
|           v                         v                  |
|  +--------------------------------------------------+ |
|  | Interview-Flow                                    | |
|  | (gefuehrte Fragen pro Prozessschritt)             | |
|  | Optional: LLM-Vorschlaege via Ollama/API          | |
|  +--------------------------------------------------+ |
|           |                                            |
|           v                                            |
|  +------------------+    +-------------------------+   |
|  | Report-Generator |    | Config-Generator        |   |
|  | (Markdown/PDF)   |    | (YAML)                  |   |
|  +------------------+    +-------------------------+   |
+-------------------------------------------------------+
```

### 2.2 Designprinzipien

1. **Client-Only**: Keine BPMN-Datei verlaesst den Browser. Kein Upload, kein Backend, kein Server-Log. Privacy by Design.
2. **LLM-Optional**: Die App funktioniert vollstaendig ohne LLM (rein regelbasiert). Ein LLM (lokal via Ollama oder Cloud via API) verbessert die Vorschlaege, ist aber kein Requirement.
3. **Mensch entscheidet**: Das LLM schlaegt vor, der Nutzer bestaetigt. Jede Entscheidung wird dokumentiert. Der Report zeigt die menschliche Entscheidung, nicht die KI-Vermutung.
4. **Template-First**: v1 parst BPMN nicht generisch, sondern matched gegen vordefinierte Prozessmuster. Das reduziert BPMN-Dialekt-Probleme und Edge Cases.

### 2.3 Tech-Stack

| Komponente | Technologie | Begruendung |
|---|---|---|
| Frontend-Framework | React 18+ mit TypeScript | Milans bestehender Stack (Minty Dashboard) |
| BPMN-Rendering | bpmn-js (Camunda, MIT-Lizenz) | De-facto-Standard fuer BPMN-Visualisierung im Browser |
| BPMN-Parsing | bpmn-moddle | Parst .bpmn XML in JavaScript-Objektmodell |
| Styling | Tailwind CSS | Schnelle Iteration, keine eigene Design-System-Pflege |
| State Management | React Context + useReducer | Ausreichend fuer Single-Page-App ohne Backend |
| Report-Export | jsPDF + Markdown-Template | PDF-Generierung clientseitig |
| Config-Export | js-yaml | YAML-Serialisierung |
| LLM-Anbindung (optional) | fetch() an Ollama localhost:11434 oder Anthropic API | Kein SDK noetig, reiner HTTP-Call |
| Hosting (Demo) | Vercel oder Netlify (Static Site) | Kostenlos, kein Backend noetig |
| Build | Vite | Schneller als CRA, besser fuer Libraries wie bpmn-js |

### 2.4 Verzeichnisstruktur

```
process2agent/
├── public/
│   └── templates/                  # Referenz-BPMN-Dateien fuer Template-Matching
│       ├── purchase-to-pay.bpmn
│       ├── order-to-cash.bpmn
│       └── invoice-verification.bpmn
├── src/
│   ├── components/
│   │   ├── BpmnViewer.tsx          # bpmn-js Wrapper
│   │   ├── InterviewPanel.tsx      # Rechte Seite: Fragen pro Schritt
│   │   ├── StepCard.tsx            # Einzelne Schritt-Karte im Interview
│   │   ├── ReportPreview.tsx       # Vorschau des AI-Readiness-Reports
│   │   ├── ScoreBar.tsx            # Echtzeit-Score oben
│   │   └── FileDropZone.tsx        # BPMN-Import per Drag-and-Drop
│   ├── engine/
│   │   ├── bpmnParser.ts           # BPMN-XML einlesen, normalisieren
│   │   ├── templateMatcher.ts      # Match gegen Referenz-Templates
│   │   ├── mappingRules.ts         # Regelbasierte Pattern-Zuweisung
│   │   ├── interviewQuestions.ts   # Frage-Katalog pro Elementtyp
│   │   ├── llmClassifier.ts       # Optionale LLM-Vorschlaege
│   │   ├── reportGenerator.ts     # Markdown/PDF-Report erzeugen
│   │   └── configGenerator.ts     # YAML-Config erzeugen
│   ├── data/
│   │   ├── mappingTable.ts         # Die zentrale Mapping-Tabelle
│   │   ├── navPatterns.ts          # NAV/BC-spezifische Task-Muster
│   │   └── privacyQuestions.ts     # DSGVO-Fragenkatalog
│   ├── types/
│   │   └── index.ts                # TypeScript-Interfaces
│   ├── App.tsx
│   └── main.tsx
├── docs/
│   ├── MAPPING_TABLE.md            # Die Mapping-Tabelle als Standalone-Dokument
│   ├── ARCHITECTURE.md             # Architektur-Diagramm und Erklaerung
│   └── CASE_STUDY_P2P.md          # Beispiel-Durchlauf am P2P-Prozess
├── README.md
├── LICENSE                         # MIT
├── package.json
└── vite.config.ts
```

---

## 3. Die Mapping-Tabelle

### 3.1 Kernlogik

Die Mapping-Tabelle ist das intellektuelle Zentrum der App. Sie bildet BPMN-Elementtypen auf Agentic Patterns ab. Die Zuordnung ist ein Startvorschlag, nicht eine Endentscheidung.

Wichtig: Die Tabelle ist bewusst konservativ. Im Zweifel schlaegt sie "Mensch bleibt im Loop" vor, nicht "Agent uebernimmt". Das ist eine Designentscheidung, keine technische Einschraenkung. Ein Tool, das zu aggressiv automatisiert, verliert das Vertrauen der Zielgruppe (Prozessmanager und DPOs).

### 3.2 Mapping-Regeln (Stufe 1: regelbasiert)

```typescript
// src/data/mappingTable.ts

export type AgenticPattern =
  | 'human_in_the_loop'        // Mensch entscheidet, Agent unterstuetzt
  | 'agent_autonomous'          // Agent fuehrt aus, Mensch wird informiert
  | 'agent_with_approval'       // Agent bereitet vor, Mensch gibt frei
  | 'rule_based_automation'     // Kein LLM noetig, deterministische Logik
  | 'mcp_or_api_call'           // Systemintegration (ERP, DMS, Mail)
  | 'local_code_execution'      // Skript/Berechnung ohne LLM
  | 'notification_and_wait'     // Benachrichtigung an externen Akteur
  | 'llm_classification'        // LLM klassifiziert/bewertet Input
  | 'llm_generation'            // LLM erzeugt Text/Dokument
  | 'needs_clarification';      // Prozessschritt zu unklar fuer Zuordnung

export type PrivacyLevel =
  | 'pii_confirmed'             // Personenbezogene Daten, lokal zwingend
  | 'pii_likely'                // Wahrscheinlich PII, Nutzer muss bestaetigen
  | 'pseudonymized'             // Pseudonymisiert, Cloud moeglich mit DPA
  | 'no_pii'                    // Keine personenbezogenen Daten
  | 'unknown';                  // Nutzer muss entscheiden

export type ComplexityClass =
  | 'low'                       // Einfache Regel, kurzer Prompt, wenig Kontext
  | 'medium'                    // Moderater Kontext, Standard-Prompt
  | 'high'                      // Grosser Kontext, Multi-Step, Iteration noetig
  | 'unknown';

export interface MappingRule {
  bpmnType: string;
  defaultPattern: AgenticPattern;
  defaultPrivacy: PrivacyLevel;
  defaultComplexity: ComplexityClass;
  rationale: string;             // Begruendung fuer den Vorschlag
  interviewRequired: boolean;    // Muss der Nutzer aktiv bestaetigen?
  warningIfAutomatic?: string;   // Warnung, falls Nutzer "agent_autonomous" waehlt
}

export const MAPPING_RULES: MappingRule[] = [
  {
    bpmnType: 'bpmn:UserTask',
    defaultPattern: 'human_in_the_loop',
    defaultPrivacy: 'unknown',
    defaultComplexity: 'unknown',
    rationale: 'User Tasks sind per Definition menschliche Taetigkeiten. '
      + 'KI kann unterstuetzen (Vorschlaege, Zusammenfassungen), '
      + 'aber die Entscheidung bleibt beim Menschen.',
    interviewRequired: true,
  },
  {
    bpmnType: 'bpmn:ServiceTask',
    defaultPattern: 'mcp_or_api_call',
    defaultPrivacy: 'unknown',
    defaultComplexity: 'medium',
    rationale: 'Service Tasks sind Systemaufrufe. Das Zielsystem '
      + '(ERP, DMS, Mail-Server) bestimmt die Integration. '
      + 'MCP, REST-API oder RPA sind moeglich.',
    interviewRequired: true,
    warningIfAutomatic: 'Service Tasks koennen auf Legacy-Systeme '
      + 'zugreifen, die keine API haben. Integration pruefen.',
  },
  {
    bpmnType: 'bpmn:ScriptTask',
    defaultPattern: 'local_code_execution',
    defaultPrivacy: 'no_pii',
    defaultComplexity: 'low',
    rationale: 'Script Tasks fuehren deterministische Berechnungen aus. '
      + 'Kein LLM noetig, existierender Code kann uebernommen werden.',
    interviewRequired: false,
  },
  {
    bpmnType: 'bpmn:ManualTask',
    defaultPattern: 'notification_and_wait',
    defaultPrivacy: 'unknown',
    defaultComplexity: 'low',
    rationale: 'Manuelle Tasks sind physische oder externe Taetigkeiten '
      + '(Ware pruefen, Dokument unterschreiben). '
      + 'KI kann nur benachrichtigen und auf Bestaetigung warten.',
    interviewRequired: false,
  },
  {
    bpmnType: 'bpmn:BusinessRuleTask',
    defaultPattern: 'rule_based_automation',
    defaultPrivacy: 'no_pii',
    defaultComplexity: 'low',
    rationale: 'Business Rule Tasks enthalten deterministische Regeln. '
      + 'Kein LLM noetig, If/Else-Logik oder DMN-Engine reicht.',
    interviewRequired: false,
  },
  {
    bpmnType: 'bpmn:SendTask',
    defaultPattern: 'agent_with_approval',
    defaultPrivacy: 'pii_likely',
    defaultComplexity: 'medium',
    rationale: 'Send Tasks versenden Nachrichten (Mail, Benachrichtigung). '
      + 'LLM kann Entwurf generieren, Mensch gibt frei. '
      + 'Empfaengerdaten sind haeufig personenbezogen.',
    interviewRequired: true,
  },
  {
    bpmnType: 'bpmn:ReceiveTask',
    defaultPattern: 'mcp_or_api_call',
    defaultPrivacy: 'unknown',
    defaultComplexity: 'low',
    rationale: 'Receive Tasks warten auf externe Nachrichten. '
      + 'Integration via MCP, Webhook oder Polling.',
    interviewRequired: false,
  },
  {
    bpmnType: 'bpmn:ExclusiveGateway',
    defaultPattern: 'needs_clarification',
    defaultPrivacy: 'no_pii',
    defaultComplexity: 'unknown',
    rationale: 'Exclusive Gateways koennen regelbasiert (Betrag > 5000) '
      + 'oder urteilsbasiert (Reklamation berechtigt?) sein. '
      + 'Die App kann das nicht automatisch unterscheiden.',
    interviewRequired: true,
  },
  {
    bpmnType: 'bpmn:ParallelGateway',
    defaultPattern: 'rule_based_automation',
    defaultPrivacy: 'no_pii',
    defaultComplexity: 'low',
    rationale: 'Parallele Ausfuehrung ist ein Orchestrierungsmuster, '
      + 'keine inhaltliche Entscheidung. Kein LLM noetig.',
    interviewRequired: false,
  },
  {
    bpmnType: 'bpmn:InclusiveGateway',
    defaultPattern: 'needs_clarification',
    defaultPrivacy: 'no_pii',
    defaultComplexity: 'medium',
    rationale: 'Inclusive Gateways aktivieren einen oder mehrere Pfade. '
      + 'Die Entscheidungslogik muss geklaert werden.',
    interviewRequired: true,
  },
  {
    bpmnType: 'bpmn:StartEvent',
    defaultPattern: 'mcp_or_api_call',
    defaultPrivacy: 'no_pii',
    defaultComplexity: 'low',
    rationale: 'Startereignisse sind Trigger: Formular-Submit, '
      + 'Timer, eingehende Nachricht. Integration via MCP/Webhook.',
    interviewRequired: false,
  },
  {
    bpmnType: 'bpmn:EndEvent',
    defaultPattern: 'notification_and_wait',
    defaultPrivacy: 'no_pii',
    defaultComplexity: 'low',
    rationale: 'Endereignisse sind Abschluesse: Benachrichtigung, '
      + 'Report-Generierung, Status-Update.',
    interviewRequired: false,
  },
  {
    bpmnType: 'bpmn:IntermediateThrowEvent',
    defaultPattern: 'notification_and_wait',
    defaultPrivacy: 'unknown',
    defaultComplexity: 'low',
    rationale: 'Intermediate Throw Events senden Signale oder Nachrichten. '
      + 'Integration via MCP oder Webhook.',
    interviewRequired: false,
  },
  {
    bpmnType: 'bpmn:IntermediateCatchEvent',
    defaultPattern: 'mcp_or_api_call',
    defaultPrivacy: 'unknown',
    defaultComplexity: 'low',
    rationale: 'Intermediate Catch Events warten auf externe Signale. '
      + 'Timer-Events werden zu Cron-Jobs.',
    interviewRequired: false,
  },
  {
    bpmnType: 'bpmn:SubProcess',
    defaultPattern: 'needs_clarification',
    defaultPrivacy: 'unknown',
    defaultComplexity: 'high',
    rationale: 'Subprozesse enthalten eingebettete Logik, die separat '
      + 'analysiert werden muss. v1 kann Subprozesse nicht ausfloesen, '
      + 'markiert sie als eigenstaendige Assessment-Einheit.',
    interviewRequired: true,
    warningIfAutomatic: 'Subprozesse koennen beliebig komplex sein. '
      + 'Manuelle Analyse empfohlen.',
  },
  {
    bpmnType: 'bpmn:CallActivity',
    defaultPattern: 'needs_clarification',
    defaultPrivacy: 'unknown',
    defaultComplexity: 'high',
    rationale: 'Call Activities referenzieren externe Prozesse. '
      + 'Ohne den referenzierten Prozess ist keine Bewertung moeglich.',
    interviewRequired: true,
  },
];
```

### 3.3 Zusatzlogik: NAV/BC-spezifische Muster

```typescript
// src/data/navPatterns.ts

export interface NavTaskPattern {
  keywords: string[];             // Schlagwoerter im Elementnamen
  suggestedPattern: AgenticPattern;
  suggestedPrivacy: PrivacyLevel;
  suggestedComplexity: ComplexityClass;
  navContext: string;             // NAV/BC-spezifische Erklaerung
}

export const NAV_PATTERNS: NavTaskPattern[] = [
  {
    keywords: ['sachkonto', 'buchen', 'buchung', 'kontierung'],
    suggestedPattern: 'mcp_or_api_call',
    suggestedPrivacy: 'no_pii',
    suggestedComplexity: 'medium',
    navContext: 'NAV/BC Sachkonto-Buchungen laufen ueber die '
      + 'General Journal API oder Web Services (OData/SOAP). '
      + 'MCP-Server oder REST-Call an BC-Tenant.',
  },
  {
    keywords: ['lagerbewegung', 'lager', 'wareneingang', 'warenausgang'],
    suggestedPattern: 'mcp_or_api_call',
    suggestedPrivacy: 'no_pii',
    suggestedComplexity: 'medium',
    navContext: 'Lagerbewegungen in NAV/BC ueber Item Journal '
      + 'oder Warehouse API. Mengenvalidierung regelbasiert moeglich.',
  },
  {
    keywords: ['kreditor', 'lieferant', 'vendor', 'stammdaten'],
    suggestedPattern: 'agent_with_approval',
    suggestedPrivacy: 'pii_likely',
    suggestedComplexity: 'medium',
    navContext: 'Kreditorenstammdaten enthalten oft Kontaktpersonen '
      + '(Name, Telefon, Mail). PII-Pruefung erforderlich. '
      + 'Aenderungen an Stammdaten sollten menschliche Freigabe haben.',
  },
  {
    keywords: ['debitor', 'kunde', 'customer'],
    suggestedPattern: 'agent_with_approval',
    suggestedPrivacy: 'pii_confirmed',
    suggestedComplexity: 'medium',
    navContext: 'Debitorenstammdaten sind personenbezogen. '
      + 'Lokales Routing erzwingen, Cloud nur mit Anonymisierung.',
  },
  {
    keywords: ['rechnung', 'invoice', 'faktura', 'fakturierung'],
    suggestedPattern: 'llm_classification',
    suggestedPrivacy: 'pii_likely',
    suggestedComplexity: 'medium',
    navContext: 'Rechnungspruefung ist ein starker LLM-Use-Case: '
      + 'Abgleich Bestellung vs. Rechnung, Anomalie-Erkennung, '
      + 'Dublettencheck. PII in Adressdaten moeglich.',
  },
  {
    keywords: ['genehmigung', 'freigabe', 'approval'],
    suggestedPattern: 'human_in_the_loop',
    suggestedPrivacy: 'unknown',
    suggestedComplexity: 'low',
    navContext: 'Freigabeprozesse in NAV/BC haben definierte '
      + 'Approval Workflows. LLM kann vorpruefend unterstuetzen, '
      + 'finale Freigabe bleibt beim berechtigten User.',
  },
  {
    keywords: ['bestellung', 'purchase order', 'einkauf', 'banf', 'bestellanforderung'],
    suggestedPattern: 'agent_with_approval',
    suggestedPrivacy: 'no_pii',
    suggestedComplexity: 'medium',
    navContext: 'Bestellvorschlaege koennen LLM-gestuetzt generiert '
      + 'werden (basierend auf Lagerbestand, Lieferzeiten, Preisen). '
      + 'Menschliche Freigabe vor Bestellausloesung.',
  },
  {
    keywords: ['mahnung', 'zahlungserinnerung', 'reminder'],
    suggestedPattern: 'llm_generation',
    suggestedPrivacy: 'pii_confirmed',
    suggestedComplexity: 'medium',
    navContext: 'Mahnschreiben enthalten Kundennamen und Betraege. '
      + 'LLM kann Tonalitaet anpassen (1./2./3. Mahnung). '
      + 'Lokales Routing wegen PII.',
  },
  {
    keywords: ['report', 'bericht', 'auswertung', 'analyse'],
    suggestedPattern: 'llm_generation',
    suggestedPrivacy: 'unknown',
    suggestedComplexity: 'high',
    navContext: 'Reports koennen grosse Datenmengen enthalten. '
      + 'LLM eignet sich fuer Zusammenfassungen und Anomalie-Highlighting. '
      + 'Datenexport aus NAV via OData, dann lokale Analyse.',
  },
];
```

### 3.4 Klassifikations-Stufen

Die Zuordnung laeuft in drei Stufen, jede optionaler als die vorherige:

**Stufe 1 (immer aktiv): Regelbasiert nach BPMN-Elementtyp.**
Liest den `bpmnType` und wendet `MAPPING_RULES` an. Funktioniert ohne LLM, ohne Internet, deterministisch.

**Stufe 2 (immer aktiv): Keyword-Matching im Elementnamen.**
Durchsucht den menschenlesbaren Namen des Elements (`element.name`) gegen `NAV_PATTERNS` und allgemeine Keyword-Listen. Verfeinert den Vorschlag aus Stufe 1. Ebenfalls deterministisch, kein LLM noetig.

**Stufe 3 (optional, nur mit LLM): Semantische Klassifikation.**
Sendet den Elementnamen, den Kontext (benachbarte Elemente, Lane-Zugehoerigkeit) und die bisherigen Vorschlaege an ein LLM. Das LLM liefert eine verfeinerte Empfehlung mit Begruendung. Der Nutzer sieht sowohl den regelbasierten Vorschlag als auch den LLM-Vorschlag und entscheidet.

LLM-Prompt fuer Stufe 3:

```
Du bist ein Prozessanalyst mit Erfahrung in BPMN-Modellierung und 
KI-Agent-Architektur. Analysiere den folgenden Prozessschritt und 
empfehle ein Agentic Pattern.

Prozessschritt: "{elementName}"
BPMN-Typ: {bpmnType}
Lane/Zustaendigkeit: "{laneName}"
Vorheriger Schritt: "{previousElementName}"
Naechster Schritt: "{nextElementName}"
Regelbasierter Vorschlag: {defaultPattern}

Antworte ausschliesslich als JSON:
{
  "pattern": "<AgenticPattern>",
  "privacy": "<PrivacyLevel>",
  "complexity": "<ComplexityClass>",
  "rationale": "<Begruendung in 1-2 Saetzen>",
  "open_questions": ["<Frage 1>", "<Frage 2>"]
}
```

---

## 4. Interview-Flow

### 4.1 Grundprinzip

Fuer jeden Prozessschritt, bei dem `interviewRequired: true` gilt oder bei dem die Klassifikation `needs_clarification` ergibt, zeigt die App ein strukturiertes Interview. Die Fragen sind nicht generisch, sondern abhaengig vom BPMN-Typ und dem Klassifikationsergebnis.

### 4.2 Frage-Katalog

```typescript
// src/data/privacyQuestions.ts

export interface InterviewQuestion {
  id: string;
  category: 'privacy' | 'decision_logic' | 'data_quality' | 'integration' | 'risk';
  question_de: string;
  question_en: string;
  options: InterviewOption[];
  appliesTo: string[];            // BPMN-Typen, fuer die diese Frage relevant ist
  required: boolean;
}

export interface InterviewOption {
  value: string;
  label_de: string;
  label_en: string;
  impact: {
    pattern?: AgenticPattern;
    privacy?: PrivacyLevel;
    complexity?: ComplexityClass;
    warning?: string;
  };
}
```

**Privacy-Fragen (fuer alle Schritte mit `privacy: unknown`):**

1. "Welche Daten fliessen in diesem Schritt?"
   - Personenbezogene Daten (Name, Adresse, Kontakt) --> `pii_confirmed`, lokales Routing
   - Pseudonymisierte Daten (Kundennummer, Vorgangsnummer) --> `pseudonymized`, Cloud moeglich
   - Reine Sachdaten (Betraege, Mengen, Artikelnummern) --> `no_pii`
   - Unklar / muss geprueft werden --> `pii_likely`, Warnung im Report

2. "Gibt es eine Rechtsgrundlage fuer die Verarbeitung?"
   - Vertrag (Art. 6 Abs. 1 lit. b DSGVO)
   - Berechtigtes Interesse (Art. 6 Abs. 1 lit. f)
   - Einwilligung (Art. 6 Abs. 1 lit. a)
   - Gesetzliche Pflicht (Art. 6 Abs. 1 lit. c)
   - Unklar --> Warnung: "Rechtsgrundlage vor Implementierung klaeren"

3. "Wer ist aktuell verantwortlich fuer diesen Schritt?"
   - Interne Mitarbeiter --> Lane-Zuordnung moeglich
   - Externer Partner (Lieferant, Dienstleister) --> `notification_and_wait`, kein Agent
   - Automatisiert (System/Software) --> `mcp_or_api_call`
   - Behoerde / Regulierer --> `notification_and_wait`, kein Agent

**Entscheidungslogik-Fragen (fuer Gateways mit `needs_clarification`):**

4. "Wie wird diese Entscheidung aktuell getroffen?"
   - Klare Regel (Schwellwert, Checkliste, Formel) --> `rule_based_automation`
   - Erfahrungsbasiertes Urteil (Bauchgefuehl, Expertise) --> `llm_classification` oder `human_in_the_loop`
   - Kombination aus Regel und Urteil --> `agent_with_approval`
   - Unklar --> Warnung: "Entscheidungslogik dokumentieren"

5. "Was ist das Risiko einer Fehlentscheidung?"
   - Gering (korrigierbar, kein finanzieller Schaden) --> Agent-Autonomie moeglich
   - Mittel (finanzieller Schaden, aber reversibel) --> `agent_with_approval`
   - Hoch (irreversibler Schaden, rechtliche Konsequenzen) --> `human_in_the_loop`
   - Unklar --> konservativ `human_in_the_loop`

**Integrations-Fragen (fuer Service Tasks):**

6. "Welches Zielsystem ist betroffen?"
   - ERP (NAV/BC, SAP, etc.) --> MCP oder API, NAV-Patterns anwenden
   - DMS (EASY, SharePoint, etc.) --> MCP oder API
   - Mail/Kommunikation --> MCP (Gmail, Outlook)
   - Kein IT-System (physischer Vorgang) --> `notification_and_wait`
   - Eigenentwicklung / Legacy --> Warnung: "API-Verfuegbarkeit pruefen"

### 4.3 Luecken-Marker

Wenn eine Frage mit "Unklar" beantwortet wird oder der Nutzer sie ueberspringt, generiert die App einen expliziten Luecken-Marker im Report:

```
⚠ KLAERUNGSBEDARF: Schritt "Reklamation bewerten"
  - Entscheidungslogik nicht dokumentiert
  - Privacy-Einstufung offen
  - Empfehlung: Vor Implementierung Fachbereich konsultieren
```

Das ist ein bewusstes Design-Element, keine Schwaeche. Ein Assessment, das Luecken benennt, ist wertvoller als eines, das sie verdeckt.

---

## 5. Prozess-Templates (v1)

### 5.1 Scope

v1 enthaelt drei vordefinierte Prozess-Templates. Diese dienen als Referenz fuer das Template-Matching und als Demo-Inhalte.

**Template 1: Purchase-to-Pay (P2P)**

Milans Kernprozess aus der Stiegl-Erfahrung. Abdeckung:

```
Bedarfsmeldung (BANF) --> Genehmigung --> Bestellung anlegen (NAV) -->
Wareneingang buchen --> Rechnungseingang --> Rechnungspruefung -->
3-Way-Match (Bestellung/Lieferschein/Rechnung) --> Freigabe -->
Zahlung ausloesen --> Buchung Sachkonto
```

NAV-spezifische Tasks: BANF-Erstellung, Purchase Order in NAV, Item Receipt, Purchase Invoice, Vendor Ledger Entry.

**Template 2: Order-to-Cash (O2C)**

Gegenstueck zum P2P, kundenorientiert:

```
Kundenanfrage --> Angebot erstellen --> Auftragserfassung (NAV) -->
Bonitaetspruefung --> Kommissionierung --> Versand -->
Rechnung erstellen --> Zahlungseingang --> Mahnung (optional)
```

NAV-spezifische Tasks: Sales Quote, Sales Order, Shipment, Sales Invoice, Customer Ledger Entry.

**Template 3: Invoice Verification (Rechnungspruefung)**

Ein Teilprozess aus P2P, aber so haeufig, dass er ein eigenes Template verdient:

```
Rechnungseingang (Scan/Mail) --> OCR/Datenextraktion -->
Stammdatenabgleich (Kreditor) --> 3-Way-Match -->
Abweichungspruefung --> Freigabe oder Rueckfrage -->
Buchung --> Archivierung (DMS)
```

### 5.2 Template-Matching-Logik

Das Matching laeuft nicht ueber BPMN-Struktur-Vergleich (zu fragil), sondern ueber Keyword-Analyse der Elementnamen:

```typescript
// src/engine/templateMatcher.ts

export interface TemplateMatch {
  templateId: string;
  templateName: string;
  confidence: number;             // 0.0 - 1.0
  matchedElements: number;        // Wie viele Elemente matchen
  totalElements: number;          // Wie viele Elemente hat das BPMN
  unmatchedElements: string[];    // Elemente ohne Template-Entsprechung
}
```

Der Matcher zaehlt, wie viele Elementnamen im hochgeladenen BPMN zu den Keywords eines Templates passen. Bei >50% Match wird das Template vorgeschlagen. Bei <50% oder Gleichstand zeigt die App: "Kein eindeutiges Template gefunden. Generische Analyse wird durchgefuehrt."

Generische Analyse = nur Stufe 1 + Stufe 2 (regelbasiert + Keyword), kein Template-Kontext. Das funktioniert, liefert aber weniger spezifische Vorschlaege.

---

## 6. User Interface

### 6.1 Layout

Drei Zustaende, linear durchlaufen:

**Zustand 1: Import**

Zentrierter Bereich mit Drag-and-Drop-Zone fuer .bpmn-Dateien. Darunter: "Oder waehle ein Beispiel" mit drei klickbaren Karten (P2P, O2C, Invoice Verification), die Demo-BPMNs laden. Kein weiteres UI-Element, kein Erklaerungstext, keine Registrierung.

**Zustand 2: Assessment (Hauptansicht)**

Split-Screen, vertikal geteilt (auf Mobile: gestapelt):

Linke Haelfte (55%):
- BPMN-Diagramm gerendert via bpmn-js
- Das aktuell im Interview befindliche Element ist farblich hervorgehoben (blauer Rand)
- Bereits bewertete Elemente sind gruen (abgeschlossen) oder gelb (Klaerungsbedarf)
- Noch nicht bewertete Elemente bleiben grau

Rechte Haelfte (45%):
- Oben: Fortschrittsanzeige ("Schritt 4 von 12") und Echtzeit-Scores
  - Automatisierungsgrad: "58% KI-geeignet"
  - Privacy-Profil: "3 Schritte lokal, 7 Cloud-faehig, 2 offen"
- Mitte: Interview-Karte fuer den aktuellen Schritt
  - Elementname und BPMN-Typ als Header
  - Vorgeschlagenes Pattern (regelbasiert, ggf. LLM-verfeinert)
  - Interview-Fragen als Dropdown/Radio-Buttons
  - "Vorschlag uebernehmen" oder "Anpassen" Buttons
  - Optional: LLM-Begruendung in einem aufklappbaren Abschnitt
- Unten: Navigation (Zurueck / Weiter / Ueberspringen)

**Zustand 3: Report**

Vollbild-Ansicht des generierten Reports mit Tabs:
- Tab 1: AI-Readiness-Report (Markdown gerendert, druckbar)
- Tab 2: YAML-Konfiguration (Syntax-Highlighting, kopierbar)
- Export-Buttons: "Als PDF herunterladen", "YAML herunterladen", "Alles als ZIP"

### 6.2 Design-Grundsaetze

- Keine Farben als Informationstraeger (Barrierefreiheit). Stattdessen: Icons + Text.
- Exception: Die drei Zustaende im BPMN-Diagramm (gruen/gelb/grau) werden zusaetzlich durch Icons markiert (Haken, Fragezeichen, Kreis).
- Kein Dark Mode in v1 (Aufwand, geringer Nutzen fuer Zielgruppe).
- Responsive: Desktop-First, aber auf Tablet nutzbar (Assessment auf Mobile ist unrealistisch).
- Sprache der UI: Englisch als Default, Deutsch als Option (Toggle oben rechts). Interview-Fragen und Report in der gewaehlten Sprache.

---

## 7. Output-Formate

### 7.1 AI-Readiness-Report (Markdown/PDF)

```markdown
# AI-Readiness Assessment
## Prozess: Purchase-to-Pay (Variante Stiegl)
Erstellt am: 2026-05-13
Tool: process2agent v1.0

---

## Zusammenfassung

| Kennzahl | Wert |
|---|---|
| Analysierte Schritte | 12 |
| KI-geeignet (Agent autonom oder mit Freigabe) | 7 (58%) |
| Mensch bleibt im Loop | 3 (25%) |
| Klaerungsbedarf | 2 (17%) |
| Schritte mit PII (lokal erforderlich) | 3 |
| Schritte Cloud-faehig | 7 |
| Komplexitaet gesamt | Mittel |

## Bewertung pro Schritt

### Schritt 1: Bedarfsmeldung (BANF)
- **BPMN-Typ:** User Task
- **Empfohlenes Pattern:** Agent mit Freigabe
- **Begruendung:** LLM kann Bedarfsvorschlaege generieren 
  (basierend auf Lagerbestand und Verbrauchshistorie). 
  Freigabe durch Einkauf bleibt menschlich.
- **Privacy:** Keine PII (Sachdaten)
- **Komplexitaet:** Mittel
- **Zielsystem:** NAV/BC Purchase Requisition
- **Offene Fragen:** Keine

### Schritt 5: Rechnungspruefung
- **BPMN-Typ:** User Task
- **Empfohlenes Pattern:** LLM-Klassifikation
- **Begruendung:** 3-Way-Match (Bestellung/Lieferschein/Rechnung) 
  ist ein starker LLM-Use-Case fuer Anomalie-Erkennung.
- **Privacy:** PII wahrscheinlich (Lieferantenadresse)
  - *Nutzerentscheidung:* Lokal routing erzwungen
  - *Rechtsgrundlage:* Vertragserfuellung (Art. 6 Abs. 1 lit. b)
- **Komplexitaet:** Hoch (mehrseitige PDFs als Kontext)
- **Zielsystem:** NAV/BC Purchase Invoice + EASY DMS
- **Offene Fragen:** Keine

### Schritt 8: Reklamation bewerten
- **BPMN-Typ:** Exclusive Gateway
- **Empfohlenes Pattern:** ⚠ Klaerungsbedarf
- **Begruendung:** Entscheidungslogik nicht dokumentiert. 
  Unklar ob regelbasiert oder urteilsbasiert.
- **Privacy:** Offen
- **Komplexitaet:** Unbekannt
- **Offene Fragen:**
  - Nach welchen Kriterien wird entschieden?
  - Wer haftet bei Fehlentscheidungen?
  - Gibt es eine bestehende Entscheidungsmatrix?

---

## Privacy-Uebersicht

| Schritt | Datenkategorie | Routing | Rechtsgrundlage |
|---|---|---|---|
| BANF | Sachdaten | Cloud OK | n/a |
| Rechnungspruefung | PII (Adresse) | Lokal | Art. 6/1/b |
| Mahnschreiben | PII (Kunde) | Lokal | Art. 6/1/b |
| ... | ... | ... | ... |

## Klaerungsbedarf (Handlungsempfehlungen)

1. **Schritt 8 (Reklamation bewerten):** 
   Entscheidungslogik mit Fachbereich dokumentieren.
2. **Schritt 11 (Archivierung):** 
   Aufbewahrungsfrist und Loeschkonzept mit DPO klaeren.

---

## Hinweis

Dieser Report dokumentiert menschliche Entscheidungen, unterstuetzt 
durch regelbasierte Analyse. Er ersetzt keine rechtliche Beratung, 
kein DSGVO-Audit und kein AI-Impact-Assessment nach EU AI Act.
Die Privacy-Einstufungen basieren auf Nutzerangaben, nicht auf 
automatisierter Datenklassifikation.
```

### 7.2 YAML-Konfiguration

```yaml
# process2agent Configuration
# Generated: 2026-05-13
# Process: Purchase-to-Pay

meta:
  process_name: "Purchase-to-Pay"
  template_match: "p2p"
  match_confidence: 0.82
  total_steps: 12
  ai_ready_pct: 58

steps:
  - id: "step_01_banf"
    name: "Bedarfsmeldung (BANF)"
    bpmn_type: "bpmn:UserTask"
    pattern: "agent_with_approval"
    privacy:
      level: "no_pii"
      routing: "cloud_ok"
      legal_basis: null
    complexity: "medium"
    integration:
      target_system: "nav_bc"
      method: "api"                # api | mcp | rpa | manual
      endpoint_hint: "Purchase Requisition API"
    agent_config:
      role: "Bedarfsvorschlag generieren"
      human_approval: true
      fallback: "manual"

  - id: "step_05_invoice_check"
    name: "Rechnungspruefung"
    bpmn_type: "bpmn:UserTask"
    pattern: "llm_classification"
    privacy:
      level: "pii_confirmed"
      routing: "local_only"
      legal_basis: "art_6_1_b"
      data_categories: ["supplier_address", "invoice_amounts"]
    complexity: "high"
    integration:
      target_system: "nav_bc"
      method: "api"
      endpoint_hint: "Purchase Invoice API + EASY DMS"
    agent_config:
      role: "3-Way-Match und Anomalie-Erkennung"
      human_approval: true
      local_model_hint: "qwen3.5:27b via Ollama"
      fallback: "human_review"

  - id: "step_08_complaint"
    name: "Reklamation bewerten"
    bpmn_type: "bpmn:ExclusiveGateway"
    pattern: "needs_clarification"
    privacy:
      level: "unknown"
      routing: "pending"
    complexity: "unknown"
    open_questions:
      - "Entscheidungskriterien dokumentieren"
      - "Haftung bei Fehlentscheidung klaeren"
      - "Bestehende Entscheidungsmatrix pruefen"

# Integration summary
integrations:
  - system: "nav_bc"
    methods: ["odata_v4", "soap_webservice", "mcp"]
    note: "NAV 2018 unterstuetzt OData v4 und SOAP. MCP-Server muesste custom gebaut werden."
  - system: "easy_dms"
    methods: ["rest_api", "mcp"]
    note: "EASY DMS bietet REST-API. MCP-Wrapper moeglich."

# Privacy routing summary
privacy_routing:
  local_required: 3
  cloud_allowed: 7
  pending: 2
  note: "Lokales Routing via Ollama (qwen3.5:27b). Cloud-Routing nur fuer Sachdaten ohne PII."
```

---

## 8. Explizit ausserhalb des Scopes von v1

Die folgenden Features werden bewusst nicht gebaut. Sie sind dokumentiert, damit klar ist, dass sie bedacht und verworfen (nicht vergessen) wurden.

| Feature | Begruendung fuer Ausschluss |
|---|---|
| Agent-Runtime / Ausfuehrung | Kein Mehrwert im Assessment-Kontext; vervielfacht Komplexitaet |
| Python-Skeleton-Generierung | Ohne Ziel-Framework zu abstrakt; Developer schreiben es ohnehin um |
| Token-Kosten-Schaetzung in USD | Ohne Prompt-Design und Kontext spekulativ; Komplexitaetsklassen stattdessen |
| BPMN-Editor | Prozessmodellierung hat eigene etablierte Tools |
| Login / Accounts / Cloud-Backend | Widerspricht Privacy-Positionierung; kein Nutzen fuer v1 |
| Verschachtelte Subprozesse aufloesen | Zu komplex fuer v1; werden als Luecke markiert |
| BPMN-Expression-Parsing (FEEL, XPath) | Engine-spezifisch, fragil; Interview-Frage stattdessen |
| Multi-Prozess-Vergleich | Nice-to-have fuer v2, kein Kern-Nutzen |
| Automatische PII-Klassifikation ohne menschliche Bestaetigung | DSGVO-Risiko; Interview stattdessen |

---

## 9. Offene Annahmen

1. BPMN-Dateien sind hinreichend aktuell und Elementnamen sind menschenlesbar (nicht nur technische IDs).
2. Nutzer akzeptieren, dass regelbasierte Vorschlaege Startpunkte sind und investieren 10-15 Minuten pro Prozess ins Interview.
3. Die drei Templates (P2P, O2C, Invoice Verification) decken einen Grossteil der Erstnutzer-Prozesse ab.
4. bpmn-js kann .bpmn-Dateien aus Signavio und Camunda ohne groessere Dialekt-Probleme rendern (zu validieren am realen Export).
5. Der Karriere- und Portfolio-Wert des Projekts ist hoeher als der direkte kommerzielle Wert.

---

## 10. Naechste Schritte

1. **Mapping validieren**: 2-3 reale BPMN-Dateien aus Milans Stiegl-Erfahrung (anonymisiert) durch die Mapping-Tabelle laufen lassen. Bruchstellen dokumentieren.
2. **bpmn-js Proof of Concept**: Minimale React-App, die eine .bpmn-Datei rendert und Elemente klickbar macht. Validiert, ob Signavio-Exporte ohne Anpassung funktionieren.
3. **Interview-Flow Prototyp**: Hardcoded P2P-Template, 5 Schritte, vollstaendiger Interview-Durchlauf, Report-Generierung als Markdown.
4. **README und MAPPING_TABLE.md**: Standalone-Dokumente, die auch ohne laufende App Wert haben (zitierbar, vortragsfaehig).
5. **Oeffentliches Repository**: GitHub-Repo mit MIT-Lizenz, sauberer README, Architektur-Diagramm, Case Study am P2P-Beispiel.
