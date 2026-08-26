import { COMPLEXITY_LABELS, MAPPING_RULES, PATTERN_LABELS, PRIVACY_LABELS, VERDICT_LABELS } from '../data/mappingRules';
import { getAutomationLevelLabel, estimateSTPRate } from '../engine/automationLevel';
import { computeAssessmentSummary } from '../engine/processSummary';
import type { AssessmentDecision, AssessmentProject } from '../types';
import type { ProcessEntry } from '../types/workspace';

interface ReportPreviewProps {
  process: ProcessEntry;
  onBack: () => void;
}

function DonutChart({ aiSuitable, humanLoop, clarification }: {
  aiSuitable: number;
  humanLoop: number;
  clarification: number;
}) {
  const total = aiSuitable + humanLoop + clarification;
  if (total === 0) return null;

  const r = 38;
  const cx = 56;
  const cy = 56;
  const circumference = 2 * Math.PI * r;

  function Slice({ value, offset, color }: { value: number; offset: number; color: string }) {
    const pct = value / total;
    return (
      <circle
        r={r}
        cx={cx}
        cy={cy}
        fill="none"
        stroke={color}
        strokeWidth={16}
        strokeDasharray={`${pct * circumference} ${circumference}`}
        strokeDashoffset={-(offset / total) * circumference}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    );
  }

  return (
    <div className="donut-wrap">
      <svg width="112" height="112" viewBox="0 0 112 112">
        <Slice value={aiSuitable} offset={0} color="#16a34a" />
        <Slice value={humanLoop} offset={aiSuitable} color="#1a56db" />
        <Slice value={clarification} offset={aiSuitable + humanLoop} color="#b45309" />
      </svg>
      <div className="donut-legend">
        <span className="legend-item"><span className="legend-dot" style={{ background: '#16a34a' }} />{aiSuitable} KI-geeignet</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: '#1a56db' }} />{humanLoop} menschlich</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: '#b45309' }} />{clarification} offen</span>
      </div>
    </div>
  );
}

export function ReportPreview({ process, onBack }: ReportPreviewProps) {
  const project: Pick<AssessmentProject, 'fileName' | 'elements' | 'suggestions'> = {
    fileName: process.name,
    elements: process.steps,
    suggestions: process.suggestions,
  };
  const decisions: Record<string, AssessmentDecision> = process.decisions;
  const summary = computeAssessmentSummary(project.elements, decisions);
  const createdAt = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
  const clarificationItems = project.elements.filter((element) => decisions[element.id]?.status !== 'completed');
  const aiPercent = summary.total > 0 ? Math.round((summary.aiSuitable / summary.total) * 100) : 0;
  const quickWins = project.elements.filter((el) => project.suggestions[el.id]?.quick_win).slice(0, 3);
  const laneNames = Array.from(new Set(project.elements.map((el) => el.laneName).filter(Boolean)));
  const usedPatterns = Array.from(new Set(
    project.elements.map((el) => decisions[el.id]?.pattern ?? project.suggestions[el.id]?.pattern).filter(Boolean),
  ));

  return (
    <main className="report-page">
      <div className="report-actions no-print">
        <button type="button" className="secondary-button" onClick={onBack}>Zurück zum Assessment</button>
        <button type="button" className="primary-button compact" onClick={() => window.print()}>Drucken / als PDF speichern</button>
      </div>

      <article className="report-document">
        <header className="report-header">
          <p className="eyebrow">process2agent · AI-Readiness Assessment</p>
          <h1>{project.fileName}</h1>
          <p className="report-meta">
            Erstellt am {createdAt} · {summary.total} Schritte{laneNames.length > 0 ? ` · ${laneNames.length} Lanes (${laneNames.join(', ')})` : ''}
            {process ? ` · Status: ${STATUS_LABELS_DE[process.status]}` : ''}
          </p>
        </header>

        <section>
          <h2>Zusammenfassung</h2>
          <DonutChart aiSuitable={summary.aiSuitable} humanLoop={summary.humanLoop} clarification={summary.clarification} />
          <p className="executive-summary">
            Der Prozess enthält {summary.total} bewertbare Schritte. Nach aktuellem Stand sind {summary.aiSuitable} Schritte ({aiPercent}%) KI-geeignet,
            {summary.humanLoop} Schritte bleiben bewusst menschlich kontrolliert und {summary.clarification} Punkte müssen vor einer Umsetzung geklärt werden.
          </p>
          <table>
            <tbody>
              <tr><th>Analysierte Schritte</th><td>{summary.total}</td></tr>
              <tr><th>KI-geeignet</th><td>{summary.aiSuitable}</td></tr>
              <tr><th>Mensch bleibt im Loop</th><td>{summary.humanLoop}</td></tr>
              <tr><th>Klärungsbedarf</th><td>{summary.clarification}</td></tr>
              <tr><th>Schritte mit lokalem Routing</th><td>{summary.localRequired}</td></tr>
              <tr><th>Cloud-fähig laut Nutzerangabe</th><td>{summary.cloudCapable}</td></tr>
            </tbody>
          </table>
        </section>

        {quickWins.length > 0 && (
          <section>
            <h2>Top Quick Wins</h2>
            <div className="report-quick-win-cards">
              {quickWins.map((el) => {
                const s = project.suggestions[el.id];
                return (
                  <div key={el.id} className="report-qw-card">
                    <h3>{el.name}</h3>
                    <p className="report-qw-lane">{el.laneName ?? '—'}</p>
                    {s?.rationale && <p className="report-qw-rationale">{s.rationale}</p>}
                    {s?.implementation_hint && (
                      <div className="report-qw-hint">
                        <strong>Nächster Schritt:</strong> {s.implementation_hint}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <h2>Klärungsbedarf</h2>
          {clarificationItems.length === 0 ? (
            <p>Keine offenen Punkte dokumentiert.</p>
          ) : (
            <ol className="clarification-list">
              {clarificationItems.map((element) => {
                const decision = decisions[element.id];
                const openReasons = buildOpenReasons(decision);

                return (
                  <li key={element.id}>
                    <strong>{element.name}</strong>
                    <span>{openReasons.join(', ')}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section>
          <h2>Bewertung pro Schritt</h2>
          {project.elements.map((element, index) => {
            const decision = decisions[element.id];
            const suggestion = project.suggestions[element.id];

            return (
              <div className="report-step" key={element.id}>
                <h3>{index + 1}. {element.name}</h3>
                <p><strong>BPMN-Typ:</strong> {element.bpmnType}</p>
                <p><strong>Pattern:</strong> {decision ? PATTERN_LABELS[decision.pattern] : PATTERN_LABELS[suggestion.pattern]}</p>
                <p><strong>Privacy:</strong> {decision ? PRIVACY_LABELS[decision.privacy] : PRIVACY_LABELS[suggestion.privacy]}</p>
                <p><strong>Komplexität:</strong> {decision ? COMPLEXITY_LABELS[decision.complexity] : COMPLEXITY_LABELS[suggestion.complexity]}</p>
                <p><strong>Zielsystem:</strong> {decision?.targetSystem ?? 'Nicht bewertet'}</p>
                <p><strong>Begründung:</strong> {suggestion.rationale}</p>
                {suggestion.implementation_hint && <p><strong>Umsetzungshinweis:</strong> {suggestion.implementation_hint}</p>}
                {decision?.note ? <p><strong>Notiz:</strong> {decision.note}</p> : null}
                {!decision || decision.status !== 'completed' ? <p className="clarification">KLÄRUNGSBEDARF: Entscheidung, Privacy, Komplexität oder Zielsystem ist offen.</p> : null}
              </div>
            );
          })}
        </section>

        {process?.businessCase && Object.keys(process.businessCase.stepCases).length > 0 && (
          <section>
            <h2>Business Case</h2>
            <table className="report-table">
              <thead>
                <tr><th>Schritt</th><th>Häufigkeit/Jahr</th><th>Minuten</th><th>Rolle</th><th>Stundensatz</th><th>Automatisierung</th><th>Einsparung/Jahr</th></tr>
              </thead>
              <tbody>
                {project.elements.map((el) => {
                  const bc = process.businessCase?.stepCases[el.id];
                  if (!bc) return null;
                  const cost = (bc.frequencyPerYear * bc.minutesPerExecution / 60) * bc.hourlyRate;
                  const saving = cost * bc.automationDegree;
                  return (
                    <tr key={el.id}>
                      <td>{el.name}</td>
                      <td>{bc.frequencyPerYear}</td>
                      <td>{bc.minutesPerExecution}</td>
                      <td>{bc.role}</td>
                      <td>{formatCurrency(bc.hourlyRate)}</td>
                      <td>{Math.round(bc.automationDegree * 100)}%</td>
                      <td><strong>{formatCurrency(saving)}</strong></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {process.summary.estimatedAnnualSavings ? (
              <p className="report-total">Gesamtes Einsparungspotenzial: <strong>{formatCurrency(process.summary.estimatedAnnualSavings)}</strong> pro Jahr</p>
            ) : null}
          </section>
        )}

        {process?.sandboxTests && process.sandboxTests.length > 0 && (
          <section>
            <h2>Validierung (Sandbox)</h2>
            <div className="report-sandbox-list">
              {process.sandboxTests.map((test) => {
                const result = test.structuredResult as { summary?: string; entities?: string[]; confidence?: number; recommendation?: string } | undefined;
                const el = project.elements.find((e) => e.id === test.stepId);
                return (
                  <div key={test.id} className={`report-sandbox-item verdict-${test.userVerdict}`}>
                    <p><strong>{el?.name ?? 'Unbekannter Schritt'}</strong> · {test.inputFileName} · {test.inputType.toUpperCase()}</p>
                    {result?.summary && <p>{result.summary}</p>}
                    {typeof result?.confidence === 'number' && <p>Confidence: {Math.round(result.confidence * 100)}%</p>}
                    <span className="sandbox-verdict-badge">{VERDICT_LABELS[test.userVerdict]}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {project.elements.some((el) => decisions[el.id]?.riskChecklist) && (
          <section>
            <h2>Risiko-Checkliste</h2>
            <table className="report-table compact">
              <thead>
                <tr><th>Schritt</th><th>PII</th><th>Reversibel</th><th>Freigabe</th></tr>
              </thead>
              <tbody>
                {project.elements.map((el) => {
                  const rc = decisions[el.id]?.riskChecklist;
                  if (!rc) return null;
                  return (
                    <tr key={el.id}>
                      <td>{el.name}</td>
                      <td>{rc.containsPII === 'yes' ? 'Ja' : rc.containsPII === 'no' ? 'Nein' : 'Unklar'}</td>
                      <td>{rc.decisionReversible === 'yes' ? 'Ja' : 'Nein'}</td>
                      <td>{rc.humanApprovalExists === 'yes' ? 'Ja' : 'Nein'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        {project.elements.some((el) => decisions[el.id]?.changeImpact) && (
          <section>
            <h2>Change Impact</h2>
            <table className="report-table compact">
              <thead>
                <tr><th>Schritt</th><th>Betroffene Systeme</th><th>Change Mgmt</th></tr>
              </thead>
              <tbody>
                {project.elements.map((el) => {
                  const ci = decisions[el.id]?.changeImpact;
                  if (!ci) return null;
                  return (
                    <tr key={el.id}>
                      <td>{el.name}</td>
                      <td>{ci.affectedSystems || '—'}</td>
                      <td>{ci.changeManagementRequired === 'yes' ? 'Ja' : 'Nein'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        <section className="report-methodology">
          <h2>Anhang: Methodik</h2>
          <p>
            Die Einordnung jedes Schritts folgt einer zweistufigen Methodik: Zunächst eine regelbasierte Zuordnung
            aus dem BPMN-Elementtyp, verfeinert durch Domänen-Muster und — wo konfiguriert — eine KI-Analyse.
            Jede Zuordnung ist ein Vorschlag; die finale Entscheidung trifft immer der Mensch und wird in diesem
            Report dokumentiert.
          </p>

          <h3>Verwendete Automatisierungsmuster</h3>
          <table className="report-table compact">
            <thead>
              <tr><th>Muster</th><th>Schritte in diesem Prozess</th></tr>
            </thead>
            <tbody>
              {usedPatterns.map((pattern) => (
                <tr key={pattern}>
                  <td>{PATTERN_LABELS[pattern]}</td>
                  <td>{project.elements.filter((el) => (decisions[el.id]?.pattern ?? project.suggestions[el.id]?.pattern) === pattern).length}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>BPMN-Typ → Standardzuordnung</h3>
          <table className="report-table compact">
            <thead>
              <tr><th>BPMN-Typ</th><th>Standardmuster</th><th>Interview erforderlich</th></tr>
            </thead>
            <tbody>
              {MAPPING_RULES.map((rule) => (
                <tr key={rule.bpmnType}>
                  <td>{rule.bpmnType.replace('bpmn:', '')}</td>
                  <td>{PATTERN_LABELS[rule.defaultPattern]}</td>
                  <td>{rule.interviewRequired ? 'Ja' : 'Nein'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Automatisierungsstufen</h3>
          <table className="report-table compact">
            <thead>
              <tr><th>Stufe</th><th>Bezeichnung</th><th>Typische STP-Rate</th></tr>
            </thead>
            <tbody>
              {([0, 1, 2, 3] as const).map((level) => (
                <tr key={level}>
                  <td>{level}</td>
                  <td>{getAutomationLevelLabel(level)}</td>
                  <td>{estimateSTPRate(level)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2>Hinweis</h2>
          <p>Dieser Report dokumentiert menschliche Entscheidungen, unterstützt durch KI-Analyse. Er ersetzt keine rechtliche Beratung, kein DSGVO-Audit und kein AI-Impact-Assessment nach EU AI Act.</p>
        </section>
      </article>
    </main>
  );
}

const STATUS_LABELS_DE: Record<ProcessEntry['status'], string> = {
  imported: 'Importiert',
  analyzed: 'Analysiert',
  reviewed: 'Bewertet',
  validated: 'Validiert',
  implementing: 'In Umsetzung',
  live: 'Live',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0, style: 'currency', currency: 'EUR' }).format(value);
}

function buildOpenReasons(decision?: AssessmentDecision): string[] {
  if (!decision) {
    return ['nicht bewertet'];
  }

  const reasons: string[] = [];

  if (decision.status === 'skipped') {
    reasons.push('übersprungen');
  }

  if (decision.pattern === 'needs_clarification') {
    reasons.push('Pattern offen');
  }

  if (decision.privacy === 'unknown') {
    reasons.push('Privacy offen');
  }

  if (decision.complexity === 'unknown') {
    reasons.push('Komplexität offen');
  }

  if (decision.targetSystem === 'Unklar') {
    reasons.push('Zielsystem offen');
  }

  return reasons.length > 0 ? reasons : ['Entscheidung prüfen'];
}
