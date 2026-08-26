import type { AssessmentDecision, AssessmentSuggestion, ProcessElement } from './index';

export interface Workspace {
  id: string;
  name: string;
  areas: Area[];
  settings: WorkspaceSettings;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSettings {
  defaultCurrency: 'EUR' | 'CHF';
  defaultHourlyRates: Record<string, number>;
  llmProvider: 'anthropic' | 'ollama' | 'none';
  llmConfig: {
    anthropicApiKey?: string;
    anthropicModel?: string;
    ollamaUrl?: string;
    ollamaModel?: string;
  };
  locale: 'de' | 'en';
}

export interface Area {
  id: string;
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
  processIds: string[];
}

export type ProcessStatus =
  | 'imported'
  | 'analyzed'
  | 'reviewed'
  | 'validated'
  | 'implementing'
  | 'live';

export interface ProcessEntry {
  id: string;
  areaId: string;
  name: string;
  description: string;
  bpmnXml: string;
  status: ProcessStatus;
  tags: string[];
  linkedProcessId?: string;
  createdAt: string;
  updatedAt: string;
  steps: ProcessElement[];
  suggestions: Record<string, AssessmentSuggestion>;
  decisions: Record<string, AssessmentDecision>;
  summary: ProcessSummary;
  businessCase?: ProcessBusinessCase;
  sandboxTests?: SandboxTest[];
}

export interface StepBusinessCase {
  frequencyPerYear: number;
  minutesPerExecution: number;
  role: string;
  hourlyRate: number;
  automationDegree: number;
}

export interface ProcessBusinessCase {
  stepCases: Record<string, StepBusinessCase>;
  implementationCostManual?: number;
}

export interface SandboxTest {
  id: string;
  stepId: string;
  testDate: string;
  inputFileName: string;
  inputType: 'pdf' | 'docx' | 'image' | 'text';
  extractedText: string;
  promptUsed: string;
  llmResponse: string;
  structuredResult?: Record<string, unknown>;
  confidence?: number;
  userVerdict: 'correct' | 'partial' | 'incorrect' | 'pending';
  notes?: string;
}

export interface ProcessSummary {
  totalSteps: number;
  quickWins: number;
  automationPotential: number;
  humanInLoop: number;
  clarificationNeeded: number;
  estimatedAnnualSavings?: number;
  laneCount: number;
  laneNames: string[];
}
