//https://nitro.unjs.io/config
export default defineNitroConfig({
  srcDir: "server",
  compatibilityDate: '2024-11-22',
  runtimeConfig: {
    openaiApiKey: process.env.OPENAI_API_KEY
  }
});
