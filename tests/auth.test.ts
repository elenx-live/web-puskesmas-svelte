import { describe, it, expect, vi } from 'vitest';
import { apiAuthGuard, rateLimit } from '../server/middleware/auth';

// ---- mock minimal req/res Express ----
function mockReq(overrides: Record<string, unknown> = {}) {
  return {
    method: 'GET',
    path: '/',
    headers: {},
    ip: '127.0.0.1',
    originalUrl: '/',
    ...overrides,
  } as unknown as Parameters<typeof apiAuthGuard>[0];
}

function mockRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: unknown) {
      res.body = body;
      return res;
    },
    setHeader(k: string, v: string) {
      res.headers[k] = v;
    },
  };
  return res;
}

const tick = () => new Promise((r) => setTimeout(r, 20));

describe('apiAuthGuard', () => {
  it('GET konten publik (/theme/published) lolos tanpa token', () => {
    const next = vi.fn();
    const res = mockRes();
    apiAuthGuard(mockReq({ method: 'GET', path: '/theme/published' }), res as never, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(0);
  });

  it('GET /health lolos tanpa token', () => {
    const next = vi.fn();
    const res = mockRes();
    apiAuthGuard(mockReq({ method: 'GET', path: '/health' }), res as never, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('POST /theme/publish tanpa token → 401', async () => {
    const next = vi.fn();
    const res = mockRes();
    apiAuthGuard(
      mockReq({ method: 'POST', path: '/theme/publish', originalUrl: '/api/theme/publish' }),
      res as never,
      next,
    );
    await tick();
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('GET /theme/draft tanpa token → 401 (config sensitif)', async () => {
    const next = vi.fn();
    const res = mockRes();
    apiAuthGuard(
      mockReq({ method: 'GET', path: '/theme/draft', originalUrl: '/api/theme/draft' }),
      res as never,
      next,
    );
    await tick();
    // requireAdmin → authenticate tanpa token → 401
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('rateLimit', () => {
  it('menolak dengan 429 + Retry-After setelah melewati batas', () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 2 });
    const results: number[] = [];
    for (let i = 0; i < 3; i++) {
      const next = vi.fn();
      const res = mockRes();
      limiter(
        mockReq({ ip: '9.9.9.9', method: 'GET', path: '/ai/x' }) as never,
        res as never,
        next,
      );
      results.push(res.statusCode === 429 ? 429 : next.mock.calls.length ? 200 : 0);
      if (i === 2) {
        expect(res.statusCode).toBe(429);
        expect(res.headers['Retry-After']).toBeDefined();
      }
    }
    expect(results).toEqual([200, 200, 429]);
  });
});
