import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';


export default defineLazyEventHandler(async () => {
  const config = useRuntimeConfig();
  if (!config.openaiApiKey) throw new Error('Missing OpenAI API key');
  
  const openai = createOpenAI({
    apiKey: config.openaiApiKey,
  });

  return defineEventHandler(async (event) => {
    const { messages } = await readBody(event);

    const { text } = await generateText({
      model: openai('gpt-4o'),
      messages,
    });

    return { response: text };
  });
}); 