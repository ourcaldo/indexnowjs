// Replit-compatible Next.js launcher with WebSocket support
import { spawn } from 'child_process';

const port = process.env.PORT || '8081';

console.log('🚀 Starting IndexNow Studio with WebSocket support...');

// Use the custom server with WebSocket support instead of default Next.js dev server
const serverProcess = spawn('npx', ['tsx', 'server/custom-server.ts'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: port },
  cwd: process.cwd()
});

serverProcess.on('error', (err) => {
  console.error('❌ Failed to start custom server:', err);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  console.log(`Custom server process exited with code ${code}`);
  process.exit(code || 0);
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  serverProcess.kill();
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  serverProcess.kill();
});
