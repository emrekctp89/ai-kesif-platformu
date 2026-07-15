/**
 * Resolve Google Cloud credentials for local + Vercel/serverless.
 *
 * Priority:
 * 1) GCP_SERVICE_ACCOUNT_JSON / GOOGLE_CREDENTIALS_JSON — full service-account JSON string
 * 2) GOOGLE_APPLICATION_CREDENTIALS — file path (local dev)
 * 3) Application Default Credentials (ADC) if neither is set
 */

let cachedCredentials = undefined;

function parseServiceAccountJson(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    // Support base64-encoded JSON (handy for some CI secret stores)
    if (!trimmed.startsWith('{')) {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
      if (decoded.trim().startsWith('{')) {
        return JSON.parse(decoded);
      }
    }
    return JSON.parse(trimmed);
  } catch (error) {
    console.error(
      '[googleCredentials] Failed to parse Google service-account JSON:',
      error.message
    );
    return null;
  }
}

/**
 * Options object for @google-cloud/* client constructors.
 * @returns {{ credentials?: object, keyFilename?: string }}
 */
export function getGoogleClientOptions() {
  if (cachedCredentials !== undefined) {
    return cachedCredentials;
  }

  const rawServiceAccount =
    process.env.GCP_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_CREDENTIALS_JSON;
  const fromJson = parseServiceAccountJson(rawServiceAccount);
  // Accept parsed service-account objects; reject empty / non-objects.
  if (fromJson && typeof fromJson === 'object' && Object.keys(fromJson).length > 0) {
    cachedCredentials = { credentials: fromJson };
    return cachedCredentials;
  }

  // Prefer explicit key file for local dev (and as fallback if JSON env is corrupt)
  const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (keyFilename) {
    cachedCredentials = { keyFilename };
    return cachedCredentials;
  }

  // ADC / workload identity / empty — client libraries may still work in GCP
  cachedCredentials = {};
  return cachedCredentials;
}

export function getGcsBucketName() {
  return process.env.GCS_BUCKET_NAME || 'aikesif-media';
}
