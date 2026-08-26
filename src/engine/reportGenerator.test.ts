import { describe, expect, it } from 'vitest';
import { summarizeAssessment } from './reportGenerator';
import type { AssessmentDecision, AssessmentProject } from '../types';

function project(count: number): AssessmentProject {
  return {
    fileName: 'test.bpmn',
    xml: '<definitions />',
    elements: Array.from({ length: count }, (_, i) => ({
      id: `Step_${i}`,
      name: `Schritt ${i}`,
      bpmnType: 'bpmn:Task',
      source: 'name' as const,
    })),
    suggestions: {},
  };
}

function decision(id: string, overrides: Partial<AssessmentDecision>): AssessmentDecision {
  return {
    elementId: id,
    pattern: 'agent_with_approval',
    privacy: 'no_pii',
    complexity: 'low',
    targetSystem: 'NAV/Business Central',
    note: '',
    status: 'completed',
    ...overrides,
  };
}

describe('summarizeAssessment', () => {
  it('zählt KI-geeignete, menschliche und offene Schritte korrekt', () => {
    const p = project(5);
    const decisions: Record<string, AssessmentDecision> = {
      Step_0: decision('Step_0', { pattern: 'agent_autonomous' }),
      Step_1: decision('Step_1', { pattern: 'llm_classification', privacy: 'pii_confirmed' }),
      Step_2: decision('Step_2', { pattern: 'human_in_the_loop' }),
      Step_3: decision('Step_3', { pattern: 'rule_based_automation', status: 'needs_clarification', privacy: 'unknown' }),
    };

    const summary = summarizeAssessment(p, decisions);

    expect(summary.total).toBe(5);
    expect(summary.aiSuitable).toBe(2);
    expect(summary.humanLoop).toBe(1);
    expect(summary.clarification).toBe(2);
  });

  it('zählt nicht abgeschlossene Entscheidungen weiterhin nach Pattern (aktuelles Verhalten)', () => {
    const p = project(1);
    const decisions: Record<string, AssessmentDecision> = {
      Step_0: decision('Step_0', { pattern: 'agent_autonomous', status: 'needs_clarification' }),
    };

    const summary = summarizeAssessment(p, decisions);

    expect(summary.aiSuitable).toBe(1);
    expect(summary.clarification).toBe(1);
  });

  it('klassifiziert PII-Schritte als lokal erforderlich', () => {
    const p = project(2);
    const decisions: Record<string, AssessmentDecision> = {
      Step_0: decision('Step_0', { privacy: 'pii_confirmed' }),
      Step_1: decision('Step_1', { privacy: 'pseudonymized' }),
    };

    const summary = summarizeAssessment(p, decisions);

    expect(summary.localRequired).toBe(1);
    expect(summary.cloudCapable).toBe(1);
  });

  it('leerer Report ergibt Nullen ohne Fehler', () => {
    const summary = summarizeAssessment(project(0), {});
    expect(summary.total).toBe(0);
    expect(summary.aiSuitable).toBe(0);
  });
});
