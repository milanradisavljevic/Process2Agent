import type { AppView, AssessmentDecision, AssessmentProject } from '../types';

export interface AssessmentState {
  view: AppView;
  project?: AssessmentProject;
  currentIndex: number;
  decisions: Record<string, AssessmentDecision>;
  error?: string;
}

export type AssessmentAction =
  | { type: 'load_project'; project: AssessmentProject }
  | { type: 'set_error'; error: string }
  | { type: 'select_element'; elementId: string }
  | { type: 'save_decision'; decision: AssessmentDecision }
  | { type: 'next_step' }
  | { type: 'previous_step' }
  | { type: 'show_report' }
  | { type: 'back_to_assessment' };

export const initialAssessmentState: AssessmentState = {
  view: 'import',
  currentIndex: 0,
  decisions: {},
};

export function assessmentReducer(state: AssessmentState, action: AssessmentAction): AssessmentState {
  switch (action.type) {
    case 'load_project':
      return {
        view: 'assessment',
        project: action.project,
        currentIndex: 0,
        decisions: {},
      };
    case 'set_error':
      return {
        ...state,
        error: action.error,
      };
    case 'select_element': {
      const index = state.project?.elements.findIndex((element) => element.id === action.elementId) ?? -1;
      return index >= 0 ? { ...state, currentIndex: index } : state;
    }
    case 'save_decision':
      return {
        ...state,
        decisions: {
          ...state.decisions,
          [action.decision.elementId]: action.decision,
        },
      };
    case 'next_step':
      return {
        ...state,
        currentIndex: Math.min(state.currentIndex + 1, Math.max((state.project?.elements.length ?? 1) - 1, 0)),
      };
    case 'previous_step':
      return {
        ...state,
        currentIndex: Math.max(state.currentIndex - 1, 0),
      };
    case 'show_report':
      return { ...state, view: 'report' };
    case 'back_to_assessment':
      return { ...state, view: 'assessment' };
  }
}
