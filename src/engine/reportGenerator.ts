import type { AssessmentDecision, AssessmentProject, AssessmentSummary } from '../types';

export function summarizeAssessment(project: AssessmentProject, decisions: Record<string, AssessmentDecision>): AssessmentSummary {
  const entries = project.elements.map((element) => decisions[element.id]);
  const completedEntries = entries.filter(Boolean);

  return {
    total: project.elements.length,
    aiSuitable: completedEntries.filter((decision) => ['agent_autonomous', 'agent_with_approval', 'llm_classification', 'llm_generation'].includes(decision.pattern)).length,
    humanLoop: completedEntries.filter((decision) => decision.pattern === 'human_in_the_loop').length,
    clarification: project.elements.length - completedEntries.length + completedEntries.filter((decision) => decision.status !== 'completed').length,
    localRequired: completedEntries.filter((decision) => decision.privacy === 'pii_confirmed' || decision.privacy === 'pii_likely').length,
    cloudCapable: completedEntries.filter((decision) => decision.privacy === 'no_pii' || decision.privacy === 'pseudonymized').length,
  };
}
