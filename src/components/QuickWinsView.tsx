import { useMemo } from 'react';
import type { AgenticPattern, AssessmentDecision, AssessmentSuggestion, ProcessElement } from '../types';
import { PATTERN_LABELS, COMPLEXITY_LABELS } from '../data/mappingRules';
import { FileText } from 'lucide-react';

const AUTOMATION_PATTERNS = new Set<AgenticPattern>([
  'agent_autonomous', 'agent_with_approval', 'mcp_or_api_call',
  'rule_based_automation', 'local_code_execution', 'llm_classification', 'llm_generation',
]);

interface QuickWinsViewProps {
  elements: ProcessElement[];
  suggestions: Record<string, AssessmentSuggestion>;
  decisions: Record<string, AssessmentDecision>;
  hoveredElementId?: string | null;
  onElementSelect: (elementId: string) => void;
  onElementHover?: (elementId: string | null) => void;
  onReport: () => void;
}

export function QuickWinsView({
  elements, suggestions, decisions, hoveredElementId, onElementSelect, onElementHover, onReport,
}: QuickWinsViewProps) {
  const categorized = useMemo(() => {
    const quickWins: ProcessElement[] = [];
    const potential: ProcessElement[] = [];
    const human: ProcessElement[] = [];
    const open: ProcessElement[] = [];

    for (const el of elements) {
      const decision = decisions[el.id];
      if (decision?.status === 'needs_clarification' || decision?.status === 'skipped' || !decision) {
        open.push(el);
        continue;
      }
      const s = suggestions[el.id];
      if (s?.quick_win) {
        quickWins.push(el);
      } else if (s && AUTOMATION_PATTERNS.has(s.pattern)) {
        potential.push(el);
      } else {
        human.push(el);
      }
    }

    return { quickWins, potential, human, open };
  }, [elements, suggestions, decisions]);

  return (
    <div className="quick-wins-view">
      <div className="element-grid-section">
        <div className="element-grid">
          {elements.map((el) => {
            const suggestion = suggestions[el.id];
            const decision = decisions[el.id];
            const category = getCategory(el, suggestion, decision);

            return (
              <button
                key={el.id}
                type="button"
                className={`element-card ${category} ${hoveredElementId === el.id ? 'hovered' : ''}`}
                onClick={() => onElementSelect(el.id)}
                onMouseEnter={() => onElementHover?.(el.id)}
                onMouseLeave={() => onElementHover?.(null)}
              >
                <div className="element-card-name">{el.name}</div>
                {el.laneName && (
                  <div className="element-card-lane">{el.laneName}</div>
                )}
                <div className="element-card-badges">
                  {suggestion && (
                    <span className="element-card-badge">
                      {PATTERN_LABELS[suggestion.pattern]}
                    </span>
                  )}
                  {suggestion && (
                    <span className="element-card-badge">
                      {COMPLEXITY_LABELS[suggestion.complexity]}
                    </span>
                  )}
                </div>
                {suggestion?.rationale && (
                  <p className="element-card-rationale">{suggestion.rationale}</p>
                )}
                {decision && (
                  <div className="element-card-status">
                    {decision.status === 'completed'
                      ? 'Bewertet'
                      : decision.status === 'skipped'
                        ? 'Übersprungen'
                        : 'Klärungsbedarf'}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Dashboard
        categorized={categorized}
        suggestions={suggestions}
        decisions={decisions}
        onElementSelect={onElementSelect}
      />

      <div className="quick-wins-footer">
        <button type="button" className="primary-button" onClick={onReport}>
          <FileText size={16} />
          Report generieren
        </button>
      </div>
    </div>
  );
}

function getCategory(
  _el: ProcessElement,
  suggestion?: AssessmentSuggestion,
  decision?: AssessmentDecision,
): string {
  if (decision?.status === 'needs_clarification' || decision?.status === 'skipped') {
    return 'risk';
  }
  if (suggestion?.quick_win) {
    return 'quick-win';
  }
  if (suggestion && AUTOMATION_PATTERNS.has(suggestion.pattern)) {
    return 'potential';
  }
  return 'human';
}

/* =========================================
   DASHBOARD
   ========================================= */

interface DashboardProps {
  categorized: {
    quickWins: ProcessElement[];
    potential: ProcessElement[];
    human: ProcessElement[];
    open: ProcessElement[];
  };
  suggestions: Record<string, AssessmentSuggestion>;
  decisions: Record<string, AssessmentDecision>;
  onElementSelect: (elementId: string) => void;
}

function Dashboard({ categorized, suggestions, decisions, onElementSelect }: DashboardProps) {
  const { quickWins, potential, human, open } = categorized;

  return (
    <div className="dashboard-grid">
      <DashboardCard title="Prozess-Insights">
        <DonutChart
          quickWins={quickWins.length}
          potential={potential.length}
          human={human.length}
          open={open.length}
        />
      </DashboardCard>

      <DashboardCard title="Top 3 Quick Wins">
        <div className="dashboard-list">
          {quickWins.slice(0, 3).map((el) => {
            const s = suggestions[el.id];
            return (
              <div
                key={el.id}
                className="dashboard-list-item quick-win"
                onClick={() => onElementSelect(el.id)}
              >
                <div className="dashboard-item-name">{el.name}</div>
                <div className="dashboard-item-meta">
                  {s?.implementation_hint ?? s?.rationale ?? 'Kein Hinweis'}
                </div>
              </div>
            );
          })}
          {quickWins.length === 0 && (
            <div className="dashboard-item-meta">Keine Quick Wins erkannt</div>
          )}
        </div>
      </DashboardCard>

      <DashboardCard title="Klärungsbedarf">
        <div className="dashboard-list">
          {open.slice(0, 5).map((el) => {
            const d = decisions[el.id];
            return (
              <div
                key={el.id}
                className="dashboard-list-item risk"
                onClick={() => onElementSelect(el.id)}
              >
                <div className="dashboard-item-name">{el.name}</div>
                <div className="dashboard-item-meta">
                  {d ? buildOpenReasons(d).join(', ') : 'Nicht bewertet'}
                </div>
              </div>
            );
          })}
          {open.length === 0 && (
            <div className="dashboard-item-meta">Keine offenen Punkte</div>
          )}
        </div>
      </DashboardCard>
    </div>
  );
}

function DashboardCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="dashboard-card">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

/* =========================================
   DONUT CHART
   ========================================= */

function DonutChart({
  quickWins, potential, human, open,
}: {
  quickWins: number;
  potential: number;
  human: number;
  open: number;
}) {
  const total = quickWins + potential + human + open;
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
      <div className="donut-center">
        <svg width="112" height="112" viewBox="0 0 112 112">
          <Slice value={quickWins} offset={0} color="var(--color-quick-win)" />
          <Slice value={potential} offset={quickWins} color="var(--color-potential)" />
          <Slice value={human} offset={quickWins + potential} color="var(--color-human)" />
          <Slice value={open} offset={quickWins + potential + human} color="var(--color-neutral)" />
        </svg>
        <div className="donut-center-text">
          <span className="donut-center-value">{total}</span>
          <span className="donut-center-label">Schritte</span>
        </div>
      </div>
      <div className="donut-legend">
        <span className="legend-item">
          <span className="legend-dot" style={{ background: 'var(--color-quick-win)' }} />
          {quickWins} Quick Wins
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: 'var(--color-potential)' }} />
          {potential} Potenzial
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: 'var(--color-human)' }} />
          {human} Menschlich
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: 'var(--color-neutral)' }} />
          {open} Offen
        </span>
      </div>
    </div>
  );
}

function buildOpenReasons(decision: AssessmentDecision): string[] {
  const reasons: string[] = [];
  if (decision.status === 'skipped') reasons.push('übersprungen');
  if (decision.pattern === 'needs_clarification') reasons.push('Pattern offen');
  if (decision.privacy === 'unknown') reasons.push('Privacy offen');
  if (decision.complexity === 'unknown') reasons.push('Komplexität offen');
  if (decision.targetSystem === 'Unklar') reasons.push('Zielsystem offen');
  return reasons.length > 0 ? reasons : ['Entscheidung prüfen'];
}
