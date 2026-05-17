import type { Area, ProcessEntry, Workspace, WorkspaceSettings } from '../types/workspace';

export type WorkspaceView =
  | { page: 'landing' }
  | { page: 'import'; targetAreaId?: string }
  | { page: 'assessment'; processId: string }
  | { page: 'report'; processId: string }
  | { page: 'settings' };

export interface WorkspaceState {
  workspace: Workspace | null;
  currentView: WorkspaceView;
  processes: ProcessEntry[];
  loading: boolean;
  error: string | null;
}

export type WorkspaceAction =
  | { type: 'WORKSPACE_LOADED'; workspace: Workspace; processes: ProcessEntry[] }
  | { type: 'NAVIGATE'; view: WorkspaceView }
  | { type: 'AREA_CREATED'; area: Area }
  | { type: 'AREA_UPDATED'; area: Area }
  | { type: 'AREA_DELETED'; areaId: string }
  | { type: 'PROCESS_SAVED'; process: ProcessEntry }
  | { type: 'PROCESS_DELETED'; processId: string }
  | { type: 'PROCESS_MOVED'; processId: string; targetAreaId: string }
  | { type: 'SETTINGS_UPDATED'; settings: WorkspaceSettings }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' };

export const initialWorkspaceState: WorkspaceState = {
  workspace: null,
  currentView: { page: 'landing' },
  processes: [],
  loading: true,
  error: null,
};

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'WORKSPACE_LOADED':
      return {
        ...state,
        workspace: action.workspace,
        processes: action.processes,
        loading: false,
        error: null,
      };
    case 'NAVIGATE':
      return { ...state, currentView: action.view, error: null };
    case 'AREA_CREATED':
      return state.workspace
        ? { ...state, workspace: { ...state.workspace, areas: [...state.workspace.areas, action.area] } }
        : state;
    case 'AREA_UPDATED':
      return state.workspace
        ? {
            ...state,
            workspace: {
              ...state.workspace,
              areas: state.workspace.areas.map((area) => area.id === action.area.id ? action.area : area),
            },
          }
        : state;
    case 'AREA_DELETED':
      return state.workspace
        ? {
            ...state,
            workspace: {
              ...state.workspace,
              areas: state.workspace.areas.filter((area) => area.id !== action.areaId),
            },
          }
        : state;
    case 'PROCESS_SAVED': {
      const exists = state.processes.some((process) => process.id === action.process.id);
      const processes = exists
        ? state.processes.map((process) => process.id === action.process.id ? action.process : process)
        : [action.process, ...state.processes];

      return { ...state, processes };
    }
    case 'PROCESS_DELETED':
      return { ...state, processes: state.processes.filter((process) => process.id !== action.processId) };
    case 'PROCESS_MOVED':
      return {
        ...state,
        processes: state.processes.map((process) => (
          process.id === action.processId ? { ...process, areaId: action.targetAreaId } : process
        )),
      };
    case 'SETTINGS_UPDATED':
      return state.workspace
        ? { ...state, workspace: { ...state.workspace, settings: action.settings } }
        : state;
    case 'SET_ERROR':
      return { ...state, error: action.error, loading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
  }
}
