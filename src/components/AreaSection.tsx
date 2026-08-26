import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { Area, ProcessEntry, ProcessStatus } from '../types/workspace';
import { ProcessCard } from './ProcessCard';

interface AreaSectionProps {
  area: Area;
  processes: ProcessEntry[];
  onImport: (areaId: string) => void;
  onOpenProcess: (processId: string) => void;
  onDeleteProcess: (processId: string) => void;
  onStatusChange: (processId: string, status: ProcessStatus) => void;
  onRenameArea: (area: Area) => void;
  onDeleteArea: (areaId: string) => void;
}

export function AreaSection({
  area,
  processes,
  onImport,
  onOpenProcess,
  onDeleteProcess,
  onStatusChange,
  onRenameArea,
  onDeleteArea,
}: AreaSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(area.name);
  const savings = processes.reduce((sum, process) => sum + (process.summary.estimatedAnnualSavings ?? 0), 0);

  function saveAreaName() {
    const name = draftName.trim();
    setEditing(false);
    if (name && name !== area.name) {
      onRenameArea({ ...area, name });
    } else {
      setDraftName(area.name);
    }
  }

  return (
    <section className="area-section">
      <div className="area-header">
        <button type="button" className="area-title-button" onClick={() => setExpanded((value) => !value)}>
          <span>{expanded ? '▾' : '▸'}</span>
          <span className="area-icon">{area.icon}</span>
        </button>
        {editing ? (
          <input
            className="area-name-input"
            value={draftName}
            autoFocus
            onBlur={saveAreaName}
            onChange={(event) => setDraftName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') saveAreaName();
              if (event.key === 'Escape') {
                setDraftName(area.name);
                setEditing(false);
              }
            }}
          />
        ) : (
          <h2 onDoubleClick={() => setEditing(true)}>{area.name}</h2>
        )}
        <p>{processes.length} Prozesse{ savings > 0 ? ` · ~${formatCurrency(savings)} Potenzial` : ''}</p>
        <button type="button" className="secondary-button compact-area-button" onClick={() => onImport(area.id)}>+</button>
        <button type="button" className="area-delete-btn" onClick={() => onDeleteArea(area.id)} title="Bereich löschen">
          <Trash2 size={14} />
        </button>
      </div>

      <div className={`area-content ${expanded ? 'open' : ''}`}>
        <div className="area-content-inner">
          <div className="process-grid">
            {processes.map((process) => (
              <ProcessCard
                key={process.id}
                process={process}
                onOpen={onOpenProcess}
                onDelete={onDeleteProcess}
                onStatusChange={onStatusChange}
              />
            ))}
            {processes.length === 0 ? <p className="empty-area">Noch keine Prozesse in diesem Bereich.</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0, style: 'currency', currency: 'EUR' }).format(value);
}
