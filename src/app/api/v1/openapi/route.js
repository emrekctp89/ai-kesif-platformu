import { buildDeveloperOpenApi } from '@/lib/developerOpenApi';
import { jsonResponse } from '@/lib/developerApi';
import { getSiteOrigin } from '@/utils/siteUrl';

export const dynamic = 'force-dynamic';

/** Public OpenAPI document for /api/v1/* (no API key required). */
export async function GET(request) {
  let baseUrl = getSiteOrigin();
  try {
    baseUrl = new URL(request.url).origin || baseUrl;
  } catch {
    // keep env origin
  }

  const doc = buildDeveloperOpenApi({ baseUrl });
  return jsonResponse(doc, 200, {
    'Cache-Control': 'public, max-age=300',
  });
}
