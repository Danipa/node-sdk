import type { HttpClient } from '../http.js';
import type { CreateInvoiceRequest, Invoice } from '../types.js';

export class InvoicesResource {
  constructor(private readonly http: HttpClient) {}

  /** Issue an invoice. Returns the created `Invoice` in `SENT` status. */
  async create(request: CreateInvoiceRequest, opts: { idempotencyKey?: string } = {}): Promise<Invoice> {
    return this.http.request<Invoice>({
      method: 'POST',
      path: '/v1/merchants/me/invoices',
      body: request,
      ...(opts.idempotencyKey !== undefined ? { idempotencyKey: opts.idempotencyKey } : {}),
    });
  }
}
