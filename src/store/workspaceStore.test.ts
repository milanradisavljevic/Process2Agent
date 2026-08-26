import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkspaceStore } from './workspaceStore';
import type { ProcessEntry } from '../types/workspace';

vi.mock('../storage/db', () => ({
  getWorkspace: vi.fn(async () => undefined),
  saveWorkspace: vi.fn(async () => undefined),
  getAllProcesses: vi.fn(async () => []),
  saveProcess: vi.fn(async (process: ProcessEntry) => ({ ...process, updatedAt: '2026-01-01T00:00:00.000Z' })),
  deleteProcess: vi.fn(async () => undefined),
}));

import { getAllProcesses, saveProcess } from '../storage/db';

function process(overrides: Partial<ProcessEntry> = {}): ProcessEntry {
  return {
    id: 'p1',
    areaId: 'a1',
    name: 'Testprozess',
    description: '',
    bpmnXml: '<definitions />',
    status: 'imported',
    tags: [],
    createdAt: '',
    updatedAt: '',
    steps: [{ id: 's1', name: 'Schritt 1', bpmnType: 'bpmn:Task', source: 'name' }],
    suggestions: {},
    decisions: {},
    summary: {
      totalSteps: 1, quickWins: 0, automationPotential: 0, humanInLoop: 0,
      clarificationNeeded: 1, laneCount: 0, laneNames: [],
    },
    ...overrides,
  };
}

describe('workspaceStore', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      workspace: null,
      processes: {},
      loading: true,
      error: null,
    });
    vi.clearAllMocks();
  });

  it('load erstellt einen Default-Workspace, wenn keiner existiert', async () => {
    await useWorkspaceStore.getState().load();

    const state = useWorkspaceStore.getState();
    expect(state.loading).toBe(false);
    expect(state.workspace?.areas[0].name).toBe('Allgemein');
  });

  it('updateProcess berechnet Summary neu und plant Persistierung ein', async () => {
    vi.useFakeTimers();
    await useWorkspaceStore.getState().load();
    await useWorkspaceStore.getState().addProcess(process());

    expect(saveProcess).toHaveBeenCalledTimes(1);

    useWorkspaceStore.getState().updateProcess('p1', (p) => ({
      ...p,
      decisions: { s1: { elementId: 's1', pattern: 'human_in_the_loop', privacy: 'unknown', complexity: 'low', targetSystem: '', note: '', status: 'completed' } },
    }));

    const state = useWorkspaceStore.getState();
    expect(state.processes['p1'].summary.clarificationNeeded).toBe(0);
    expect(state.processes['p1'].status).toBe('reviewed');
    expect(saveProcess).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2100);
    expect(saveProcess).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('persistProcessNow schreibt den aktuellsten Stand sofort', async () => {
    await useWorkspaceStore.getState().load();
    await useWorkspaceStore.getState().addProcess(process());

    useWorkspaceStore.getState().updateProcess('p1', (p) => ({ ...p, name: 'Umbenannt' }));
    await useWorkspaceStore.getState().persistProcessNow('p1');

    const calls = vi.mocked(saveProcess).mock.calls;
    const savedCall = calls[calls.length - 1]?.[0];
    expect(savedCall?.name).toBe('Umbenannt');
  });

  it('removeProcess entfernt aus Store und Area', async () => {
    await useWorkspaceStore.getState().load();
    await useWorkspaceStore.getState().addProcess(process());

    await useWorkspaceStore.getState().removeProcess('p1');

    expect(useWorkspaceStore.getState().processes['p1']).toBeUndefined();
    expect(useWorkspaceStore.getState().workspace?.areas[0].processIds).toEqual([]);
  });

  it('getAllProcesses normalisiert Legacy-Statuswerte', async () => {
    vi.mocked(getAllProcesses).mockResolvedValueOnce([
      process({ id: 'old1', status: 'live' }),
      process({ id: 'old2', status: 'implementing' }),
    ]);

    await useWorkspaceStore.getState().load();

    const processes = useWorkspaceStore.getState().processes;
    expect(processes['old1']?.status).toBe('validated');
    expect(processes['old2']?.status).toBe('validated');
  });
});
