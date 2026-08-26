import type {
  AgenticPattern,
  AssessmentDecision,
  AssessmentSuggestion,
  AssessmentSummary,
  ProcessElement,
} from '../types';
import type { ProcessBusinessCase, ProcessStatus, ProcessSummary } from '../types/workspace';

const AUTOMATION_PATTERNS = new Set<AgenticPattern>([
  'agent_autonomous',
  'agent_with_approval',
  'llm_classification',
  'llm_generation',
  'mcp_or_api_call',
  'rule_based_automation',
  'local_code_execution',
]);

const AI_SUITABLE_PATTERNS = new Set<AgenticPattern>([
  'agent_autonomous',
  'agent_with_approval',
  'llm_classification',
  'llm_generation',
]);

export function computeProcessSummary(
  elements: ProcessElement[],
  suggestions: Record<string, AssessmentSuggestion>,
  decisions: Record<string, AssessmentDecision>,
  businessCase?: ProcessBusinessCase,
): ProcessSummary {
  const laneNames = Array.from(
    new Set(elements.map((element) => element.laneName).filter((lane): lane is string => Boolean(lane))),
  );

  let estimatedAnnualSavings: number | undefined;
  if (businessCase) {
    let total = 0;
    for (const step of elements) {
      const stepCase = businessCase.stepCases[step.id];
      if (stepCase) {
        total += (stepCase.frequencyPerYear * stepCase.minutesPerExecution / 60)
          * stepCase.hourlyRate * stepCase.automationDegree;
      }
    }
    if (total > 0) estimatedAnnualSavings = Math.round(total);
  }

  return {
    totalSteps: elements.length,
    quickWins: elements.filter((element) => suggestions[element.id]?.quick_win).length,
    automationPotential: elements.filter(
      (element) => {
        const pattern = effectivePattern(element, suggestions, decisions);
        return pattern !== undefined && AUTOMATION_PATTERNS.has(pattern);
      },
    ).length,
    humanInLoop: elements.filter(
      (element) => effectivePattern(element, suggestions, decisions) === 'human_in_the_loop',
    ).length,
    clarificationNeeded: elements.filter(
      (element) => !decisions[element.id] || decisions[element.id].status !== 'completed',
    ).length,
    estimatedAnnualSavings,
    laneCount: laneNames.length,
    laneNames,
  };
}

export function computeAssessmentSummary(
  elements: ProcessElement[],
  decisions: Record<string, AssessmentDecision>,
): AssessmentSummary {
  const entries = elements.map((element) => decisions[element.id]);
  const defined = entries.filter(Boolean);

  return {
    total: elements.length,
    aiSuitable: defined.filter((decision) => AI_SUITABLE_PATTERNS.has(decision.pattern)).length,
    humanLoop: defined.filter((decision) => decision.pattern === 'human_in_the_loop').length,
    clarification: elements.length - defined.length + defined.filter((decision) => decision.status !== 'completed').length,
    localRequired: defined.filter((decision) => decision.privacy === 'pii_confirmed' || decision.privacy === 'pii_likely').length,
    cloudCapable: defined.filter((decision) => decision.privacy === 'no_pii' || decision.privacy === 'pseudonymized').length,
  };
}

export function deriveStatus(
  current: ProcessStatus,
  elements: ProcessElement[],
  suggestions: Record<string, AssessmentSuggestion>,
  decisions: Record<string, AssessmentDecision>,
): ProcessStatus {
  if (current === 'validated') return 'validated';

  const hasAnalyzedSteps = elements.length > 0 && elements.every((step) => Boolean(suggestions[step.id]));
  const hasReviewedSteps = elements.length > 0 && elements.every((step) => Boolean(decisions[step.id]));

  if (hasReviewedSteps) return 'reviewed';
  if (hasAnalyzedSteps) return 'analyzed';
  return 'imported';
}

export function normalizeStatus(raw: string): ProcessStatus {
  if (raw === 'validated' || raw === 'implementing' || raw === 'live') return 'validated';
  if (raw === 'reviewed' || raw === 'analyzed') return raw;
  return 'imported';
}

function effectivePattern(
  element: ProcessElement,
  suggestions: Record<string, AssessmentSuggestion>,
  decisions: Record<string, AssessmentDecision>,
): AgenticPattern | undefined {
  return decisions[element.id]?.pattern ?? suggestions[element.id]?.pattern ?? undefined;
}
