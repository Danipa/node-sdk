import { DanipaApiError, DanipaNetworkError, type BackendErrorEnvelope } from './errors.js';

/** Configurable knobs the client exposes — sensible defaults baked in. */
export interface HttpClientOptions {
  apiKey: string;
  /** Sandbox by default; pass an explicit value to point elsewhere. */
  baseUrl?: string;
  /** Per-request timeout in ms. Default 30s. */
  timeoutMs?: number;
  /** How many attempts on transient 5xx / network failures. Default 3 (= 1 try + 2 retries). */
  maxRetries?: number;
  /** Override the global `fetch` (for tests / non-Node-20 polyfills). */
  fetch?: typeof globalThis.fetch;
}

const SANDBOX_BASE_URL = 'https://api.sandbox.danipa.com/ms';
const PRODUCTION_BASE_URL = 'https://api.danipa.com/ms';

/**
 * Sandbox vs production is inferred from the API key prefix:
 * `dk_test_…` → sandbox, `dk_live_…` → production. Callers can override
 * by passing {@link HttpClientOptions.baseUrl} explicitly.
 */
export function inferBaseUrl(apiKey: string): string {
  if (apiKey.startsWith('dk_live_')) return PRODUCTION_BASE_URL;
  return SANDBOX_BASE_URL;
}

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  /** Idempotency key sent as `X-Idempotency-Key`. Optional but strongly recommended for POST. */
  idempotencyKey?: string;
  /** Per-call override of {@link HttpClientOptions.timeoutMs}. */
  timeoutMs?: number;
}

/**
 * Minimal HTTP client used by every resource module.
 *
 * <p>Retries: 5xx + network errors only. 4xx never retries — they
 * indicate a client-side fix is needed and a retry would just burn
 * the user's rate limit.</p>
 *
 * <p>Idempotency: every mutating call should pass `idempotencyKey`
 * so retries (server- or client-side) don't double-charge. The header
 * is forwarded verbatim — backend dedupes on `(merchantId, key)`.</p>
 */
export class HttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly fetchImpl: typeof globalThis.fetch;

  constructor(options: HttpClientOptions) {
    if (!options.apiKey) {
      throw new TypeError('Danipa SDK: apiKey is required');
    }
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? inferBaseUrl(options.apiKey)).replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.maxRetries = options.maxRetries ?? 3;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    if (!this.fetchImpl) {
      throw new Error('Danipa SDK: global fetch is unavailable. Use Node 20+ or pass `fetch` explicitly.');
    }
  }

  async request<T>(opts: RequestOptions): Promise<T> {
    const url = this.buildUrl(opts.path, opts.query);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: 'application/json',
      'User-Agent': 'danipa-node-sdk/0.1.0',
    };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    if (opts.idempotencyKey) headers['X-Idempotency-Key'] = opts.idempotencyKey;

    const requestInit: RequestInit = {
      method: opts.method,
      headers,
      ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
    };

    let lastErr: unknown;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? this.timeoutMs);
      try {
        const response = await this.fetchImpl(url, { ...requestInit, signal: controller.signal });
        clearTimeout(timer);
        if (response.ok) return (await this.parseBody(response)) as T;

        // 4xx — caller error; never retry.
        if (response.status < 500) {
          throw await this.toApiError(response);
        }
        // 5xx — retry until budget exhausted, then surface the error.
        if (attempt === this.maxRetries) {
          throw await this.toApiError(response);
        }
        await this.backoff(attempt);
      } catch (err) {
        clearTimeout(timer);
        if (err instanceof DanipaApiError) throw err;
        // Network / timeout — retry within budget.
        lastErr = err;
        if (attempt === this.maxRetries) {
          throw new DanipaNetworkError(
            `Danipa SDK: request to ${opts.method} ${opts.path} failed after ${this.maxRetries} attempts`,
            err,
          );
        }
        await this.backoff(attempt);
      }
    }
    // Unreachable in practice — the loop above either returns or throws.
    throw new DanipaNetworkError('Danipa SDK: retry loop exited unexpectedly', lastErr);
  }

  private buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
    const url = new URL(this.baseUrl + (path.startsWith('/') ? path : `/${path}`));
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private async parseBody(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) return undefined;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private async toApiError(response: Response): Promise<DanipaApiError> {
    const raw = (await this.parseBody(response)) as BackendErrorEnvelope | string | undefined;
    const envelope = (typeof raw === 'object' && raw !== null) ? raw : undefined;
    const firstError = envelope?.errors?.[0];
    return new DanipaApiError(
      response.status,
      firstError?.code ?? 'UNKNOWN',
      firstError?.description ?? `HTTP ${response.status}`,
      envelope?.correlationId,
      raw,
    );
  }

  /** Exponential backoff with jitter — 200ms, 400ms, 800ms (cap). */
  private async backoff(attempt: number): Promise<void> {
    const base = Math.min(200 * 2 ** (attempt - 1), 2_000);
    const jitter = Math.random() * 50;
    await new Promise((resolve) => setTimeout(resolve, base + jitter));
  }
}
