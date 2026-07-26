/**
 * @jest-environment node
 */

const { buildDeveloperOpenApi } = require('../../src/lib/developerOpenApi');

describe('developerOpenApi', () => {
  it('OpenAPI 3 dokümanı tools + kasif path içerir', () => {
    const doc = buildDeveloperOpenApi({ baseUrl: 'https://example.com' });
    expect(doc.openapi).toMatch(/^3\./);
    expect(doc.servers[0].url).toBe('https://example.com');
    expect(doc.paths['/api/v1/tools'].get).toBeTruthy();
    expect(doc.paths['/api/v1/tools/{slug}'].get).toBeTruthy();
    expect(doc.paths['/api/v1/kasif/recommend'].post).toBeTruthy();
    expect(doc.paths['/api/v1/openapi'].get).toBeTruthy();
    expect(doc.components.securitySchemes.bearerApiKey).toBeTruthy();
  });
});
