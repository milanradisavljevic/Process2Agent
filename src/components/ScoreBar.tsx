import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bot, ShieldCheck } from 'lucide-react';
import { summarizeAssessment } from '../engine/reportGenerator';
import type { AssessmentDecision, AssessmentProject } from '../types';

interface ScoreBarProps {
  project: AssessmentProject;
  decisions: Record<string, AssessmentDecision>;
}

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const startTime = useRef<number | null>(null);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    startTime.current = null;
    if (raf.current) cancelAnimationFrame(raf.current);

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        raf.current = requestAnimationFrame(animate);
      }
    };

    raf.current = requestAnimationFrame(animate);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target, duration]);

  return value;
}

export function ScoreBar({ project, decisions }: ScoreBarProps) {
  const summary = summarizeAssessment(project, decisions);
  const aiPercent = summary.total > 0 ? Math.round((summary.aiSuitable / summary.total) * 100) : 0;

  const aiVal = useCountUp(aiPercent);
  const localVal = useCountUp(summary.localRequired);
  const openVal = useCountUp(summary.clarification);

  return (
    <div className="score-bar">
      <div className="score-badge">
        <Bot size={16} />
        <span className="value potential">{aiVal}%</span>
        <span className="label">KI-geeignet</span>
      </div>
      <div className="score-badge">
        <ShieldCheck size={16} />
        <span className="value quick-win">{localVal}</span>
        <span className="label">lokal</span>
      </div>
      <div className="score-badge">
        <AlertTriangle size={16} />
        <span className="value risk">{openVal}</span>
        <span className="label">offen</span>
      </div>
    </div>
  );
}
