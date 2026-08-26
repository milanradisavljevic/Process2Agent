# process2agent — Mapping-Tabelle

> Eigenstaendiges Referenzdokument. Unabhaengig von der App nutzbar.
> Version: 1.0 · Stand: 2026-08-26 · Autor: Milan Radisavljevic
>
> **Kanonische Version (Deutsch).** Englische Übersetzung: `docs/MAPPING_TABLE.md`.
> Bei Aenderungen an den Pattern-Definitionen (`src/data/mappingRules.ts`, `src/data/navPatterns.ts`)
> beide Dokumente synchron halten.

Diese Tabelle bildet BPMN-Elementtypen und Prozessschrittmuster auf KI-Agenten-Muster ab. Sie ist das intellektuelle Zentrum der App und kann eigenstaendig als Beratungsgrundlage verwendet werden.

**Wichtig:** Jede Zuordnung ist ein Startvorschlag, keine endgueltige Entscheidung. Die finale Wahl trifft immer der Mensch im gefuehrten Interview.

---

## 1. Agentic Patterns — Uebersicht

| Pattern | Label | Wann geeignet |
|---------|-------|--------------|
| `human_in_the_loop` | Mensch bleibt im Loop | KI kann vorbereiten oder zusammenfassen, aber die Entscheidung bleibt bewusst beim Menschen. |
| `agent_autonomous` | Agent autonom | Der Schritt ist klar begrenzt, risikoarm und kann nach Regeln eigenstaendig laufen. |
| `agent_with_approval` | Agent mit Freigabe | Agent bereitet vor, ein Mensch gibt frei. Gute Standardoption fuer Beratungssituationen. |
| `rule_based_automation` | Regelbasierte Automatisierung | Keine generative KI noetig. Der Schritt sollte als Regel, Checkliste oder Workflow automatisiert werden. |
| `mcp_or_api_call` | MCP/API-Aufruf | Der Kern ist Systemintegration. Entscheidend ist API-, MCP- oder RPA-Faehigkeit des Zielsystems. |
| `local_code_execution` | Lokale Code-Ausfuehrung | Deterministische Logik oder Skript reicht. LLM bringt hier wenig Zusatznutzen. |
| `notification_and_wait` | Benachrichtigen und warten | Der Schritt liegt bei einem Menschen, Partner oder externen Ereignis. Agent kann nur anstossen oder nachhalten. |
| `llm_classification` | LLM-Klassifikation | Geeignet, wenn unstrukturierter Input bewertet, sortiert oder geprueft werden muss. |
| `llm_generation` | LLM-Generierung | Geeignet, wenn Text, Zusammenfassungen, Mails oder Dokumententwuerfe entstehen. |
| `needs_clarification` | Klaerungsbedarf | Noch nicht einordnen. Kriterien, Daten oder Verantwortlichkeit muessen im Gespraech geklaert werden. |

---

## 2. BPMN-Typ → Muster (Stufe 1: Regelbasiert)

| BPMN-Typ | Default-Muster | Default-Datenschutz | Default-Komplexitaet | Interview? | Begruendung |
|----------|---------------|---------------------|---------------------|-----------|------------|
| `bpmn:Task` | Agent mit Freigabe | Unklar | Mittel | Ja | Generische Tasks beschreiben eine Arbeitseinheit ohne technische Spezialisierung. "Agent mit Freigabe" ist der konservative Startpunkt. |
| `bpmn:UserTask` | Mensch im Loop | Unklar | Unklar | Ja | User Tasks sind menschliche Taetigkeiten. KI kann unterstuetzen, die Entscheidung bleibt beim Menschen. |
| `bpmn:ServiceTask` | MCP/API-Aufruf | Unklar | Mittel | Ja | Service Tasks sind Systemaufrufe. Die Machbarkeit haengt vom Zielsystem und dessen API ab. |
| `bpmn:ScriptTask` | Lokale Code-Ausfuehrung | Keine PII | Niedrig | Nein | Script Tasks sind meist deterministische Berechnungen. Ein LLM ist nicht notwendig. |
| `bpmn:ManualTask` | Benachrichtigen & warten | Unklar | Niedrig | Ja | Manual Tasks liegen ausserhalb direkter Systemautomatisierung. |
| `bpmn:ExclusiveGateway` | Klaerungsbedarf | Unklar | Unklar | Ja | Gateways brauchen dokumentierte Entscheidungslogik. Ohne Kriterien bleibt der Schritt klaerungsbeduerftig. |
| `bpmn:StartEvent` | Benachrichtigen & warten | Unklar | Niedrig | Nein | Start Events beschreiben Ausloeser, keine inhaltliche Automatisierungsentscheidung. |
| `bpmn:EndEvent` | Benachrichtigen & warten | Unklar | Niedrig | Nein | End Events beenden den Prozess und werden fuer den Report dokumentiert. |
| *Unbekannter Typ* | Klaerungsbedarf | Unklar | Unklar | Ja | Fuer diesen BPMN-Typ gibt es in v1 keine spezifische Regel. |

---

## 3. Datenschutz-Klassifikation

| Level | Label | Bedeutung |
|-------|-------|-----------|
| `pii_confirmed` | Personenbezogene Daten bestaetigt | Lokal zwingend (kein Cloud-LLM ohne DPA) |
| `pii_likely` | PII wahrscheinlich | Nutzer muss bestaetigen; Standard: lokal |
| `pseudonymized` | Pseudonymisierte Daten | Cloud moeglich mit geeignetem DPA |
| `no_pii` | Keine PII / Sachdaten | Cloud-LLM ohne Einschraenkung moeglich |
| `unknown` | Unklar | Muss im Interview geklaert werden |

**Faustregeln:**
- Kreditor-/Lieferantendaten → `pii_likely` (Kontaktpersonen oft vorhanden)
- Rechnungen → `pii_likely` (Bankdaten, Empfaenger)
- Buchungs- und Bestandsdaten → `no_pii`
- Kommunikationsschritte → `pii_likely`

---

## 4. Domain-Enrichment: P2P-Prozessmuster (Stufe 2: Keyword-Matching)

Wenn ein Prozessschritt-Name auf folgende Keywords matcht, wird das Muster ueberschrieben:

| Muster-ID | Label | Schluessel-Keywords | Empfohlenes Muster | Datenschutz |
|-----------|-------|--------------------|--------------------|-------------|
| `p2p-requisition` | Bedarf/BANF | banf, bedarf, bedarfsanforderung, bestellanforderung | Agent mit Freigabe | Keine PII |
| `p2p-approval` | Genehmigung/Freigabe | freigabe, genehmigung, approval, pruefen | Mensch im Loop | Unklar |
| `p2p-purchase-order` | Bestellung | bestellung, purchase order, po, einkauf, bestellen | MCP/API-Aufruf | Keine PII |
| `p2p-goods-receipt` | Wareneingang | wareneingang, lieferung, receipt, lager, lagerbewegung | MCP/API-Aufruf | Keine PII |
| `p2p-invoice` | Rechnung | rechnung, invoice, faktura, rechnungspruefung, 3-way | LLM-Klassifikation | PII wahrscheinlich |
| `p2p-vendor` | Kreditor/Lieferant | kreditor, lieferant, vendor, stammdaten | Agent mit Freigabe | PII wahrscheinlich |
| `p2p-posting` | Buchung/Sachkonto | buchen, buchung, sachkonto, kontierung, ledger | MCP/API-Aufruf | Keine PII |
| `p2p-payment` | Zahlung | zahlung, payment, zahlvorschlag, ueberweisung | Agent mit Freigabe | PII wahrscheinlich |

### Generische Prozessmuster

| Muster-ID | Label | Schluessel-Keywords | Empfohlenes Muster |
|-----------|-------|--------------------|--------------------|
| `generic-plan` | Planen/Vorbereiten | plan, planung, vorbereiten, konzept, strategie | Agent mit Freigabe |
| `generic-document` | Dokument erstellen | dokument, unterlagen, story, briefing, text, erstellen | LLM-Generierung |
| `generic-communication` | Kommunikation | kommunikation, meeting, abstimmung, benachrichtigung | Agent mit Freigabe |
| `generic-check` | Check/Pruefung | check, pruefung, validieren, kontrolle, readiness | LLM-Klassifikation |
| `generic-master-data` | Stammdaten | artikel, stammdaten, preise, konditionen, material, erp | MCP/API-Aufruf |
| `generic-booking` | Buchung/Reservierung | buchung, buchen, booking, reservieren, termin | MCP/API-Aufruf |

---

## 5. Komplexitaets-Klassifikation

| Level | Label | Merkmale |
|-------|-------|---------|
| `low` | Niedrig | Einfache Regel, kurzer Prompt, wenig Kontext, hohe Wiederholbarkeit |
| `medium` | Mittel | Moderater Kontext, Standard-Prompt, gelegentliche Ausnahmen |
| `high` | Hoch | Grosser Kontext, Multi-Step-Reasoning, Iteration noetig, Fehler haben Konsequenzen |
| `unknown` | Unklar | Muss im Interview geklaert werden |

---

## 6. Anwendungshinweise fuer Berater

**Konservatives Vorgehen:** Im Zweifel "Agent mit Freigabe" waehlen, nicht "Agent autonom". Ein Assessment, das zu aggressiv automatisiert, verliert das Vertrauen der Zielgruppe (Prozessmanager, DPOs).

**Luecken benennen:** Wenn eine Frage mit "Unklar" beantwortet wird, generiert die App einen expliziten Luecken-Marker im Report. Ein Assessment, das Luecken benennt, ist wertvoller als eines, das sie verdeckt.

**DSGVO-Faustregel:** Bei PII-Zweifeln immer `pii_likely` waehlen und im Interview klaeren. Der Report enthaelt einen Disclaimer, dass er keine DPO-Pruefung ersetzt.

---

## 7. Versionierung

Diese Tabelle entspricht dem Stand der Implementierung in `src/data/mappingRules.ts` und `src/data/navPatterns.ts`.

Bei Aenderungen an den Pattern-Definitionen diese Datei synchron halten.
