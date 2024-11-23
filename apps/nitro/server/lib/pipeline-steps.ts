import { generateText } from 'ai';
import { randomUUID } from 'crypto';
import type { PipelineStep } from './types';
import type { CoreMessage } from 'ai';

export const messageValidation: PipelineStep = {
  name: 'messageValidation',
  execute: async (context) => {
    const lastMessage = context.messages[context.messages.length - 1];
    if (!lastMessage?.content) {
      throw new Error('Invalid message format');
    }
    return context;
  }
};

export const chatInitialization: PipelineStep = {
  name: 'chatInitialization',
  execute: async (context) => {
    if (!context.chatId) {
      const { data: chat, error } = await context.supabase
        .from('chats')
        .insert({
          id: randomUUID(),
          name: 'Computer Control Session'
        })
        .select()
        .single();

      if (error) throw new Error('Failed to create chat');
      return { ...context, chatId: chat.id };
    }
    return context;
  }
};

export const messageGeneration: PipelineStep = {
  name: 'messageGeneration',
  execute: async (context) => {
    const { text } = await generateText({
      model: context.model,
      messages: context.messages.map(msg => ({
        role: msg.role === 'tool' ? 'assistant' : msg.role,
        content: msg.content
      })) as CoreMessage[],
      tools: context.tools,
      experimental_telemetry: { isEnabled: true }
    });
    
    await context.supabase.from('messages').insert({
      id: randomUUID(),
      chat_id: context.chatId,
      role: 'assistant',
      content: text
    });
    
    return { ...context, response: text };
  }
}; 