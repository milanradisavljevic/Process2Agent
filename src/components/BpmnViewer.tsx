import { useEffect, useRef, useState } from 'react';
import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer';
import type { AgenticPattern, AssessmentDecision, AssessmentSuggestion, ProcessElement } from '../types';

const AUTOMATION_PATTERNS = new Set<AgenticPattern>([
  'agent_autonomous', 'agent_with_approval', 'mcp_or_api_call',
  'rule_based_automation', 'local_code_execution', 'llm_classification', 'llm_generation',
]);

const ALL_MARKERS = [
  'current-step', 'completed-step', 'clarification-step',
  'quick-win-marker', 'potential-marker', 'human-marker',
];

interface BpmnViewerProps {
  xml: string;
  elements: ProcessElement[];
  currentElementId?: string;
  decisions: Record<string, AssessmentDecision>;
  suggestions: Record<string, AssessmentSuggestion>;
  onElementSelect: (elementId: string) => void;
}

export function BpmnViewer({
  xml, elements, currentElementId, decisions, suggestions, onElementSelect,
}: BpmnViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<NavigatedViewer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [renderError, setRenderError] = useState<string>();

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    let cancelled = false;
    const viewer = new NavigatedViewer({ container: containerRef.current });
    viewerRef.current = viewer;
    setIsReady(false);
    setRenderError(undefined);

    viewer
      .importXML(xml)
      .then(() => {
        if (cancelled) {
          return;
        }

        viewer.get('canvas').zoom('fit-viewport');
        viewer.get('eventBus').on('element.click', (event) => {
          const id = event.element?.id;
          if (id && elements.some((el) => el.id === id)) {
            onElementSelect(id);
          }
        });
        setIsReady(true);
      })
      .catch((error: unknown) => {
        console.error('BPMN konnte nicht gerendert werden.', error);
        setRenderError('Das BPMN wurde gelesen, konnte aber nicht gerendert werden.');
      });

    return () => {
      cancelled = true;
      viewer.destroy();
      viewerRef.current = null;
      setIsReady(false);
    };
  }, [elements, onElementSelect, xml]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const canvas = viewerRef.current?.get('canvas');

    if (!canvas) {
      return;
    }

    elements.forEach((element) => {
      try {
        ALL_MARKERS.forEach((cls) => canvas.removeMarker(element.id, cls));

        const decision = decisions[element.id];
        const suggestion = suggestions[element.id];

        if (element.id === currentElementId) {
          canvas.addMarker(element.id, 'current-step');
        } else if (decision?.status === 'completed') {
          canvas.addMarker(element.id, 'completed-step');
        } else if (decision?.status === 'needs_clarification' || decision?.status === 'skipped') {
          canvas.addMarker(element.id, 'clarification-step');
        } else if (suggestion?.quick_win) {
          canvas.addMarker(element.id, 'quick-win-marker');
        } else if (suggestion && AUTOMATION_PATTERNS.has(suggestion.pattern)) {
          canvas.addMarker(element.id, 'potential-marker');
        } else if (suggestion) {
          canvas.addMarker(element.id, 'human-marker');
        }
      } catch (error) {
        console.warn(`BPMN-Marker für ${element.id} konnte nicht gesetzt werden.`, error);
      }
    });
  }, [currentElementId, decisions, elements, isReady, suggestions]);

  return (
    <div className="bpmn-viewer-wrap">
      {renderError ? <div className="viewer-error">{renderError}</div> : null}
      <div className="bpmn-canvas" ref={containerRef} />
    </div>
  );
}
