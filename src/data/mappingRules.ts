import type { AgenticPattern, ComplexityClass, MappingRule, PrivacyLevel } from '../types';

export const PATTERN_LABELS: Record<AgenticPattern, string> = {
  human_in_the_loop: 'Mensch bleibt im Loop',
  agent_autonomous: 'Agent autonom',
  agent_with_approval: 'Agent mit Freigabe',
  rule_based_automation: 'Regelbasierte Automatisierung',
  mcp_or_api_call: 'MCP/API-Aufruf',
  local_code_execution: 'Lokale Code-Ausfuehrung',
  notification_and_wait: 'Benachrichtigen und warten',
  llm_classification: 'LLM-Klassifikation',
  llm_generation: 'LLM-Generierung',
  needs_clarification: 'Klaerungsbedarf',
};

export const PATTERN_HINTS: Record<AgenticPattern, string> = {
  human_in_the_loop: 'KI kann vorbereiten oder zusammenfassen, aber die Entscheidung bleibt bewusst beim Menschen.',
  agent_autonomous: 'Der Schritt ist klar begrenzt, risikoarm und kann nach Regeln eigenstaendig laufen.',
  agent_with_approval: 'Agent bereitet vor, ein Mensch gibt frei. Gute Standardoption fuer Beratungssituationen.',
  rule_based_automation: 'Keine generative KI noetig. Der Schritt sollte als Regel, Checkliste oder Workflow automatisiert werden.',
  mcp_or_api_call: 'Der Kern ist Systemintegration. Entscheidend ist API-, MCP- oder RPA-Faehigkeit des Zielsystems.',
  local_code_execution: 'Deterministische Logik oder Skript reicht. LLM bringt hier wenig Zusatznutzen.',
  notification_and_wait: 'Der Schritt liegt bei einem Menschen, Partner oder externen Ereignis. Agent kann nur anstossen oder nachhalten.',
  llm_classification: 'Geeignet, wenn unstrukturierter Input bewertet, sortiert oder geprueft werden muss.',
  llm_generation: 'Geeignet, wenn Text, Zusammenfassungen, Mails oder Dokumententwuerfe entstehen.',
  needs_clarification: 'Noch nicht einordnen. Kriterien, Daten oder Verantwortlichkeit muessen im Gespraech geklaert werden.',
};

export const PRIVACY_LABELS: Record<PrivacyLevel, string> = {
  pii_confirmed: 'Personenbezogene Daten bestaetigt',
  pii_likely: 'PII wahrscheinlich',
  pseudonymized: 'Pseudonymisierte Daten',
  no_pii: 'Keine PII / Sachdaten',
  unknown: 'Unklar',
};

export const COMPLEXITY_LABELS: Record<ComplexityClass, string> = {
  low: 'Niedrig',
  medium: 'Mittel',
  high: 'Hoch',
  unknown: 'Unklar',
};

export const TARGET_SYSTEM_OPTIONS = ['NAV/Business Central', 'DMS/Archiv', 'Mail/Kommunikation', 'Legacy/Eigenentwicklung', 'Kein IT-System', 'Unklar'];

export const MAPPING_RULES: MappingRule[] = [
  {
    bpmnType: 'bpmn:Task',
    defaultPattern: 'agent_with_approval',
    defaultPrivacy: 'unknown',
    defaultComplexity: 'medium',
    rationale: 'Generische BPMN Tasks beschreiben eine Arbeitseinheit ohne technische Spezialisierung. Fuer v1 ist Agent mit Freigabe der konservative Startpunkt.',
    interviewRequired: true,
  },
  {
    bpmnType: 'bpmn:UserTask',
    defaultPattern: 'human_in_the_loop',
    defaultPrivacy: 'unknown',
    defaultComplexity: 'unknown',
    rationale: 'User Tasks sind menschliche Taetigkeiten. KI kann unterstuetzen, die Entscheidung bleibt zunaechst beim Menschen.',
    interviewRequired: true,
  },
  {
    bpmnType: 'bpmn:ServiceTask',
    defaultPattern: 'mcp_or_api_call',
    defaultPrivacy: 'unknown',
    defaultComplexity: 'medium',
    rationale: 'Service Tasks sind Systemaufrufe. Die konkrete Machbarkeit haengt vom Zielsystem und dessen API ab.',
    interviewRequired: true,
  },
  {
    bpmnType: 'bpmn:ScriptTask',
    defaultPattern: 'local_code_execution',
    defaultPrivacy: 'no_pii',
    defaultComplexity: 'low',
    rationale: 'Script Tasks sind meist deterministische Berechnungen. Ein LLM ist dafuer nicht notwendig.',
    interviewRequired: false,
  },
  {
    bpmnType: 'bpmn:ManualTask',
    defaultPattern: 'notification_and_wait',
    defaultPrivacy: 'unknown',
    defaultComplexity: 'low',
    rationale: 'Manual Tasks liegen ausserhalb direkter Systemautomatisierung und werden als externe Aktivitaet behandelt.',
    interviewRequired: true,
  },
  {
    bpmnType: 'bpmn:ExclusiveGateway',
    defaultPattern: 'needs_clarification',
    defaultPrivacy: 'unknown',
    defaultComplexity: 'unknown',
    rationale: 'Gateways brauchen dokumentierte Entscheidungslogik. Ohne Kriterien bleibt der Schritt klaerungsbeduerftig.',
    interviewRequired: true,
  },
  {
    bpmnType: 'bpmn:StartEvent',
    defaultPattern: 'notification_and_wait',
    defaultPrivacy: 'unknown',
    defaultComplexity: 'low',
    rationale: 'Start Events beschreiben Ausloeser, aber keine inhaltliche Automatisierungsentscheidung.',
    interviewRequired: false,
  },
  {
    bpmnType: 'bpmn:EndEvent',
    defaultPattern: 'notification_and_wait',
    defaultPrivacy: 'unknown',
    defaultComplexity: 'low',
    rationale: 'End Events beenden den Prozess und werden fuer den Report dokumentiert.',
    interviewRequired: false,
  },
];

export const FALLBACK_RULE: MappingRule = {
  bpmnType: 'unknown',
  defaultPattern: 'needs_clarification',
  defaultPrivacy: 'unknown',
  defaultComplexity: 'unknown',
  rationale: 'Fuer diesen BPMN-Typ gibt es in v1 keine spezifische Regel. Der Schritt wird als offene Beratungsfrage markiert.',
  interviewRequired: true,
};
