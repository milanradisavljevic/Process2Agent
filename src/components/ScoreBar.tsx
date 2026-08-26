import { AlertTriangle, Bot, ShieldCheck } from 'lucide-react';
import { computeAssessmentSummary } from '../engine/processSummary';
import type { AssessmentDecision, AssessmentProject } from '../types';

interface ScoreBarProps {
  project: AssessmentProject;
  decisions: Record<string, AssessmentDecision>;
}

export function ScoreBar({ project, decisions }: ScoreBarProps) {
  const summary = computeAssessmentSummary(project.elements, decisions);
  const aiPercent = summary.total > 0 ? Math.round((summary.aiSuitable / summary.total) * 100) : 0;

  return (
    <div className="score-bar">
      <div className="score-badge">
        <Bot size={16} />
        <span className="value potential">{aiPercent}%</span>
        <span className="label">KI-geeignet</span>
      </div>
      <div className="score-badge">
        <ShieldCheck size={16} />
        <span className="value quick-win">{summary.localRequired}</span>
        <span className="label">lokal</span>
      </div>
      <div className="score-badge">
        <AlertTriangle size={16} />
        <span className="value risk">{summary.clarification}</span>
        <span className="label">offen</span>
      </div>
    </div>
  );
}
