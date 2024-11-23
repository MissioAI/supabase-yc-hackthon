import { Page } from 'puppeteer'

export async function installStepOverlay(page: Page) {
  await page.evaluateOnNewDocument(`
    window.addEventListener('DOMContentLoaded', () => {
      // Create overlay container
      const stepOverlay = document.createElement('div');
      stepOverlay.id = 'step-overlay';
      
      const styleElement = document.createElement('style');
      styleElement.innerHTML = \`
        #step-overlay {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 300px;
          background: rgba(0, 0, 0, 0.85);
          color: white;
          padding: 15px;
          border-radius: 8px;
          font-family: monospace;
          font-size: 12px;
          z-index: 10000;
          pointer-events: none;
          transition: opacity 0.3s;
          opacity: 0;
        }

        #step-overlay.active {
          opacity: 1;
        }

        #step-overlay .step-type {
          color: #00ff95;
          font-weight: bold;
          margin-bottom: 8px;
        }

        #step-overlay .message {
          color: #ffffff;
          margin-bottom: 8px;
          word-wrap: break-word;
        }

        #step-overlay .coordinates {
          color: #ffcc00;
          font-family: monospace;
        }
      \`;
      
      document.head.appendChild(styleElement);
      document.body.appendChild(stepOverlay);

      // Immediately show example data
      const exampleData = {
        stepType: "tool-result",
        message: "Now I'll click on the main Vercel link at the top of the search results",
        toolCalls: [{
          type: "tool-call",
          toolCallId: "toolu_01HpdBpiVKPEMGhLUaJJ2edW",
          toolName: "computer",
          args: {
            action: "mouse_move",
            coordinate: [192, 190]
          }
        }]
      };

      const overlay = document.getElementById('step-overlay');
      if (overlay) {
        // Clear previous content
        overlay.innerHTML = '';
        
        // Add step type
        const stepType = document.createElement('div');
        stepType.className = 'step-type';
        stepType.textContent = \`Step: \${exampleData.stepType}\`;
        overlay.appendChild(stepType);

        // Add message
        const message = document.createElement('div');
        message.className = 'message';
        message.textContent = exampleData.message;
        overlay.appendChild(message);

        // Add coordinates
        const coords = document.createElement('div');
        coords.className = 'coordinates';
        coords.textContent = \`Coordinates: [\${exampleData.toolCalls[0].args.coordinate.join(', ')}]\`;
        overlay.appendChild(coords);

        // Show overlay
        overlay.classList.add('active');
      }
    });
  `);
} 