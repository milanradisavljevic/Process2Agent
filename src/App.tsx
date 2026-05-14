import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { BpmnViewer } from './components/BpmnViewer';
import { FileDropZone } from './components/FileDropZone';
import { InterviewPanel } from './components/InterviewPanel';
import { ReportPreview } from './components/ReportPreview';
import { ScoreBar } from './components/ScoreBar';
import { AnalyzingView } from './components/AnalyzingView';
import { QuickWinsView } from './components/QuickWinsView';
import { LLMConfigPanel, loadLLMConfig } from './components/LLMConfigPanel';
import { createSuggestions } from './engine/domainEnrichment';
import { parseBpmnElements } from './engine/bpmnParser';
import { analyzeBatch } from './engine/llmService';
import { assessmentReducer, initialAssessmentState } from './state/assessmentReducer';
import type { AssessmentDecision, AssessmentProject, LLMConfig } from './types';

export function App() {
  const [state, dispatch] = useReducer(assessmentReducer, initialAssessmentState);
  const [llmConfig, setLlmConfig] = useState<LLMConfig>(() => loadLLMConfig());
  const [drawerWidth, setDrawerWidth] = useState(480);
  const isResizing = useRef(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  const handleFileLoaded = useCallback((fileName: string, xml: string) => {
    try {
      const elements = parseBpmnElements(xml);

      if (elements.length === 0) {
        dispatch({ type: 'set_error', error: 'Keine bewertbaren BPMN-Schritte gefunden.' });
        return;
      }

      const project: AssessmentProject = {
        fileName,
        xml,
        elements,
        suggestions: createSuggestions(elements),
      };

      dispatch({ type: 'load_project', project });
    } catch (error) {
      dispatch({
        type: 'set_error',
        error: error instanceof Error ? error.message : 'Die BPMN-Datei konnte nicht gelesen werden.',
      });
    }
  }, []);

  // Trigger LLM analysis after load_project sets view to 'analyzing'
  useEffect(() => {
    if (state.view !== 'analyzing' || !state.project) {
      return;
    }

    if (llmConfig.provider === 'none') {
      dispatch({ type: 'llm_error', error: '' });
      return;
    }

    let cancelled = false;

    analyzeBatch(state.project.elements, llmConfig)
      .then((suggestions) => {
        if (!cancelled) {
          dispatch({ type: 'llm_success', suggestions });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          dispatch({
            type: 'llm_error',
            error: error instanceof Error ? error.message : 'LLM-Analyse fehlgeschlagen',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [state.view, state.project, llmConfig]);

  const handleElementSelect = useCallback((elementId: string) => {
    dispatch({ type: 'open_drawer', elementId });
  }, []);

  const handleSaveDecision = useCallback((decision: AssessmentDecision) => {
    dispatch({ type: 'save_decision', decision });
  }, []);

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

  if (!state.project) {
    return <FileDropZone error={state.error} onFileLoaded={handleFileLoaded} />;
  }

  if (state.view === 'analyzing') {
    return <AnalyzingView elementCount={state.project.elements.length} />;
  }

  if (state.view === 'report') {
    return (
      <ReportPreview
        project={state.project}
        decisions={state.decisions}
        onBack={() => dispatch({ type: 'back_to_assessment' })}
      />
    );
  }

  const currentElement = state.project.elements[state.currentIndex];
  const currentSuggestion = currentElement ? state.project.suggestions[currentElement.id] : undefined;

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="brand">PROCESS2AGENT</p>
          <h1>{state.project.fileName}</h1>
          <p className="header-summary">
            {state.project.elements.length} Schritte · {countLanes(state.project)} Lanes
            {state.llmStatus === 'done' && (
              <span className="badge badge-ok"> · KI-Analyse abgeschlossen</span>
            )}
            {state.llmStatus === 'error' && state.llmError && (
              <span className="badge badge-warn"> · Regelbasiert (LLM-Fehler)</span>
            )}
          </p>
        </div>
        <div className="header-actions">
          <LLMConfigPanel config={llmConfig} onConfigChange={setLlmConfig} />
          <ScoreBar project={state.project} decisions={state.decisions} />
        </div>
      </header>

      <div className="assessment-fullscreen">
        <div className="viewer-panel">
          <BpmnViewer
            xml={state.project.xml}
            elements={state.project.elements}
            currentElementId={state.drawerOpen ? currentElement?.id : undefined}
            decisions={state.decisions}
            suggestions={state.project.suggestions}
            onElementSelect={handleElementSelect}
          />
        </div>

        <QuickWinsView
          elements={state.project.elements}
          suggestions={state.project.suggestions}
          decisions={state.decisions}
          onElementSelect={handleElementSelect}
          onReport={() => dispatch({ type: 'show_report' })}
        />
      </div>

      {state.drawerOpen && currentElement && currentSuggestion && (
        <div className="drawer-overlay open" onClick={() => dispatch({ type: 'close_drawer' })}>
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
              decision={state.decisions[currentElement.id]}
              currentIndex={state.currentIndex}
              total={state.project.elements.length}
              onSave={handleSaveDecision}
              onNext={() => dispatch({ type: 'next_step' })}
              onPrevious={() => dispatch({ type: 'previous_step' })}
              onReport={() => dispatch({ type: 'show_report' })}
              onClose={() => dispatch({ type: 'close_drawer' })}
            />
          </div>
        </div>
      )}
    </main>
  );
}

function countLanes(project: AssessmentProject): number {
  return new Set(project.elements.map((el) => el.laneName).filter(Boolean)).size;
}
