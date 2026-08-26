import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { ConfirmDialog, PromptDialog } from '../components/Dialogs';
import { ImportModal } from '../components/ImportModal';
import { WorkspaceLanding } from '../components/WorkspaceLanding';
import { exportAll, getAllProcesses, getWorkspace, importAll } from '../storage/db';
import { useBpmnImport } from '../hooks/useBpmnImport';
import { settingsToLLMConfig } from '../store/llmConfig';
import { flushPendingPersists, useWorkspaceStore } from '../store/workspaceStore';

interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

export function LandingPage() {
  const navigate = useNavigate();
  const workspace = useWorkspaceStore((state) => state.workspace)!;
  const processMap = useWorkspaceStore((state) => state.processes);
  const error = useWorkspaceStore((state) => state.error);
  const { pendingImport, loadDemo, cancel, runImport } = useBpmnImport();

  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const [areaPromptOpen, setAreaPromptOpen] = useState(false);

  const processes = Object.values(processMap);

  const handleOpenProcess = useCallback((processId: string) => {
    navigate(`/process/${processId}`);
  }, [navigate]);

  const handleDeleteProcess = useCallback((processId: string) => {
    const process = useWorkspaceStore.getState().processes[processId];
    if (!process) return;

    setConfirmRequest({
      title: 'Prozess löschen',
      message: `"${process.name}" inklusive aller Bewertungen wird unwiderruflich gelöscht.`,
      confirmLabel: 'Löschen',
      danger: true,
      onConfirm: () => {
        setConfirmRequest(null);
        void useWorkspaceStore.getState().removeProcess(processId);
      },
    });
  }, []);

  const handleDeleteArea = useCallback((areaId: string) => {
    const area = useWorkspaceStore.getState().workspace?.areas.find((a) => a.id === areaId);
    if (!area) return;

    setConfirmRequest({
      title: 'Bereich löschen',
      message: `Bereich "${area.name}" und alle darin enthaltenen Prozesse werden unwiderruflich gelöscht.`,
      confirmLabel: 'Bereich löschen',
      danger: true,
      onConfirm: () => {
        setConfirmRequest(null);
        void useWorkspaceStore.getState().deleteArea(areaId);
      },
    });
  }, []);

  const handleExport = useCallback(async () => {
    await flushPendingPersists();
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
          const storedWorkspace = await getWorkspace();
          const importedProcesses = await getAllProcesses();
          if (storedWorkspace) {
            useWorkspaceStore.setState({
              workspace: storedWorkspace,
              processes: Object.fromEntries(importedProcesses.map((process) => [process.id, process])),
              loading: false,
              error: null,
            });
          }
        })();
      },
    });
  }, []);

  return (
    <main className="workspace-landing">
      <WorkspaceLanding
        workspace={workspace}
        processes={processes}
        error={error}
        llmConfig={settingsToLLMConfig(workspace.settings)}
        onLLMConfigChange={(config) => useWorkspaceStore.getState().updateLLMConfig(config)}
        onImport={() => navigate('/import')}
        onDemoImport={loadDemo}
        onCreateArea={() => setAreaPromptOpen(true)}
        onRenameArea={(area) => useWorkspaceStore.getState().renameArea(area)}
        onDeleteArea={handleDeleteArea}
        onOpenProcess={handleOpenProcess}
        onDeleteProcess={handleDeleteProcess}
        onStatusChange={(processId, status) => {
          useWorkspaceStore.getState().updateProcess(processId, (process) => ({ ...process, status }));
          void useWorkspaceStore.getState().persistProcessNow(processId);
        }}
        onExport={() => void handleExport()}
        onImportWorkspace={handleImportWorkspace}
      />

      {pendingImport ? (
        <ImportModal
          fileName={pendingImport.fileName}
          areas={workspace.areas}
          onCancel={cancel}
          onCreateArea={(name) => useWorkspaceStore.getState().createArea(name) ?? workspace.areas[0]}
          onImport={(areaId, name, startAnalysis) => void runImport(areaId, name, startAnalysis)}
        />
      ) : null}

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
            useWorkspaceStore.getState().createArea(name);
            setAreaPromptOpen(false);
          }}
        />
      )}
    </main>
  );
}
