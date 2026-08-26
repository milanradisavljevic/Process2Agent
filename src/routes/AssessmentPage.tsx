import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { BpmnViewer } from '../components/BpmnViewer';
import { InterviewPanel } from '../components/InterviewPanel';
import { LLMConfigPanel } from '../components/LLMConfigPanel';
import { AnalyzingView } from '../components/AnalyzingView';
import { QuickWinsView } from '../components/QuickWinsView';
import { ResizableDrawer } from '../components/ResizableDrawer';
import { ScoreBar } from '../components/ScoreBar';
import { settingsToLLMConfig } from '../store/llmConfig';
import { flushPendingPersists, useWorkspaceStore } from '../store/workspaceStore';
import { useAssessmentStore } from '../store/assessmentStore';

export function AssessmentPage() {
  const { processId } = useParams<{ processId: string }>();
  const navigate = useNavigate();
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);

  const process = useWorkspaceStore((state) => (processId ? state.processes[processId] : undefined));
  const workspace = useWorkspaceStore((state) => state.workspace);
  const llmStatus = useAssessmentStore((state) => state.llmStatus);
  const llmError = useAssessmentStore((state) => state.llmError);
  const drawerOpen = useAssessmentStore((state) => state.drawerOpen);
  const currentIndex = useAssessmentStore((state) => state.currentIndex);

  useEffect(() => {
    if (!processId) return;
    void useAssessmentStore.getState().openProcess(processId);
    return () => {
      useAssessmentStore.getState().closeProcess();
      flushPendingPersists();
    };
  }, [processId]);

  if (!processId || !process) {
    return <Navigate to="/" replace />;
  }

  if (llmStatus === 'running') {
    return <AnalyzingView variant="analyzing" elementCount={process.steps.length} />;
  }

  const area = workspace?.areas.find((a) => a.id === process.areaId);
  const currentElement = process.steps[currentIndex];
  const currentSuggestion = currentElement ? process.suggestions[currentElement.id] : undefined;

  return (
    <main className="app-shell view-transition">
      <header className="app-header">
        <div>
          <p className="brand">PROCESS2AGENT</p>
          <h1>{process.name}</h1>
          <p className="header-summary">
            {area ? `${area.name} · ` : ''}{process.steps.length} Schritte · {process.summary.laneCount} Lanes
            {llmStatus === 'done' && (
              <span className="badge badge-ok"> · KI-Analyse abgeschlossen</span>
            )}
            {llmStatus === 'error' && llmError && (
              <span className="badge badge-warn"> · Regelbasiert (LLM-Fehler)</span>
            )}
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="secondary-button" onClick={() => navigate('/')}>Zurück zum Workspace</button>
          {workspace && (
            <LLMConfigPanel
              config={settingsToLLMConfig(workspace.settings)}
              onConfigChange={(config) => {
                useWorkspaceStore.getState().updateLLMConfig(config);
                void useAssessmentStore.getState().startAnalysis();
              }}
            />
          )}
          <ScoreBar elements={process.steps} decisions={process.decisions} />
        </div>
      </header>

      <div className="assessment-fullscreen">
        <div className="viewer-panel">
          <BpmnViewer
            xml={process.bpmnXml}
            elements={process.steps}
            currentElementId={drawerOpen ? currentElement?.id : undefined}
            hoveredElementId={hoveredElementId}
            decisions={process.decisions}
            suggestions={process.suggestions}
            onElementSelect={(elementId) => useAssessmentStore.getState().openDrawer(elementId)}
            onElementHover={setHoveredElementId}
          />
          <div className="bpmn-legend">
            <span className="legend-item"><span className="legend-dot legend-dot--quick-win" /> Quick Win</span>
            <span className="legend-item"><span className="legend-dot legend-dot--potential" /> Potenzial</span>
            <span className="legend-item"><span className="legend-dot legend-dot--human" /> Mensch im Loop</span>
            <span className="legend-item"><span className="legend-dot legend-dot--open" /> Offen</span>
            <span className="legend-sep" aria-hidden="true" />
            <span className="legend-item"><span className="legend-dot legend-dot--completed" /> Bewertet</span>
            <span className="legend-item"><span className="legend-dot legend-dot--risk" /> Klärungsbedarf</span>
          </div>
        </div>

        <QuickWinsView
          elements={process.steps}
          suggestions={process.suggestions}
          decisions={process.decisions}
          hoveredElementId={hoveredElementId}
          onElementSelect={(elementId) => useAssessmentStore.getState().openDrawer(elementId)}
          onElementHover={setHoveredElementId}
          onReport={() => navigate(`/process/${processId}/report`)}
        />
      </div>

      {drawerOpen && currentElement && currentSuggestion && (
        <ResizableDrawer onClose={() => useAssessmentStore.getState().closeDrawer()}>
          <InterviewPanel
            element={currentElement}
            suggestion={currentSuggestion}
            decision={process.decisions[currentElement.id]}
            currentIndex={currentIndex}
            total={process.steps.length}
            process={process}
            llmConfig={workspace ? settingsToLLMConfig(workspace.settings) : undefined}
            defaultHourlyRates={workspace?.settings.defaultHourlyRates}
            onSave={(decision) => useAssessmentStore.getState().saveDecision(decision)}
            onSaveBusinessCase={(businessCase) => useAssessmentStore.getState().saveBusinessCase(businessCase)}
            onSaveSandboxTest={(test) => useAssessmentStore.getState().saveSandboxTest(test)}
            onNext={() => useAssessmentStore.getState().nextStep()}
            onPrevious={() => useAssessmentStore.getState().previousStep()}
            onReport={() => navigate(`/process/${processId}/report`)}
            onClose={() => useAssessmentStore.getState().closeDrawer()}
          />
        </ResizableDrawer>
      )}
    </main>
  );
}
