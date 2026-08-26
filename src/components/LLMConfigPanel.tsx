import { useState } from 'react';
import { Settings, X } from 'lucide-react';
import type { LLMConfig } from '../types';
import { DEFAULT_LLM_CONFIG } from '../types';

const STORAGE_KEY = 'process2agent_llm_config';

export function loadLLMConfig(): LLMConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_LLM_CONFIG, ...(JSON.parse(stored) as Partial<LLMConfig>) };
    }
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULT_LLM_CONFIG };
}

function saveLLMConfig(config: LLMConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

interface LLMConfigPanelProps {
  config: LLMConfig;
  onConfigChange: (config: LLMConfig) => void;
}

export function LLMConfigPanel({ config, onConfigChange }: LLMConfigPanelProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<LLMConfig>(config);

  function handleOpen() {
    setDraft(config);
    setOpen(true);
  }

  function handleSave() {
    saveLLMConfig(draft);
    onConfigChange(draft);
    setOpen(false);
  }

  const label =
    config.provider === 'none'
      ? 'Kein LLM'
      : config.provider === 'ollama'
        ? `Ollama · ${config.ollamaModel}`
        : `Anthropic · ${config.anthropicModel}`;

  return (
    <>
      <button type="button" className="llm-config-btn" onClick={handleOpen} title="LLM konfigurieren">
        <Settings size={16} />
        <span>{label}</span>
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>LLM-Konfiguration</h2>
              <button type="button" className="modal-close" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <fieldset className="config-fieldset">
                <legend>Provider</legend>
                {(['none', 'ollama', 'anthropic'] as const).map((p) => (
                  <label key={p} className="radio-label">
                    <input
                      type="radio"
                      name="provider"
                      value={p}
                      checked={draft.provider === p}
                      onChange={() => setDraft({ ...draft, provider: p })}
                    />
                    {p === 'none' ? 'Keiner (regelbasiert)' : p === 'ollama' ? 'Ollama (lokal)' : 'Anthropic (Cloud)'}
                  </label>
                ))}
              </fieldset>

              {draft.provider === 'ollama' && (
                <div className="config-fields">
                  <label className="config-label">
                    Ollama URL
                    <input
                      type="text"
                      value={draft.ollamaUrl}
                      onChange={(e) => setDraft({ ...draft, ollamaUrl: e.target.value })}
                    />
                  </label>
                  <label className="config-label">
                    Modell
                    <input
                      type="text"
                      value={draft.ollamaModel}
                      onChange={(e) => setDraft({ ...draft, ollamaModel: e.target.value })}
                      placeholder="llama3.2"
                    />
                  </label>
                </div>
              )}

              {draft.provider === 'anthropic' && (
                <div className="config-fields">
                  <label className="config-label">
                    API Key
                    <input
                      type="password"
                      value={draft.anthropicApiKey}
                      onChange={(e) => setDraft({ ...draft, anthropicApiKey: e.target.value })}
                      placeholder="sk-ant-..."
                    />
                  </label>
                  <label className="config-label">
                    Modell
                    <input
                      type="text"
                      value={draft.anthropicModel}
                      onChange={(e) => setDraft({ ...draft, anthropicModel: e.target.value })}
                      placeholder="claude-sonnet-4-6"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="secondary-button" onClick={() => setOpen(false)}>
                Abbrechen
              </button>
              <button type="button" className="primary-button compact" onClick={handleSave}>
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
