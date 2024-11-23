import type { 
  IActionSpaceManager, 
  Action, 
  Goal, 
  ActionEvaluation,
  BrowserState,
  PredictedEffect,
  ActionSpace,
  StateSpace
} from '../types/agent';

export class ActionSpaceManager implements IActionSpaceManager {
  private lastKnownState: BrowserState;
  private platformCapabilities: Set<string>;
  private interactionPatterns: Map<string, number>; // pattern -> success_rate

  constructor() {
    this.platformCapabilities = new Set([
      'pointer_precision',    // Mouse movement capability
      'text_input',          // Keyboard input capability
      'viewport_scrolling',  // Ability to scroll content
      'click_actions'        // Various click interactions
    ]);

    this.interactionPatterns = new Map([
      ['direct_navigation', 0.9],   // Direct URL/link navigation
      ['form_interaction', 0.85],   // Form filling and submission
      ['content_scanning', 0.95],   // Reading/scanning content
      ['spatial_memory', 0.8]       // Remembering element locations
    ]);
  }

  async evaluateAction(action: Action, goal: Goal): Promise<ActionEvaluation> {
    // Simplified evaluation based on platform understanding
    const utility = this.evaluateActionFit(action);
    
    return {
      utility,
      epistemicValue: this.evaluatePatternMatch(action),
      temporalEffects: [{
        state: this.predictBasicOutcome(action),
        probability: this.getActionReliability(action),
        timeframe: 'immediate'
      }],
      confidence: this.calculateConfidence(action)
    };
  }

  private evaluateActionFit(action: Action): number {
    // Evaluate how well the action matches platform capabilities
    const actionType = this.mapActionToPlatformCapability(action.type);
    if (!this.platformCapabilities.has(actionType)) {
      return 0;
    }

    // Consider physical constraints (e.g., mouse movement distances)
    if (action.type === 'mouse_move') {
      return this.evaluateMovementEfficiency(action);
    }

    // Consider interaction pattern success rates
    const pattern = this.identifyInteractionPattern(action);
    return this.interactionPatterns.get(pattern) ?? 0.5;
  }

  private evaluatePatternMatch(action: Action): number {
    // Instead of tracking specific elements, track interaction success patterns
    const pattern = this.identifyInteractionPattern(action);
    const currentSuccess = this.interactionPatterns.get(pattern) ?? 0.5;
    
    // Adjust pattern success rate based on outcomes
    this.updatePatternSuccess(pattern, action);
    
    return currentSuccess;
  }

  private mapActionToPlatformCapability(actionType: string): string {
    switch (actionType) {
      case 'mouse_move':
        return 'pointer_precision';
      case 'type':
        return 'text_input';
      case 'left_click':
      case 'right_click':
      case 'double_click':
        return 'click_actions';
      default:
        return 'unknown';
    }
  }

  private identifyInteractionPattern(action: Action): string {
    if (action.type === 'type') return 'form_interaction';
    if (action.type === 'mouse_move') return 'spatial_memory';
    if (action.target?.type === 'a') return 'direct_navigation';
    return 'content_scanning';
  }

  private getActionReliability(action: Action): number {
    // Base reliability on platform capabilities and past pattern success
    const capability = this.mapActionToPlatformCapability(action.type);
    const pattern = this.identifyInteractionPattern(action);
    
    return (
      (this.platformCapabilities.has(capability) ? 0.8 : 0.2) *
      (this.interactionPatterns.get(pattern) ?? 0.5)
    );
  }

  private predictBasicOutcome(action: Action): Partial<BrowserState> {
    // Simple, practical prediction based on action type
    switch (action.type) {
      case 'mouse_move':
      case 'left_click':
        return {
          activeElement: action.target,
          url: action.type === 'left_click' && action.target.type === 'a' 
            ? action.target.attributes.href 
            : this.lastKnownState.url
        };
      default:
        return this.lastKnownState;
    }
  }

  private calculateConfidence(action: Action): number {
    // Simple confidence based on platform capability and pattern success
    const capability = this.mapActionToPlatformCapability(action.type);
    const pattern = this.identifyInteractionPattern(action);
    
    return this.getActionReliability(action);
  }

  private evaluateMovementEfficiency(action: Action): number {
    if (!action.target?.position) {
      return 0;
    }

    // Simple distance-based efficiency (closer is better)
    const distance = Math.sqrt(
      Math.pow(action.target.position.x - (this.lastKnownState.activeElement?.position?.x ?? 0), 2) +
      Math.pow(action.target.position.y - (this.lastKnownState.activeElement?.position?.y ?? 0), 2)
    );

    // Normalize to 0-1 range (assuming max screen distance of 2000px)
    return Math.max(0, 1 - distance / 2000);
  }

  private updatePatternSuccess(pattern: string, action: Action): void {
    const currentRate = this.interactionPatterns.get(pattern) ?? 0.5;
    // Slight adjustment based on action reliability
    const adjustment = this.getActionReliability(action) > 0.7 ? 0.01 : -0.01;
    const newRate = Math.max(0.1, Math.min(0.99, currentRate + adjustment));
    
    this.interactionPatterns.set(pattern, newRate);
  }

  // Required by IActionSpaceManager interface
  getPossibleActions(state: BrowserState): Set<Action> {
    this.lastKnownState = state;
    const actions = new Set<Action>();

    // Add basic movement and click actions for interactable elements
    state.interactableElements?.forEach(element => {
      if (element.position) {
        actions.add({
          type: 'mouse_move',
          target: element,
          parameters: { coordinates: [element.position.x, element.position.y] }
        });

        actions.add({
          type: 'left_click',
          target: element,
          parameters: { coordinates: [element.position.x, element.position.y] }
        });
      }
    });

    return actions;
  }

  // Required by IActionSpaceManager interface
  calculateUtility(action: Action, goal: Goal): number {
    const actionFit = this.evaluateActionFit(action);
    const reliability = this.getActionReliability(action);
    
    return (actionFit * 0.6) + (reliability * 0.4);
  }

  // Required by IActionSpaceManager interface
  evaluateKnowledgeGain(action: Action): number {
    const pattern = this.identifyInteractionPattern(action);
    const currentSuccess = this.interactionPatterns.get(pattern) ?? 0.5;
    
    // Knowledge gain is higher for less-used patterns
    return 1 - currentSuccess;
  }

  // Required by IActionSpaceManager interface
  async planActionSequence(goal: Goal): Promise<Action[]> {
    const currentState = this.lastKnownState;
    const possibleActions = this.getPossibleActions(currentState);
    
    // Return the highest utility actions first
    return Array.from(possibleActions)
      .sort((a, b) => this.calculateUtility(b, goal) - this.calculateUtility(a, goal))
      .slice(0, 3); // Limit to top 3 actions
  }
} 