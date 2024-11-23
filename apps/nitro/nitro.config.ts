//https://nitro.unjs.io/config
export default defineNitroConfig({
  srcDir: "server",
  compatibilityDate: '2024-11-22',
  devServer: {
    watch: true,
    ignore: [
      'server/api/text-embeddings.ts',
      'server/api/screenshot-embeddings.ts',
      'node_modules/**',
      '.nitro/**'
    ]
  },
  runtimeConfig: {
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_KEY,
  }
});
