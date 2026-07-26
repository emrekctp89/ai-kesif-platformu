/**
 * OpenAPI 3.0 document for public developer v1 endpoints.
 */

import { V1_RATE_LIMIT_PER_MINUTE } from './developerApi';

/**
 * @param {{ baseUrl?: string }} [opts]
 */
export function buildDeveloperOpenApi(opts = {}) {
  const serverUrl = String(opts.baseUrl || '').replace(/\/$/, '') || '/';

  return {
    openapi: '3.0.3',
    info: {
      title: 'AI Keşif Developer API',
      version: '1.0.0',
      description:
        'Programmatic access to the approved AI tools catalog and the Kâşif recommendation engine. Authenticate with `Authorization: Bearer aik_…` (keys from /developer).',
    },
    servers: [{ url: serverUrl, description: 'Current host' }],
    tags: [
      { name: 'Tools', description: 'Approved catalog tools' },
      { name: 'Kasif', description: 'Kâşif recommendation engine' },
      { name: 'Meta', description: 'Discovery helpers' },
    ],
    components: {
      securitySchemes: {
        bearerApiKey: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'aik_',
          description: 'API key created in the developer portal (`aik_…`).',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            retryAfter: { type: 'integer', description: 'Seconds (429 only)' },
          },
          required: ['error'],
        },
        Tool: {
          type: 'object',
          properties: {
            id: {},
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string', nullable: true },
            website_url: { type: 'string', nullable: true },
            pricing_type: { type: 'string', nullable: true },
            is_verified: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time', nullable: true },
            updated_at: { type: 'string', format: 'date-time', nullable: true },
            category: { type: 'string', nullable: true },
            category_slug: { type: 'string', nullable: true },
            url: { type: 'string', nullable: true },
          },
        },
        Recommendation: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            slug: { type: 'string' },
            reason: { type: 'string' },
            score: { type: 'number' },
            url: { type: 'string', nullable: true },
          },
        },
      },
    },
    paths: {
      '/api/v1/tools': {
        get: {
          tags: ['Tools'],
          summary: 'List approved tools',
          security: [{ bearerApiKey: [] }],
          parameters: [
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', minimum: 1, default: 1 },
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
            },
            {
              name: 'q',
              in: 'query',
              description: 'Simple name/description/slug search. Use Kâşif for smart ranking.',
              schema: { type: 'string', maxLength: 120 },
            },
          ],
          responses: {
            200: {
              description: 'Paginated tool list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/Tool' } },
                      meta: {
                        type: 'object',
                        properties: {
                          total: { type: 'integer' },
                          page: { type: 'integer' },
                          limit: { type: 'integer' },
                          totalPages: { type: 'integer' },
                          q: { type: 'string', nullable: true },
                        },
                      },
                    },
                  },
                },
              },
            },
            401: { description: 'Invalid API key', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            429: {
              description: `Rate limit (${V1_RATE_LIMIT_PER_MINUTE}/min)`,
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
            },
          },
        },
      },
      '/api/v1/tools/{slug}': {
        get: {
          tags: ['Tools'],
          summary: 'Get one approved tool by slug',
          security: [{ bearerApiKey: [] }],
          parameters: [
            {
              name: 'slug',
              in: 'path',
              required: true,
              schema: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
            },
          ],
          responses: {
            200: {
              description: 'Tool detail',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/Tool' },
                      meta: { type: 'object', properties: { slug: { type: 'string' } } },
                    },
                  },
                },
              },
            },
            400: { description: 'Invalid slug' },
            404: { description: 'Not found' },
            401: { description: 'Unauthorized' },
            429: { description: 'Rate limited' },
          },
        },
      },
      '/api/v1/kasif/recommend': {
        post: {
          tags: ['Kasif'],
          summary: 'Kâşif tool recommendations',
          description:
            'Ranks approved platform tools for a natural-language job. Not a general-purpose LLM.',
          security: [{ bearerApiKey: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['question'],
                  properties: {
                    question: { type: 'string', minLength: 3, maxLength: 800 },
                    limit: { type: 'integer', minimum: 1, maximum: 10, default: 5 },
                    locale: { type: 'string', enum: ['tr', 'en'], default: 'tr' },
                    history: {
                      type: 'array',
                      maxItems: 6,
                      items: {
                        type: 'object',
                        properties: {
                          role: { type: 'string', enum: ['user', 'assistant'] },
                          content: { type: 'string', maxLength: 800 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Ranked recommendations',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          question: { type: 'string' },
                          locale: { type: 'string' },
                          recommendations: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Recommendation' },
                          },
                          intent: { type: 'object', nullable: true },
                        },
                      },
                      meta: {
                        type: 'object',
                        properties: {
                          engine: { type: 'string', example: 'kasif' },
                          count: { type: 'integer' },
                          limit: { type: 'integer' },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: { description: 'Invalid body' },
            401: { description: 'Unauthorized' },
            429: { description: 'Rate limited' },
            503: { description: 'Kâşif disabled' },
          },
        },
        get: {
          tags: ['Kasif'],
          summary: 'Recommend endpoint discovery',
          responses: {
            200: { description: 'Short endpoint contract' },
          },
        },
      },
      '/api/v1/openapi': {
        get: {
          tags: ['Meta'],
          summary: 'This OpenAPI document',
          responses: {
            200: { description: 'OpenAPI 3.0 JSON' },
          },
        },
      },
    },
  };
}
