import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Danipa, DanipaApiError, DanipaNetworkError } from '../src/index.js';

interface CallRecord {
  url: string;
  init: RequestInit;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Danipa client', () => {
  let calls: CallRecord[];
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    calls = [];
    fetchMock = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('infers the sandbox base URL from a dk_test_ key', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ available: '0', pending: '0', merchantId: 'm', currency: 'GHS', asOf: '2026-01-01' }));
    const danipa = new Danipa({ apiKey: 'dk_test_abc', fetch: fetchMock as unknown as typeof globalThis.fetch });

    await danipa.wallets.getBalance();

    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain('api.sandbox.danipa.com');
  });

  it('infers the production base URL from a dk_live_ key', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ available: '0', pending: '0', merchantId: 'm', currency: 'GHS', asOf: '2026-01-01' }));
    const danipa = new Danipa({ apiKey: 'dk_live_abc', fetch: fetchMock as unknown as typeof globalThis.fetch });

    await danipa.wallets.getBalance();

    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toBe('https://api.danipa.com/ms/v1/wallets/balance');
  });

  it('attaches Bearer auth on every request', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}));
    const danipa = new Danipa({ apiKey: 'dk_test_secret_key', fetch: fetchMock as unknown as typeof globalThis.fetch });

    await danipa.wallets.getBalance();

    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer dk_test_secret_key');
  });

  it('forwards X-Idempotency-Key when supplied', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 'col_1', merchantId: 'm', amount: '1', currency: 'GHS', status: 'PENDING', payer: {}, paymentLinkId: null, createdAt: '', completedAt: null }));
    const danipa = new Danipa({ apiKey: 'dk_test_x', fetch: fetchMock as unknown as typeof globalThis.fetch });

    await danipa.collections.create(
      { amount: '50', currency: 'GHS', payer: { phone: '+233244000000' } },
      { idempotencyKey: 'order-123' },
    );

    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Idempotency-Key']).toBe('order-123');
  });

  it('throws DanipaApiError on 4xx (no retry)', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          correlationId: 'corr-1',
          errors: [{ code: 'INSUFFICIENT_FUNDS', description: 'Wallet balance below request amount.' }],
        }),
        { status: 422, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const danipa = new Danipa({ apiKey: 'dk_test_x', fetch: fetchMock as unknown as typeof globalThis.fetch });

    await expect(
      danipa.collections.create({ amount: '50', currency: 'GHS', payer: {} }),
    ).rejects.toMatchObject({
      name: 'DanipaApiError',
      status: 422,
      code: 'INSUFFICIENT_FUNDS',
      correlationId: 'corr-1',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries 5xx and surfaces the final error', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    fetchMock.mockResolvedValue(new Response('fail', { status: 503 }));
    const danipa = new Danipa({
      apiKey: 'dk_test_x',
      maxRetries: 3,
      fetch: fetchMock as unknown as typeof globalThis.fetch,
    });

    // Vitest 4 fails the test if the request promise rejects while we're
    // inside runAllTimersAsync (it's "unhandled" until the next microtask).
    // Attach the rejection assertion eagerly so a handler exists at the
    // moment the final 5xx surfaces.
    const promise = danipa.wallets.getBalance();
    const assertion = expect(promise).rejects.toBeInstanceOf(DanipaApiError);
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('retries network errors then wraps in DanipaNetworkError', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    fetchMock.mockRejectedValue(new TypeError('failed to connect'));
    const danipa = new Danipa({
      apiKey: 'dk_test_x',
      maxRetries: 2,
      fetch: fetchMock as unknown as typeof globalThis.fetch,
    });

    const promise = danipa.wallets.getBalance();
    const assertion = expect(promise).rejects.toBeInstanceOf(DanipaNetworkError);
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects construction when apiKey is empty', () => {
    expect(() => new Danipa({ apiKey: '' })).toThrow(/apiKey is required/);
  });

  it('honors an explicit baseUrl override', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}));
    const danipa = new Danipa({
      apiKey: 'dk_test_x',
      baseUrl: 'https://api.example.test/v9',
      fetch: fetchMock as unknown as typeof globalThis.fetch,
    });

    await danipa.wallets.getBalance();

    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url.startsWith('https://api.example.test/v9/v1/wallets/balance')).toBe(true);
  });
});
