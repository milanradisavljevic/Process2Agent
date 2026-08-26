import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { AnalyzingView } from '../components/AnalyzingView';
import { useWorkspaceStore } from '../store/workspaceStore';
import { flushPendingPersists } from '../store/workspaceStore';
import { AssessmentPage } from './AssessmentPage';
import { ImportPage } from './ImportPage';
import { LandingPage } from './LandingPage';
import { ReportPage } from './ReportPage';

export function AppRoutes() {
  const loading = useWorkspaceStore((state) => state.loading);
  const workspace = useWorkspaceStore((state) => state.workspace);

  useEffect(() => {
    void useWorkspaceStore.getState().load();
  }, []);

  useEffect(() => {
    function handleBeforeUnload() {
      flushPendingPersists();
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  if (loading || !workspace) {
    return <AnalyzingView elementCount={0} />;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/import" element={<ImportPage />} />
      <Route path="/process/:processId" element={<AssessmentPage />} />
      <Route path="/process/:processId/report" element={<ReportPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
