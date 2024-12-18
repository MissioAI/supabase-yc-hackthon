import { Page } from 'puppeteer'

export async function installStepOverlay(page: Page) {
  await page.evaluateOnNewDocument(`
    let hideTimeout
    
    window.addEventListener('DOMContentLoaded', () => {
      // Create overlay container
      const stepOverlay = document.createElement('div')
      stepOverlay.id = 'step-overlay'
      
      const styleElement = document.createElement('style')
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
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        #step-overlay.active {
          opacity: 1;
        }

        #step-overlay .step-type {
          color: #00ff95;
          font-weight: bold;
          margin-bottom: 8px;
          text-transform: uppercase;
          font-size: 10px;
        }

        #step-overlay .message {
          color: #ffffff;
          margin-bottom: 8px;
          word-wrap: break-word;
          line-height: 1.4;
        }

        #step-overlay .coordinates {
          color: #ffcc00;
          font-family: monospace;
          font-size: 11px;
          opacity: 0.8;
        }

        #step-overlay .screenshot-flash {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: white;
          opacity: 0;
          pointer-events: none;
          z-index: 9999;
        }

        #step-overlay .confetti {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 9999;
        }

        #step-overlay .confetti-piece {
          position: absolute;
          width: 10px;
          height: 10px;
          background: #ffd300;
          top: 0;
          opacity: 0;
          animation: confetti-fall 3s ease-in-out infinite;
        }

        #step-overlay .confetti-piece:nth-child(2n) {
          background: #00ff95;
        }

        #step-overlay .confetti-piece:nth-child(3n) {
          background: #ff1461;
        }

        #step-overlay .confetti-piece:nth-child(4n) {
          background: #00e4ff;
        }

        @keyframes confetti-fall {
          0% {
            opacity: 1;
            top: -10%;
            transform: translateX(0) rotateZ(0deg);
          }
          100% {
            opacity: 0;
            top: 100%;
            transform: translateX(100px) rotateZ(360deg);
          }
        }

        #step-overlay.success-message {
          background: rgba(0, 255, 149, 0.95);
          color: #000;
          transform: scale(1.1);
          transition: all 0.3s ease-out;
        }
      \`
      
      document.head.appendChild(styleElement)
      document.body.appendChild(stepOverlay)

      // Add auto-hide functionality
      window.updateOverlay = (data) => {
        const overlay = document.getElementById('step-overlay')
        if (!overlay) return
        
        clearTimeout(hideTimeout)
        
        overlay.innerHTML = ''
        
        if (data.stepType) {
          const stepType = document.createElement('div')
          stepType.className = 'step-type'
          stepType.textContent = \`Step: \${data.stepType}\`
          overlay.appendChild(stepType)
        }

        if (data.message) {
          const message = document.createElement('div')
          message.className = 'message'
          message.textContent = data.message
          overlay.appendChild(message)
        }

        if (data.coordinates) {
          const coords = document.createElement('div')
          coords.className = 'coordinates'
          coords.textContent = \`Coordinates: [\${data.coordinates.join(', ')}]\`
          overlay.appendChild(coords)
        }

        overlay.classList.add('active')
        
        // Auto-hide after 3 seconds
        hideTimeout = setTimeout(() => {
          overlay.classList.remove('active')
        }, 3000)
      }
    })
  `)
} 