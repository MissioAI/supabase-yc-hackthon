import type { SupabaseClient } from '@supabase/supabase-js';
import type { CoreMessage, StepResult as AIStepResult } from 'ai';
import type { LanguageModelV1 } from 'ai';

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | Array<{ type: string; text: string; }>;
  tool_invocations?: any[];
}

export interface PipelineContext {
  chatId: string;
  messages: Message[];
  supabase: SupabaseClient;
  tools?: Record<string, any>;
  lastMousePosition?: { x: number; y: number };
  model: LanguageModelV1;
  systemPrompt?: string;
}

export interface PipelineStep {
  name: string;
  execute: (context: PipelineContext) => Promise<PipelineContext>;
  onError?: (error: Error, context: PipelineContext) => Promise<void>;
}

// Use the SDK's step result type with proper generic parameter
export type StepResult = AIStepResult<Record<string, any>>; 