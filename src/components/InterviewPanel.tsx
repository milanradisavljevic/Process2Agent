import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleHelp, ChevronDown, SkipForward, Upload, FlaskConical, ShieldCheck, RefreshCw, Coins } from 'lucide-react';
import { Users, Bot, GitPullRequest, GitBranch, Plug, Terminal, Bell, ScanText, Sparkles, HelpCircle, Check, Minus, X, Circle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { COMPLEXITY_LABELS, PATTERN_HINTS, PATTERN_LABELS, PRIVACY_LABELS, TARGET_SYSTEM_OPTIONS, VERDICT_LABELS } from '../data/mappingRules';
import { extractDocumentText } from '../engine/documentExtractor';
import { analyzeSandboxDocument } from '../engine/llmService';
import { computeAutomationLevel, estimateSTPRate, getAutomationBlueprint, getAutomationLevelLabel } from '../engine/automationLevel';
import type { AgenticPattern, AssessmentDecision, AssessmentSuggestion, AutomationDimensions, ComplexityClass, DataStructure, DecisionComplexity, ExceptionRate, PrivacyLevel, ProcessElement, SystemAccess } from '../types';
import type { LLMConfig } from '../types';
import type { ProcessBusinessCase, ProcessEntry, SandboxTest, StepBusinessCase } from '../types/workspace';

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

const LLM_BASED_PATTERNS = new Set<AgenticPattern>(['agent_autonomous', 'agent_with_approval', 'llm_generation', 'llm_classification', 'mcp_or_api_call', 'needs_clarification']);

interface InterviewPanelProps {
  element: ProcessElement;
  suggestion: AssessmentSuggestion;
  decision?: AssessmentDecision;
  currentIndex: number;
  total: number;
  process?: ProcessEntry;
  llmConfig?: LLMConfig;
  defaultHourlyRates?: Record<string, number>;
  onSave: (decision: AssessmentDecision) => void;
  onSaveBusinessCase: (businessCase: ProcessBusinessCase) => void;
  onSaveSandboxTest: (test: SandboxTest) => void;
  onNext: () => void;
  onPrevious: () => void;
  onReport: () => void;
  onClose: () => void;
}

export function InterviewPanel({
  element,
  suggestion,
  decision,
  currentIndex,
  total,
  process,
  llmConfig,
  defaultHourlyRates = {},
  onSave,
  onSaveBusinessCase,
  onSaveSandboxTest,
  onNext,
  onPrevious,
  onReport,
  onClose,
}: InterviewPanelProps) {
  const [pattern, setPattern] = useState<AgenticPattern>(decision?.pattern ?? suggestion.pattern);
  const [privacy, setPrivacy] = useState<PrivacyLevel>(decision?.privacy ?? suggestion.privacy);
  const [complexity, setComplexity] = useState<ComplexityClass>(decision?.complexity ?? suggestion.complexity);
  const [targetSystem, setTargetSystem] = useState(decision?.targetSystem ?? inferTargetSystem(suggestion));
  const [note, setNote] = useState(decision?.note ?? '');

  const [riskOpen, setRiskOpen] = useState(false);
  const [riskContainsPII, setRiskContainsPII] = useState<'yes' | 'no' | 'unclear'>(decision?.riskChecklist?.containsPII ?? 'unclear');
  const [riskDecisionReversible, setRiskDecisionReversible] = useState<'yes' | 'no'>(decision?.riskChecklist?.decisionReversible ?? 'yes');
  const [riskHumanApproval, setRiskHumanApproval] = useState<'yes' | 'no'>(decision?.riskChecklist?.humanApprovalExists ?? 'yes');

  const [changeOpen, setChangeOpen] = useState(false);
  const [changeSystems, setChangeSystems] = useState(decision?.changeImpact?.affectedSystems ?? '');
  const [changeMgmt, setChangeMgmt] = useState<'yes' | 'no'>(decision?.changeImpact?.changeManagementRequired ?? 'no');

  const [bcOpen, setBcOpen] = useState(false);
  const stepBc = useMemo(() => process?.businessCase?.stepCases[element.id], [process?.businessCase, element.id]);
  const [freq, setFreq] = useState(stepBc?.frequencyPerYear ?? 0);
  const [minutes, setMinutes] = useState(stepBc?.minutesPerExecution ?? 0);
  const [role, setRole] = useState(stepBc?.role ?? '');
  const [hourlyRate, setHourlyRate] = useState(stepBc?.hourlyRate ?? (defaultHourlyRates[role] ?? 0));
  const [autoDegree, setAutoDegree] = useState(stepBc?.automationDegree ?? 0.6);

  const savedDims = decision?.dimensions ?? suggestion.dimensions;
  const [dimData, setDimData] = useState<DataStructure>(savedDims?.dataStructure ?? 'semi_structured');
  const [dimDecision, setDimDecision] = useState<DecisionComplexity>(savedDims?.decisionComplexity ?? 'judgment');
  const [dimSystem, setDimSystem] = useState<SystemAccess>(savedDims?.systemAccess ?? 'none');
  const [dimException, setDimException] = useState<ExceptionRate>(savedDims?.exceptionRate ?? 'frequent_exceptions');

  const automationDimensions = useMemo<AutomationDimensions>(() => ({
    dataStructure: dimData, decisionComplexity: dimDecision, systemAccess: dimSystem, exceptionRate: dimException,
  }), [dimData, dimDecision, dimSystem, dimException]);
  const automationLevel = useMemo(() => computeAutomationLevel(automationDimensions), [automationDimensions]);

  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [sandboxError, setSandboxError] = useState<string | null>(null);
  const [latestSandbox, setLatestSandbox] = useState<SandboxTest | undefined>();

  const stepSandboxTests = useMemo(() =>
    process?.sandboxTests?.filter((t) => t.stepId === element.id).sort((a, b) => b.testDate.localeCompare(a.testDate)),
    [process?.sandboxTests, element.id]
  );

  useEffect(() => {
    setPattern(decision?.pattern ?? suggestion.pattern);
    setPrivacy(decision?.privacy ?? suggestion.privacy);
    setComplexity(decision?.complexity ?? suggestion.complexity);
    setTargetSystem(decision?.targetSystem ?? inferTargetSystem(suggestion));
    setNote(decision?.note ?? '');
    setRiskContainsPII(decision?.riskChecklist?.containsPII ?? 'unclear');
    setRiskDecisionReversible(decision?.riskChecklist?.decisionReversible ?? 'yes');
    setRiskHumanApproval(decision?.riskChecklist?.humanApprovalExists ?? 'yes');
    setChangeSystems(decision?.changeImpact?.affectedSystems ?? '');
    setChangeMgmt(decision?.changeImpact?.changeManagementRequired ?? 'no');
    setFreq(stepBc?.frequencyPerYear ?? 0);
    setMinutes(stepBc?.minutesPerExecution ?? 0);
    setRole(stepBc?.role ?? '');
    setHourlyRate(stepBc?.hourlyRate ?? (defaultHourlyRates[role] ?? 0));
    setAutoDegree(stepBc?.automationDegree ?? 0.6);
    const dims = decision?.dimensions ?? suggestion.dimensions;
    setDimData(dims?.dataStructure ?? 'semi_structured');
    setDimDecision(dims?.decisionComplexity ?? 'judgment');
    setDimSystem(dims?.systemAccess ?? 'none');
    setDimException(dims?.exceptionRate ?? 'frequent_exceptions');
    setLatestSandbox(undefined);
    setSandboxError(null);
  }, [decision, element.id, suggestion, stepBc, defaultHourlyRates, role]);

  const hasOpenItems = pattern === 'needs_clarification' || privacy === 'unknown' || complexity === 'unknown' || targetSystem === 'Unklar';
  const recommendationTitle = suggestion.source === 'fallback' ? 'Noch nicht eingeordnet' : `Empfehlung: ${PATTERN_LABELS[suggestion.pattern]}`;
  const showRisk = LLM_BASED_PATTERNS.has(pattern);

  const annualManualCost = useMemo(() => (freq * minutes / 60) * hourlyRate, [freq, minutes, hourlyRate]);
  const expectedSavings = useMemo(() => annualManualCost * autoDegree, [annualManualCost, autoDegree]);

  function buildDecision(status: AssessmentDecision['status']): AssessmentDecision {
    return {
      elementId: element.id,
      pattern,
      privacy,
      complexity,
      targetSystem,
      note,
      status,
      riskChecklist: showRisk ? { containsPII: riskContainsPII, decisionReversible: riskDecisionReversible, humanApprovalExists: riskHumanApproval } : undefined,
      changeImpact: { affectedSystems: changeSystems, changeManagementRequired: changeMgmt },
      dimensions: automationDimensions,
    };
  }

  function saveCurrent(status: AssessmentDecision['status'] = hasOpenItems ? 'needs_clarification' : 'completed') {
    onSave(buildDecision(status));
    saveBusinessCase();
  }

  function saveAndNext() {
    saveCurrent();
    onNext();
  }

  function saveAndReport() {
    saveCurrent();
    onReport();
  }

  function saveBusinessCase() {
    if (!process) return;
    const nextStepCase: StepBusinessCase = {
      frequencyPerYear: freq,
      minutesPerExecution: minutes,
      role,
      hourlyRate,
      automationDegree: autoDegree,
    };
    const nextBusinessCase: ProcessBusinessCase = {
      stepCases: { ...process.businessCase?.stepCases, [element.id]: nextStepCase },
      implementationCostManual: process.businessCase?.implementationCostManual,
    };
    onSaveBusinessCase(nextBusinessCase);
  }

  const handleSandboxUpload = useCallback(async (file: File) => {
    if (!llmConfig || llmConfig.provider === 'none') {
      setSandboxError('Kein LLM konfiguriert. Bitte in den Einstellungen einen Provider wählen.');
      return;
    }
    setSandboxLoading(true);
    setSandboxError(null);
    try {
      const { text, type } = await extractDocumentText(file);
      const result = await analyzeSandboxDocument(text, element.name, PATTERN_LABELS[pattern], llmConfig);
      const test: SandboxTest = {
        id: crypto.randomUUID(),
        stepId: element.id,
        testDate: new Date().toISOString(),
        inputFileName: file.name,
        inputType: type,
        extractedText: text,
        promptUsed: '',
        llmResponse: JSON.stringify(result),
        structuredResult: result,
        confidence: result.confidence,
        userVerdict: 'pending',
      };
      setLatestSandbox(test);
      onSaveSandboxTest(test);
    } catch (err) {
      setSandboxError(err instanceof Error ? err.message : 'Sandbox-Analyse fehlgeschlagen');
    } finally {
      setSandboxLoading(false);
    }
  }, [element.id, element.name, pattern, llmConfig, onSaveSandboxTest]);

  const handleVerdict = useCallback((verdict: SandboxTest['userVerdict']) => {
    const test = latestSandbox ?? stepSandboxTests?.[0];
    if (!test) return;
    const updated = { ...test, userVerdict: verdict };
    setLatestSandbox(updated);
    onSaveSandboxTest(updated);
  }, [latestSandbox, stepSandboxTests, onSaveSandboxTest]);

  return (
    <aside className="interview-panel">
      <div className="drawer-header">
        <div>
          <p className="drawer-eyebrow">{element.laneName ?? 'Keine Lane'}</p>
          <h2 className="drawer-title">{element.name}</h2>
        </div>
        <button type="button" className="drawer-close-btn" onClick={onClose} aria-label="Schließen">✕</button>
      </div>

      <div className="interview-panel-body">
        <div className="step-meta">
          <span>Schritt {currentIndex + 1} von {total}</span>
          <span className="bpmn-type-badge">{element.bpmnType}</span>
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

        <section className="question-block dim-section">
          <h3>Automatisierungsanalyse</h3>
          <div className="dim-grid">
            <label className="field-label compact">
              Daten
              <select value={dimData} onChange={(e) => setDimData(e.target.value as DataStructure)}>
                <option value="structured">Strukturiert (DB, Formular, API)</option>
                <option value="semi_structured">Semi-strukturiert (PDF, Vorlagen-Mail)</option>
                <option value="unstructured">Unstrukturiert (Freitext, Gespräch)</option>
              </select>
            </label>
            <label className="field-label compact">
              Entscheidung
              <select value={dimDecision} onChange={(e) => setDimDecision(e.target.value as DecisionComplexity)}>
                <option value="rule_based">Klare Regel (Betrag, Schwellwert)</option>
                <option value="pattern_recognition">Mustererkennung (Anomalie)</option>
                <option value="judgment">Erfahrungsurteil</option>
                <option value="creative">Kreativ / Strategisch</option>
              </select>
            </label>
            <label className="field-label compact">
              Systemzugang
              <select value={dimSystem} onChange={(e) => setDimSystem(e.target.value as SystemAccess)}>
                <option value="api">API vorhanden (REST/OData/SOAP)</option>
                <option value="rpa">UI-Automatisierung (RPA)</option>
                <option value="none">Kein maschineller Zugang</option>
                <option value="no_system">Kein System (rein menschlich)</option>
              </select>
            </label>
            <label className="field-label compact">
              Standardisierung
              <select value={dimException} onChange={(e) => setDimException(e.target.value as ExceptionRate)}>
                <option value="standard_dominant">&gt;90% Standardfälle</option>
                <option value="frequent_exceptions">30–50% Sonderfälle</option>
                <option value="every_case_different">Jeder Fall anders</option>
              </select>
            </label>
          </div>
          <div className={`automation-level-badge level-${automationLevel}`}>
            <span className="level-number">Stufe {automationLevel}</span>
            <span className="level-label">{getAutomationLevelLabel(automationLevel)}</span>
            {automationLevel >= 2 && (
              <span className="stp-rate">STP-Rate: {estimateSTPRate(automationLevel)}</span>
            )}
          </div>
          <details className="blueprint-details">
            <summary>Architektur-Blaupause</summary>
            <p className="blueprint-text">{getAutomationBlueprint(automationLevel)}</p>
          </details>
        </section>

        <section className="question-block">
          <h3>1. Wie soll KI hier unterstützen?</h3>
          <div className="choice-grid pattern-grid">
            {PATTERN_OPTIONS.map((option) => {
              const Icon = PATTERN_ICONS[option];
              return (
                <button className={pattern === option ? 'choice-card selected' : 'choice-card'} data-pattern={option} key={option} type="button" onClick={() => setPattern(option)}>
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

        {showRisk && (
          <section className="question-block risk-section">
            <div className="section-header" onClick={() => setRiskOpen((v) => !v)}>
              <h3><ShieldCheck size={14} /> Risiko-Checkliste</h3>
              <ChevronDown size={16} className={riskOpen ? 'rotated' : ''} />
            </div>
            {riskOpen && (
              <div className="risk-fields">
                <div className="risk-field">
                  <label>Enthält der Schritt personenbezogene Daten?</label>
                  <div className="choice-grid compact-grid">
                    {(['yes', 'no', 'unclear'] as const).map((v) => (
                      <button key={v} className={riskContainsPII === v ? 'choice-pill selected' : 'choice-pill'} type="button" onClick={() => setRiskContainsPII(v)}>
                        {v === 'yes' ? 'Ja' : v === 'no' ? 'Nein' : 'Unklar'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="risk-field">
                  <label>Ist die Entscheidung reversibel?</label>
                  <div className="choice-grid compact-grid">
                    {(['yes', 'no'] as const).map((v) => (
                      <button key={v} className={riskDecisionReversible === v ? 'choice-pill selected' : 'choice-pill'} type="button" onClick={() => setRiskDecisionReversible(v)}>
                        {v === 'yes' ? 'Ja' : 'Nein'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="risk-field">
                  <label>Gibt es eine menschliche Freigabe?</label>
                  <div className="choice-grid compact-grid">
                    {(['yes', 'no'] as const).map((v) => (
                      <button key={v} className={riskHumanApproval === v ? 'choice-pill selected' : 'choice-pill'} type="button" onClick={() => setRiskHumanApproval(v)}>
                        {v === 'yes' ? 'Ja' : 'Nein'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        <section className="question-block change-section">
          <div className="section-header" onClick={() => setChangeOpen((v) => !v)}>
            <h3><RefreshCw size={14} /> Change Impact</h3>
            <ChevronDown size={16} className={changeOpen ? 'rotated' : ''} />
          </div>
          {changeOpen && (
            <div className="change-fields">
              <label className="field-label">
                Betroffene Systeme / Stakeholder
                <input value={changeSystems} onChange={(e) => setChangeSystems(e.target.value)} placeholder="z.B. SAP, E-Mail-System, Vertrieb" />
              </label>
              <div className="risk-field">
                <label>Change Management erforderlich?</label>
                <div className="choice-grid compact-grid">
                  {(['yes', 'no'] as const).map((v) => (
                    <button key={v} className={changeMgmt === v ? 'choice-pill selected' : 'choice-pill'} type="button" onClick={() => setChangeMgmt(v)}>
                      {v === 'yes' ? 'Ja' : 'Nein'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className={`question-block business-case-section ${bcOpen ? 'open' : ''}`}>
          <div className="section-header" onClick={() => setBcOpen((v) => !v)}>
            <h3><Coins size={14} /> Business Case</h3>
            <ChevronDown size={16} className={bcOpen ? 'rotated' : ''} />
          </div>
          {bcOpen && (
            <div className="business-case-fields">
              <div className="bc-row">
                <label className="field-label compact">
                  Häufigkeit / Jahr
                  <input type="number" min={0} value={freq} onChange={(e) => setFreq(Number(e.target.value))} />
                </label>
                <label className="field-label compact">
                  Minuten / Durchlauf
                  <input type="number" min={0} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
                </label>
              </div>
              <div className="bc-row">
                <label className="field-label compact">
                  Rolle
                  <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="z.B. Buchhalter" />
                </label>
                <label className="field-label compact">
                  Stundensatz (EUR)
                  <input type="number" min={0} value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value))} />
                </label>
              </div>
              <label className="field-label">
                Automatisierungsgrad
                <input type="range" min={0} max={1} step={0.05} value={autoDegree} onChange={(e) => setAutoDegree(Number(e.target.value))} />
                <span className="range-value">{Math.round(autoDegree * 100)}%</span>
              </label>
              {annualManualCost > 0 && (
                <div className="bc-summary">
                  <p>Manuelle Kosten: <strong>{formatCurrency(annualManualCost)}</strong>/Jahr</p>
                  <p>Erwartete Einsparung: <strong className="savings">{formatCurrency(expectedSavings)}</strong>/Jahr</p>
                </div>
              )}
            </div>
          )}
        </section>

        <section className={`question-block sandbox-section ${sandboxOpen ? 'open' : ''}`}>
          <div className="section-header" onClick={() => setSandboxOpen((v) => !v)}>
            <h3><FlaskConical size={16} /> Agent testen</h3>
            <ChevronDown size={16} className={sandboxOpen ? 'rotated' : ''} />
          </div>
          {sandboxOpen && (
            <div className="sandbox-fields">
              <label className="field-label sandbox-upload">
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleSandboxUpload(file);
                    e.target.value = '';
                  }}
                />
                <span className="upload-btn"><Upload size={14} /> Dokument hochladen</span>
                <span className="upload-hint">PDF, DOCX, Bild oder Text</span>
              </label>
              {sandboxLoading && <p className="sandbox-loading">Analysiere Dokument…</p>}
              {sandboxError && <p className="error-text sandbox-error">{sandboxError}</p>}
              {(latestSandbox ?? stepSandboxTests?.[0]) && (
                <div className="sandbox-result">
                  {(() => {
                    const test = latestSandbox ?? stepSandboxTests![0];
                    const result = test.structuredResult as { summary?: string; entities?: string[]; confidence?: number; recommendation?: string } | undefined;
                    return (
                      <>
                        <p className="sandbox-file">{test.inputFileName} · {test.inputType.toUpperCase()}</p>
                        {result?.summary && <p className="sandbox-summary">{result.summary}</p>}
                        {result?.entities && result.entities.length > 0 && (
                          <div className="sandbox-entities">
                            {result.entities.map((e, i) => <span key={i} className="entity-tag">{e}</span>)}
                          </div>
                        )}
                        {typeof result?.confidence === 'number' && (
                          <p className="sandbox-confidence">Confidence: {Math.round(result.confidence * 100)}%</p>
                        )}
                        {result?.recommendation && <p className="sandbox-recommendation">{result.recommendation}</p>}
                        <div className="sandbox-verdict">
                          <span>Verdict:</span>
                          {(['correct', 'partial', 'incorrect', 'pending'] as const).map((v) => {
                            const VerdictIcon = v === 'correct' ? Check : v === 'partial' ? Minus : v === 'incorrect' ? X : Circle;
                            return (
                              <button
                                key={v}
                                className={test.userVerdict === v ? 'verdict-btn selected' : 'verdict-btn'}
                                type="button"
                                onClick={() => handleVerdict(v)}
                              >
                                <VerdictIcon size={12} /> {VERDICT_LABELS[v]}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </section>

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
  if (source === 'name') return 'BPMN-Name';
  if (source === 'extension') return 'Extension';
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0, style: 'currency', currency: 'EUR' }).format(value);
}
