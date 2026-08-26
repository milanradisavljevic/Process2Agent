import { useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import type { ProcessEntry, ProcessStatus } from '../types/workspace';

interface ProcessCardProps {
  process: ProcessEntry;
  onOpen: (processId: string) => void;
  onDelete: (processId: string) => void;
  onStatusChange: (processId: string, status: ProcessStatus) => void;
}

const STATUS_LABELS: Record<ProcessStatus, string> = {
  imported: 'Importiert',
  analyzed: 'Analysiert',
  reviewed: 'Bewertet',
  validated: 'Validiert',
  implementing: 'In Umsetzung',
  live: 'Live',
};

export function ProcessCard({ process, onOpen, onDelete, onStatusChange }: ProcessCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const updatedAt = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(new Date(process.updatedAt));
  const canAnalyze = process.status === 'imported' && Object.keys(process.suggestions).length === 0;

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <article className={`process-card status-${process.status}`}>
      <button type="button" className="process-card-main" onClick={() => onOpen(process.id)}>
        <span className={`status-badge status-badge--${process.status}`}>{STATUS_LABELS[process.status]}</span>
        <h3>{process.name}</h3>
        <p>{process.summary.laneCount} Lanes · {process.summary.totalSteps} Schritte</p>
        {canAnalyze ? (
          <strong className="process-card-cta">Analyse starten →</strong>
        ) : (
          <div className="process-card-metrics">
            <span>{process.summary.quickWins} Quick Wins</span>
            {process.summary.estimatedAnnualSavings ? <span>~{formatCurrency(process.summary.estimatedAnnualSavings)}/Jahr</span> : null}
          </div>
        )}
        <small>Zuletzt: {updatedAt}</small>
      </button>
      <div ref={menuRef} className="process-card-menu">
        <button type="button" className="menu-toggle" onClick={() => setMenuOpen((v) => !v)}>
          <MoreVertical size={16} />
        </button>
        <div className={`process-menu-popover ${menuOpen ? 'open' : ''}`}>
          {(['imported', 'analyzed', 'reviewed', 'validated', 'implementing', 'live'] as ProcessStatus[]).map((status) => (
            <button key={status} type="button" onClick={() => { onStatusChange(process.id, status); setMenuOpen(false); }}>
              Status: {STATUS_LABELS[status]}
            </button>
          ))}
          <button type="button" className="danger" onClick={() => { onDelete(process.id); setMenuOpen(false); }}>Löschen</button>
        </div>
      </div>
    </article>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0, style: 'currency', currency: 'EUR' }).format(value);
}
