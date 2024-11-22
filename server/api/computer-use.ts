import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { promises as fs } from 'fs';
import { resolve } from 'path';

export default defineLazyEventHandler(async () => {
  const config = useRuntimeConfig();
  if (!config.anthropicApiKey) throw new Error('Missing Anthropic API key');

  const anthropic = createAnthropic({
    apiKey: config.anthropicApiKey,
  });

  // Create computer tool
  const computerTool = anthropic.tools.computer_20241022({
    displayWidthPx: 2560,
    displayHeightPx: 1600,
    execute: async ({ action, coordinate, text }) => {
      switch (action) {
        case 'screenshot': {
          try {
            // Get the path to the public directory
            const publicPath = resolve('./public');
            const imagePath = resolve(publicPath, 'full-display.png');

            // Check if file exists
            try {
              await fs.access(imagePath);
            } catch {
              throw new Error('Screenshot file not found in public directory');
            }

            // Read the file
            const imageBuffer = await fs.readFile(imagePath);
            const base64Data = imageBuffer.toString('base64');
            
            return {
              type: 'image',
              data: base64Data
            };
          } catch (error) {
            console.error('Error reading screenshot:', error);
            throw new Error('Failed to process screenshot');
          }
        }
        default: {
          console.log('Action:', action);
          console.log('Coordinate:', coordinate);
          console.log('Text:', text);
          return `executed ${action}`;
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
      maxSteps: 3,
    });
    return { response: text };
  });
});