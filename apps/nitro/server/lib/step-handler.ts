import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PipelineContext, StepResult } from './types';

export class StepHandler {
  constructor(
    private supabase: SupabaseClient,
    private getContext: () => PipelineContext
  ) {}

  async handleStep(step: StepResult) {
    try {
      console.log('\n🤖 ===== AI STEP DETAILS ===== 🤖');
      console.log(`📍 Step Type: ${step.stepType}`);

      if (step.text) {
        
        console.log('💬 Assistant Message:', step.text);
      }

      if (step.toolCalls?.length) {
        console.log('🛠️  Tool Calls:', JSON.stringify(step.toolCalls, null, 2));
      }

      const context = this.getContext();
      
      // Save assistant message for this step
      if (step.stepType === 'initial' || step.stepType === 'continue') {
        const { error: assistantError } = await this.supabase.from('messages').insert({
          id: randomUUID(),
          chat_id: context.chatId,
          role: 'assistant',
          content: step.text,
          tool_invocations: step.toolCalls?.length ? step.toolCalls : null
        });

        if (assistantError) {
          console.error('❌ Failed to save assistant message:', assistantError);
        }
      }

      // Save tool results if any
      if (step.toolResults?.length) {
        console.log('🎯 Tool Results:', JSON.stringify(step.toolResults, null, 2));

        const { error: toolError } = await this.supabase.from('messages').insert({
          id: randomUUID(),
          chat_id: context.chatId,
          role: 'tool',
          tool_invocations: step.toolResults,
          content: null
        });

        if (toolError) {
          console.error('❌ Failed to save tool results:', toolError);
        }
      }
    } catch (error) {
      console.error('⚠️  Error in handleStep:', error);
      console.error('🔍 Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack
      });
    }
  }
} 