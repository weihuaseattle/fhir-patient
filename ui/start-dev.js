#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting SMART FHIR Patient App...\n');

// Start the callback server
const callbackServer = spawn('node', ['callback-server.js'], {
  stdio: 'pipe',
  cwd: __dirname
});

callbackServer.stdout.on('data', (data) => {
  console.log(`[Callback Server] ${data.toString().trim()}`);
});

callbackServer.stderr.on('data', (data) => {
  console.error(`[Callback Server Error] ${data.toString().trim()}`);
});

// Wait a moment for callback server to start, then start Vite
setTimeout(() => {
  const viteServer = spawn('npx', ['vite'], {
    stdio: 'inherit',
    cwd: __dirname
  });

  viteServer.on('close', (code) => {
    console.log(`\n🛑 Vite server stopped with code ${code}`);
    callbackServer.kill();
    process.exit(code);
  });
}, 2000);

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down servers...');
  callbackServer.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down servers...');
  callbackServer.kill();
  process.exit(0);
});

callbackServer.on('close', (code) => {
  console.log(`\n🛑 Callback server stopped with code ${code}`);
  process.exit(code);
}); 