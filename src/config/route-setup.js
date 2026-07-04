/**
 * Route Setup
 * Register all application routes
 */

import { logger } from '../utils/logger';
import { registerAuthRoutes } from '../routes/auth-routes';
import { registerUserRoutes } from '../routes/user-routes';
import { registerHealthRoutes } from '../routes/health-routes';

/**
 * Setup routes
 */
export function setupRoutes(app, options = {}) {
  const router = require('express').Router();

  logger.info('Setting up routes');

  // Health routes (no auth required)
  if (options.health !== false) {
    registerHealthRoutes(router);
    logger.debug('Health routes registered');
  }

  // Auth routes (no auth required)
  if (options.auth !== false) {
    registerAuthRoutes(router);
    logger.debug('Auth routes registered');
  }

  // User routes (auth required)
  if (options.users !== false) {
    registerUserRoutes(router);
    logger.debug('User routes registered');
  }

  // Custom routes
  if (options.custom && Array.isArray(options.custom)) {
    options.custom.forEach((route) => {
      if (route.path && route.handler) {
        router.use(route.path, route.handler);
        logger.debug('Custom route registered', { path: route.path });
      }
    });
  }

  // Register main router
  app.use('/api', router);

  // API v1 prefix
  if (options.v1 !== false) {
    app.use('/api/v1', router);
    logger.debug('API v1 routes registered');
  }

  logger.info('Routes setup completed');
}

/**
 * Get registered routes
 */
export function getRegisteredRoutes(app) {
  const routes = [];

  function printRoutes(stack, prefix = '') {
    stack.forEach((middleware) => {
      if (middleware.route) {
        // Route
        const methods = Object.keys(middleware.route.methods).map((m) => m.toUpperCase());
        routes.push({
          path: prefix + middleware.route.path,
          methods,
        });
      } else if (middleware.name === 'router' && middleware.handle.stack) {
        // Router
        const routerPrefix =
          prefix + (middleware.regexp.source === '^\\/?$?' ? '' : middleware.regexp.source);
        printRoutes(middleware.handle.stack, routerPrefix);
      }
    });
  }

  if (app._router && app._router.stack) {
    printRoutes(app._router.stack);
  }

  return routes;
}

/**
 * Log registered routes
 */
export function logRegisteredRoutes(app) {
  const routes = getRegisteredRoutes(app);

  logger.info('Registered routes:', { count: routes.length });

  routes.forEach((route) => {
    logger.debug(`  ${route.methods.join(', ')} ${route.path}`);
  });

  return routes;
}

export default {
  setupRoutes,
  getRegisteredRoutes,
  logRegisteredRoutes,
};
