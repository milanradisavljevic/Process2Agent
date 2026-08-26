import type { LLMConfig, } from '../types';
import type { Workspace, WorkspaceSettings } from '../types/workspace';

export const LEGACY_LLM_STORAGE_KEY = 'process2agent_llm_config';

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  defaultCurrency: 'EUR',
  defaultHourlyRates: {},
  llmProvider: 'none',
  llmConfig: {},
  locale: 'de',
};

export function settingsToLLMConfig(settings: WorkspaceSettings): LLMConfig {
  return {
    provider: settings.llmProvider,
    ollamaUrl: settings.llmConfig.ollamaUrl ?? 'http://localhost:11434',
    ollamaModel: settings.llmConfig.ollamaModel ?? 'llama3.2',
    anthropicApiKey: settings.llmConfig.anthropicApiKey ?? '',
    anthropicModel: settings.llmConfig.anthropicModel ?? 'claude-sonnet-4-6',
  };
}

export function llmConfigToSettings(settings: WorkspaceSettings, config: LLMConfig): WorkspaceSettings {
  return {
    ...settings,
    llmProvider: config.provider,
    llmConfig: {
      anthropicApiKey: config.anthropicApiKey,
      anthropicModel: config.anthropicModel,
      ollamaUrl: config.ollamaUrl,
      ollamaModel: config.ollamaModel,
    },
  };
}

export function normalizeSettings(raw?: Partial<WorkspaceSettings> | null): WorkspaceSettings {
  return {
    ...DEFAULT_WORKSPACE_SETTINGS,
    ...raw,
    llmConfig: { ...(raw?.llmConfig ?? {}) },
    defaultHourlyRates: { ...(raw?.defaultHourlyRates ?? {}) },
  };
}

/**
 * Einmalige Migration: LLM-Konfiguration aus dem localStorage (v1-Doppelspeicherung)
 * in die Workspace-Settings übernehmen. Der localStorage-Key wird in jedem Fall
 * entfernt, damit die Workspace-Settings ab jetzt die einzige Quelle sind.
 */
export function migrateLegacyLLMConfig(workspace: Workspace): Workspace {
  let legacyRaw: string | null = null;
  try {
    legacyRaw = window.localStorage.getItem(LEGACY_LLM_STORAGE_KEY);
  } catch {
    return workspace;
  }

  if (!legacyRaw) return workspace;

  try {
    window.localStorage.removeItem(LEGACY_LLM_STORAGE_KEY);
    const legacy = JSON.parse(legacyRaw) as Partial<LLMConfig>;

    if (legacy.provider && legacy.provider !== 'none' && workspace.settings.llmProvider === 'none') {
      return {
        ...workspace,
        settings: llmConfigToSettings(workspace.settings, {
          provider: legacy.provider,
          ollamaUrl: legacy.ollamaUrl ?? 'http://localhost:11434',
          ollamaModel: legacy.ollamaModel ?? 'llama3.2',
          anthropicApiKey: legacy.anthropicApiKey ?? '',
          anthropicModel: legacy.anthropicModel ?? 'claude-sonnet-4-6',
        }),
      };
    }
  } catch {
    // Korrupte Legacy-Daten ignorieren — Key ist bereits entfernt.
  }

  return workspace;
}
