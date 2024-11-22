import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { promises as fs } from 'fs';
import { resolve } from 'path';

// Store last known mouse position
let lastMousePosition = { x: 0, y: 0 };

export default defineLazyEventHandler(async () => {
  const config = useRuntimeConfig();
  if (!config.anthropicApiKey) throw new Error('Missing Anthropic API key');

  const anthropic = createAnthropic({
    apiKey: config.anthropicApiKey,
  });

  // Create computer tool
  const computerTool = anthropic.tools.computer_20241022({
    displayWidthPx: 1280,
    displayHeightPx: 800,
    execute: async ({ action, coordinate, text }) => {
      switch (action) {
        case 'screenshot': {
          const response = await $fetch('/api/computer-control', {
            method: 'POST',
            body: {
              action: 'screenshot'
            }
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
          // Store coordinates before moving
          lastMousePosition = { x: coordinate[0], y: coordinate[1] };
          await $fetch('/api/computer-control', {
            method: 'POST',
            body: {
              action: 'move',
              coordinates: lastMousePosition
            }
          });
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

  return defineEventHandler(async (event) => {
    const { messages } = await readBody(event);
    const { text } = await generateText({
      model: anthropic('claude-3-5-sonnet-20241022'),
      messages,
      tools: { computer: computerTool },
      maxSteps: 10,
    });
    return { response: text };
  });
});