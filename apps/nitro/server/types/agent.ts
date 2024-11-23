// Basic action types
export type AtomicAction = 
  | 'mouse_move'
  | 'left_click' 
  | 'type'
  | 'scroll'
  | 'hover'
  | 'press';

export type CompositeAction = 
  | 'fillForm'
  | 'navigate'
  | 'search'
  | 'select';

// Browser and UI related types
export type BrowserState = {
  url: string;
  title: string;
  activeElement: ElementState | null;
  visibleElements: ElementState[];
  interactableElements: ElementState[];
  viewport: {
    width: number;
    height: number;
  };
};

export type ElementState = {
  type: string;
  isVisible: boolean;
  isInteractable: boolean;
  position: { x: number; y: number };
  dimensions?: { width: number; height: number };
  attributes: Record<string, string>;
  text?: string;
};

export type UIPattern = 
  | 'form'
  | 'navigation'
  | 'modal'
  | 'dropdown'
  | 'search'
  | 'list';

// Action and state management
export type ActionConstraint = {
  type: 'precondition' | 'postcondition' | 'invariant';
  condition: (state: BrowserState) => boolean;
  description: string;
};

export type StateTransition = {
  fromState: BrowserState;
  action: Action;
  toState: BrowserState;
  timestamp: number;
  success: boolean;
};

export type Action = {
  type: AtomicAction | CompositeAction;
  target: ElementState;
  parameters: {
    coordinates?: [number, number];
    text?: string;
    sequence?: Action[];
  };
  constraints?: ActionConstraint[];
};

// Goal and evaluation types
export type Goal = {
  type: 'navigate' | 'interact' | 'extract' | 'verify';
  target: string;
  success_criteria: (state: BrowserState) => boolean;
  constraints?: ActionConstraint[];
};

export type ActionEvaluation = {
  utility: number;
  epistemicValue: number;
  temporalEffects: PredictedEffect[];
  confidence: number;
};

export type PredictedEffect = {
  state: Partial<BrowserState>;
  probability: number;
  timeframe: 'immediate' | 'delayed';
};

// Epistemic types
export type EpistemicUpdate = {
  type: 'pattern_recognition' | 'action_effect' | 'state_update';
  content: any;
  confidence: number;
};

// Handler types
export interface StepHandler {
  handleStep: (step: any, chatId: string) => Promise<void>;
  executeAction: (action: Action) => Promise<ActionResult>;
}

// Utility types for the managers
export interface IActionSpaceManager {
  evaluateAction(action: Action, goal: Goal): Promise<ActionEvaluation>;
  getPossibleActions(state: BrowserState): Set<Action>;
  planActionSequence(goal: Goal): Promise<Action[]>;
  calculateUtility(action: Action, goal: Goal): number;
  evaluateKnowledgeGain(action: Action): number;
}

export interface IStateTracker {
  getCurrentState(): Promise<BrowserState>;
  updateState(action: Action, result: ActionResult): Promise<void>;
  predictActionEffects(action: Action): Promise<PredictedEffect[]>;
  updateEpistemicState(updates: EpistemicUpdate[]): void;
  updateTemporalHistory(action: Action, result: ActionResult): void;
}

export type ActionResult = {
  success: boolean;
  newState: BrowserState;
  epistemicGain: EpistemicUpdate[];
};

// Add these missing type definitions
export type ActionSpace = {
  atomic: Set<AtomicAction>;
  composite: Map<CompositeAction, AtomicAction[]>;
  constraints: ActionConstraint[];
};

export type StateSpace = {
  current: BrowserState;
  history: StateTransition[];
  possibleActions: Set<Action>;
  knownPatterns: UIPattern[];
}; 