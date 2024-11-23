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

const initialMessages = [
  {
    role: "system",
    content: `You control a web browser. For every action:

1. Take a screenshot
2. Describe what you see: "I see [element] at [coordinates]"
3. Take action based on what you see
4. Verify the result with another screenshot

For search:
1. Click search bar
2. Type the complete query
3. Click search or press Enter

Example:
"I see the search bar at (340, 120)
I'll click it and type 'amazon.com'
I see the search button at (420, 120)
I'll click it to search"`
  },
  {
    role: "assistant",
    content: `I understand. I'll analyze each transformation through STIT theory, ensuring reliable state changes.

For example:
"Intent Frame: Transform platform experience insight into memetic commentary
Pattern: Context gathering → Pattern matching → Novel combination
Approach: First gather Supabase pain points, match against established meme formats, then compose for resonance"`
  }
];

function generateStepReflection(intent: string, phase: string, success: boolean): string {
  const transformationPatterns = {
    discovery: {
      success: [
        "Information space effectively mapped - context boundaries emerging",
        "Pattern recognition activating - useful analogies surfacing",
        "Resource landscape revealing key opportunities"
      ],
      failure: [
        "Context boundaries might need expansion",
        "Consider alternate pattern spaces",
        "Information scent may need reorientation"
      ]
    },
    synthesis: {
      success: [
        "Pattern combination yielding novel insights",
        "Resource composition showing emergent potential",
        "Transform sequence revealing useful structure"
      ],
      failure: [
        "Pattern space might need enrichment",
        "Consider alternate composition vectors",
        "Synthesis chain needs stronger bridges"
      ]
    },
    crystallization: {
      success: [
        "State transformation pathway clarifying",
        "Output form taking effective shape",
        "Feedback loop reinforcing intent alignment"
      ],
      failure: [
        "Consider alternate crystallization forms",
        "State transform might need recalibration",
        "Output vector may need reorientation"
      ]
    }
  };

  const phasePatterns = transformationPatterns[phase as keyof typeof transformationPatterns];
  const reflections = success ? phasePatterns.success : phasePatterns.failure;
  
  return `Transform Reflection: ${reflections[Math.floor(Math.random() * reflections.length)]}

Focus: Maintain reliable path toward ${intent} through current phase: ${phase}`;
}

type StepResult<T = any> = {
  stepType: string;
  text?: string;
  toolCalls?: Array<{
    type: 'tool-call';
    toolCallId: string;
    toolName: 'computer';
    args: {
      action: 'key' | 'type' | 'mouse_move' | 'left_click' | 'left_click_drag' | 
              'right_click' | 'middle_click' | 'double_click' | 'screenshot' | 'cursor_position';
      text?: string;
      coordinate?: number[];
    };
  }>;
  toolResults?: Array<{
    type: 'tool-result';
    toolCallId: string;
    toolName: 'computer';
    args: {
      action: 'key' | 'type' | 'mouse_move' | 'left_click' | 'left_click_drag' | 
              'right_click' | 'middle_click' | 'double_click' | 'screenshot' | 'cursor_position';
      text?: string;
      coordinate?: number[];
    };
    result: string | { type: 'image'; data: string };
  }>;
};

type VisualState = {
  currentPage: string;
  lastScreenshot: string;
  currentView: {
    url?: string;
    scrollPosition?: number;
    visibleElements: {
      type: string;  // 'link', 'button', 'text', 'price', etc.
      content: string;
      location: string; // "top-right", "center", etc.
      coordinates?: [number, number];
    }[];
  };
  navigationHistory: {
    timestamp: string;
    action: string;
    result: string;
  }[];
  verifiedDetails: {
    prices?: string[];
    products?: string[];
    locations?: { [key: string]: [number, number] };
    lastVerified: string;
  };
};

let visualState: VisualState = {
  currentPage: '',
  lastScreenshot: '',
  currentView: {
    url: '',
    scrollPosition: 0,
    visibleElements: []
  },
  navigationHistory: [],
  verifiedDetails: {
    lastVerified: new Date().toISOString()
  }
};

const visualVerificationPrompt = `
Before each action:
1. Take a screenshot
2. Describe what you see using this format:
   "Visual State: I see [element] at [location], [element] in [location]..."
3. Reference specific coordinates when clicking
4. Verify your expectations match reality

After each action:
1. Take another screenshot
2. Confirm the expected changes occurred
3. Update your understanding of the page state
4. Plan next steps based on verified information

Example:
"Visual State: I see a search bar at (340, 120), Amazon logo in top-left, and shopping cart icon at (980, 60).
Action: I'll click the search bar at (340, 120) to enter our query.
Verification: After clicking, I see the cursor blinking in the search bar, ready for input."`;

const hasValidVisualCheck = (event: StepResult) => {
  // Check if screenshot was taken
  const hasScreenshot = event.toolCalls?.some(call => 
    call.args.action === 'screenshot'
  );
  
  // Check if visual state was described
  const hasVisualDescription = event.text?.includes('Visual State:');
  
  // Check if specific elements were referenced
  const hasSpecificReferences = event.text?.match(
    /I see .* at|in .*/g
  )?.length ?? 0;
  
  // Check if verification was performed
  const hasVerification = event.text?.includes('Verification:');
  
  return {
    complete: hasScreenshot && hasVisualDescription && hasSpecificReferences > 0 && hasVerification,
    score: [
      hasScreenshot,
      hasVisualDescription,
      hasSpecificReferences > 0,
      hasVerification
    ].filter(Boolean).length / 4
  };
};

function inferElementType(content: string): string {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('button') || lowerContent.includes('click')) return 'button';
  if (lowerContent.includes('link') || lowerContent.includes('href')) return 'link';
  if (lowerContent.match(/\$[\d,]+\.?\d*/)) return 'price';
  if (lowerContent.includes('input') || lowerContent.includes('search')) return 'input';
  if (lowerContent.includes('image') || lowerContent.includes('icon')) return 'image';
  if (lowerContent.includes('text') || lowerContent.includes('label')) return 'text';
  
  return 'unknown';
}

export default defineLazyEventHandler(async () => {
  if (!config.anthropicApiKey) throw new Error('Missing Anthropic API key');
  if (!config.supabaseUrl) throw new Error('Missing Supabase URL');
  if (!config.supabaseAnonKey) throw new Error('Missing Supabase key');

  // Initialize Supabase client
  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);

  const anthropic = createAnthropic({
    apiKey: config.anthropicApiKey,
  });

  const scaleFactor = Number(config.displayScaleFactor) ?? 1 // Default to 1 if not set

  // Track transformation state
  let currentIntent = '';
  let currentPhase = 'discovery';
  let phaseProgress = new Map<string, number>([
    ['discovery', 0],
    ['synthesis', 0],
    ['crystallization', 0]
  ]);
  let lastReflection = ''; // Add this to store the most recent reflection

  return defineEventHandler(async (event) => {
    try {
      const { messages: userMessages, chatId } = await readBody(event);
      
      // Combine initial STIT guidance with user messages
      const messages = [...initialMessages, ...userMessages];

      // Create chat if chatId is not provided
      let actualChatId = chatId;
      if (!actualChatId) {
        const browserId = randomUUID();
        const { data: chat, error: chatError } = await supabase
          .from('chats')
          .insert({
            id: browserId,
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

      // Create computer tool with the chat ID as browser ID
      const computerTool = anthropic.tools.computer_20241022({
        displayWidthPx: Math.round(1280 / scaleFactor),
        displayHeightPx: Math.round(800 / scaleFactor),
        execute: async ({ action, coordinate, text }) => {
          // Common overlay message data
          const overlayMessage = {
            stepType: 'tool-execution',
            message: '',
            coordinates: coordinate
          }

          switch (action) {
            case 'screenshot': {
              const response = await $fetch('/api/computer-control', {
                method: 'POST',
                body: {
                  action: 'screenshot',
                  browserId: actualChatId
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
                throw new Error('Coordinates required for mouse move')
              }

              overlayMessage.message = `Moving cursor to (${coordinate[0]}, ${coordinate[1]})`
              
              const startPos = { ...lastMousePosition }
              const targetPos = { x: coordinate[0], y: coordinate[1] }

              // Move in small steps
              const steps = 20
              for (let i = 0; i <= steps; i++) {
                const progress = i / steps
                const currentX = startPos.x + (targetPos.x - startPos.x) * progress
                const currentY = startPos.y + (targetPos.y - startPos.y) * progress

                await $fetch('/api/computer-control', {
                  method: 'POST',
                  body: {
                    action: 'move',
                    coordinates: { x: currentX, y: currentY },
                    browserId: actualChatId,
                    overlayMessage
                  }
                })
                await new Promise(resolve => setTimeout(resolve, 10))
              }

              lastMousePosition = { x: coordinate[0], y: coordinate[1] }
              return `moved cursor to (${coordinate[0]}, ${coordinate[1]})`
            }
            case 'left_click': {
              overlayMessage.message = `Clicking at (${lastMousePosition.x}, ${lastMousePosition.y})`
              await $fetch('/api/computer-control', {
                method: 'POST',
                body: {
                  action: 'click',
                  coordinates: lastMousePosition,
                  browserId: actualChatId,
                  overlayMessage
                }
              })
              return `clicked at coordinates (${lastMousePosition.x}, ${lastMousePosition.y})`
            }
            case 'type': {
              if (!text) {
                throw new Error('Text required for type action')
              }
              overlayMessage.message = `Typing: ${text}`
              await $fetch('/api/computer-control', {
                method: 'POST',
                body: {
                  action: 'type',
                  text,
                  browserId: actualChatId,
                  overlayMessage
                }
              })
              return `typed text: ${text}`
            }
            case 'key':
              if (!text) {
                throw new Error('Key sequence required for key action')
              }
              await $fetch('/api/computer-control', {
                method: 'POST',
                body: {
                  action: 'key',
                  text,
                  browserId: actualChatId
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
                  coordinates: { x: coordinate[0], y: coordinate[1] },
                  browserId: actualChatId
                }
              })
              return `dragged to (${coordinate[0]}, ${coordinate[1]})`

            case 'right_click':
              await $fetch('/api/computer-control', {
                method: 'POST',
                body: {
                  action: 'right_click',
                  coordinates: lastMousePosition,
                  browserId: actualChatId
                }
              })
              return `right clicked at (${lastMousePosition.x}, ${lastMousePosition.y})`

            case 'middle_click':
              await $fetch('/api/computer-control', {
                method: 'POST',
                body: {
                  action: 'middle_click',
                  coordinates: lastMousePosition,
                  browserId: actualChatId
                }
              })
              return `middle clicked at (${lastMousePosition.x}, ${lastMousePosition.y})`

            case 'double_click':
              await $fetch('/api/computer-control', {
                method: 'POST',
                body: {
                  action: 'double_click',
                  coordinates: lastMousePosition,
                  browserId: actualChatId
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

      // Generate response with step tracking
      const response = await generateText({
        model: anthropic('claude-3-5-sonnet-20241022'),
        messages: [
          {
            role: "system",
            content: `You control a web browser (Firefox is already open). You can only know what's on screen by:

1. Taking screenshots
2. Describing exactly what you see: "I see [element] at [coordinates]"
3. Using browser actions (click, type, scroll)
4. Verifying each action with a new screenshot

For search:
1. Click search bar
2. Type the complete query
3. Click search or press Enter

Example:
"I see the search bar at (340, 120)
I'll click it and type 'amazon.com'
I see the search button at (420, 120)
I'll click it to search"

Important: 
- You can only know what's on screen through screenshots
- Never assume or predict page content
- Take actions one at a time
- Wait for user guidance to proceed`
          },
          ...userMessages
        ],
        tools: { computer: computerTool },
        maxSteps: 40,
        onStepFinish: async (event) => {
          try {
            console.log('\n🤖 ===== AI STEP DETAILS ===== 🤖');
            
            // Parse intent and phase
            if (event.text) {
              const intentMatch = event.text.match(/Intent Frame: (.*?)\n/);
              if (intentMatch) {
                currentIntent = intentMatch[1];
              }
              
              const phaseMatch = event.text.match(/Pattern: (.*?)(?:→|$)/);
              if (phaseMatch) {
                const phaseText = phaseMatch[1].trim().toLowerCase();
                // Map various phase descriptions to our three core phases
                if (phaseText.includes('context') || phaseText.includes('discovery') || phaseText.includes('exploration')) {
                  currentPhase = 'discovery';
                } else if (phaseText.includes('pattern') || phaseText.includes('synthesis') || phaseText.includes('refinement')) {
                  currentPhase = 'synthesis';
                } else if (phaseText.includes('transform') || phaseText.includes('crystallization')) {
                  currentPhase = 'crystallization';
                }
              }
            }

            // Only count success if there were actual tool actions
            const toolActions = event.toolCalls?.length ?? 0;
            const toolResults = event.toolResults?.length ?? 0;
            const success = toolActions > 0 && toolResults > 0;

            // Update progress only if actual actions were taken
            if (currentPhase && success) {
              const currentProgress = phaseProgress.get(currentPhase) ?? 0;
              
              // Validate tool usage
              const hasSearchAction = event.toolCalls?.some(call => 
                call.args.text?.toLowerCase().includes('search') ||
                call.args.text?.toLowerCase().includes('type')
              );
              const hasNavigation = event.toolCalls?.some(call =>
                call.args.action === 'left_click' ||
                call.args.action === 'mouse_move'
              );
              const hasScreenshot = event.toolCalls?.some(call =>
                call.args.action === 'screenshot'
              );

              // Only increment progress if meaningful actions were taken
              if (hasSearchAction || hasNavigation || hasScreenshot) {
                phaseProgress.set(currentPhase, 
                  Math.min(1, currentProgress + 0.2)
                );
                console.log(`📈 Valid actions detected - Updated ${currentPhase} progress:`, 
                  phaseProgress.get(currentPhase)
                );
              } else {
                console.log('⚠️ No valid tool actions detected');
              }
            }

            // Generate reflection with action validation
            const reflection = generateStepReflection(
              currentIntent,
              currentPhase,
              success && toolActions > 0
            );

            // Enhanced logging
            console.log('🛠️ Tool Calls:', toolActions);
            console.log('🎯 Tool Results:', toolResults);
            console.log('✅ Valid Success:', success && toolActions > 0);

            // Add reflection as a user message
            messages.push({
              role: 'user',
              content: `Reflection on your progress:
${reflection}

Current Progress:
${Array.from(phaseProgress.entries())
  .map(([phase, progress]) => 
    `${phase}: [${'█'.repeat(Math.floor(progress * 10))}${'.'.repeat(10 - Math.floor(progress * 10))}] ${Math.round(progress * 100)}%`
  ).join('\n')}

Please continue with this feedback in mind.`
            });

            // Save to Supabase with enhanced context
            const { error: messageError } = await supabase.from('messages').insert({
              id: randomUUID(),
              chat_id: actualChatId,
              role: event.toolResults?.length ? 'tool' : 'assistant',
              content: event.text ?? null,
              tool_invocations: (!event.toolResults?.length ? null : event.toolResults) ?? event.toolCalls ?? null,
              metadata: {
                intent: currentIntent,
                phase: currentPhase,
                reflection,
                phaseProgress: Object.fromEntries(phaseProgress),
                success
              }
            });
            
            // Enhanced logging
            if (event.text) {
              console.log('💭 Intent:', currentIntent);
              console.log('📍 Phase:', currentPhase);
              console.log('💬 Assistant Message:', event.text);
              console.log('🤔 Reflection:', reflection);
            }
            if (event.toolCalls?.length) {
              console.log('🛠️  Tool Calls:', JSON.stringify(event.toolCalls, null, 2));
            }
            if (event.toolResults?.length) {
              console.log('🎯 Tool Results:', JSON.stringify(event.toolResults, null, 2));
            }
            console.log('📊 Phase Progress:', Object.fromEntries(phaseProgress));

            // Update visual state
            if (event.toolResults?.length) {
              const screenshot = event.toolResults.find(r => 
                r.type === 'tool-result' && 
                r.args.action === 'screenshot'
              );
              
              if (screenshot) {
                // Update visual state with rich context
                visualState.lastScreenshot = new Date().toISOString();
                visualState.currentView.visibleElements = [];
                
                // Parse visual elements from AI's description
                const elementMatches = event.text?.matchAll(
                  /I see (.*?) (?:at|in) (the )?([^,.]+)/g
                );
                
                for (const match of elementMatches ?? []) {
                  visualState.currentView.visibleElements.push({
                    type: inferElementType(match[1]),
                    content: match[1],
                    location: match[3]
                  });
                }

                // Track navigation
                visualState.navigationHistory.push({
                  timestamp: new Date().toISOString(),
                  action: 'screenshot',
                  result: `Verified ${visualState.currentView.visibleElements.length} elements`
                });

                // Extract and verify prices
                const priceMatches = event.text?.match(/\$[\d,]+\.?\d*/g);
                if (priceMatches) {
                  visualState.verifiedDetails.prices = priceMatches;
                  visualState.verifiedDetails.lastVerified = new Date().toISOString();
                }

                console.log('👁️ Visual State Updated:', {
                  elements: visualState.currentView.visibleElements,
                  navigation: visualState.navigationHistory.slice(-1)[0],
                  verified: visualState.verifiedDetails
                });
              }
            }

          } catch (error) {
            console.error('⚠️ Error in onStepFinish:', error);
          }
        }
      });

      // Calculate overall progress using only active phases
      const overallProgress = Array.from(phaseProgress.entries())
        .filter(([_, progress]) => progress > 0) // Only consider phases with progress
        .reduce((sum, [_, progress]) => sum + progress, 0) / 
        Math.max(1, Array.from(phaseProgress.values()).filter(p => p > 0).length); // Divide by number of active phases

      // Show success overlay when progress is good
      if (overallProgress > 0.8) {
        await $fetch('/api/computer-control', {
          method: 'POST',
          body: {
            action: 'success',
            text: `✨ Transformation achieved successfully!
Intent: ${currentIntent}
Key Phases: ${Array.from(phaseProgress.entries())
  .filter(([_, progress]) => progress > 0)
  .map(([phase]) => phase)
  .join(' → ')}`,
            browserId: actualChatId
          }
        });
      }

      return {
        response: response.text,
        chatId: actualChatId,
        transformationMetadata: {
          intent: currentIntent,
          phases: Object.fromEntries(phaseProgress),
          overallProgress
        }
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