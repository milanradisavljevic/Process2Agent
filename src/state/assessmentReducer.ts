import type { AppView, AssessmentDecision, AssessmentProject, AssessmentSuggestion } from '../types';

export interface AssessmentState {
  view: AppView;
  project?: AssessmentProject;
  currentIndex: number;
  decisions: Record<string, AssessmentDecision>;
  error?: string;
  llmStatus: 'idle' | 'running' | 'done' | 'error';
  llmError?: string;
  drawerOpen: boolean;
}

export type AssessmentAction =
  | { type: 'load_project'; project: AssessmentProject }
  | { type: 'open_project'; project: AssessmentProject; decisions: Record<string, AssessmentDecision> }
  | { type: 'set_error'; error: string }
  | { type: 'select_element'; elementId: string }
  | { type: 'save_decision'; decision: AssessmentDecision }
  | { type: 'next_step' }
  | { type: 'previous_step' }
  | { type: 'show_report' }
  | { type: 'back_to_assessment' }
  | { type: 'llm_success'; suggestions: Record<string, AssessmentSuggestion> }
  | { type: 'llm_error'; error: string }
  | { type: 'open_drawer'; elementId: string }
  | { type: 'close_drawer' };

export const initialAssessmentState: AssessmentState = {
  view: 'import',
  currentIndex: 0,
  decisions: {},
  llmStatus: 'idle',
  drawerOpen: false,
};

export function assessmentReducer(state: AssessmentState, action: AssessmentAction): AssessmentState {
  switch (action.type) {
    case 'load_project':
      return {
        ...initialAssessmentState,
        view: 'analyzing',
        project: action.project,
        llmStatus: 'running',
      };
    case 'open_project':
      return {
        ...initialAssessmentState,
        view: 'assessment',
        project: action.project,
        decisions: action.decisions,
        llmStatus: 'done',
      };
    case 'set_error':
      return { ...state, error: action.error };
    case 'select_element': {
      const index = state.project?.elements.findIndex((el) => el.id === action.elementId) ?? -1;
      return index >= 0 ? { ...state, currentIndex: index } : state;
    }
    case 'save_decision':
      return {
        ...state,
        decisions: { ...state.decisions, [action.decision.elementId]: action.decision },
      };
    case 'next_step':
      return {
        ...state,
        currentIndex: Math.min(state.currentIndex + 1, Math.max((state.project?.elements.length ?? 1) - 1, 0)),
      };
    case 'previous_step':
      return { ...state, currentIndex: Math.max(state.currentIndex - 1, 0) };
    case 'show_report':
      return { ...state, view: 'report', drawerOpen: false };
    case 'back_to_assessment':
      return { ...state, view: 'assessment' };
    case 'llm_success':
      return {
        ...state,
        view: 'assessment',
        llmStatus: 'done',
        project: state.project
          ? { ...state.project, suggestions: { ...state.project.suggestions, ...action.suggestions } }
          : state.project,
      };
    case 'llm_error':
      return { ...state, view: 'assessment', llmStatus: 'error', llmError: action.error };
    case 'open_drawer': {
      const index = state.project?.elements.findIndex((el) => el.id === action.elementId) ?? -1;
      return index >= 0
        ? { ...state, drawerOpen: true, currentIndex: index }
        : { ...state, drawerOpen: true };
    }
    case 'close_drawer':
      return { ...state, drawerOpen: false };
  }
}
