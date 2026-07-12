import dns from 'node:dns/promises';
import { assertSafeFetchUrl, GET, isDisallowedHost } from '../route';

class TestResponse {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.ok = this.status >= 200 && this.status < 300;
    this.headers = {
      get: (name) => init.headers?.[name.toLowerCase()] || init.headers?.[name] || null,
    };
  }

  async arrayBuffer() {
    if (!this.body) return new ArrayBuffer(0);
    return new TextEncoder().encode(String(this.body)).buffer;
  }

  async text() {
    return String(this.body || '');
  }

  async json() {
    return JSON.parse(String(this.body || '{}'));
  }
}

jest.mock('node:dns/promises', () => ({
  __esModule: true,
  default: {
    lookup: jest.fn(),
  },
}));

describe('tool-icon route security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.Response = TestResponse;
    global.fetch = jest.fn();
  });

  it('blocks localhost and private IP hostnames before fetching', () => {
    expect(isDisallowedHost('localhost')).toBe(true);
    expect(isDisallowedHost('127.0.0.1')).toBe(true);
    expect(isDisallowedHost('10.0.0.4')).toBe(true);
    expect(isDisallowedHost('192.168.1.10')).toBe(true);
    expect(isDisallowedHost('example.com')).toBe(false);
  });

  it('rejects public hostnames that resolve to private addresses', async () => {
    dns.lookup.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);

    await expect(assertSafeFetchUrl('https://public.example/favicon.ico')).rejects.toThrow(
      'Unsafe resolved address'
    );
  });

  it('does not follow redirects to unsafe private hosts', async () => {
    dns.lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
    global.fetch.mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: 'http://127.0.0.1/internal.png' },
      })
    );

    const response = await GET({
      url: 'https://www.aikesif.test/api/tool-icon?link=https://public.example',
    });

    expect(response.status).toBe(404);
    expect(global.fetch).toHaveBeenCalled();
    const fetchedUrls = global.fetch.mock.calls.map(([url]) => String(url));
    expect(fetchedUrls.some((url) => url.includes('127.0.0.1'))).toBe(false);
  });
});
