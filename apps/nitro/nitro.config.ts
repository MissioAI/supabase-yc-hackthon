//https://nitro.unjs.io/config
export default defineNitroConfig({
  srcDir: "server",
  compatibilityDate: '2024-11-22',
  runtimeConfig: {
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_KEY,
    laminarApiKey: process.env.LAMINAR_API_KEY,
  },
  // Remove from moduleSideEffects and handle only in externals
  externals: {
    inline: [
      '@lmnr-ai/lmnr',
      // Group OpenTelemetry dependencies together
      '@opentelemetry/api',
      '@opentelemetry/exporter-trace-otlp-grpc',
      '@opentelemetry/sdk-trace-base',
      '@opentelemetry/sdk-trace-node',
      // Group GRPC dependencies together
      '@grpc/grpc-js',
      '@grpc/proto-loader'
    ]
  }
});
