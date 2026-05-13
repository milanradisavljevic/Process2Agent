import { useCallback, useReducer } from 'react';
import { BpmnViewer } from './components/BpmnViewer';
import { FileDropZone } from './components/FileDropZone';
import { InterviewPanel } from './components/InterviewPanel';
import { ReportPreview } from './components/ReportPreview';
import { ScoreBar } from './components/ScoreBar';
import { createSuggestions } from './engine/domainEnrichment';
import { parseBpmnElements } from './engine/bpmnParser';
import { assessmentReducer, initialAssessmentState } from './state/assessmentReducer';
import type { AssessmentDecision, AssessmentProject } from './types';

export function App() {
  const [state, dispatch] = useReducer(assessmentReducer, initialAssessmentState);

  const handleFileLoaded = useCallback((fileName: string, xml: string) => {
    try {
      const elements = parseBpmnElements(xml);

      if (elements.length === 0) {
        dispatch({ type: 'set_error', error: 'Keine bewertbaren BPMN-Schritte gefunden. Bitte pruefe den Export.' });
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
      dispatch({ type: 'set_error', error: error instanceof Error ? error.message : 'Die BPMN-Datei konnte nicht gelesen werden.' });
    }
  }, []);

  const handleElementSelect = useCallback((elementId: string) => {
    dispatch({ type: 'select_element', elementId });
  }, []);

  const handleSaveDecision = useCallback((decision: AssessmentDecision) => {
    dispatch({ type: 'save_decision', decision });
  }, []);

  if (!state.project) {
    return <FileDropZone error={state.error} onFileLoaded={handleFileLoaded} />;
  }

  if (state.view === 'report') {
    return <ReportPreview project={state.project} decisions={state.decisions} onBack={() => dispatch({ type: 'back_to_assessment' })} />;
  }

  const currentElement = state.project.elements[state.currentIndex];

  if (!currentElement) {
    return <FileDropZone error="Der BPMN-Import wurde gelesen, aber der Assessment-State ist unvollstaendig. Bitte lade die Datei erneut." onFileLoaded={handleFileLoaded} />;
  }

  const currentSuggestion = state.project.suggestions[currentElement.id];

  if (!currentSuggestion) {
    return <FileDropZone error="Der BPMN-Import wurde gelesen, aber die Vorschlaege konnten nicht erzeugt werden. Bitte lade die Datei erneut." onFileLoaded={handleFileLoaded} />;
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">process2agent v1 PoC</p>
          <h1>{state.project.fileName}</h1>
          <p className="header-summary">{state.project.elements.length} Schritte erkannt · {countLanes(state.project)} Lanes · {countFallbackNames(state.project)} technische Namen</p>
        </div>
        <ScoreBar project={state.project} decisions={state.decisions} />
      </header>

      <section className="assessment-layout">
        <div className="viewer-panel">
          <BpmnViewer
            xml={state.project.xml}
            elements={state.project.elements}
            currentElementId={currentElement.id}
            decisions={state.decisions}
            onElementSelect={handleElementSelect}
          />
          <div className="element-debug-list">
            {state.project.elements.map((element, index) => (
              <button
                className={element.id === currentElement.id ? 'active' : ''}
                key={element.id}
                type="button"
                onClick={() => dispatch({ type: 'select_element', elementId: element.id })}
              >
                <span className={`step-status ${state.decisions[element.id]?.status ?? 'open'}`} />
                <span>{index + 1}. {element.name}</span>
              </button>
            ))}
          </div>
        </div>

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
        />
      </section>
    </main>
  );
}

function countLanes(project: AssessmentProject): number {
  return new Set(project.elements.map((element) => element.laneName).filter(Boolean)).size;
}

function countFallbackNames(project: AssessmentProject): number {
  return project.elements.filter((element) => element.source === 'id').length;
}
