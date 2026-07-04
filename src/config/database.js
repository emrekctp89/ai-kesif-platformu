/**
 * Database Connection
 * MongoDB connection setup and management
 */

import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import { getEnv } from './env-config';

let mongoConnection = null;

/**
 * Connect to MongoDB
 */
export async function connectDatabase(options = {}) {
  const dbUrl = options.url || getEnv('DATABASE_URL');
  const dbUser = options.user || getEnv('DATABASE_USER');
  const dbPassword = options.password || getEnv('DATABASE_PASSWORD');
  const dbDebug = options.debug || getEnv('DATABASE_DEBUG') === 'true';

  if (!dbUrl) {
    throw new Error('DATABASE_URL is required');
  }

  try {
    logger.info('Connecting to database', {
      url: dbUrl.replace(/([a-zA-Z0-9]+):([a-zA-Z0-9]+)@/, '***:***@'),
    });

    // Build connection URL
    let connectionUrl = dbUrl;
    if (dbUser && dbPassword) {
      const protocol = dbUrl.split('://')[0];
      const rest = dbUrl.split('://')[1];
      connectionUrl = `${protocol}://${dbUser}:${dbPassword}@${rest}`;
    }

    // Connection options
    const mongoOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      ...options.mongoOptions,
    };

    // Enable debug mode
    if (dbDebug) {
      mongoose.set('debug', true);
    }

    // Connect
    mongoConnection = await mongoose.connect(connectionUrl, mongoOptions);

    logger.info('Database connected successfully', {
      database: mongoConnection.connection.db.databaseName,
      host: mongoConnection.connection.host,
    });

    // Setup connection event listeners
    setupConnectionListeners();

    return mongoConnection;
  } catch (error) {
    logger.error('Database connection failed', {
      error: error.message,
      url: dbUrl.replace(/([a-zA-Z0-9]+):([a-zA-Z0-9]+)@/, '***:***@'),
    });
    throw error;
  }
}

/**
 * Disconnect from database
 */
export async function disconnectDatabase() {
  try {
    if (!mongoConnection) {
      logger.warn('No active database connection');
      return;
    }

    await mongoose.disconnect();
    mongoConnection = null;

    logger.info('Database disconnected successfully');
  } catch (error) {
    logger.error('Database disconnection failed', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get database connection
 */
export function getDatabase() {
  if (!mongoConnection) {
    throw new Error('Database not connected');
  }
  return mongoConnection;
}

/**
 * Check database connection status
 */
export function isDatabaseConnected() {
  return mongoConnection && mongoose.connection.readyState === 1;
}

/**
 * Setup connection event listeners
 */
function setupConnectionListeners() {
  mongoose.connection.on('disconnected', () => {
    logger.warn('Database disconnected');
    mongoConnection = null;
  });

  mongoose.connection.on('error', (error) => {
    logger.error('Database error', {
      error: error.message,
    });
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('Database reconnected');
  });
}

/**
 * Health check
 */
export async function checkDatabaseHealth() {
  try {
    if (!isDatabaseConnected()) {
      return {
        status: 'disconnected',
        connected: false,
      };
    }

    const adminDb = mongoose.connection.db.admin();
    const status = await adminDb.ping();

    return {
      status: 'connected',
      connected: true,
      ping: status,
    };
  } catch (error) {
    logger.error('Database health check failed', {
      error: error.message,
    });
    return {
      status: 'error',
      connected: false,
      error: error.message,
    };
  }
}

export default {
  connectDatabase,
  disconnectDatabase,
  getDatabase,
  isDatabaseConnected,
  checkDatabaseHealth,
};
