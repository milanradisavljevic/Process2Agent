import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_WORKSPACE_SETTINGS,
  LEGACY_LLM_STORAGE_KEY,
  migrateLegacyLLMConfig,
  normalizeSettings,
  settingsToLLMConfig,
} from './llmConfig';
import type { Workspace } from '../types/workspace';

function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: 'ws_1',
    name: 'Test',
    areas: [],
    settings: { ...DEFAULT_WORKSPACE_SETTINGS },
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('settingsToLLMConfig', () => {
  it('füllt Defaults für fehlende Felder', () => {
    const config = settingsToLLMConfig(DEFAULT_WORKSPACE_SETTINGS);

    expect(config.provider).toBe('none');
    expect(config.ollamaUrl).toBe('http://localhost:11434');
    expect(config.ollamaModel).toBe('llama3.2');
    expect(config.anthropicApiKey).toBe('');
    expect(config.anthropicModel).toBe('claude-sonnet-4-6');
  });
});

describe('normalizeSettings', () => {
  it('ergänzt fehlende Felder defensiv', () => {
    const normalized = normalizeSettings({ llmProvider: 'ollama' });

    expect(normalized.llmProvider).toBe('ollama');
    expect(normalized.defaultCurrency).toBe('EUR');
    expect(normalized.defaultHourlyRates).toEqual({});
    expect(normalized.llmConfig).toEqual({});
  });
});

describe('migrateLegacyLLMConfig', () => {
  it('übernimmt konfiguriertes Legacy-LLM in die Settings und entfernt den Key', () => {
    window.localStorage.setItem(LEGACY_LLM_STORAGE_KEY, JSON.stringify({
      provider: 'anthropic',
      anthropicApiKey: 'sk-test',
      anthropicModel: 'claude-test',
    }));

    const result = migrateLegacyLLMConfig(workspace());

    expect(result.settings.llmProvider).toBe('anthropic');
    expect(result.settings.llmConfig.anthropicApiKey).toBe('sk-test');
    expect(window.localStorage.getItem(LEGACY_LLM_STORAGE_KEY)).toBeNull();
  });

  it('entfernt den Key auch, wenn kein Merge nötig ist (bereits konfiguriert)', () => {
    window.localStorage.setItem(LEGACY_LLM_STORAGE_KEY, JSON.stringify({ provider: 'ollama' }));
    const ws = workspace();
    ws.settings = { ...ws.settings, llmProvider: 'anthropic' };

    const result = migrateLegacyLLMConfig(ws);

    expect(result).toBe(ws);
    expect(window.localStorage.getItem(LEGACY_LLM_STORAGE_KEY)).toBeNull();
  });

  it('ignoriert korrupte Legacy-Daten ohne Fehler', () => {
    window.localStorage.setItem(LEGACY_LLM_STORAGE_KEY, '{kein json');

    const result = migrateLegacyLLMConfig(workspace());

    expect(result.settings.llmProvider).toBe('none');
    expect(window.localStorage.getItem(LEGACY_LLM_STORAGE_KEY)).toBeNull();
  });

  it('ist ein No-op ohne localStorage-Eintrag', () => {
    const ws = workspace();
    expect(migrateLegacyLLMConfig(ws)).toBe(ws);
  });
});
