import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HashRouter } from 'react-router';

vi.mock('../storage/db', () => ({
  getWorkspace: vi.fn(async () => undefined),
  saveWorkspace: vi.fn(async () => undefined),
  getAllProcesses: vi.fn(async () => []),
  saveProcess: vi.fn(async (process: unknown) => process),
  deleteProcess: vi.fn(async () => undefined),
}));

import { AppRoutes } from './AppRoutes';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useAssessmentStore } from '../store/assessmentStore';

describe('AppRoutes', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useWorkspaceStore.setState({ workspace: null, processes: {}, loading: true, error: null });
    useAssessmentStore.setState({
      activeProcessId: null, currentIndex: 0, drawerOpen: false,
      llmStatus: 'idle', llmError: '',
    });
  });

  it('landet nach dem Workspace-Load auf der Landing mit Demo-Angebot', async () => {
    render(
      <HashRouter>
        <AppRoutes />
      </HashRouter>,
    );

    expect(await screen.findByText('Mein Workspace')).toBeInTheDocument();
    expect(screen.getByText('Demo-Prozess laden')).toBeInTheDocument();
    expect(screen.getAllByText('BPMN importieren').length).toBeGreaterThanOrEqual(1);
  });
});
