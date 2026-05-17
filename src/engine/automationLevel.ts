import type { AutomationDimensions, AutomationLevel } from '../types';

export function computeAutomationLevel(d: AutomationDimensions): AutomationLevel {
  if (d.decisionComplexity === 'creative' || d.systemAccess === 'no_system') return 0;
  if (d.exceptionRate === 'every_case_different') return Math.min(1, _baseScore(d)) as AutomationLevel;
  if (d.systemAccess === 'none') return 1;
  if (d.decisionComplexity === 'judgment') return d.dataStructure === 'unstructured' ? 0 : 1;

  if (
    d.decisionComplexity === 'rule_based' &&
    d.dataStructure === 'structured' &&
    d.systemAccess === 'api' &&
    d.exceptionRate === 'standard_dominant'
  ) return 3;

  if (d.decisionComplexity === 'rule_based' && d.systemAccess === 'api') return 2;
  if (d.decisionComplexity === 'pattern_recognition') return 2;

  return Math.min(_baseScore(d), 2) as AutomationLevel;
}

function _baseScore(d: AutomationDimensions): number {
  let s = 0;
  if (d.dataStructure === 'structured') s++;
  if (d.decisionComplexity === 'rule_based') s++;
  if (d.systemAccess === 'api') s++;
  if (d.exceptionRate === 'standard_dominant') s++;
  return s;
}

export function getAutomationLevelLabel(level: AutomationLevel): string {
  const labels: Record<AutomationLevel, string> = {
    0: 'Keine Automatisierung',
    1: 'Assistenz',
    2: 'Teilautomatisierung',
    3: 'Vollautomatisierung',
  };
  return labels[level];
}

export function getAutomationBlueprint(level: AutomationLevel): string {
  const blueprints: Record<AutomationLevel, string> = {
    0: 'Dieser Schritt bleibt vollständig menschlich. Typisch für kreative, strategische oder beziehungsbasierte Tätigkeiten — kein sinnvoller KI-Kandidat.',
    1: 'KI bereitet vor, Mensch entscheidet. Das Modell liefert Entwürfe, Zusammenfassungen oder Recherche-Ergebnisse; der Mitarbeiter prüft und gibt frei. Aufwand: 3–8 PT.',
    2: 'KI verarbeitet den Standardfall automatisch (STP), Ausnahmen gehen an einen Sachbearbeiter. Benötigt Routing-Logik und Monitoring-Dashboard. Aufwand: 10–25 PT.',
    3: 'Ende-zu-Ende-Automatisierung per API oder Event-Trigger. Agent führt aus, validiert das Ergebnis und loggt den Vorgang — kein menschlicher Eingriff im Normalfall. Aufwand: 5–15 PT.',
  };
  return blueprints[level];
}

export function estimateSTPRate(level: AutomationLevel): string {
  const rates: Record<AutomationLevel, string> = { 0: '—', 1: '—', 2: '70–90 %', 3: '> 95 %' };
  return rates[level];
}
