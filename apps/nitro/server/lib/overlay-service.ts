import { $fetch } from 'ofetch';
import { OverlayAction, OverlayMessage, OverlayRequest } from './types';

export class OverlayService {
  private readonly timeout = 5000; // 5 second timeout

  constructor(private browserId: string) {}

  private async sendOverlay(action: OverlayAction, message: OverlayMessage): Promise<void> {
    try {
      await Promise.race([
        $fetch('/api/computer-control', {
          method: 'POST',
          body: {
            action,
            overlayMessage: message,
            browserId: this.browserId
          } as OverlayRequest
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Overlay timeout')), this.timeout)
        )
      ]);
    } catch (error) {
      console.error('Failed to show overlay:', error);
      // Optionally rethrow or handle silently depending on requirements
    }
  }

  async showStep(stepType: string, text: string, coordinates?: number[]) {
    await this.sendOverlay('overlay', { stepType, text, coordinates });
  }

  async showSuccess(text = '✨ Task completed successfully!') {
    await this.sendOverlay('success', { 
      stepType: 'success',
      text,
      animate: true
    });
  }

  async showError(text = 'An error occurred') {
    await this.sendOverlay('error', { 
      stepType: 'error',
      text 
    });
  }
} 