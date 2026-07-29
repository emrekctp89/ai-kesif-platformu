/** @jest-environment node */
describe('Gemini embedding helper', () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });
  it('pgvector için 768 boyut ister', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    delete process.env.GEMINI_EMBED_MODEL;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: { values: Array(768).fill(0.1) } }),
    });
    const { embedGeminiText } = await import('@/utils/gemini');
    await expect(embedGeminiText('test')).resolves.toHaveLength(768);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/models/gemini-embedding-2:embedContent'),
      expect.objectContaining({ body: expect.stringContaining('"outputDimensionality":768') })
    );
  });
});
