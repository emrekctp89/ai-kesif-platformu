#!/usr/bin/env node

/**
 * Application Startup Script
 * Entry point for starting the application
 */

import { startApp } from './src/server.js';

startApp().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
