import { COMPLEXITY_LABELS, PATTERN_LABELS, PRIVACY_LABELS } from '../data/mappingRules';
import { summarizeAssessment } from '../engine/reportGenerator';
import type { AssessmentDecision, AssessmentProject } from '../types';

interface ReportPreviewProps {
  project: AssessmentProject;
  decisions: Record<string, AssessmentDecision>;
  onBack: () => void;
}

export function ReportPreview({ project, decisions, onBack }: ReportPreviewProps) {
  const summary = summarizeAssessment(project, decisions);
  const createdAt = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
  const clarificationItems = project.elements.filter((element) => decisions[element.id]?.status !== 'completed');
  const aiPercent = summary.total > 0 ? Math.round((summary.aiSuitable / summary.total) * 100) : 0;

  return (
    <main className="report-page">
      <div className="report-actions no-print">
        <button type="button" className="secondary-button" onClick={onBack}>Zurück zum Assessment</button>
        <button type="button" className="primary-button compact" onClick={() => window.print()}>Drucken / als PDF speichern</button>
      </div>

      <article className="report-document">
        <header>
          <p className="eyebrow">AI-Readiness Assessment</p>
          <h1>{project.fileName}</h1>
          <p>Erstellt am {createdAt} mit process2agent v1 PoC.</p>
        </header>

        <section>
          <h2>Zusammenfassung</h2>
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
                {decision?.note ? <p><strong>Notiz:</strong> {decision.note}</p> : null}
                {!decision || decision.status !== 'completed' ? <p className="clarification">KLÄRUNGSBEDARF: Entscheidung, Privacy, Komplexität oder Zielsystem ist offen.</p> : null}
              </div>
            );
          })}
        </section>

        <section>
          <h2>Hinweis</h2>
          <p>Dieser Report dokumentiert menschliche Entscheidungen, unterstützt durch regelbasierte Analyse. Er ersetzt keine rechtliche Beratung, kein DSGVO-Audit und kein AI-Impact-Assessment nach EU AI Act.</p>
        </section>
      </article>
    </main>
  );
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
