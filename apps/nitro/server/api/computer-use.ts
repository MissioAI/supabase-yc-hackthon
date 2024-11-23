import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Store last known mouse position
let lastMousePosition = { x: 0, y: 0 };

export default defineLazyEventHandler(async () => {
  const config = useRuntimeConfig();
  if (!config.anthropicApiKey) throw new Error('Missing Anthropic API key');
  if (!config.supabaseUrl) throw new Error('Missing Supabase URL');
  if (!config.supabaseKey) throw new Error('Missing Supabase key');

  // Initialize Supabase client
  const supabase = createClient(config.supabaseUrl, config.supabaseKey);

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
      messages,
      tools: { computer: computerTool },
      maxSteps: 10,
      onStepFinish: async (step) => {
        try {
          // Save assistant message for this step
          if (step.stepType === 'initial' || step.stepType === 'continue') {
            const { error: assistantError } = await supabase.from('messages').insert({
              id: randomUUID(),
              chat_id: actualChatId,
              role: 'assistant',
              content: step.text,
              tool_invocations: step.toolCalls?.length ? step.toolCalls : null
            });
            
            if (assistantError) {
              console.error('Failed to save assistant message:', assistantError);
            }
          }

          // Save tool results if any
          if (step.toolResults?.length) {
            const { error: toolError } = await supabase.from('messages').insert({
              id: randomUUID(),
              chat_id: actualChatId,
              role: 'tool',
              tool_invocations: step.toolResults,
              content: null
            });

            if (toolError) {
              console.error('Failed to save tool results:', toolError);
            }
          }
        } catch (error) {
          console.error('Error in onStepFinish:', error);
        }
      }
    });

    // Save the final response based on its type
    const { error: finalResponseError } = await supabase.from('messages').insert({
      id: randomUUID(),
      chat_id: actualChatId,
      role: response.toolResults?.length ? 'tool' : 'assistant',
      content: response.toolResults?.length ? null : response.text,
      tool_invocations: response.toolResults?.length ? response.toolResults : null
    });

    if (finalResponseError) {
      console.error('Failed to save final response:', finalResponseError);
    }

    return { 
      response: response.text,
      chatId: actualChatId 
    };
  });
});