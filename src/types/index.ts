export type AgenticPattern =
  | 'human_in_the_loop'
  | 'agent_autonomous'
  | 'agent_with_approval'
  | 'rule_based_automation'
  | 'mcp_or_api_call'
  | 'local_code_execution'
  | 'notification_and_wait'
  | 'llm_classification'
  | 'llm_generation'
  | 'needs_clarification';

export type PrivacyLevel =
  | 'pii_confirmed'
  | 'pii_likely'
  | 'pseudonymized'
  | 'no_pii'
  | 'unknown';

export type ComplexityClass = 'low' | 'medium' | 'high' | 'unknown';

export type AppView = 'import' | 'analyzing' | 'assessment' | 'report';

export interface ProcessElement {
  id: string;
  name: string;
  bpmnType: string;
  laneName?: string;
  source: 'name' | 'extension' | 'id';
  documentation?: string;
}

export interface MappingRule {
  bpmnType: string;
  defaultPattern: AgenticPattern;
  defaultPrivacy: PrivacyLevel;
  defaultComplexity: ComplexityClass;
  rationale: string;
  interviewRequired: boolean;
  warningIfAutomatic?: string;
}

export interface DomainPattern {
  id: string;
  label: string;
  keywords: string[];
  suggestedPattern: AgenticPattern;
  suggestedPrivacy: PrivacyLevel;
  suggestedComplexity: ComplexityClass;
  rationale: string;
}

export interface AssessmentSuggestion {
  elementId: string;
  pattern: AgenticPattern;
  privacy: PrivacyLevel;
  complexity: ComplexityClass;
  rationale: string;
  source: 'bpmn_rule' | 'domain_enrichment' | 'fallback' | 'llm';
  matchedKeywords: string[];
  implementation_hint: string;
  risk: string;
  quick_win: boolean;
}

export interface AssessmentDecision {
  elementId: string;
  pattern: AgenticPattern;
  privacy: PrivacyLevel;
  complexity: ComplexityClass;
  targetSystem: string;
  note: string;
  status: 'completed' | 'needs_clarification' | 'skipped';
}

export interface AssessmentSummary {
  total: number;
  aiSuitable: number;
  humanLoop: number;
  clarification: number;
  localRequired: number;
  cloudCapable: number;
}

export interface AssessmentProject {
  fileName: string;
  xml: string;
  elements: ProcessElement[];
  suggestions: Record<string, AssessmentSuggestion>;
}

export interface LLMConfig {
  provider: 'ollama' | 'anthropic' | 'none';
  ollamaUrl: string;
  ollamaModel: string;
  anthropicApiKey: string;
  anthropicModel: string;
}

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: 'none',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.2',
  anthropicApiKey: '',
  anthropicModel: 'claude-sonnet-4-6',
};
