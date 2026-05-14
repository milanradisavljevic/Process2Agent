import { useEffect, useState } from 'react';
import { CheckCircle2, CircleHelp, SkipForward } from 'lucide-react';
import { Users, Bot, GitPullRequest, GitBranch, Plug, Terminal, Bell, ScanText, Sparkles, HelpCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { COMPLEXITY_LABELS, PATTERN_HINTS, PATTERN_LABELS, PRIVACY_LABELS, TARGET_SYSTEM_OPTIONS } from '../data/mappingRules';
import type { AgenticPattern, AssessmentDecision, AssessmentSuggestion, ComplexityClass, PrivacyLevel, ProcessElement } from '../types';

const PATTERN_OPTIONS: AgenticPattern[] = ['agent_with_approval', 'human_in_the_loop', 'agent_autonomous', 'llm_generation', 'llm_classification', 'mcp_or_api_call', 'rule_based_automation', 'local_code_execution', 'notification_and_wait', 'needs_clarification'];
const PRIVACY_OPTIONS: PrivacyLevel[] = ['no_pii', 'pseudonymized', 'pii_likely', 'pii_confirmed', 'unknown'];
const COMPLEXITY_OPTIONS: ComplexityClass[] = ['low', 'medium', 'high', 'unknown'];

const PATTERN_ICONS: Record<AgenticPattern, LucideIcon> = {
  human_in_the_loop: Users,
  agent_autonomous: Bot,
  agent_with_approval: GitPullRequest,
  rule_based_automation: GitBranch,
  mcp_or_api_call: Plug,
  local_code_execution: Terminal,
  notification_and_wait: Bell,
  llm_classification: ScanText,
  llm_generation: Sparkles,
  needs_clarification: HelpCircle,
};

interface InterviewPanelProps {
  element: ProcessElement;
  suggestion: AssessmentSuggestion;
  decision?: AssessmentDecision;
  currentIndex: number;
  total: number;
  onSave: (decision: AssessmentDecision) => void;
  onNext: () => void;
  onPrevious: () => void;
  onReport: () => void;
  onClose: () => void;
}

export function InterviewPanel({ element, suggestion, decision, currentIndex, total, onSave, onNext, onPrevious, onReport, onClose }: InterviewPanelProps) {
  const [pattern, setPattern] = useState<AgenticPattern>(decision?.pattern ?? suggestion.pattern);
  const [privacy, setPrivacy] = useState<PrivacyLevel>(decision?.privacy ?? suggestion.privacy);
  const [complexity, setComplexity] = useState<ComplexityClass>(decision?.complexity ?? suggestion.complexity);
  const [targetSystem, setTargetSystem] = useState(decision?.targetSystem ?? inferTargetSystem(suggestion));
  const [note, setNote] = useState(decision?.note ?? '');

  useEffect(() => {
    setPattern(decision?.pattern ?? suggestion.pattern);
    setPrivacy(decision?.privacy ?? suggestion.privacy);
    setComplexity(decision?.complexity ?? suggestion.complexity);
    setTargetSystem(decision?.targetSystem ?? inferTargetSystem(suggestion));
    setNote(decision?.note ?? '');
  }, [decision, element.id, suggestion]);

  const hasOpenItems = pattern === 'needs_clarification' || privacy === 'unknown' || complexity === 'unknown' || targetSystem === 'Unklar';
  const recommendationTitle = suggestion.source === 'fallback' ? 'Noch nicht eingeordnet' : `Empfehlung: ${PATTERN_LABELS[suggestion.pattern]}`;

  function buildDecision(status: AssessmentDecision['status']): AssessmentDecision {
    return {
      elementId: element.id,
      pattern,
      privacy,
      complexity,
      targetSystem,
      note,
      status,
    };
  }

  function saveCurrent(status: AssessmentDecision['status'] = hasOpenItems ? 'needs_clarification' : 'completed') {
    onSave(buildDecision(status));
  }

  function saveAndNext() {
    saveCurrent();
    onNext();
  }

  function saveAndReport() {
    saveCurrent();
    onReport();
  }

  return (
    <aside className="interview-panel">
      <div className="drawer-header">
        <div>
          <p className="drawer-eyebrow">{element.laneName ?? ''}</p>
          <h2 className="drawer-title">{element.name}</h2>
        </div>
        <button type="button" className="drawer-close-btn" onClick={onClose} aria-label="Schließen">
          ✕
        </button>
      </div>

      <div className="interview-panel-body">
      <div className="step-meta">
        <span>Schritt {currentIndex + 1} von {total}</span>
        <span>{element.bpmnType}</span>
      </div>
      <p className="muted">{element.laneName ? `Lane: ${element.laneName}` : 'Keine Lane erkannt'} · Quelle: {sourceLabel(element.source)}</p>

      <div className={suggestion.source === 'fallback' ? 'suggestion-box neutral' : 'suggestion-box'}>
        <strong>{recommendationTitle}</strong>
        <p>{suggestion.rationale}</p>
        {suggestion.matchedKeywords.length > 0 ? <small>Erkannt über: {suggestion.matchedKeywords.join(', ')}</small> : <small>Quelle: {suggestion.source}</small>}
        {suggestion.implementation_hint && (
          <div className="hint-box">
            <strong>Umsetzungshinweis</strong>
            <p>{suggestion.implementation_hint}</p>
          </div>
        )}
        {suggestion.risk && (
          <div className="risk-box">
            <strong>Risiko</strong>
            <p>{suggestion.risk}</p>
          </div>
        )}
      </div>

      <section className="question-block">
        <h3>1. Wie soll KI hier unterstützen?</h3>
        <div className="choice-grid pattern-grid">
          {PATTERN_OPTIONS.map((option) => {
            const Icon = PATTERN_ICONS[option];
            return (
              <button
                className={pattern === option ? 'choice-card selected' : 'choice-card'}
                data-pattern={option}
                key={option}
                type="button"
                onClick={() => setPattern(option)}
              >
                <span className="card-icon"><Icon size={16} strokeWidth={2} /></span>
                <strong>{PATTERN_LABELS[option]}</strong>
                <span>{PATTERN_HINTS[option]}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="question-block">
        <h3>2. Welche Daten sind betroffen?</h3>
        <div className="choice-grid compact-grid">
          {PRIVACY_OPTIONS.map((option) => (
            <button className={privacy === option ? 'choice-pill selected' : 'choice-pill'} key={option} type="button" onClick={() => setPrivacy(option)}>
              {PRIVACY_LABELS[option]}
            </button>
          ))}
        </div>
      </section>

      <section className="question-block">
        <h3>3. Wie aufwendig ist die Umsetzung?</h3>
        <div className="choice-grid compact-grid">
          {COMPLEXITY_OPTIONS.map((option) => (
            <button className={complexity === option ? 'choice-pill selected' : 'choice-pill'} key={option} type="button" onClick={() => setComplexity(option)}>
              {COMPLEXITY_LABELS[option]}
            </button>
          ))}
        </div>
      </section>

      <label className="field-label">
        Zielsystem / Integrationskontext
        <select value={targetSystem} onChange={(event) => setTargetSystem(event.target.value)}>
          {TARGET_SYSTEM_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>

      <label className="field-label">
        Notiz für den Report
        <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="z.B. Kriterien für Freigabe mit Fachbereich klären" />
      </label>

      <div className={hasOpenItems ? 'decision-status open' : 'decision-status done'}>
        {hasOpenItems ? <CircleHelp size={18} /> : <CheckCircle2 size={18} />}
        <span>{hasOpenItems ? 'Wird als Klärungsbedarf im Report markiert.' : 'Vollständig bewertet.'}</span>
      </div>

      <div className="button-row sticky-actions">
        <button type="button" className="secondary-button" onClick={onPrevious} disabled={currentIndex === 0}>Zurück</button>
        <button type="button" className="secondary-button" onClick={() => saveCurrent('skipped')}><SkipForward size={16} /> Überspringen</button>
        <button type="button" className="primary-button compact" onClick={saveAndNext} disabled={currentIndex === total - 1}>Speichern & weiter</button>
      </div>

      <button type="button" className="report-button" onClick={saveAndReport}>Aktuellen Stand als Report anzeigen</button>
      </div>
    </aside>
  );
}

function sourceLabel(source: ProcessElement['source']): string {
  if (source === 'name') {
    return 'BPMN-Name';
  }

  if (source === 'extension') {
    return 'Extension';
  }

  return 'technische ID';
}

function inferTargetSystem(suggestion: AssessmentSuggestion): string {
  const keywordText = suggestion.matchedKeywords.join(' ').toLowerCase();

  if (keywordText.match(/erp|artikel|stammdaten|preis|kondition|nav|buchung|rechnung|bestellung/)) {
    return 'NAV/Business Central';
  }

  if (keywordText.match(/mail|kommunikation|meeting|benachrichtigung/)) {
    return 'Mail/Kommunikation';
  }

  return 'Unklar';
}
