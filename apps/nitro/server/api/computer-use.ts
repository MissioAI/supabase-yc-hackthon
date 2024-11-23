import { Laminar } from '@lmnr-ai/lmnr';
import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Store last known mouse position

let lastMousePosition = { x: 0, y: 0 };
const config = useRuntimeConfig();

// Initialize Laminar client
Laminar.initialize({
  projectApiKey: config.laminarApiKey
});

export default defineLazyEventHandler(async () => {
  if (!config.anthropicApiKey) throw new Error('Missing Anthropic API key');
  if (!config.supabaseUrl) throw new Error('Missing Supabase URL');
  if (!config.supabaseAnonKey) throw new Error('Missing Supabase key');

  // Initialize Supabase client
  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);

  const anthropic = createAnthropic({
    apiKey: config.anthropicApiKey,
  });

  const scaleFactor = 0.5 // Adjust this value to control reduction (0.5 = 50% of original size)

  // Create computer tool
  const computerTool = anthropic.tools.computer_20241022({
    displayWidthPx: Math.round(1280 / scaleFactor),
    displayHeightPx: Math.round(800 / scaleFactor),
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

          const startPos = { ...lastMousePosition };
          const targetPos = { x: coordinate[0], y: coordinate[1] };

          // Move in small steps
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

  return defineEventHandler(async (event) => {
    try {
      const { messages, chatId } = await readBody(event);

      // Create chat if chatId is not provided
      let actualChatId = chatId;
      if (!actualChatId) {
        const { data: chat, error: chatError } = await supabase
          .from('chats')
          .insert({
            id: randomUUID(),
            name: 'Computer Control Session'
          })
          .select()
          .single();
          

        if (chatError) throw createError({
          statusCode: 500,
          message: 'Failed to create chat'
        });

        actualChatId = chat.id;
      }

      // Save user message
      const userMessageId = randomUUID();
      await supabase.from('messages').insert({
        id: userMessageId,
        chat_id: actualChatId,
        role: 'user',
        content: JSON.stringify(messages[messages.length - 1].content)
      });

      // Generate response with step tracking
      const response = await generateText({
        model: anthropic('claude-3-5-sonnet-20241022'),
        experimental_telemetry: { isEnabled: true },
        system: 'The browser is your tool; it will always be open when you initialize at the Google homepage (Firefox is already running). Deliberate on your agentic flow using principles from stit theory, but within your policy bounds. Immediately describe all actions necessary to complete the the task end-to-end.',
        messages,
        tools: { computer: computerTool },
        maxSteps: 40,
        onStepFinish: async (step) => {
          try {
            console.log('\n🤖 ===== AI STEP DETAILS ===== 🤖');
            console.log(`📍 Step Type: ${step.stepType}`);
            
            const { error: messageError } = await supabase.from('messages').insert({
              id: randomUUID(),
              chat_id: actualChatId,
              role: step.toolResults?.length ? 'tool' : 'assistant',
              content: step.text ?? null,
              tool_invocations: (!step.toolResults?.length ? null : step.toolResults) ?? step.toolCalls ?? null
            });
            
            if (messageError) {
              console.error('❌ Failed to save message:', messageError);
            }
  
            // Log details
            if (step.text) {
              console.log('💬 Assistant Message:', step.text);
            }
            if (step.toolCalls?.length) {
              console.log('🛠️  Tool Calls:', JSON.stringify(step.toolCalls, null, 2));
            }
            if (step.toolResults?.length) {
              console.log('🎯 Tool Results:', JSON.stringify(step.toolResults, null, 2));
            }
          } catch (error) {
            console.error('⚠️  Error in onStepFinish:', error);
          }
        }
      });


      return {
        response: response.text,
        chatId: actualChatId
      };
    } catch (error) {
      // Ensure Laminar attempts shutdown even on error
      try {
        await Laminar.shutdown();
      } catch (shutdownError) {
        console.warn('Laminar shutdown error during error handling:', shutdownError);
      }
      throw error;
    }
  });
});