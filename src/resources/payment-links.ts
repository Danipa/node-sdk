import type { HttpClient } from '../http.js';
import type { CreatePaymentLinkRequest, PaymentLink } from '../types.js';

export class PaymentLinksResource {
  constructor(private readonly http: HttpClient) {}

  /** Create a hosted payment link the merchant can share by URL. */
  async create(request: CreatePaymentLinkRequest, opts: { idempotencyKey?: string } = {}): Promise<PaymentLink> {
    return this.http.request<PaymentLink>({
      method: 'POST',
      path: '/v1/merchants/me/payment-links',
      body: request,
      ...(opts.idempotencyKey !== undefined ? { idempotencyKey: opts.idempotencyKey } : {}),
    });
  }
}
