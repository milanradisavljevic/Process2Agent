import { useEffect, useState } from 'react';
import { CheckCircle2, CircleHelp, SkipForward } from 'lucide-react';
import { COMPLEXITY_LABELS, PATTERN_HINTS, PATTERN_LABELS, PRIVACY_LABELS, TARGET_SYSTEM_OPTIONS } from '../data/mappingRules';
import type { AgenticPattern, AssessmentDecision, AssessmentSuggestion, ComplexityClass, PrivacyLevel, ProcessElement } from '../types';

const PATTERN_OPTIONS: AgenticPattern[] = ['agent_with_approval', 'human_in_the_loop', 'agent_autonomous', 'llm_generation', 'llm_classification', 'mcp_or_api_call', 'rule_based_automation', 'local_code_execution', 'notification_and_wait', 'needs_clarification'];
const PRIVACY_OPTIONS: PrivacyLevel[] = ['no_pii', 'pseudonymized', 'pii_likely', 'pii_confirmed', 'unknown'];
const COMPLEXITY_OPTIONS: ComplexityClass[] = ['low', 'medium', 'high', 'unknown'];

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
}

export function InterviewPanel({ element, suggestion, decision, currentIndex, total, onSave, onNext, onPrevious, onReport }: InterviewPanelProps) {
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
      <div className="step-meta">
        <span>Schritt {currentIndex + 1} von {total}</span>
        <span>{element.bpmnType}</span>
      </div>
      <h2>{element.name}</h2>
      <p className="muted">{element.laneName ? `Lane: ${element.laneName}` : 'Keine Lane erkannt'} · Quelle: {sourceLabel(element.source)}</p>

      <div className={suggestion.source === 'fallback' ? 'suggestion-box neutral' : 'suggestion-box'}>
        <strong>{recommendationTitle}</strong>
        <p>{suggestion.rationale}</p>
        {suggestion.matchedKeywords.length > 0 ? <small>Erkannt ueber: {suggestion.matchedKeywords.join(', ')}</small> : <small>Quelle: {suggestion.source}</small>}
      </div>

      <section className="question-block">
        <h3>1. Wie soll KI hier unterstuetzen?</h3>
        <div className="choice-grid pattern-grid">
          {PATTERN_OPTIONS.map((option) => (
            <button className={pattern === option ? 'choice-card selected' : 'choice-card'} key={option} type="button" onClick={() => setPattern(option)}>
              <strong>{PATTERN_LABELS[option]}</strong>
              <span>{PATTERN_HINTS[option]}</span>
            </button>
          ))}
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
        Notiz fuer den Report
        <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="z.B. Kriterien fuer Freigabe mit Fachbereich klaeren" />
      </label>

      <div className={hasOpenItems ? 'decision-status open' : 'decision-status done'}>
        {hasOpenItems ? <CircleHelp size={18} /> : <CheckCircle2 size={18} />}
        <span>{hasOpenItems ? 'Wird als Klaerungsbedarf im Report markiert.' : 'Vollstaendig bewertet.'}</span>
      </div>

      <div className="button-row sticky-actions">
        <button type="button" className="secondary-button" onClick={onPrevious} disabled={currentIndex === 0}>Zurueck</button>
        <button type="button" className="secondary-button" onClick={() => saveCurrent('skipped')}><SkipForward size={16} /> Ueberspringen</button>
        <button type="button" className="primary-button compact" onClick={saveAndNext} disabled={currentIndex === total - 1}>Speichern & weiter</button>
      </div>

      <button type="button" className="report-button" onClick={saveAndReport}>Aktuellen Stand als Report anzeigen</button>
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
