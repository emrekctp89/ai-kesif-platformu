describe('googleCredentials utility', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.GCP_SERVICE_ACCOUNT_JSON;
    delete process.env.GOOGLE_CREDENTIALS_JSON;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.GCS_BUCKET_NAME;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses inline service-account JSON when provided', async () => {
    const credentials = {
      type: 'service_account',
      project_id: 'demo-project',
      client_email: 'svc@example.com',
    };
    process.env.GCP_SERVICE_ACCOUNT_JSON = JSON.stringify(credentials);

    const { getGoogleClientOptions } = await import('../googleCredentials');

    expect(getGoogleClientOptions()).toEqual({ credentials });
  });

  it('supports base64-encoded service-account JSON', async () => {
    const credentials = {
      type: 'service_account',
      project_id: 'encoded-project',
      client_email: 'encoded@example.com',
    };
    process.env.GCP_SERVICE_ACCOUNT_JSON = Buffer.from(JSON.stringify(credentials)).toString(
      'base64'
    );

    const { getGoogleClientOptions } = await import('../googleCredentials');

    expect(getGoogleClientOptions()).toEqual({ credentials });
  });

  it('supports GOOGLE_CREDENTIALS_JSON as a backwards-compatible alias', async () => {
    const credentials = {
      type: 'service_account',
      project_id: 'legacy-project',
      client_email: 'legacy@example.com',
    };
    process.env.GOOGLE_CREDENTIALS_JSON = JSON.stringify(credentials);

    const { getGoogleClientOptions } = await import('../googleCredentials');

    expect(getGoogleClientOptions()).toEqual({ credentials });
  });

  it('falls back to GOOGLE_APPLICATION_CREDENTIALS path', async () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = './google-credentials.json';

    const { getGoogleClientOptions } = await import('../googleCredentials');

    expect(getGoogleClientOptions()).toEqual({ keyFilename: './google-credentials.json' });
  });

  it('falls back to key file when inline JSON is corrupt', async () => {
    process.env.GCP_SERVICE_ACCOUNT_JSON = 'GCS_BUCKET_NAME=aikesif-media';
    process.env.GOOGLE_APPLICATION_CREDENTIALS = './google-credentials.json';

    const { getGoogleClientOptions } = await import('../googleCredentials');

    expect(getGoogleClientOptions()).toEqual({ keyFilename: './google-credentials.json' });
  });

  it('uses the configured GCS bucket name or default bucket', async () => {
    const { getGcsBucketName } = await import('../googleCredentials');

    expect(getGcsBucketName()).toBe('aikesif-media');

    process.env.GCS_BUCKET_NAME = 'custom-bucket';
    expect(getGcsBucketName()).toBe('custom-bucket');
  });
});
