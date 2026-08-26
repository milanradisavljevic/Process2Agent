import { describe, expect, it } from 'vitest';
import { createSuggestion } from './domainEnrichment';
import type { ProcessElement } from '../types';

function element(name: string, bpmnType = 'bpmn:Task'): ProcessElement {
  return { id: crypto.randomUUID(), name, bpmnType, source: 'name' };
}

describe('createSuggestion', () => {
  it('matcht Invoice-Pattern unabhängig von Umlaut-Schreibweise', () => {
    for (const name of ['RECHNUNGSPRÜFUNG', 'Rechnungsbearbeitung']) {
      const suggestion = createSuggestion(element(name));
      expect(suggestion.source).toBe('domain_enrichment');
      expect(suggestion.pattern).toBe('llm_classification');
    }
  });

  it('matcht Pruefung-Substring vor dem Invoice-Pattern (bekannter Quirk, Fix in Phase 1)', () => {
    // "prüfen" normalisiert zu "prufen" und matcht als Substring in "prufen"/"pruefung"
    const suggestion = createSuggestion(element('Rechnung prüfen'));

    expect(suggestion.source).toBe('domain_enrichment');
    expect(suggestion.pattern).toBe('human_in_the_loop');
  });

  it('erkennt Freigabe-Schritte als Human-in-the-Loop', () => {
    const suggestion = createSuggestion(element('Freigabe durch Einkaufsleiter'));
    expect(suggestion.pattern).toBe('human_in_the_loop');
    expect(suggestion.matchedKeywords.length).toBeGreaterThan(0);
  });

  it('fällt auf die BPMN-Typ-Regel zurück, wenn kein Keyword matcht', () => {
    const suggestion = createSuggestion(element('Xyzzy Qux'));

    expect(suggestion.source).toBe('bpmn_rule');
    expect(suggestion.pattern).toBe('agent_with_approval');
  });

  it('mappt UserTask konservativ auf Mensch-im-Loop', () => {
    const suggestion = createSuggestion(element('Xyzzy Qux', 'bpmn:UserTask'));
    expect(suggestion.pattern).toBe('human_in_the_loop');
  });

  it('matcht Keywords auch in der Dokumentation nicht — nur im Namen', () => {
    const el: ProcessElement = {
      ...element('Xyzzy'),
      documentation: 'Hier geht es um Rechnungen',
    };
    const suggestion = createSuggestion(el);
    expect(suggestion.source).toBe('bpmn_rule');
  });

  it('gibt für unbekannte Typen den Klärungsbedarf-Fallback', () => {
    const suggestion = createSuggestion(element('Xyzzy', 'bpmn:UnknownType'));
    expect(suggestion.source).toBe('fallback');
    expect(suggestion.pattern).toBe('needs_clarification');
  });
});
