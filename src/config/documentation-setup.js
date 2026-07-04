/**
 * API Documentation
 * Main API documentation and routes setup
 */

import { setupSwagger, exportSwaggerSpecs } from '../config/swagger-config';
import { logger } from '../utils/logger';

/**
 * Setup API documentation
 */
export function setupDocumentation(app, options = {}) {
  try {
    // Setup Swagger UI
    setupSwagger(app, {
      basePath: '/api-docs',
      swaggerUIOptions: {
        swaggerOptions: {
          persistAuthorization: true,
        },
      },
      ...options,
    });

    // Export Swagger specs as JSON
    app.get('/api-docs.json', exportSwaggerSpecs);

    logger.info('API documentation setup completed');
  } catch (error) {
    logger.error('Failed to setup API documentation', {
      error: error.message,
    });
  }
}

const defaultExport = {
  setupDocumentation,
};

export default defaultExport;
