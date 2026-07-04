/**
 * Swagger Configuration
 * OpenAPI/Swagger documentation setup
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { logger } from '../utils/logger';
import { getEnv } from './env-config';

/**
 * Swagger definition
 */
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'AI Kesif Platformu API',
    version: '1.0.0',
    description: 'AI Kesif Platformu - REST API Documentation',
    contact: {
      name: 'API Support',
      email: 'support@ai-kesif.com',
    },
    license: {
      name: 'MIT',
    },
  },
  servers: [
    {
      url: `http://${getEnv('HOST')}:${getEnv('PORT')}`,
      description: 'Development server',
    },
    {
      url: 'https://api.ai-kesif.com',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Authentication',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
              },
              code: {
                type: 'string',
              },
              statusCode: {
                type: 'number',
              },
              requestId: {
                type: 'string',
              },
            },
          },
        },
      },
      Success: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
          },
          data: {
            type: 'object',
          },
          message: {
            type: 'string',
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

/**
 * API documentation paths
 */
const apiDocsPaths = ['./src/routes/**/*.js', './src/controllers/**/*.js'];

/**
 * Swagger options
 */
const swaggerOptions = {
  definition: swaggerDefinition,
  apis: apiDocsPaths,
};

/**
 * Generate Swagger specs
 */
const swaggerSpecs = swaggerJsdoc(swaggerOptions);

/**
 * Setup Swagger UI
 */
export function setupSwagger(app, options = {}) {
  const basePath = options.basePath || '/api-docs';
  const swaggerUIOptions = {
    swaggerOptions: {
      persistAuthorization: true,
      displayOperationId: false,
      urls: [
        {
          url: swaggerSpecs,
          name: 'v1',
        },
      ],
    },
    customCss: '.swagger-ui .topbar { display: none }',
    ...options.swaggerUIOptions,
  };

  try {
    app.use(basePath, swaggerUi.serve, swaggerUi.setup(swaggerSpecs, swaggerUIOptions));

    logger.info('Swagger UI setup', {
      path: basePath,
      url: `http://${getEnv('HOST')}:${getEnv('PORT')}${basePath}`,
    });
  } catch (error) {
    logger.error('Failed to setup Swagger UI', {
      error: error.message,
    });
  }
}

/**
 * Get Swagger specs
 */
export function getSwaggerSpecs() {
  return swaggerSpecs;
}

/**
 * Export Swagger specs as JSON
 */
export function exportSwaggerSpecs(req, res) {
  try {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpecs);
  } catch (error) {
    logger.error('Failed to export Swagger specs', {
      error: error.message,
    });
    res.status(500).json({
      error: {
        message: 'Failed to export Swagger specs',
        code: 'EXPORT_ERROR',
        statusCode: 500,
      },
    });
  }
}

export default {
  setupSwagger,
  getSwaggerSpecs,
  exportSwaggerSpecs,
};
