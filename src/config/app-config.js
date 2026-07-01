/**
 * App Configuration
 * Express application initialization and setup
 */

import express from 'express';
import { logger } from '../utils/logger';

/**
 * Create and configure Express app
 */
export function createApp(options = {}) {
  const app = express();

  // Basic configuration
  app.set('env', process.env.NODE_ENV || 'development');
  app.set('port', process.env.PORT || 3000);
  app.set('host', process.env.HOST || 'localhost');

  // Trust proxy
  if (options.trustProxy) {
    app.set('trust proxy', options.trustProxy);
  }

  // View engine (if needed)
  if (options.viewEngine) {
    app.set('view engine', options.viewEngine);
  }

  logger.info('Express app created', {
    env: app.get('env'),
    port: app.get('port'),
    host: app.get('host'),
  });

  return app;
}

/**
 * Get app configuration
 */
export function getAppConfig(app) {
  return {
    env: app.get('env'),
    port: app.get('port'),
    host: app.get('host'),
    trustProxy: app.get('trust proxy'),
    viewEngine: app.get('view engine'),
  };
}

/**
 * Validate app configuration
 */
export function validateAppConfig(app) {
  const config = getAppConfig(app);
  const errors = [];

  // Validate port
  if (!config.port || config.port < 1 || config.port > 65535) {
    errors.push('Invalid port number');
  }

  // Validate host
  if (!config.host) {
    errors.push('Host is required');
  }

  // Validate environment
  const validEnvs = ['development', 'production', 'test'];
  if (!validEnvs.includes(config.env)) {
    errors.push(`Invalid environment: ${config.env}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    config,
  };
}

/**
 * Start server
 */
export function startServer(app, options = {}) {
  const config = getAppConfig(app);

  // Validate config
  const validation = validateAppConfig(app);
  if (!validation.valid) {
    logger.error('Invalid app configuration', {
      errors: validation.errors,
    });
    throw new Error('Invalid app configuration');
  }

  return new Promise((resolve, reject) => {
    const server = app.listen(config.port, config.host, () => {
      logger.info('Server started', {
        url: `http://${config.host}:${config.port}`,
        env: config.env,
      });

      resolve(server);
    });

    server.on('error', (error) => {
      logger.error('Server error', { error: error.message });
      reject(error);
    });
  });
}

/**
 * Stop server
 */
export function stopServer(server, options = {}) {
  return new Promise((resolve, reject) => {
    if (!server) {
      resolve();
      return;
    }

    server.close((error) => {
      if (error) {
        logger.error('Server close error', { error: error.message });
        reject(error);
      } else {
        logger.info('Server stopped');
        resolve();
      }
    });

    // Force close after timeout
    if (options.timeout) {
      setTimeout(() => {
        logger.warn('Forcing server close after timeout');
        process.exit(1);
      }, options.timeout);
    }
  });
}

export default {
  createApp,
  getAppConfig,
  validateAppConfig,
  startServer,
  stopServer,
};
