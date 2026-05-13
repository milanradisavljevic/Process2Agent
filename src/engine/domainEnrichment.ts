import { FALLBACK_RULE, MAPPING_RULES } from '../data/mappingRules';
import { NAV_PATTERNS } from '../data/navPatterns';
import type { AssessmentSuggestion, ProcessElement } from '../types';

export function createSuggestion(element: ProcessElement): AssessmentSuggestion {
  const rule = MAPPING_RULES.find((candidate) => candidate.bpmnType === element.bpmnType) ?? FALLBACK_RULE;
  const normalizedName = normalizeText(element.name);
  const matchedPattern = NAV_PATTERNS.map((pattern) => ({
    pattern,
    hits: pattern.keywords.filter((keyword) => normalizedName.includes(normalizeText(keyword))),
  })).find((result) => result.hits.length > 0);

  if (matchedPattern) {
    return {
      elementId: element.id,
      pattern: matchedPattern.pattern.suggestedPattern,
      privacy: matchedPattern.pattern.suggestedPrivacy,
      complexity: matchedPattern.pattern.suggestedComplexity,
      rationale: matchedPattern.pattern.rationale,
      source: 'domain_enrichment',
      matchedKeywords: matchedPattern.hits,
    };
  }

  return {
    elementId: element.id,
    pattern: rule.defaultPattern,
    privacy: rule.defaultPrivacy,
    complexity: rule.defaultComplexity,
    rationale: rule.rationale,
    source: rule === FALLBACK_RULE ? 'fallback' : 'bpmn_rule',
    matchedKeywords: [],
  };
}

export function createSuggestions(elements: ProcessElement[]): Record<string, AssessmentSuggestion> {
  return Object.fromEntries(elements.map((element) => [element.id, createSuggestion(element)]));
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
