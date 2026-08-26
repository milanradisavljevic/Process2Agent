import { create } from 'zustand';
import { computeProcessSummary } from '../engine/processSummary';
import { createSuggestions } from '../engine/domainEnrichment';
import { analyzeBatch } from '../engine/llmService';
import { settingsToLLMConfig } from './llmConfig';
import { useWorkspaceStore } from './workspaceStore';
import type { AssessmentDecision, AssessmentSuggestion } from '../types';
import type { ProcessBusinessCase, SandboxTest, WorkspaceSettings } from '../types/workspace';

export type LlmStatus = 'idle' | 'running' | 'done' | 'error';

const RULE_ONLY_SETTINGS: WorkspaceSettings = {
  defaultCurrency: 'EUR',
  defaultHourlyRates: {},
  llmProvider: 'none',
  llmConfig: {},
  locale: 'de',
};

interface AssessmentStore {
  activeProcessId: string | null;
  currentIndex: number;
  drawerOpen: boolean;
  llmStatus: LlmStatus;
  llmError: string;

  openProcess: (processId: string) => Promise<void>;
  startAnalysis: () => Promise<void>;
  closeProcess: () => void;

  selectElement: (elementId: string) => void;
  openDrawer: (elementId: string) => void;
  closeDrawer: () => void;
  nextStep: () => void;
  previousStep: () => void;

  saveDecision: (decision: AssessmentDecision) => void;
  saveBusinessCase: (businessCase: ProcessBusinessCase) => void;
  saveSandboxTest: (test: SandboxTest) => void;
  applySuggestions: (suggestions: Record<string, AssessmentSuggestion>) => void;
}

export const useAssessmentStore = create<AssessmentStore>((set, get) => ({
  activeProcessId: null,
  currentIndex: 0,
  drawerOpen: false,
  llmStatus: 'idle',
  llmError: '',

  async openProcess(processId) {
    if (get().activeProcessId === processId) {
      // Resume: Zustand (Position, Drawer, LLM-Ergebnis) bleibt erhalten.
      set({ drawerOpen: false });
      return;
    }

    const workspaceStore = useWorkspaceStore.getState();
    const process = workspaceStore.processes[processId];
    if (!process) return;

    if (Object.keys(process.suggestions).length === 0 && process.steps.length > 0) {
      const suggestions = createSuggestions(process.steps);
      const ensured = {
        ...process,
        suggestions,
        summary: computeProcessSummary(process.steps, suggestions, process.decisions, process.businessCase),
      };
      useWorkspaceStore.setState((state) => ({
        processes: { ...state.processes, [process.id]: ensured },
      }));
      await useWorkspaceStore.getState().persistProcessNow(process.id);
    }

    set({
      activeProcessId: processId,
      currentIndex: 0,
      drawerOpen: false,
      llmStatus: 'idle',
      llmError: '',
    });

    await get().startAnalysis();
  },

  async startAnalysis() {
    const { activeProcessId } = get();
    if (!activeProcessId) return;

    const workspaceStore = useWorkspaceStore.getState();
    const process = workspaceStore.processes[activeProcessId];
    if (!process) return;

    const config = settingsToLLMConfig(workspaceStore.workspace?.settings ?? RULE_ONLY_SETTINGS);

    if (config.provider === 'none') {
      set({ llmStatus: 'done', llmError: '' });
      return;
    }

    set({ llmStatus: 'running', llmError: '' });
    try {
      const suggestions = await analyzeBatch(process.steps, config);
      get().applySuggestions(suggestions);
      set({ llmStatus: 'done' });
    } catch (error) {
      set({
        llmStatus: 'error',
        llmError: error instanceof Error ? error.message : 'LLM-Analyse fehlgeschlagen',
      });
    }
  },

  closeProcess() {
    set({ activeProcessId: null, currentIndex: 0, drawerOpen: false, llmStatus: 'idle', llmError: '' });
  },

  selectElement(elementId) {
    const process = useWorkspaceStore.getState().processes[get().activeProcessId ?? ''];
    if (!process) return;
    const index = process.steps.findIndex((step) => step.id === elementId);
    if (index >= 0) set({ currentIndex: index });
  },

  openDrawer(elementId) {
    get().selectElement(elementId);
    set({ drawerOpen: true });
  },

  closeDrawer() {
    set({ drawerOpen: false });
  },

  nextStep() {
    const process = useWorkspaceStore.getState().processes[get().activeProcessId ?? ''];
    const max = Math.max((process?.steps.length ?? 1) - 1, 0);
    set({ currentIndex: Math.min(get().currentIndex + 1, max) });
  },

  previousStep() {
    set({ currentIndex: Math.max(get().currentIndex - 1, 0) });
  },

  saveDecision(decision) {
    const id = get().activeProcessId;
    if (!id) return;
    useWorkspaceStore.getState().updateProcess(id, (process) => ({
      ...process,
      decisions: { ...process.decisions, [decision.elementId]: decision },
    }));
  },

  saveBusinessCase(businessCase) {
    const id = get().activeProcessId;
    if (!id) return;
    useWorkspaceStore.getState().updateProcess(id, (process) => ({
      ...process,
      businessCase,
    }));
  },

  saveSandboxTest(test) {
    const id = get().activeProcessId;
    if (!id) return;
    useWorkspaceStore.getState().updateProcess(id, (process) => ({
      ...process,
      sandboxTests: [...(process.sandboxTests ?? []).filter((t) => t.id !== test.id), test],
    }));
  },

  applySuggestions(suggestions) {
    const id = get().activeProcessId;
    if (!id) return;
    useWorkspaceStore.getState().updateProcess(id, (process) => ({
      ...process,
      suggestions: { ...process.suggestions, ...suggestions },
    }));
  },
}));
