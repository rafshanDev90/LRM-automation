import app from './app.js';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`🚀 Lab Report Engine Online`);
  console.log(`📡 Listening on: http://localhost:${PORT}`);
  console.log(`========================================`);
});

// Implement clean process teardowns to prevent zombie headless browser processes
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Shutting down gracefully...');
  server.close(() => {
    console.log('HTTP Server closed.');
    process.exit(0);
  });
});
