import { create } from 'zustand';
import { computeProcessSummary, deriveStatus, normalizeStatus } from '../engine/processSummary';
import {
  deleteProcess,
  getAllProcesses,
  getWorkspace,
  saveProcess,
  saveWorkspace,
} from '../storage/db';
import { migrateLegacyLLMConfig } from './llmConfig';
import type { LLMConfig } from '../types';
import type { Area, ProcessEntry, Workspace } from '../types/workspace';

const PERSIST_DELAY_MS = 2000;

interface WorkspaceStore {
  workspace: Workspace | null;
  processes: Record<string, ProcessEntry>;
  loading: boolean;
  error: string | null;

  load: () => Promise<void>;
  setError: (error: string | null) => void;

  createArea: (name: string) => Area | null;
  renameArea: (area: Area) => void;
  deleteArea: (areaId: string) => Promise<void>;

  addProcess: (process: ProcessEntry) => Promise<void>;
  updateProcess: (id: string, updater: (process: ProcessEntry) => ProcessEntry) => void;
  persistProcessNow: (id: string) => Promise<void>;
  removeProcess: (id: string) => Promise<void>;

  updateLLMConfig: (config: LLMConfig) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  workspace: null,
  processes: {},
  loading: true,
  error: null,

  async load() {
    try {
      const stored = await getWorkspace();
      let workspace = stored ?? createDefaultWorkspace();
      workspace = migrateLegacyLLMConfig(workspace);
      if (!stored) {
        await saveWorkspace(workspace);
      }
      const processes = await getAllProcesses();
      const normalized = processes.map((process) => ({ ...process, status: normalizeStatus(process.status) }));
      set({
        workspace,
        processes: Object.fromEntries(normalized.map((process) => [process.id, process])),
        loading: false,
        error: null,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Workspace konnte nicht geladen werden.',
        loading: false,
      });
    }
  },

  setError(error) {
    set({ error });
  },

  createArea(name) {
    const workspace = get().workspace;
    if (!workspace || !name.trim()) return null;

    const area: Area = {
      id: crypto.randomUUID(),
      name: name.trim(),
      icon: 'folder',
      color: 'var(--text-secondary)',
      sortOrder: workspace.areas.length,
      processIds: [],
    };
    const nextWorkspace = { ...workspace, areas: [...workspace.areas, area] };
    set({ workspace: nextWorkspace });
    void saveWorkspace(nextWorkspace);
    return area;
  },

  renameArea(area) {
    const workspace = get().workspace;
    if (!workspace) return;
    const nextWorkspace = {
      ...workspace,
      areas: workspace.areas.map((item) => item.id === area.id ? area : item),
    };
    set({ workspace: nextWorkspace });
    void saveWorkspace(nextWorkspace);
  },

  async deleteArea(areaId) {
    const { workspace, processes } = get();
    if (!workspace) return;

    for (const processId of workspace.areas.find((area) => area.id === areaId)?.processIds ?? []) {
      cancelPersist(processId);
      await deleteProcess(processId);
    }

    const nextWorkspace = { ...workspace, areas: workspace.areas.filter((area) => area.id !== areaId) };
    const nextProcesses = Object.fromEntries(
      Object.entries(processes).filter(([_, process]) => process.areaId !== areaId),
    );
    set({ workspace: nextWorkspace, processes: nextProcesses });
    await saveWorkspace(nextWorkspace);
  },

  async addProcess(process) {
    const saved = await saveProcess(process);
    const workspace = get().workspace;
    if (workspace) {
      const nextWorkspace = addProcessToArea(workspace, saved.areaId, saved.id);
      set({ processes: { ...get().processes, [saved.id]: saved }, workspace: nextWorkspace });
      await saveWorkspace(nextWorkspace);
    } else {
      set({ processes: { ...get().processes, [saved.id]: saved } });
    }
  },

  updateProcess(id, updater) {
    const current = get().processes[id];
    if (!current) return;

    const updated = updater(current);
    const nextStatus = deriveStatus(updated.status, updated.steps, updated.suggestions, updated.decisions);
    const withSummary: ProcessEntry = {
      ...updated,
      status: nextStatus,
      summary: computeProcessSummary(updated.steps, updated.suggestions, updated.decisions, updated.businessCase),
    };
    set({ processes: { ...get().processes, [id]: withSummary } });
    schedulePersist(id);
  },

  async persistProcessNow(id) {
    cancelPersist(id);
    const process = get().processes[id];
    if (!process) return;
    const saved = await saveProcess(process);
    set({ processes: { ...get().processes, [id]: saved } });
  },

  async removeProcess(id) {
    cancelPersist(id);
    await deleteProcess(id);
    const workspace = get().workspace;
    if (workspace) {
      const nextWorkspace = {
        ...workspace,
        areas: workspace.areas.map((area) => (
          area.processIds.includes(id)
            ? { ...area, processIds: area.processIds.filter((pid) => pid !== id) }
            : area
        )),
      };
      const nextProcesses = { ...get().processes };
      delete nextProcesses[id];
      set({ workspace: nextWorkspace, processes: nextProcesses });
      await saveWorkspace(nextWorkspace);
    } else {
      const nextProcesses = { ...get().processes };
      delete nextProcesses[id];
      set({ processes: nextProcesses });
    }
  },

  updateLLMConfig(config) {
    const workspace = get().workspace;
    if (!workspace) return;
    const nextSettings = {
      ...workspace.settings,
      llmProvider: config.provider,
      llmConfig: {
        anthropicApiKey: config.anthropicApiKey,
        anthropicModel: config.anthropicModel,
        ollamaUrl: config.ollamaUrl,
        ollamaModel: config.ollamaModel,
      },
    };
    const nextWorkspace = { ...workspace, settings: nextSettings };
    set({ workspace: nextWorkspace });
    void saveWorkspace(nextWorkspace);
  },
}));

const persistTimers = new Map<string, number>();

function schedulePersist(id: string): void {
  cancelPersist(id);
  persistTimers.set(id, window.setTimeout(() => {
    persistTimers.delete(id);
    void useWorkspaceStore.getState().persistProcessNow(id);
  }, PERSIST_DELAY_MS));
}

function cancelPersist(id: string): void {
  const timer = persistTimers.get(id);
  if (timer !== undefined) {
    window.clearTimeout(timer);
    persistTimers.delete(id);
  }
}

export function flushPendingPersists(): void {
  for (const id of Array.from(persistTimers.keys())) {
    void useWorkspaceStore.getState().persistProcessNow(id);
  }
}

function createDefaultWorkspace(): Workspace {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: 'Mein Workspace',
    areas: [{
      id: crypto.randomUUID(),
      name: 'Allgemein',
      icon: 'folder',
      color: 'var(--text-secondary)',
      sortOrder: 0,
      processIds: [],
    }],
    settings: {
      defaultCurrency: 'EUR',
      defaultHourlyRates: {},
      llmProvider: 'none',
      llmConfig: {},
      locale: 'de',
    },
    createdAt: now,
    updatedAt: now,
  };
}

function addProcessToArea(workspace: Workspace, areaId: string, processId: string): Workspace {
  return {
    ...workspace,
    areas: workspace.areas.map((area) => (
      area.id === areaId && !area.processIds.includes(processId)
        ? { ...area, processIds: [...area.processIds, processId] }
        : area
    )),
  };
}

export function selectCurrentProcess(state: WorkspaceStore, processId: string | null | undefined): ProcessEntry | undefined {
  return processId ? state.processes[processId] : undefined;
}
