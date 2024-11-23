//https://nitro.unjs.io/config
export default defineNitroConfig({
  srcDir: "server",
  compatibilityDate: '2024-11-22',
  runtimeConfig: {
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    laminarApiKey: process.env.LAMINAR_API_KEY,
  },
  // Remove from moduleSideEffects and handle only in externals
  externals: {
    inline: [
      '@lmnr-ai/lmnr',
      // Explicitly include all required OpenTelemetry packages with their dependencies
      '@opentelemetry/api',
      '@opentelemetry/core',
      '@opentelemetry/semantic-conventions',
      '@opentelemetry/resources',
      '@opentelemetry/sdk-trace-base',
      '@opentelemetry/sdk-trace-node',
      '@opentelemetry/exporter-trace-otlp-grpc',
      '@opentelemetry/otlp-grpc-exporter-base',
      '@opentelemetry/otlp-exporter-base',
      // Include all GRPC-related packages
      '@grpc/grpc-js',
      '@grpc/proto-loader',
      'long',
      'lodash.merge',
      'lodash.camelcase'
    ]
  }
});
