import { AutoProcessor, RawImage, CLIPVisionModelWithProjection } from '@xenova/transformers';
import * as ort from 'onnxruntime-node';
import type { H3Event } from 'h3';
import { resolve } from 'path';

// Initialize model components
let processor: any = null;
let visionModel: any = null;

async function initializeModel() {
  if (!processor || !visionModel) {
    try {
      const modelId = 'Xenova/clip-vit-base-patch16';
      processor = await AutoProcessor.from_pretrained(modelId);
      visionModel = await CLIPVisionModelWithProjection.from_pretrained(modelId, {
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
    await initializeModel();

    const imagePath = resolve(process.cwd(), 'public/full-display.png');
    const image = await RawImage.read(imagePath);
    
    // Process image and get embeddings
    const imageInputs = await processor(image);
    const { image_embeds } = await visionModel(imageInputs);
    const embeddings = image_embeds.tolist()[0];
    
    // Normalize the embeddings
    const normalizedEmbedding = normalize(embeddings);

    return {
      embeddings: normalizedEmbedding,
      dimensions: normalizedEmbedding.length
    };
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw createError({
      statusCode: 500,
      message: 'Failed to generate embeddings'
    });
  }
});

// Helper function to normalize embeddings
function normalize(embedding: number[]) {
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / magnitude);
}

// loadImage function can be removed since we're using direct file path