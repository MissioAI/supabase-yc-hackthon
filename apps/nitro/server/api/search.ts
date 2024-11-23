import type { H3Event } from 'h3';

export default defineEventHandler(async (event: H3Event) => {
  console.log('🔍 Starting search with query:', getQuery(event));
  try {
    const query = getQuery(event);
    const { text, threshold = 0.1, limit = 25 } = query;

    if (!text) {
      throw createError({
        statusCode: 400,
        message: 'Text parameter is required'
      });
    }

    // Validate threshold
    const matchThreshold = Number(threshold);
    if (isNaN(matchThreshold) || matchThreshold < 0 || matchThreshold > 1) {
      throw createError({
        statusCode: 400,
        message: 'Threshold must be a number between 0 and 1'
      });
    }

    // Validate limit
    const matchCount = Number(limit);
    if (isNaN(matchCount) || !Number.isInteger(matchCount) || matchCount < 0 || matchCount > 1000) {
      throw createError({
        statusCode: 400,
        message: 'Limit must be an integer between 0 and 1000'
      });
    }

    console.log('📊 Validated parameters:', { text, matchThreshold, matchCount });

    // Get text embeddings from our text-embeddings endpoint
    console.log('🔤 Fetching text embeddings...');
    const textEmbeddingsResponse = await $fetch('/api/text-embeddings', {
      method: 'POST',
      body: { text }
    });
    console.log('✅ Received embeddings response:', textEmbeddingsResponse);

    // TODO: Implement your search logic here
    console.log('⚠️ Search implementation pending');

    const response = {
      results: [], // Replace with actual search results
      query: text,
      threshold: matchThreshold,
      limit: matchCount
    };
    console.log('📤 Returning response:', response);
    return response;
  } catch (error) {
    console.error('❌ Error in search:', error);
    throw createError({
      statusCode: 500,
      message: 'Search failed'
    });
  }
}); 