import { useEffect, useRef, useState } from 'react';
import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer';
import type { AssessmentDecision, ProcessElement } from '../types';

interface BpmnViewerProps {
  xml: string;
  elements: ProcessElement[];
  currentElementId?: string;
  decisions: Record<string, AssessmentDecision>;
  onElementSelect: (elementId: string) => void;
}

export function BpmnViewer({ xml, elements, currentElementId, decisions, onElementSelect }: BpmnViewerProps) {
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

          if (id && elements.some((element) => element.id === id)) {
            onElementSelect(id);
          }
        });
        setIsReady(true);
      })
      .catch((error: unknown) => {
        console.error('BPMN konnte nicht gerendert werden.', error);
        setRenderError('Das BPMN wurde gelesen, konnte aber nicht gerendert werden. Die Schrittanalyse bleibt sichtbar.');
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
        canvas.removeMarker(element.id, 'current-step');
        canvas.removeMarker(element.id, 'completed-step');
        canvas.removeMarker(element.id, 'clarification-step');

        const decision = decisions[element.id];

        if (element.id === currentElementId) {
          canvas.addMarker(element.id, 'current-step');
        } else if (decision?.status === 'needs_clarification' || decision?.status === 'skipped') {
          canvas.addMarker(element.id, 'clarification-step');
        } else if (decision?.status === 'completed') {
          canvas.addMarker(element.id, 'completed-step');
        }
      } catch (error) {
        console.warn(`BPMN-Marker für ${element.id} konnte nicht gesetzt werden.`, error);
      }
    });
  }, [currentElementId, decisions, elements, isReady]);

  return (
    <div className="bpmn-viewer-wrap">
      {renderError ? <div className="viewer-error">{renderError}</div> : null}
      <div className="bpmn-canvas" ref={containerRef} />
    </div>
  );
}
