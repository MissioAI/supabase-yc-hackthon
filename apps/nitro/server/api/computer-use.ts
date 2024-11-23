import { Laminar } from '@lmnr-ai/lmnr';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createClient } from '@supabase/supabase-js';
import { Pipeline } from '../lib/pipeline';
import { createComputerTool } from '../lib/computer-tool';
import type { PipelineContext } from '../lib/types';

let lastMousePosition = { x: 0, y: 0 };
const config = useRuntimeConfig();

// Initialize Laminar client
Laminar.initialize({
  projectApiKey: config.laminarApiKey
});

export default defineLazyEventHandler(async () => {
  // Validate environment
  if (!config.anthropicApiKey) throw new Error('Missing Anthropic API key');
  if (!config.supabaseUrl) throw new Error('Missing Supabase URL');
  if (!config.supabaseAnonKey) throw new Error('Missing Supabase key');

  // Initialize clients
  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
  const anthropic = createAnthropic({ apiKey: config.anthropicApiKey });
  const computerTool = createComputerTool(anthropic, lastMousePosition);

  return defineEventHandler(async (event) => {
    try {
      const { messages, chatId } = await readBody(event);

      const context: PipelineContext = {
        chatId,
        messages,
        supabase,
        model: anthropic('claude-3-5-sonnet-20241022'),
        tools: { computer: computerTool },
        lastMousePosition,
        systemPrompt: 'The browser is your tool; it will always be open when you initialize at the Google homepage (Firefox is already running). Deliberate on your agentic flow using principles from stit theory, but within your policy bounds. Immediately describe all actions necessary to complete the the task end-to-end.'
      };

      // Execute pipeline with all steps
      const pipeline = new Pipeline(context);
      const result = await pipeline.execute();

      // Ensure Laminar shuts down properly
      await Laminar.shutdown();
      
      return result;

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