import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { parseBpmnElements } from '../engine/bpmnParser';
import { createSuggestions } from '../engine/domainEnrichment';
import { computeProcessSummary } from '../engine/processSummary';
import demoProduktlaunchXml from '../../demo_produktlaunch.bpmn?raw';
import { useWorkspaceStore } from '../store/workspaceStore';
import type { ProcessEntry } from '../types/workspace';

interface PendingImport {
  fileName: string;
  xml: string;
}

export function useBpmnImport() {
  const navigate = useNavigate();
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadFile = useCallback((fileName: string, xml: string) => {
    setError(null);
    setPendingImport({ fileName, xml });
  }, []);

  const loadDemo = useCallback(() => {
    setError(null);
    setPendingImport({ fileName: 'demo-produktlaunch.bpmn', xml: demoProduktlaunchXml });
  }, []);

  const cancel = useCallback(() => setPendingImport(null), []);

  const runImport = useCallback(async (areaId: string, processName: string, startAnalysis: boolean) => {
    if (!pendingImport) return;

    let elements;
    try {
      elements = parseBpmnElements(pendingImport.xml);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Die BPMN-Datei konnte nicht gelesen werden.');
      return;
    }

    if (elements.length === 0) {
      setError('Keine bewertbaren BPMN-Schritte gefunden.');
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

    const saved = await useWorkspaceStore.getState().addProcess(process);
    setPendingImport(null);

    if (startAnalysis) {
      navigate(`/process/${saved.id}`);
    }
  }, [navigate, pendingImport]);

  return { pendingImport, error, loadFile, loadDemo, cancel, runImport };
}
