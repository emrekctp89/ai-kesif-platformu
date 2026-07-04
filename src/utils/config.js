/**
 * Server Configuration
 * Centralized configuration loading and validation
 */

import { getValidatedEnv, getEnvString, getEnvNumber, getEnvBoolean } from './env-validator';
import { logger } from './logger';

/**
 * Application configuration
 */
class AppConfig {
  constructor() {
    this.env = null;
    this.config = null;
    this.initialized = false;
  }

  /**
   * Initialize configuration
   */
  initialize() {
    if (this.initialized) {
      return this.config;
    }

    try {
      this.env = getValidatedEnv();

      this.config = {
        // Application
        app: {
          environment: this.env.NODE_ENV,
          isDevelopment: this.env.NODE_ENV === 'development',
          isProduction: this.env.NODE_ENV === 'production',
          isTesting: this.env.NODE_ENV === 'test',
          siteUrl: this.env.NEXT_PUBLIC_SITE_URL,
          apiUrl: this.env.NEXT_PUBLIC_API_URL,
        },

        // Database
        database: {
          url: this.env.DATABASE_URL,
          poolSize: this.env.DATABASE_POOL_SIZE,
          ssl: this.env.NODE_ENV === 'production',
        },

        // Redis
        redis: {
          enabled: !!this.env.REDIS_URL,
          url: this.env.REDIS_URL,
        },

        // Authentication
        auth: {
          jwtSecret: this.env.JWT_SECRET,
          jwtExpiry: this.env.JWT_EXPIRY,
        },

        // API Keys
        api: {
          openaiKey: this.env.OPENAI_API_KEY,
        },

        // Email
        email: {
          enabled: !!(this.env.SMTP_HOST && this.env.SMTP_USER),
          smtp: {
            host: this.env.SMTP_HOST,
            port: this.env.SMTP_PORT,
            user: this.env.SMTP_USER,
            password: this.env.SMTP_PASSWORD,
            from: this.env.SMTP_FROM,
            secure: this.env.SMTP_PORT === 465,
          },
        },

        // Logging
        logging: {
          level: this.env.LOG_LEVEL,
        },

        // Rate Limiting
        rateLimit: {
          enabled: this.env.RATE_LIMIT_ENABLED,
          window: this.env.RATE_LIMIT_WINDOW,
          maxRequests: this.env.RATE_LIMIT_MAX_REQUESTS,
        },

        // CORS
        cors: {
          origins: this.env.NEXT_PUBLIC_ALLOWED_ORIGINS.split(','),
        },

        // Features
        features: {
          aiAnalysis: this.env.FEATURE_AI_ANALYSIS,
          export: this.env.FEATURE_EXPORT,
        },
      };

      this.initialized = true;
      logger.info('Application configuration initialized', {
        environment: this.config.app.environment,
        hasDatabase: !!this.config.database.url,
        hasRedis: this.config.redis.enabled,
        hasEmail: this.config.email.enabled,
      });

      return this.config;
    } catch (error) {
      logger.error('Failed to initialize configuration', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get config section
   */
  get(section) {
    if (!this.initialized) {
      this.initialize();
    }
    return this.config[section];
  }

  /**
   * Get full config
   */
  getAll() {
    if (!this.initialized) {
      this.initialize();
    }
    return this.config;
  }

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(feature) {
    if (!this.initialized) {
      this.initialize();
    }
    return this.config.features[feature] === true;
  }

  /**
   * Validate critical configuration
   */
  validateCritical() {
    if (!this.initialized) {
      this.initialize();
    }

    const critical = [
      { key: 'database.url', value: this.config.database.url },
      { key: 'auth.jwtSecret', value: this.config.auth.jwtSecret },
    ];

    const missing = critical.filter((item) => !item.value);

    if (missing.length > 0) {
      throw new Error(`Missing critical configuration: ${missing.map((m) => m.key).join(', ')}`);
    }
  }

  /**
   * Reset (for testing)
   */
  reset() {
    this.env = null;
    this.config = null;
    this.initialized = false;
  }
}

/**
 * Global config instance
 */
export const appConfig = new AppConfig();

/**
 * Initialize app config
 */
export function initializeConfig() {
  return appConfig.initialize();
}

/**
 * Get config
 */
export function getConfig() {
  return appConfig.getAll();
}

/**
 * Get config section
 */
export function getConfigSection(section) {
  return appConfig.get(section);
}

/**
 * Type-safe config access
 */
export const config = {
  app: () => appConfig.get('app'),
  database: () => appConfig.get('database'),
  redis: () => appConfig.get('redis'),
  auth: () => appConfig.get('auth'),
  api: () => appConfig.get('api'),
  email: () => appConfig.get('email'),
  logging: () => appConfig.get('logging'),
  rateLimit: () => appConfig.get('rateLimit'),
  cors: () => appConfig.get('cors'),
  features: () => appConfig.get('features'),
};

/**
 * Quick access helpers
 */
export const isDevelopment = () => appConfig.get('app')?.isDevelopment ?? false;
export const isProduction = () => appConfig.get('app')?.isProduction ?? false;
export const isTesting = () => appConfig.get('app')?.isTesting ?? false;

/**
 * Configuration for different environments
 */
export const envConfigs = {
  development: {
    logging: { level: 'debug' },
    rateLimit: { enabled: false },
  },
  production: {
    logging: { level: 'warn' },
    rateLimit: { enabled: true },
  },
  test: {
    logging: { level: 'error' },
    rateLimit: { enabled: false },
  },
};

const defaultExport = {
  AppConfig,
  appConfig,
  initializeConfig,
  getConfig,
  getConfigSection,
  config,
  isDevelopment,
  isProduction,
  isTesting,
  envConfigs,
};

export default defaultExport;
