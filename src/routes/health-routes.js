/**
 * Health Routes
 * System health check endpoints
 */

import { RouteHandlerFactory } from '../utils/route-handler-factory';
import { logger } from '../utils/logger';

const factory = new RouteHandlerFactory();

/**
 * Health check endpoint
 */
export const health = factory.createGetHandler(async (req, res, next) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  logger.debug('Health check performed');

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: Math.floor(uptime),
      minutes: Math.floor(uptime / 60),
      hours: Math.floor(uptime / 3600),
    },
    memory: {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
      external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB',
    },
  };
});

/**
 * Ready check endpoint
 */
export const ready = factory.createGetHandler(async (req, res, next) => {
  // TODO: Check database connection
  // const dbReady = await database.isConnected();

  // TODO: Check external services
  // const servicesReady = await checkServices();

  logger.debug('Ready check performed');

  return {
    ready: true,
    services: {
      database: true,
      cache: true,
      externalServices: true,
    },
  };
});

/**
 * Detailed status endpoint
 */
export const status = factory.createGetHandler(async (req, res, next) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  // TODO: Get stats from managers
  // const sessionStats = sessionManager.getStats();
  // const jwtStats = jwtManager.getStats();
  // const routeStats = factory.getStats();

  logger.debug('Status check performed');

  return {
    status: 'operational',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime),
    memory: {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      rss: memoryUsage.rss,
    },
    stats: {
      sessions: {
        active: 0,
        total: 0,
      },
      tokens: {
        created: 0,
        verified: 0,
      },
      routes: {
        handled: 0,
        failed: 0,
      },
    },
  };
});

/**
 * Version endpoint
 */
export const version = factory.createGetHandler(async (req, res, next) => {
  const packageJson = require('../../package.json');

  logger.debug('Version check performed');

  return {
    version: packageJson.version,
    name: packageJson.name,
    description: packageJson.description,
    node: process.version,
    environment: process.env.NODE_ENV || 'development',
  };
});

/**
 * Dependencies endpoint
 */
export const dependencies = factory.createGetHandler(async (req, res, next) => {
  const packageJson = require('../../package.json');

  logger.debug('Dependencies check performed');

  return {
    dependencies: packageJson.dependencies || {},
    devDependencies: packageJson.devDependencies || {},
    count: {
      total: Object.keys(packageJson.dependencies || {}).length,
      dev: Object.keys(packageJson.devDependencies || {}).length,
    },
  };
});

/**
 * Register routes
 */
export function registerHealthRoutes(router) {
  router.get('/health', health);
  router.get('/ready', ready);
  router.get('/status', status);
  router.get('/version', version);
  router.get('/dependencies', dependencies);
}

export default {
  health,
  ready,
  status,
  version,
  dependencies,
  registerHealthRoutes,
};
