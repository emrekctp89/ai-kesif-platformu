jest.mock('next/server', () => ({
  NextResponse: {
    json: (body, options = {}) => ({ status: options.status || 200, json: async () => body }),
  },
}));
jest.mock('@/lib/kasif/server', () => ({
  getViewerProState: jest.fn(),
  callLlmJson: jest.fn(),
  normalizeWorkmindWorkflow: jest.fn(),
  planWorkmindWorkflow: jest.fn(),
  understandQuestion: jest.fn(),
}));
const { POST } = require('@/app/api/workmind/generate/route');
const { getViewerProState } = require('@/lib/kasif/server');
const { callLlmJson } = require('@/lib/kasif/server');
test.each([
  [false, 401],
  [true, 403],
])('blocks non-PRO user (authenticated: %s) before model call', async (isAuthenticated, status) => {
  getViewerProState.mockResolvedValue({ isPro: false, isAuthenticated });
  const response = await POST({ json: async () => ({ prompt: 'Prepare a launch workflow' }) });
  expect(response.status).toBe(status);
  expect(callLlmJson).not.toHaveBeenCalled();
});
test('PRO user reaches prompt validation', async () => {
  getViewerProState.mockResolvedValue({ isPro: true, isAuthenticated: true });
  expect((await POST({ json: async () => ({ prompt: '' }) })).status).toBe(400);
});
