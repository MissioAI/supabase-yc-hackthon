import { generateText } from 'ai';
import type { CoreMessage } from 'ai';
import { randomUUID } from 'node:crypto';
import type { PipelineContext, StepResult } from './types';
import { StepHandler } from './step-handler';
import { messageValidation, chatInitialization, messageGeneration } from './pipeline-steps';

export class Pipeline {
  private stepHandler: StepHandler;
  private currentContext: PipelineContext;
  private steps = [
    messageValidation,
    chatInitialization,
    messageGeneration
  ];

  constructor(initialContext: PipelineContext) {
    this.currentContext = initialContext;
    this.stepHandler = new StepHandler(
      initialContext.supabase,
      () => this.currentContext // Getter function to always get latest context
    );
  }

  async execute() {
    // Run through all pipeline steps
    for (const step of this.steps) {
      try {
        this.currentContext = await step.execute(this.currentContext);
      } catch (error) {
        console.error(`Error in pipeline step ${step.name}:`, error);
        if (step.onError) {
          await step.onError(error, this.currentContext);
        }
        throw error;
      }
    }

    // Generate the final response
    const { text, toolResults } = await generateText({
      model: this.currentContext.model,
      messages: this.currentContext.messages.map(msg => ({
        role: msg.role === 'tool' ? 'assistant' : msg.role,
        content: msg.content
      })) as CoreMessage[],
      system: this.currentContext.systemPrompt,
      tools: this.currentContext.tools,
      experimental_telemetry: { isEnabled: true },
      maxSteps: 40,
      onStepFinish: (step) => this.stepHandler.handleStep(step)
    });

    await this.handleFinalResponse({ text, toolResults });

    return {
      response: text,
      chatId: this.currentContext.chatId
    };
  }

  private async handleFinalResponse({ text, toolResults }: { 
    text: string; 
    toolResults?: any[] 
  }) {
    console.log('\n✨ ===== FINAL RESPONSE ===== ✨');
    console.log('📝 Response Text:', text);
    
    const { error } = await this.currentContext.supabase.from('messages').insert({
      id: randomUUID(),
      chat_id: this.currentContext.chatId,
      role: toolResults?.length ? 'tool' : 'assistant',
      content: toolResults?.length ? null : text,
      tool_invocations: toolResults || null
    });

    if (error) {
      console.error('Failed to save final response:', error);
      throw error;
    }
  }
} 