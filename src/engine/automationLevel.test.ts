import { describe, expect, it } from 'vitest';
import {
  computeAutomationLevel,
  estimateSTPRate,
  getAutomationBlueprint,
  getAutomationLevelLabel,
} from './automationLevel';
import type { AutomationDimensions } from '../types';

const base: AutomationDimensions = {
  dataStructure: 'structured',
  decisionComplexity: 'rule_based',
  systemAccess: 'api',
  exceptionRate: 'standard_dominant',
};

describe('computeAutomationLevel', () => {
  it('gibt Stufe 3 für den Ideal-Kandidaten (Regeln + strukturiert + API + Standardfälle)', () => {
    expect(computeAutomationLevel(base)).toBe(3);
  });

  it('gibt Stufe 0 für kreative Entscheidungen', () => {
    expect(computeAutomationLevel({ ...base, decisionComplexity: 'creative' })).toBe(0);
  });

  it('gibt Stufe 0 ohne jedes System', () => {
    expect(computeAutomationLevel({ ...base, systemAccess: 'no_system' })).toBe(0);
  });

  it('begrenzt auf Stufe 1, wenn jeder Fall anders ist', () => {
    const level = computeAutomationLevel({ ...base, exceptionRate: 'every_case_different' });
    expect(level).toBeLessThanOrEqual(1);
  });

  it('gibt höchstens Stufe 1 ohne maschinellen Systemzugang', () => {
    const level = computeAutomationLevel({ ...base, systemAccess: 'none' });
    expect(level).toBe(1);
  });

  it('gibt Stufe 2 für regelbasierte Entscheidungen mit API trotz Sonderfällen', () => {
    expect(computeAutomationLevel({ ...base, exceptionRate: 'frequent_exceptions' })).toBe(2);
  });

  it('gibt Stufe 2 für Mustererkennung', () => {
    expect(computeAutomationLevel({ ...base, decisionComplexity: 'pattern_recognition' })).toBe(2);
  });

  it('stuft Erfahrungsurteil auf unstrukturierten Daten auf Stufe 0', () => {
    expect(computeAutomationLevel({
      ...base,
      decisionComplexity: 'judgment',
      dataStructure: 'unstructured',
    })).toBe(0);
  });
});

describe('Labels', () => {
  it('beschriftet alle vier Stufen', () => {
    expect(getAutomationLevelLabel(0)).toContain('Keine');
    expect(getAutomationLevelLabel(1)).toContain('Assistenz');
    expect(getAutomationLevelLabel(2)).toContain('Teilautomatisierung');
    expect(getAutomationLevelLabel(3)).toContain('Vollautomatisierung');
  });

  it('liefert Blaupausen und STP-Raten für jede Stufe', () => {
    for (const level of [0, 1, 2, 3] as const) {
      expect(getAutomationBlueprint(level).length).toBeGreaterThan(10);
      expect(estimateSTPRate(level).length).toBeGreaterThan(0);
    }
  });
});
