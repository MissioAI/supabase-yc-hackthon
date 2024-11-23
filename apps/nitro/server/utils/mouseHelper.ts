import { Page } from 'puppeteer'

export async function installMouseHelper(page: Page) {
  await page.evaluateOnNewDocument(() => {
    // Install mouse helper only for top-level frame.
    if (window !== window.parent)
      return;
    window.addEventListener('DOMContentLoaded', () => {
      const box = document.createElement('puppeteer-mouse-pointer');
      const styleElement = document.createElement('style');
      styleElement.innerHTML = `
        @keyframes rainbow-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes rainbow-pulse {
          0% { transform: scale(0.98); opacity: 0.5; }
          50% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(0.98); opacity: 0.5; }
        }

        @keyframes click-expand {
          0% { transform: scale(1); filter: brightness(1) blur(15px); }
          10% { transform: scale(1.3); filter: brightness(0.7) blur(15px); }
          90% { transform: scale(1.3); filter: brightness(0.7) blur(15px); }
          100% { transform: scale(1); filter: brightness(1) blur(15px); }
        }

        puppeteer-mouse-pointer {
          pointer-events: none;
          position: absolute;
          top: 75px;
          z-index: 10000;
          left: 75px;
          width: 40px;
          height: 40px;
          margin: -20px 0 0 -20px;
          padding: 0;
        }

        puppeteer-mouse-pointer::before {
          content: '';
          position: absolute;
          width: 52px;
          height: 52px;
          top: -6px;
          left: -6px;
          background: linear-gradient(
            45deg,
            #3b82f6,
            #6366f1,
            #8b5cf6,
            #d946ef,
            #ec4899
          );
          -webkit-mask-image: url("data:image/svg+xml,%3Csvg width='109' height='113' viewBox='0 0 109 113' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z' fill='black'/%3E%3Cpath d='M45.317 2.07103C48.1765 -1.53037 53.9745 0.442937 54.0434 5.041L54.4849 72.2922H9.83113C1.64038 72.2922 -2.92775 62.8321 2.1655 56.4175L45.317 2.07103Z' fill='black'/%3E%3C/svg%3E");
          mask-image: url("data:image/svg+xml,%3Csvg width='109' height='113' viewBox='0 0 109 113' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z' fill='black'/%3E%3Cpath d='M45.317 2.07103C48.1765 -1.53037 53.9745 0.442937 54.0434 5.041L54.4849 72.2922H9.83113C1.64038 72.2922 -2.92775 62.8321 2.1655 56.4175L45.317 2.07103Z' fill='black'/%3E%3C/svg%3E");
          -webkit-mask-size: contain;
          mask-size: contain;
          -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
          animation: rainbow-spin 3s linear infinite,
                     rainbow-pulse 2s ease-in-out infinite;
          filter: blur(15px);
          z-index: -1;
          opacity: 0.75;
          border-radius: 50%;
        }

        puppeteer-mouse-pointer::after {
          content: '';
          position: absolute;
          width: 40px;
          height: 40px;
          background-image: url("data:image/svg+xml,%3Csvg width='109' height='113' viewBox='0 0 109 113' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z' fill='url(%23paint0_linear)'/%3E%3Cpath d='M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z' fill='url(%23paint1_linear)' fill-opacity='0.2'/%3E%3Cpath d='M45.317 2.07103C48.1765 -1.53037 53.9745 0.442937 54.0434 5.041L54.4849 72.2922H9.83113C1.64038 72.2922 -2.92775 62.8321 2.1655 56.4175L45.317 2.07103Z' fill='%233ECF8E'/%3E%3Cdefs%3E%3ClinearGradient id='paint0_linear' x1='53.9738' y1='54.974' x2='94.1635' y2='71.8295' gradientUnits='userSpaceOnUse'%3E%3Cstop stop-color='%23249361'/%3E%3Cstop offset='1' stop-color='%233ECF8E'/%3E%3C/linearGradient%3E%3ClinearGradient id='paint1_linear' x1='36.1558' y1='30.578' x2='54.4844' y2='65.0806' gradientUnits='userSpaceOnUse'%3E%3Cstop/%3E%3Cstop offset='1' stop-opacity='0'/%3E%3C/linearGradient%3E%3C/defs%3E%3C/svg%3E");
          background-size: contain;
          background-repeat: no-repeat;
          z-index: 1;
        }

        puppeteer-mouse-pointer.button-1::before {
          animation: click-expand 1s ease-out;
        }

        puppeteer-mouse-pointer.button-1::after {
          transform: scale(0.95);
        }
      `;
      document.head.appendChild(styleElement);
      document.body.appendChild(box);

      let clickTimeout: number;

      document.addEventListener('mousedown', () => {
        box.classList.add('button-1');
        // Remove the class after animation completes
        clearTimeout(clickTimeout);
        clickTimeout = window.setTimeout(() => {
          box.classList.remove('button-1');
        }, 1000); // Match animation duration
      }, true);

      // Remove the original mouseup listener and replace with this
      document.addEventListener('mousemove', event => {
        box.style.left = event.pageX + 'px';
        box.style.top = event.pageY + 'px';
      }, true);
    }, false);
  });
} 