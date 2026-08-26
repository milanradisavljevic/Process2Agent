import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { BpmnViewer } from './components/BpmnViewer';
import { FileDropZone } from './components/FileDropZone';
import { ImportModal } from './components/ImportModal';
import { InterviewPanel } from './components/InterviewPanel';
import { ReportPreview } from './components/ReportPreview';
import { ScoreBar } from './components/ScoreBar';
import { AnalyzingView } from './components/AnalyzingView';
import { QuickWinsView } from './components/QuickWinsView';
import { LLMConfigPanel, loadLLMConfig } from './components/LLMConfigPanel';
import { WorkspaceLanding } from './components/WorkspaceLanding';
import { ConfirmDialog, PromptDialog } from './components/Dialogs';
import { createSuggestions } from './engine/domainEnrichment';
import { parseBpmnElements } from './engine/bpmnParser';
import { analyzeBatch } from './engine/llmService';
import { computeProcessSummary } from './engine/processSummary';
import { assessmentReducer, initialAssessmentState } from './state/assessmentReducer';
import { initialWorkspaceState, workspaceReducer } from './state/workspaceReducer';
import { deleteProcess, exportAll, getAllProcesses, getWorkspace, importAll, saveProcess, saveWorkspace } from './storage/db';
import type { AssessmentDecision, AssessmentProject, LLMConfig } from './types';
import type { Area, ProcessBusinessCase, ProcessEntry, ProcessStatus, SandboxTest, Workspace, WorkspaceSettings } from './types/workspace';
import demoProduktlaunchXml from '../demo_produktlaunch.bpmn?raw';

interface PendingImport {
  fileName: string;
  xml: string;
}

interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

export function App() {
  const [assessmentState, assessmentDispatch] = useReducer(assessmentReducer, initialAssessmentState);
  const [workspaceState, workspaceDispatch] = useReducer(workspaceReducer, initialWorkspaceState);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const [areaPromptOpen, setAreaPromptOpen] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState(480);
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const isResizing = useRef(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);
  const saveTimer = useRef<number | undefined>(undefined);

  const currentProcessId = workspaceState.currentView.page === 'assessment' || workspaceState.currentView.page === 'report'
    ? workspaceState.currentView.processId
    : null;
  const currentProcess = useMemo(
    () => workspaceState.processes.find((process) => process.id === currentProcessId),
    [currentProcessId, workspaceState.processes],
  );
  const llmConfig = useMemo(
    () => workspaceState.workspace ? settingsToLLMConfig(workspaceState.workspace.settings) : loadLLMConfig(),
    [workspaceState.workspace],
  );

  async function saveAndDispatchProcess(process: ProcessEntry) {
    const saved = await saveProcess(process);
    workspaceDispatch({ type: 'PROCESS_SAVED', process: saved });
  }

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      try {
        const existingWorkspace = await getWorkspace();
        const workspace = existingWorkspace ?? createDefaultWorkspace();
        if (!existingWorkspace) {
          await saveWorkspace(workspace);
        }
        const processes = await getAllProcesses();

        if (!cancelled) {
          workspaceDispatch({ type: 'WORKSPACE_LOADED', workspace, processes });
        }
      } catch (error) {
        if (!cancelled) {
          workspaceDispatch({
            type: 'SET_ERROR',
            error: error instanceof Error ? error.message : 'Workspace konnte nicht geladen werden.',
          });
        }
      }
    }

    void loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (assessmentState.view !== 'analyzing' || !assessmentState.project) {
      return;
    }

    if (llmConfig.provider === 'none') {
      assessmentDispatch({ type: 'llm_error', error: '' });
      return;
    }

    let cancelled = false;

    analyzeBatch(assessmentState.project.elements, llmConfig)
      .then((suggestions) => {
        if (!cancelled) {
          assessmentDispatch({ type: 'llm_success', suggestions });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          assessmentDispatch({
            type: 'llm_error',
            error: error instanceof Error ? error.message : 'LLM-Analyse fehlgeschlagen',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [assessmentState.view, assessmentState.project, llmConfig]);

  useEffect(() => {
    if (!currentProcess || !assessmentState.project || workspaceState.currentView.page !== 'assessment') {
      return;
    }

    const project = assessmentState.project;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const nextProcess = processFromAssessment(currentProcess, project, assessmentState.decisions);
      void saveAndDispatchProcess(nextProcess);
    }, 2000);

    return () => window.clearTimeout(saveTimer.current);
  }, [assessmentState.decisions, assessmentState.project, currentProcess, workspaceState.currentView.page]);

  const handleFileLoaded = useCallback((fileName: string, xml: string) => {
    setPendingImport({ fileName, xml });
  }, []);

  const handleDemoLoaded = useCallback(() => {
    setPendingImport({ fileName: 'demo-produktlaunch.bpmn', xml: demoProduktlaunchXml });
  }, []);

  const handleCreateArea = useCallback((name?: string): Area | null => {
    if (!workspaceState.workspace) return null;

    const areaName = name?.trim();
    if (!areaName) return null;

    const area: Area = {
      id: crypto.randomUUID(),
      name: areaName,
      icon: 'folder',
      color: 'var(--text-secondary)',
      sortOrder: workspaceState.workspace.areas.length,
      processIds: [],
    };
    const workspace = { ...workspaceState.workspace, areas: [...workspaceState.workspace.areas, area] };
    workspaceDispatch({ type: 'AREA_CREATED', area });
    void saveWorkspace(workspace);
    return area;
  }, [workspaceState.workspace]);

  const handleImportProcess = useCallback(async (areaId: string, processName: string, startAnalysis: boolean) => {
    if (!pendingImport || !workspaceState.workspace) return;

    try {
      const elements = parseBpmnElements(pendingImport.xml);

      if (elements.length === 0) {
        workspaceDispatch({ type: 'SET_ERROR', error: 'Keine bewertbaren BPMN-Schritte gefunden.' });
        return;
      }

      const suggestions = startAnalysis ? createSuggestions(elements) : {};
      const now = new Date().toISOString();
      const process: ProcessEntry = {
        id: crypto.randomUUID(),
        areaId,
        name: processName,
        description: '',
        bpmnXml: pendingImport.xml,
        status: startAnalysis ? 'analyzed' : 'imported',
        tags: [],
        createdAt: now,
        updatedAt: now,
        steps: elements,
        suggestions,
        decisions: {},
        summary: computeProcessSummary(elements, suggestions, {}, undefined),
      };
      const savedProcess = await saveProcess(process);
      const workspace = addProcessToWorkspaceArea(workspaceState.workspace, areaId, savedProcess.id);
      await saveWorkspace(workspace);
      workspaceDispatch({ type: 'WORKSPACE_LOADED', workspace, processes: [savedProcess, ...workspaceState.processes] });
      setPendingImport(null);

      if (startAnalysis) {
        assessmentDispatch({ type: 'load_project', project: projectFromProcess(savedProcess) });
        workspaceDispatch({ type: 'NAVIGATE', view: { page: 'assessment', processId: savedProcess.id } });
      } else {
        workspaceDispatch({ type: 'NAVIGATE', view: { page: 'landing' } });
      }
    } catch (error) {
      workspaceDispatch({
        type: 'SET_ERROR',
        error: error instanceof Error ? error.message : 'Die BPMN-Datei konnte nicht gelesen werden.',
      });
    }
  }, [pendingImport, workspaceState.processes, workspaceState.workspace]);

  const handleOpenProcess = useCallback(async (processId: string) => {
    const process = workspaceState.processes.find((item) => item.id === processId);
    if (!process) return;

    workspaceDispatch({ type: 'NAVIGATE', view: { page: 'assessment', processId } });

    if (Object.keys(process.suggestions).length === 0) {
      const suggestions = createSuggestions(process.steps);
      const nextProcess = await saveProcess({ ...process, suggestions, summary: computeProcessSummary(process.steps, suggestions, process.decisions, process.businessCase) });
      workspaceDispatch({ type: 'PROCESS_SAVED', process: nextProcess });
      assessmentDispatch({ type: 'load_project', project: projectFromProcess(nextProcess) });
      return;
    }

    assessmentDispatch({ type: 'open_project', project: projectFromProcess(process), decisions: process.decisions });
  }, [workspaceState.processes]);

  const handleDeleteProcess = useCallback((processId: string) => {
    const process = workspaceState.processes.find((item) => item.id === processId);
    if (!process) return;

    setConfirmRequest({
      title: 'Prozess löschen',
      message: `"${process.name}" inklusive aller Bewertungen wird unwiderruflich gelöscht.`,
      confirmLabel: 'Löschen',
      danger: true,
      onConfirm: () => {
        setConfirmRequest(null);
        void (async () => {
          await deleteProcess(processId);
          if (workspaceState.workspace) {
            const workspace = {
              ...workspaceState.workspace,
              areas: workspaceState.workspace.areas.map((area) => (
                area.processIds.includes(processId)
                  ? { ...area, processIds: area.processIds.filter((id) => id !== processId) }
                  : area
              )),
            };
            await saveWorkspace(workspace);
            workspaceDispatch({ type: 'WORKSPACE_LOADED', workspace, processes: workspaceState.processes.filter((p) => p.id !== processId) });
          } else {
            workspaceDispatch({ type: 'PROCESS_DELETED', processId });
          }
        })();
      },
    });
  }, [workspaceState.workspace, workspaceState.processes]);

  const handleStatusChange = useCallback(async (processId: string, status: ProcessStatus) => {
    const process = workspaceState.processes.find((item) => item.id === processId);
    if (!process) return;
    await saveAndDispatchProcess({ ...process, status });
  }, [saveAndDispatchProcess, workspaceState.processes]);

  const handleDeleteArea = useCallback((areaId: string) => {
    if (!workspaceState.workspace) return;
    const area = workspaceState.workspace.areas.find((a) => a.id === areaId);
    if (!area) return;

    setConfirmRequest({
      title: 'Bereich löschen',
      message: `Bereich "${area.name}" und alle darin enthaltenen Prozesse werden unwiderruflich gelöscht.`,
      confirmLabel: 'Bereich löschen',
      danger: true,
      onConfirm: () => {
        setConfirmRequest(null);
        void (async () => {
          const currentWorkspace = workspaceState.workspace;
          if (!currentWorkspace) return;

          for (const processId of area.processIds) {
            await deleteProcess(processId);
          }

          const workspace = {
            ...currentWorkspace,
            areas: currentWorkspace.areas.filter((a) => a.id !== areaId),
          };
          await saveWorkspace(workspace);
          workspaceDispatch({ type: 'WORKSPACE_LOADED', workspace, processes: workspaceState.processes.filter((p) => p.areaId !== areaId) });
        })();
      },
    });
  }, [workspaceState.workspace, workspaceState.processes]);

  const handleRenameArea = useCallback((area: Area) => {
    if (!workspaceState.workspace) return;
    const workspace = {
      ...workspaceState.workspace,
      areas: workspaceState.workspace.areas.map((item) => item.id === area.id ? area : item),
    };
    workspaceDispatch({ type: 'AREA_UPDATED', area });
    void saveWorkspace(workspace);
  }, [workspaceState.workspace]);

  const handleLLMConfigChange = useCallback((config: LLMConfig) => {
    if (!workspaceState.workspace) return;
    const settings = llmConfigToSettings(workspaceState.workspace.settings, config);
    const workspace = { ...workspaceState.workspace, settings };
    workspaceDispatch({ type: 'SETTINGS_UPDATED', settings });
    void saveWorkspace(workspace);
  }, [workspaceState.workspace]);

  const handleExport = useCallback(async () => {
    const json = await exportAll();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `process2agent-${new Date().toISOString().slice(0, 10)}.p2a.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleImportWorkspace = useCallback((file: File) => {
    setConfirmRequest({
      title: 'Workspace importieren',
      message: 'Vorhandene Daten werden vollständig überschrieben. Fortfahren?',
      confirmLabel: 'Überschreiben',
      danger: true,
      onConfirm: () => {
        setConfirmRequest(null);
        void (async () => {
          await importAll(await file.text());
          const workspace = await getWorkspace();
          const processes = await getAllProcesses();
          if (workspace) {
            workspaceDispatch({ type: 'WORKSPACE_LOADED', workspace, processes });
          }
        })();
      },
    });
  }, []);

  const handleSaveDecision = useCallback((decision: AssessmentDecision) => {
    assessmentDispatch({ type: 'save_decision', decision });
  }, []);

  const handleSaveBusinessCase = useCallback((businessCase: ProcessBusinessCase) => {
    if (!currentProcess) return;
    const nextProcess: ProcessEntry = {
      ...currentProcess,
      businessCase,
      summary: computeProcessSummary(currentProcess.steps, currentProcess.suggestions, currentProcess.decisions, businessCase),
    };
    void saveAndDispatchProcess(nextProcess);
  }, [currentProcess, saveAndDispatchProcess]);

  const handleSaveSandboxTest = useCallback((test: SandboxTest) => {
    if (!currentProcess) return;
    const sandboxTests = [...(currentProcess.sandboxTests ?? []).filter((t) => t.id !== test.id), test];
    const nextProcess: ProcessEntry = { ...currentProcess, sandboxTests };
    void saveAndDispatchProcess(nextProcess);
  }, [currentProcess, saveAndDispatchProcess]);

  const handleShowReport = useCallback(() => {
    if (!currentProcessId) return;
    assessmentDispatch({ type: 'show_report' });
    workspaceDispatch({ type: 'NAVIGATE', view: { page: 'report', processId: currentProcessId } });
  }, [currentProcessId]);

  function handleResizeMove(e: MouseEvent) {
    if (!isResizing.current) return;
    const delta = resizeStartX.current - e.clientX;
    const next = Math.min(Math.max(resizeStartWidth.current + delta, 320), 900);
    setDrawerWidth(next);
  }

  function handleResizeEnd() {
    isResizing.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  }

  function renderDialogs() {
    return (
      <>
        {confirmRequest && (
          <ConfirmDialog
            title={confirmRequest.title}
            message={confirmRequest.message}
            confirmLabel={confirmRequest.confirmLabel}
            danger={confirmRequest.danger}
            onConfirm={confirmRequest.onConfirm}
            onCancel={() => setConfirmRequest(null)}
          />
        )}
        {areaPromptOpen && (
          <PromptDialog
            title="Neuen Bereich anlegen"
            placeholder="z.B. Finance, Einkauf, Logistik"
            onCancel={() => setAreaPromptOpen(false)}
            onConfirm={(name) => {
              handleCreateArea(name);
              setAreaPromptOpen(false);
            }}
          />
        )}
      </>
    );
  }

  if (workspaceState.loading || !workspaceState.workspace) {
    return <div className="view-transition"><AnalyzingView elementCount={0} /></div>;
  }

  if (workspaceState.currentView.page === 'import') {
    const workspace = workspaceState.workspace;
    return (
      <div className="view-transition">
        <FileDropZone error={workspaceState.error ?? undefined} onFileLoaded={handleFileLoaded} onDemoLoaded={handleDemoLoaded} />
        {pendingImport ? (
          <ImportModal
            fileName={pendingImport.fileName}
            areas={workspace.areas}
            targetAreaId={workspaceState.currentView.targetAreaId}
            onCancel={() => setPendingImport(null)}
            onCreateArea={(name) => handleCreateArea(name) ?? workspace.areas[0]}
            onImport={handleImportProcess}
          />
        ) : null}
        {renderDialogs()}
      </div>
    );
  }

  if (workspaceState.currentView.page === 'landing') {
    return (
      <div className="view-transition"><WorkspaceLanding
        workspace={workspaceState.workspace}
        processes={workspaceState.processes}
        error={workspaceState.error}
        llmConfig={llmConfig}
        onLLMConfigChange={handleLLMConfigChange}
        onImport={(areaId) => workspaceDispatch({ type: 'NAVIGATE', view: { page: 'import', targetAreaId: areaId } })}
        onDemoImport={handleDemoLoaded}
        onCreateArea={() => setAreaPromptOpen(true)}
        onRenameArea={handleRenameArea}
        onDeleteArea={handleDeleteArea}
        onOpenProcess={handleOpenProcess}
        onDeleteProcess={handleDeleteProcess}
        onStatusChange={handleStatusChange}
        onExport={handleExport}
        onImportWorkspace={handleImportWorkspace}
      />{renderDialogs()}</div>
    );
  }

  if (!assessmentState.project) {
    return <div className="view-transition"><AnalyzingView elementCount={0} /></div>;
  }

  if (assessmentState.view === 'analyzing') {
    return <div className="view-transition"><AnalyzingView elementCount={assessmentState.project.elements.length} /></div>;
  }

  if (workspaceState.currentView.page === 'report' || assessmentState.view === 'report') {
    return (
      <div className="view-transition"><ReportPreview
        project={assessmentState.project}
        decisions={assessmentState.decisions}
        process={currentProcess ?? undefined}
        onBack={() => workspaceDispatch({ type: 'NAVIGATE', view: { page: 'landing' } })}
      />{renderDialogs()}</div>
    );
  }

  const currentElement = assessmentState.project.elements[assessmentState.currentIndex];
  const currentSuggestion = currentElement ? assessmentState.project.suggestions[currentElement.id] : undefined;
  const areaName = workspaceState.workspace.areas.find((area) => area.id === currentProcess?.areaId)?.name;

  return (
    <main className="app-shell view-transition">
      <header className="app-header">
        <div>
          <p className="brand">PROCESS2AGENT</p>
          <h1>{currentProcess?.name ?? assessmentState.project.fileName}</h1>
          <p className="header-summary">
            {areaName ? `${areaName} · ` : ''}{assessmentState.project.elements.length} Schritte · {countLanes(assessmentState.project)} Lanes
            {assessmentState.llmStatus === 'done' && (
              <span className="badge badge-ok"> · KI-Analyse abgeschlossen</span>
            )}
            {assessmentState.llmStatus === 'error' && assessmentState.llmError && (
              <span className="badge badge-warn"> · Regelbasiert (LLM-Fehler)</span>
            )}
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="secondary-button" onClick={() => workspaceDispatch({ type: 'NAVIGATE', view: { page: 'landing' } })}>Zurück zum Workspace</button>
          <LLMConfigPanel config={llmConfig} onConfigChange={handleLLMConfigChange} />
          <ScoreBar project={assessmentState.project} decisions={assessmentState.decisions} />
        </div>
      </header>

      <div className="assessment-fullscreen">
        <div className="viewer-panel">
          <BpmnViewer
            xml={assessmentState.project.xml}
            elements={assessmentState.project.elements}
            currentElementId={assessmentState.drawerOpen ? currentElement?.id : undefined}
            hoveredElementId={hoveredElementId}
            decisions={assessmentState.decisions}
            suggestions={assessmentState.project.suggestions}
            onElementSelect={(elementId) => assessmentDispatch({ type: 'open_drawer', elementId })}
            onElementHover={setHoveredElementId}
          />
        </div>

        <QuickWinsView
          elements={assessmentState.project.elements}
          suggestions={assessmentState.project.suggestions}
          decisions={assessmentState.decisions}
          hoveredElementId={hoveredElementId}
          onElementSelect={(elementId) => assessmentDispatch({ type: 'open_drawer', elementId })}
          onElementHover={setHoveredElementId}
          onReport={handleShowReport}
        />
      </div>

      {assessmentState.drawerOpen && currentElement && currentSuggestion && (
        <div className="drawer-overlay open" onClick={() => assessmentDispatch({ type: 'close_drawer' })}>
          <div
            className="drawer-panel open"
            style={{ width: drawerWidth }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="drawer-resize-handle"
              onMouseDown={(e) => {
                isResizing.current = true;
                resizeStartX.current = e.clientX;
                resizeStartWidth.current = drawerWidth;
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
                document.addEventListener('mousemove', handleResizeMove);
                document.addEventListener('mouseup', handleResizeEnd);
              }}
            />
            <InterviewPanel
              element={currentElement}
              suggestion={currentSuggestion}
              decision={assessmentState.decisions[currentElement.id]}
              currentIndex={assessmentState.currentIndex}
              total={assessmentState.project.elements.length}
              process={currentProcess ?? undefined}
              llmConfig={llmConfig}
              defaultHourlyRates={workspaceState.workspace?.settings.defaultHourlyRates}
              onSave={handleSaveDecision}
              onSaveBusinessCase={handleSaveBusinessCase}
              onSaveSandboxTest={handleSaveSandboxTest}
              onNext={() => assessmentDispatch({ type: 'next_step' })}
              onPrevious={() => assessmentDispatch({ type: 'previous_step' })}
              onReport={handleShowReport}
               onClose={() => assessmentDispatch({ type: 'close_drawer' })}
             />
           </div>
         </div>
       )}

      {renderDialogs()}
    </main>
  );
}

function createDefaultWorkspace(): Workspace {
  const config = loadLLMConfig();
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    name: 'Mein Workspace',
    areas: [{
      id: crypto.randomUUID(),
      name: 'Allgemein',
      icon: 'folder',
      color: 'var(--text-secondary)',
      sortOrder: 0,
      processIds: [],
    }],
    settings: llmConfigToSettings({
      defaultCurrency: 'EUR',
      defaultHourlyRates: {},
      llmProvider: 'none',
      llmConfig: {},
      locale: 'de',
    }, config),
    createdAt: now,
    updatedAt: now,
  };
}

function projectFromProcess(process: ProcessEntry): AssessmentProject {
  return {
    fileName: process.name,
    xml: process.bpmnXml,
    elements: process.steps,
    suggestions: process.suggestions,
  };
}

function processFromAssessment(
  process: ProcessEntry,
  project: AssessmentProject,
  decisions: Record<string, AssessmentDecision>,
): ProcessEntry {
  return {
    ...process,
    name: project.fileName,
    bpmnXml: project.xml,
    steps: project.elements,
    suggestions: project.suggestions,
    decisions,
    summary: computeProcessSummary(project.elements, project.suggestions, decisions, process.businessCase),
  };
}

function addProcessToWorkspaceArea(workspace: Workspace, areaId: string, processId: string): Workspace {
  return {
    ...workspace,
    areas: workspace.areas.map((area) => (
      area.id === areaId && !area.processIds.includes(processId)
        ? { ...area, processIds: [...area.processIds, processId] }
        : area
    )),
  };
}

function settingsToLLMConfig(settings: WorkspaceSettings): LLMConfig {
  return {
    provider: settings.llmProvider,
    ollamaUrl: settings.llmConfig.ollamaUrl ?? 'http://localhost:11434',
    ollamaModel: settings.llmConfig.ollamaModel ?? 'llama3.2',
    anthropicApiKey: settings.llmConfig.anthropicApiKey ?? '',
    anthropicModel: settings.llmConfig.anthropicModel ?? 'claude-sonnet-4-6',
  };
}

function llmConfigToSettings(settings: WorkspaceSettings, config: LLMConfig): WorkspaceSettings {
  return {
    ...settings,
    llmProvider: config.provider,
    llmConfig: {
      anthropicApiKey: config.anthropicApiKey,
      anthropicModel: config.anthropicModel,
      ollamaUrl: config.ollamaUrl,
      ollamaModel: config.ollamaModel,
    },
  };
}

function countLanes(project: AssessmentProject): number {
  return new Set(project.elements.map((el) => el.laneName).filter(Boolean)).size;
}
