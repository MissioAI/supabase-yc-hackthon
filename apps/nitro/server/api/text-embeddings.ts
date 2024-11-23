import { AutoTokenizer, CLIPTextModelWithProjection } from '@xenova/transformers';
import type { H3Event } from 'h3';

// Initialize model components
let tokenizer: any = null;
let textModel: any = null;

async function initializeModel() {
  if (!tokenizer || !textModel) {
    try {
      const modelId = 'Xenova/clip-vit-base-patch16';
      tokenizer = await AutoTokenizer.from_pretrained(modelId);
      textModel = await CLIPTextModelWithProjection.from_pretrained(modelId, {
        quantized: false,
      });
    } catch (error) {
      console.error('Failed to initialize model:', error);
      throw new Error('Model initialization failed');
    }
  }
}

export default defineEventHandler(async (event: H3Event) => {
  try {
    const body = await readBody(event);
    const { text } = body;

    if (!text) {
      throw createError({
        statusCode: 400,
        message: 'Text parameter is required'
      });
      
    }

    await initializeModel();
    
    // Process text and get embeddings
    const textInputs = await tokenizer(text, { padding: true, truncation: true });
    const { text_embeds } = await textModel(textInputs);
    const embeddings = text_embeds.tolist()[0];
    
    // Normalize the embeddings
    const normalizedEmbedding = normalize(embeddings);
    
    // Add console log for embedding dimensions
    console.log('Embedding dimensions:', normalizedEmbedding.length);

    return {
      embeddings: normalizedEmbedding,
      dimensions: normalizedEmbedding.length
    };
  } catch (error) {
    console.error('Error generating text embeddings:', error);
    throw createError({
      statusCode: 500,
      message: 'Failed to generate text embeddings'
    });
  }
});

// Helper function to normalize embeddings
function normalize(embedding: number[]) {
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / magnitude);
} 