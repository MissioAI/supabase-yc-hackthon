export default eventHandler((event) => {
  return {
    message: "Welcome to the API server!",
    status: "online",
    documentation: "Visit /api/docs for available endpoints",
    timestamp: new Date().toISOString()
  };
});
