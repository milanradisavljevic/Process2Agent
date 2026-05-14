import type { AgenticPattern, AssessmentDecision, AssessmentSuggestion, ProcessElement } from '../types';
import { FileText } from 'lucide-react';

const AUTOMATION_PATTERNS = new Set<AgenticPattern>([
  'agent_autonomous', 'agent_with_approval', 'mcp_or_api_call',
  'rule_based_automation', 'local_code_execution', 'llm_classification', 'llm_generation',
]);

interface QuickWinsViewProps {
  elements: ProcessElement[];
  suggestions: Record<string, AssessmentSuggestion>;
  decisions: Record<string, AssessmentDecision>;
  onElementSelect: (elementId: string) => void;
  onReport: () => void;
}

export function QuickWinsView({
  elements, suggestions, decisions, onElementSelect, onReport,
}: QuickWinsViewProps) {
  const quickWins = elements.filter((el) => suggestions[el.id]?.quick_win === true);
  const potential = elements.filter((el) => {
    const s = suggestions[el.id];
    return s && !s.quick_win && AUTOMATION_PATTERNS.has(s.pattern);
  });
  const human = elements.filter((el) => {
    const s = suggestions[el.id];
    return !s || (!s.quick_win && !AUTOMATION_PATTERNS.has(s.pattern));
  });

  return (
    <div className="quick-wins-view">
      <Group
        title={`⚡ ${quickWins.length} Quick Wins`}
        description="Hoher Nutzen, niedrige Komplexität — sofort umsetzbar"
        colorClass="group-quick-win"
        elements={quickWins}
        suggestions={suggestions}
        decisions={decisions}
        onElementSelect={onElementSelect}
      />
      <Group
        title={`◉ ${potential.length} Schritte mit Potenzial`}
        description="Automatisierbar, aber mit Klärungsbedarf oder mittlerer Komplexität"
        colorClass="group-potential"
        elements={potential}
        suggestions={suggestions}
        decisions={decisions}
        onElementSelect={onElementSelect}
      />
      <Group
        title={`○ ${human.length} Schritte bleiben menschlich`}
        description="Bewusst nicht automatisiert"
        colorClass="group-human"
        elements={human}
        suggestions={suggestions}
        decisions={decisions}
        onElementSelect={onElementSelect}
      />
      <div className="quick-wins-footer">
        <button type="button" className="btn-primary" onClick={onReport}>
          <FileText size={16} />
          Report generieren
        </button>
      </div>
    </div>
  );
}

interface GroupProps {
  title: string;
  description: string;
  colorClass: string;
  elements: ProcessElement[];
  suggestions: Record<string, AssessmentSuggestion>;
  decisions: Record<string, AssessmentDecision>;
  onElementSelect: (id: string) => void;
}

function Group({
  title, description, colorClass, elements, suggestions, decisions, onElementSelect,
}: GroupProps) {
  if (elements.length === 0) {
    return null;
  }

  return (
    <div className={`qw-group ${colorClass}`}>
      <div className="qw-group-header">
        <strong>{title}</strong>
        <span className="qw-group-desc">{description}</span>
      </div>
      <div className="qw-cards">
        {elements.map((el) => {
          const suggestion = suggestions[el.id];
          const decision = decisions[el.id];

          return (
            <button
              key={el.id}
              type="button"
              className={`qw-card ${decision ? `decision-${decision.status}` : ''}`}
              onClick={() => onElementSelect(el.id)}
            >
              <div className="qw-card-top">
                <span className="qw-card-name">{el.name}</span>
                {el.laneName && <span className="qw-card-lane">{el.laneName}</span>}
              </div>
              {suggestion && (
                <div className="qw-card-meta">
                  <span className={`pattern-chip pattern-${suggestion.pattern}`}>
                    {suggestion.pattern.replace(/_/g, ' ')}
                  </span>
                  {suggestion.quick_win && <span className="quick-win-badge">Quick Win</span>}
                </div>
              )}
              {suggestion?.rationale && (
                <p className="qw-card-rationale">
                  {suggestion.rationale.length > 100
                    ? `${suggestion.rationale.slice(0, 100)}…`
                    : suggestion.rationale}
                </p>
              )}
              {decision && (
                <div className="qw-card-decision-status">
                  {decision.status === 'completed'
                    ? '✓ Bewertet'
                    : decision.status === 'skipped'
                      ? '→ Übersprungen'
                      : '⚠ Klärungsbedarf'}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
