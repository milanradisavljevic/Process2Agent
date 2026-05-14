# BPMN-to-Agent Mapping Table

A systematic mapping from BPMN 2.0 element types to agentic workflow patterns for AI-readiness assessment.

This table is the core methodology of process2agent. It can be used independently of the app as a reference for AI consultants, process managers, and enterprise architects evaluating where AI agents add value in documented business processes.

---

## Agentic Patterns

| Pattern | Description | When to Use |
|---|---|---|
| **Human in the Loop** | AI assists, human decides | Approval workflows, high-risk decisions, regulatory requirements |
| **Agent with Approval** | Agent prepares, human approves | Document drafts, purchase suggestions, scheduling proposals |
| **Agent Autonomous** | Agent executes independently | Low-risk, rule-bound, high-frequency tasks with clear success criteria |
| **LLM Classification** | LLM evaluates or categorizes input | Invoice matching, complaint triage, anomaly detection |
| **LLM Generation** | LLM creates text or documents | Reports, summaries, correspondence, training materials |
| **MCP/API Call** | System integration via API or MCP | ERP bookings, data sync, external service calls |
| **Rule-Based Automation** | Deterministic logic, no LLM needed | Threshold checks, format validation, routing by predefined rules |
| **Local Code Execution** | Script or computation | Calculations, transformations, data cleanup |
| **Notify and Wait** | Trigger and wait for external response | Physical inspections, partner confirmations, regulatory approvals |
| **Needs Clarification** | Cannot classify without more context | Undocumented decision logic, ambiguous process steps |

---

## Element Type Mapping (Stage 1)

Stage 1 is purely rule-based. It maps the BPMN element type to a default pattern. No keyword analysis, no LLM.

| BPMN Element | Default Pattern | Default Privacy | Interview Required | Rationale |
|---|---|---|---|---|
| `bpmn:Task` (generic) | Agent with Approval | Unknown | Yes | Generic tasks need human review to determine specifics |
| `bpmn:UserTask` | Human in the Loop | Unknown | Yes | User tasks are human activities by definition |
| `bpmn:ServiceTask` | MCP/API Call | Unknown | Yes | System calls; feasibility depends on target system API |
| `bpmn:ScriptTask` | Local Code Execution | No PII | No | Deterministic computation, no LLM needed |
| `bpmn:ManualTask` | Notify and Wait | Unknown | Yes | Physical/external activity outside system boundary |
| `bpmn:BusinessRuleTask` | Rule-Based Automation | No PII | No | Deterministic rules, DMN engine or if/else logic |
| `bpmn:SendTask` | Agent with Approval | PII Likely | Yes | Message sending; LLM can draft, human approves |
| `bpmn:ReceiveTask` | MCP/API Call | Unknown | No | Waiting for external signal; webhook or polling |
| `bpmn:ExclusiveGateway` | Needs Clarification | Unknown | Yes | Could be rule-based or judgment-based; must be documented |
| `bpmn:ParallelGateway` | Rule-Based Automation | No PII | No | Orchestration pattern, no decision logic |
| `bpmn:InclusiveGateway` | Needs Clarification | Unknown | Yes | Activates one or more paths; decision logic unclear |
| `bpmn:StartEvent` | Notify and Wait | Unknown | No | Trigger definition, not an automation decision |
| `bpmn:EndEvent` | Notify and Wait | Unknown | No | Process conclusion; notification or status update |
| `bpmn:SubProcess` | Needs Clarification | Unknown | Yes | Contains embedded logic; must be analyzed separately |
| `bpmn:CallActivity` | Needs Clarification | Unknown | Yes | References external process; cannot assess without it |

---

## Domain Enrichment (Stage 2)

Stage 2 matches keywords in the element name against domain-specific patterns. It refines the Stage 1 suggestion.

### ERP / NAV / Business Central Patterns

| Domain | Keywords | Suggested Pattern | Privacy | Rationale |
|---|---|---|---|---|
| Purchase Requisition | banf, bedarf, anforderung | Agent with Approval | No PII | Demand proposals from stock/consumption data; human approval |
| Approval | freigabe, genehmigung, approval | Human in the Loop | Unknown | Control points stay human |
| Purchase Order | bestellung, purchase order, einkauf | MCP/API Call | No PII | NAV/BC Purchase Order API via OData/SOAP |
| Goods Receipt | wareneingang, lieferung, receipt | MCP/API Call | No PII | Item Receipt posting with quantity validation |
| Invoice | rechnung, invoice, faktura | LLM Classification | PII Likely | 3-way match and anomaly detection |
| Vendor Master Data | kreditor, lieferant, vendor | Agent with Approval | PII Likely | Contact data is often personal |
| Customer Master Data | debitor, kunde, customer | Agent with Approval | PII Confirmed | Customer data is personal by definition |
| Posting | buchen, buchung, sachkonto, journal | MCP/API Call | No PII | General Journal API; audit trail critical |
| Payment | zahlung, payment, ueberweisung | Agent with Approval | PII Likely | Financial risk requires human approval |
| Dunning | mahnung, zahlungserinnerung | LLM Generation | PII Confirmed | LLM adapts tone; customer names require local routing |
| Report | report, bericht, auswertung | LLM Generation | Unknown | LLM for summaries and anomaly highlighting |

### Generic Process Patterns

| Domain | Keywords | Suggested Pattern | Rationale |
|---|---|---|---|
| Planning | plan, planung, vorbereiten, strategie | Agent with Approval | Research and structuring benefit from AI; final assessment stays human |
| Documentation | dokument, unterlagen, briefing, praesentation | LLM Generation | Text and document creation is a strong LLM use case |
| Communication | kommunikation, meeting, abstimmung, benachrichtigung | Agent with Approval | Drafting and follow-up; recipient data may be PII |
| Quality Check | check, pruefung, validieren, qualitaet | LLM Classification | Pre-assessment with explicit criteria; error impact must be defined |
| Master Data | artikel, stammdaten, preise, erp, sync | MCP/API Call | Integration question; data quality and approval process matter |

---

## Privacy Classification

| Level | Description | Routing Decision |
|---|---|---|
| **PII Confirmed** | Contains names, addresses, contact data | Local processing mandatory (Ollama, on-premise LLM) |
| **PII Likely** | Probably contains personal data; needs verification | Flag for review; default to local until confirmed |
| **Pseudonymized** | Contains IDs/numbers, no direct identification | Cloud processing acceptable with DPA in place |
| **No PII** | Pure business data (amounts, quantities, article numbers) | Cloud processing acceptable |
| **Unknown** | Data sensitivity not assessed | Flag as clarification needed |

---

## Complexity Classification

| Level | Description | Implication |
|---|---|---|
| **Low** | Simple rule, short prompt, little context needed | Quick win candidate; implement first |
| **Medium** | Moderate context, standard prompt, some iteration | Feasible with current LLM capabilities |
| **High** | Large context window, multi-step reasoning, domain expertise | Requires careful prompt engineering and testing |
| **Unknown** | Not enough information to assess | Needs domain expert input before implementation |

---

## How to Use This Table

1. Export your process as `.bpmn` from Signavio, Camunda, or any BPMN 2.0 tool
2. For each element, look up the BPMN type in the Stage 1 table
3. Check the element name against the Stage 2 domain patterns
4. Use the more specific match (Stage 2 overrides Stage 1 when keywords match)
5. For elements marked "Needs Clarification", document the missing decision logic before proceeding

The [process2agent app](https://github.com/yourusername/process2agent) automates this workflow and adds LLM-powered analysis for richer suggestions.

---

## License

This mapping table is released under MIT License as part of the process2agent project.
