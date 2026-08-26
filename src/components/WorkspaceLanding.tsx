import { Inbox, Plus, Sparkles } from 'lucide-react';
import type { LLMConfig } from '../types';
import type { Area, ProcessEntry, ProcessStatus, Workspace } from '../types/workspace';
import { AreaSection } from './AreaSection';
import { ExportImport } from './ExportImport';
import { LLMConfigPanel } from './LLMConfigPanel';

interface WorkspaceLandingProps {
  workspace: Workspace;
  processes: ProcessEntry[];
  error?: string | null;
  llmConfig: LLMConfig;
  onLLMConfigChange: (config: LLMConfig) => void;
  onImport: (areaId?: string) => void;
  onDemoImport: () => void;
  onCreateArea: () => void;
  onRenameArea: (area: Area) => void;
  onDeleteArea: (areaId: string) => void;
  onOpenProcess: (processId: string) => void;
  onDeleteProcess: (processId: string) => void;
  onStatusChange: (processId: string, status: ProcessStatus) => void;
  onExport: () => void;
  onImportWorkspace: (file: File) => void;
}

export function WorkspaceLanding({
  workspace,
  processes,
  error,
  llmConfig,
  onLLMConfigChange,
  onImport,
  onDemoImport,
  onCreateArea,
  onRenameArea,
  onDeleteArea,
  onOpenProcess,
  onDeleteProcess,
  onStatusChange,
  onExport,
  onImportWorkspace,
}: WorkspaceLandingProps) {
  const savings = processes.reduce((sum, process) => sum + (process.summary.estimatedAnnualSavings ?? 0), 0);

  return (
    <main className="workspace-landing">
      <header className="workspace-header">
        <div>
          <p className="brand">PROCESS2AGENT</p>
          <h1>{workspace.name}</h1>
          <p className="header-summary">
            {processes.length} Prozesse · {workspace.areas.length} Bereiche{savings > 0 ? ` · ~${formatCurrency(savings)} Einsparungspotenzial` : ''}
          </p>
        </div>
        <div className="header-actions">
          <ExportImport onExport={onExport} onImport={onImportWorkspace} />
          <LLMConfigPanel config={llmConfig} onConfigChange={onLLMConfigChange} />
          <button type="button" className="secondary-button" onClick={onCreateArea}><Plus size={15} /> Bereich</button>
          <button type="button" className="primary-button compact" onClick={() => onImport()}><Plus size={15} /> BPMN importieren</button>
        </div>
      </header>
      {error ? <p className="error-text workspace-error">{error}</p> : null}
      <div className="area-list">
        {workspace.areas
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((area) => (
            <AreaSection
              key={area.id}
              area={area}
              processes={processes.filter((process) => process.areaId === area.id)}
              onImport={onImport}
              onOpenProcess={onOpenProcess}
              onDeleteProcess={onDeleteProcess}
              onStatusChange={onStatusChange}
              onRenameArea={onRenameArea}
              onDeleteArea={onDeleteArea}
            />
          ))}
      </div>
      {processes.length === 0 && (
        <div className="workspace-empty">
          <div className="workspace-empty-icon"><Inbox size={44} strokeWidth={1.4} /></div>
          <h2>Keine Prozesse im Workspace</h2>
          <p>Importieren Sie Ihr erstes BPMN-Modell, um die AI-Readiness-Bewertung zu starten.</p>
          <div className="workspace-empty-actions">
            <button type="button" className="primary-button" onClick={() => onImport()}>
              <Plus size={18} /> BPMN importieren
            </button>
            <button type="button" className="secondary-button" onClick={onDemoImport}>
              <Sparkles size={15} /> Demo-Prozess laden
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0, style: 'currency', currency: 'EUR' }).format(value);
}
