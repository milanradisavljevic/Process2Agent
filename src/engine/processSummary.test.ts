import { describe, expect, it } from 'vitest';
import {
  computeAssessmentSummary,
  computeProcessSummary,
  deriveStatus,
  normalizeStatus,
} from './processSummary';
import type { AssessmentDecision, AssessmentSuggestion, ProcessElement } from '../types';

function elements(count: number): ProcessElement[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `Step_${i}`,
    name: `Schritt ${i}`,
    bpmnType: 'bpmn:Task',
    source: 'name' as const,
  }));
}

function decision(id: string, overrides: Partial<AssessmentDecision> = {}): AssessmentDecision {
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

describe('computeAssessmentSummary', () => {
  it('zählt KI-geeignete, menschliche und offene Schritte korrekt', () => {
    const els = elements(5);
    const decisions: Record<string, AssessmentDecision> = {
      Step_0: decision('Step_0', { pattern: 'agent_autonomous' }),
      Step_1: decision('Step_1', { pattern: 'llm_classification', privacy: 'pii_confirmed' }),
      Step_2: decision('Step_2', { pattern: 'human_in_the_loop' }),
      Step_3: decision('Step_3', { pattern: 'rule_based_automation', status: 'needs_clarification', privacy: 'unknown' }),
    };

    const summary = computeAssessmentSummary(els, decisions);

    expect(summary.total).toBe(5);
    expect(summary.aiSuitable).toBe(2);
    expect(summary.humanLoop).toBe(1);
    expect(summary.clarification).toBe(2);
  });

  it('klassifiziert PII-Schritte als lokal erforderlich', () => {
    const els = elements(2);
    const decisions: Record<string, AssessmentDecision> = {
      Step_0: decision('Step_0', { privacy: 'pii_confirmed' }),
      Step_1: decision('Step_1', { privacy: 'pseudonymized' }),
    };

    const summary = computeAssessmentSummary(els, decisions);

    expect(summary.localRequired).toBe(1);
    expect(summary.cloudCapable).toBe(1);
  });

  it('zählt nicht abgeschlossene Entscheidungen weiterhin nach Pattern (aktuelles Verhalten)', () => {
    const summary = computeAssessmentSummary(elements(1), {
      Step_0: decision('Step_0', { pattern: 'agent_autonomous', status: 'needs_clarification' }),
    });

    expect(summary.aiSuitable).toBe(1);
    expect(summary.clarification).toBe(1);
  });

  it('leerer Report ergibt Nullen ohne Fehler', () => {
    const summary = computeAssessmentSummary([], {});
    expect(summary.total).toBe(0);
    expect(summary.aiSuitable).toBe(0);
  });
});

describe('computeProcessSummary', () => {
  it('aggregiert Quick Wins, Potenzial und Lanes aus Suggestions und Decisions', () => {
    const els = elements(4);
    const suggestions: Record<string, AssessmentSuggestion> = {
      Step_0: { elementId: 'Step_0', pattern: 'mcp_or_api_call', privacy: 'no_pii', complexity: 'low', rationale: '', source: 'domain_enrichment', matchedKeywords: [], implementation_hint: '', risk: '', quick_win: true },
      Step_1: { elementId: 'Step_1', pattern: 'human_in_the_loop', privacy: 'unknown', complexity: 'medium', rationale: '', source: 'bpmn_rule', matchedKeywords: [], implementation_hint: '', risk: '', quick_win: false },
    };
    const decisions: Record<string, AssessmentDecision> = {
      Step_0: decision('Step_0'),
    };

    const summary = computeProcessSummary(els, suggestions, decisions);

    expect(summary.totalSteps).toBe(4);
    expect(summary.quickWins).toBe(1);
    expect(summary.automationPotential).toBe(1);
    expect(summary.humanInLoop).toBe(1);
    expect(summary.clarificationNeeded).toBe(3);
    expect(summary.laneCount).toBe(0);
  });

  it('berechnet Einsparungen aus dem Business Case', () => {
    const summary = computeProcessSummary(elements(1), {}, {}, {
      stepCases: {
        Step_0: { frequencyPerYear: 1000, minutesPerExecution: 12, role: 'Sachbearbeiter', hourlyRate: 50, automationDegree: 0.6 },
      },
    });

    expect(summary.estimatedAnnualSavings).toBe(Math.round((1000 * 12 / 60) * 50 * 0.6));
  });
});

describe('deriveStatus', () => {
  it('gibt imported ohne Suggestions zurück', () => {
    expect(deriveStatus('imported', elements(2), {}, {})).toBe('imported');
  });

  it('gibt analyzed zurück, wenn alle Schritte Vorschläge haben', () => {
    const els = elements(1);
    const suggestions: Record<string, AssessmentSuggestion> = {
      Step_0: { elementId: 'Step_0', pattern: 'agent_with_approval', privacy: 'unknown', complexity: 'medium', rationale: '', source: 'bpmn_rule', matchedKeywords: [], implementation_hint: '', risk: '', quick_win: false },
    };
    expect(deriveStatus('imported', els, suggestions, {})).toBe('analyzed');
  });

  it('gibt reviewed zurück, wenn alle Schritte entschieden sind', () => {
    const els = elements(1);
    const s: Record<string, AssessmentSuggestion> = {
      Step_0: { elementId: 'Step_0', pattern: 'agent_with_approval', privacy: 'unknown', complexity: 'medium', rationale: '', source: 'bpmn_rule', matchedKeywords: [], implementation_hint: '', risk: '', quick_win: false },
    };
    expect(deriveStatus('analyzed', els, s, { Step_0: decision('Step_0') })).toBe('reviewed');
  });

  it('hält validated stabil (kein Downgrade)', () => {
    expect(deriveStatus('validated', elements(1), {}, {})).toBe('validated');
  });
});

describe('normalizeStatus', () => {
  it('migriert implementing/live zu validated', () => {
    expect(normalizeStatus('implementing')).toBe('validated');
    expect(normalizeStatus('live')).toBe('validated');
  });

  it('lässt gültige Werte unverändert und mündet in imported', () => {
    expect(normalizeStatus('reviewed')).toBe('reviewed');
    expect(normalizeStatus('analyzed')).toBe('analyzed');
    expect(normalizeStatus('validated')).toBe('validated');
    expect(normalizeStatus('imported')).toBe('imported');
    expect(normalizeStatus('unbekannt')).toBe('imported');
  });
});
