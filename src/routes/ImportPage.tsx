import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { FileDropZone } from '../components/FileDropZone';
import { ImportModal } from '../components/ImportModal';
import { useBpmnImport } from '../hooks/useBpmnImport';
import { useWorkspaceStore } from '../store/workspaceStore';

export function ImportPage() {
  const navigate = useNavigate();
  const workspace = useWorkspaceStore((state) => state.workspace)!;
  const { pendingImport, error, loadFile, loadDemo, cancel, runImport } = useBpmnImport();

  return (
    <main className="workspace-landing">
      <header className="import-header">
        <button type="button" className="secondary-button" onClick={() => navigate('/')}>
          <ArrowLeft size={15} /> Zurück
        </button>
        <p className="brand">PROCESS2AGENT</p>
      </header>
      <FileDropZone error={error ?? undefined} onFileLoaded={loadFile} onDemoLoaded={loadDemo} />
      {pendingImport ? (
        <ImportModal
          fileName={pendingImport.fileName}
          areas={workspace.areas}
          onCancel={cancel}
          onCreateArea={(name) => useWorkspaceStore.getState().createArea(name) ?? workspace.areas[0]}
          onImport={(areaId, name, startAnalysis) => {
            void runImport(areaId, name, startAnalysis);
            if (!startAnalysis) navigate('/');
          }}
        />
      ) : null}
    </main>
  );
}
