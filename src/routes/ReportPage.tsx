import { Navigate, useParams } from 'react-router';
import { ReportPreview } from '../components/ReportPreview';
import { useWorkspaceStore } from '../store/workspaceStore';

export function ReportPage() {
  const { processId } = useParams<{ processId: string }>();
  const process = useWorkspaceStore((state) => (processId ? state.processes[processId] : undefined));

  if (!processId || !process) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="report-page">
      <ReportPreview
        process={process}
        onBack={() => window.history.back()}
      />
    </main>
  );
}
