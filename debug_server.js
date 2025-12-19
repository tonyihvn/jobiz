#!/usr/bin/env node
// Wrapper to capture server startup errors
import dotenv from 'dotenv';
dotenv.config();

console.log('=== Server Startup Debug ===');
console.log('Node version:', process.version);
console.log('Environment:', {
  DB_HOST: process.env.DB_HOST,
  DB_NAME: process.env.DB_NAME,
  PORT: process.env.PORT || 3001
});

try {
  console.log('Importing server.js...');
  // Try to import but catch any top-level errors
  import('./server.js').then(() => {
    console.log('Server imported successfully');
  }).catch(err => {
    console.error('❌ Error importing server.js:', err);
    process.exit(1);
  });
} catch (err) {
  console.error('❌ Top-level error:', err);
  process.exit(1);
}

// Give it time to start
setTimeout(() => {
  console.log('Server startup timeout (still running)...');
}, 10000);
