import { describe, it, expect, afterAll } from 'vitest';
import express from 'express';
import healthRouter from '../server/routes/health';

describe('health endpoint', () => {
  const app = express();
  app.use(healthRouter);
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;

  afterAll(() => {
    server.close();
  });

  it('GET /health → 200 dengan status ok', async () => {
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status?: string };
    expect(body.status).toBe('ok');
  });

  it('GET /api/health → 200 dengan status ok', async () => {
    const res = await fetch(`${base}/api/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status?: string };
    expect(body.status).toBe('ok');
  });
});
