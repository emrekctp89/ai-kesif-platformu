describe('gcs utility URL helpers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, GCS_BUCKET_NAME: 'test-bucket' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('builds a public GCS URL from an object path', async () => {
    const { getPublicGcsUrl } = await import('../gcs');

    expect(getPublicGcsUrl('/avatars/user/photo.png')).toBe(
      'https://storage.googleapis.com/test-bucket/avatars/user/photo.png'
    );
  });

  it('extracts object path from storage.googleapis.com URLs', async () => {
    const { gcsPathFromUrl } = await import('../gcs');

    expect(gcsPathFromUrl('https://storage.googleapis.com/test-bucket/blog/cover.jpg')).toBe(
      'blog/cover.jpg'
    );
  });

  it('extracts object path from storage.cloud.google.com URLs', async () => {
    const { gcsPathFromUrl } = await import('../gcs');

    expect(gcsPathFromUrl('https://storage.cloud.google.com/test-bucket/gallery/image.webp')).toBe(
      'gallery/image.webp'
    );
  });

  it('returns normalized paths and null for unsupported URLs', async () => {
    const { gcsPathFromUrl } = await import('../gcs');

    expect(gcsPathFromUrl('/launch/item.png')).toBe('launch/item.png');
    expect(gcsPathFromUrl('https://example.com/file.png')).toBeNull();
    expect(gcsPathFromUrl('')).toBeNull();
  });
});
