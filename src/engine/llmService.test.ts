import { describe, expect, it } from 'vitest';
import { parseLLMResponse } from './llmService';
import type { ProcessElement } from '../types';

const elements: ProcessElement[] = [
  { id: 'Task_1', name: 'Rechnung prüfen', bpmnType: 'bpmn:Task', source: 'name' },
  { id: 'Task_2', name: 'Freigabe', bpmnType: 'bpmn:UserTask', source: 'name' },
];

function response(entries: Array<Record<string, unknown>>): string {
  return JSON.stringify(entries);
}

describe('parseLLMResponse', () => {
  it('parst valide Vorschläge inklusive Dimensions', () => {
    const suggestions = parseLLMResponse(response([{
      id: 'Task_1',
      pattern: 'llm_classification',
      privacy: 'pii_likely',
      complexity: 'high',
      rationale: 'Test',
      implementation_hint: 'OData-Endpoint prüfen',
      risk: 'Fehlbuchung',
      quick_win: true,
      dimensions: {
        dataStructure: 'semi_structured',
        decisionComplexity: 'pattern_recognition',
        systemAccess: 'api',
        exceptionRate: 'frequent_exceptions',
      },
    }]), elements);

    const s = suggestions['Task_1'];
    expect(s.pattern).toBe('llm_classification');
    expect(s.dimensions?.dataStructure).toBe('semi_structured');
    expect(s.quick_win).toBe(true);
    expect(s.source).toBe('llm');
  });

  it('wirft bei fehlendem JSON-Array', () => {
    expect(() => parseLLMResponse('Kein JSON hier', elements)).toThrow();
  });

  it('extrahiert Arrays aus umgebendem Text (Markdown)', () => {
    const suggestions = parseLLMResponse(
      `Hier ist die Analyse:\n${response([{ id: 'Task_2', pattern: 'human_in_the_loop', privacy: 'unknown', complexity: 'low' }])}\nFertig.`,
      elements,
    );
    expect(Object.keys(suggestions)).toEqual(['Task_2']);
  });

  it('ignoriert unbekannte Element-IDs', () => {
    const suggestions = parseLLMResponse(response([
      { id: 'Unknown_ID', pattern: 'agent_autonomous', privacy: 'no_pii', complexity: 'low' },
    ]), elements);
    expect(suggestions).toEqual({});
  });

  it('ersetzt ungültige Enum-Werte durch konservative Defaults', () => {
    const suggestions = parseLLMResponse(response([
      { id: 'Task_1', pattern: 'hologram_mode', privacy: 'topsecret', complexity: 'ultra' },
    ]), elements);

    const s = suggestions['Task_1'];
    expect(s.pattern).toBe('needs_clarification');
    expect(s.privacy).toBe('unknown');
    expect(s.complexity).toBe('unknown');
  });

  it('validiert Dimensions-Felder einzeln und setzt Fallbacks', () => {
    const suggestions = parseLLMResponse(response([{
      id: 'Task_1',
      pattern: 'llm_generation',
      privacy: 'no_pii',
      complexity: 'medium',
      dimensions: { dataStructure: 'quantum', systemAccess: 'telepathy' },
    }]), elements);

    const dims = suggestions['Task_1'].dimensions;
    expect(dims?.dataStructure).toBe('semi_structured');
    expect(dims?.systemAccess).toBe('none');
    expect(dims?.decisionComplexity).toBe('judgment');
    expect(dims?.exceptionRate).toBe('frequent_exceptions');
  });

  it('behandelt quick_win strikt als Boolean', () => {
    const suggestions = parseLLMResponse(response([
      { id: 'Task_1', pattern: 'llm_generation', privacy: 'no_pii', complexity: 'low', quick_win: 'yes' },
    ]), elements);
    expect(suggestions['Task_1'].quick_win).toBe(false);
  });
});
