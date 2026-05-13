import { AlertTriangle, Bot, ShieldCheck } from 'lucide-react';
import { summarizeAssessment } from '../engine/reportGenerator';
import type { AssessmentDecision, AssessmentProject } from '../types';

interface ScoreBarProps {
  project: AssessmentProject;
  decisions: Record<string, AssessmentDecision>;
}

export function ScoreBar({ project, decisions }: ScoreBarProps) {
  const summary = summarizeAssessment(project, decisions);
  const aiPercent = summary.total > 0 ? Math.round((summary.aiSuitable / summary.total) * 100) : 0;

  return (
    <div className="score-bar">
      <div className="score-card">
        <Bot size={18} />
        <span>{aiPercent}% KI-geeignet</span>
      </div>
      <div className="score-card">
        <ShieldCheck size={18} />
        <span>{summary.localRequired} lokal / {summary.cloudCapable} cloud-faehig</span>
      </div>
      <div className="score-card">
        <AlertTriangle size={18} />
        <span>{summary.clarification} offen</span>
      </div>
    </div>
  );
}
