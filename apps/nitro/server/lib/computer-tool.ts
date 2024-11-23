import { createAnthropic } from '@ai-sdk/anthropic';

export function createComputerTool(anthropic: ReturnType<typeof createAnthropic>, lastMousePosition: { x: number, y: number }) {
  const scaleFactor = 0.5;

  return anthropic.tools.computer_20241022({
    displayWidthPx: Math.round(1280 / scaleFactor),
    displayHeightPx: Math.round(800 / scaleFactor),
    execute: async ({ action, coordinate, text }) => {
      switch (action) {
        case 'screenshot': {
          const response = await $fetch('/api/computer-control', {
            method: 'POST',
            body: { action: 'screenshot' }
          });

          if ('type' in response && response.type === 'image') {
            return {
              type: 'image',
              data: response.data
            };
          }
          throw new Error('Failed to get screenshot');
        }
        case 'mouse_move': {
          if (!coordinate) {
            throw new Error('Coordinates required for mouse move');
          }

          const startPos = { ...lastMousePosition };
          const targetPos = { x: coordinate[0], y: coordinate[1] };

          const steps = 20; // Adjust for speed
          for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            const currentX = startPos.x + (targetPos.x - startPos.x) * progress;
            const currentY = startPos.y + (targetPos.y - startPos.y) * progress;

            await $fetch('/api/computer-control', {
              method: 'POST',
              body: {
                action: 'move',
                coordinates: { x: currentX, y: currentY }
              }
            });
            await new Promise(resolve => setTimeout(resolve, 10)); // Small delay between steps
          }

          lastMousePosition = { x: coordinate[0], y: coordinate[1] };
          return `moved cursor to (${coordinate[0]}, ${coordinate[1]})`;
        }
        case 'left_click': {
          await $fetch('/api/computer-control', {
            method: 'POST',
            body: {
              action: 'click',
              coordinates: lastMousePosition
            }
          });
          return `clicked at coordinates (${lastMousePosition.x}, ${lastMousePosition.y})`;
        }
        case 'type': {
          if (!text) {
            throw new Error('Text required for type action');
          }
          await $fetch('/api/computer-control', {
            method: 'POST',
            body: {
              action: 'type',
              text
            }
          });
          return `typed text: ${text}`;
        }
        case 'key':
          if (!text) {
            throw new Error('Key sequence required for key action')
          }
          await $fetch('/api/computer-control', {
            method: 'POST',
            body: {
              action: 'key',
              text
            }
          })
          return `pressed key: ${text}`

        case 'cursor_position':
          return `cursor position: (${lastMousePosition.x}, ${lastMousePosition.y})`

        case 'left_click_drag':
          if (!coordinate) {
            throw new Error('Coordinates required for drag action')
          }
          await $fetch('/api/computer-control', {
            method: 'POST',
            body: {
              action: 'left_click_drag',
              coordinates: { x: coordinate[0], y: coordinate[1] }
            }
          })
          return `dragged to (${coordinate[0]}, ${coordinate[1]})`

        case 'right_click':
          await $fetch('/api/computer-control', {
            method: 'POST',
            body: {
              action: 'right_click',
              coordinates: lastMousePosition
            }
          })
          return `right clicked at (${lastMousePosition.x}, ${lastMousePosition.y})`

        case 'middle_click':
          await $fetch('/api/computer-control', {
            method: 'POST',
            body: {
              action: 'middle_click',
              coordinates: lastMousePosition
            }
          })
          return `middle clicked at (${lastMousePosition.x}, ${lastMousePosition.y})`

        case 'double_click':
          await $fetch('/api/computer-control', {
            method: 'POST',
            body: {
              action: 'double_click',
              coordinates: lastMousePosition
            }
          })
          return `double clicked at (${lastMousePosition.x}, ${lastMousePosition.y})`

        default: {
          throw new Error(`Unsupported action: ${action}`);
        }
      }
    },
    experimental_toToolResultContent(result) {
      return typeof result === 'string'
        ? [{ type: 'text', text: result }]
        : [{ type: 'image', data: result.data, mimeType: 'image/png' }];
    },
  });
}

