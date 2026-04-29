import type { HttpClient } from '../http.js';
import type { CreateDisbursementRequest, Disbursement } from '../types.js';

export class DisbursementsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Push a disbursement to a payee (MoMo wallet, bank account). Strongly
   * recommended to pass an `idempotencyKey` — disbursement creation is
   * the most expensive operation to accidentally duplicate.
   */
  async create(request: CreateDisbursementRequest, opts: { idempotencyKey?: string } = {}): Promise<Disbursement> {
    return this.http.request<Disbursement>({
      method: 'POST',
      path: '/v1/disbursements',
      body: request,
      ...(opts.idempotencyKey !== undefined ? { idempotencyKey: opts.idempotencyKey } : {}),
    });
  }

  async get(id: string): Promise<Disbursement> {
    return this.http.request<Disbursement>({
      method: 'GET',
      path: `/v1/disbursements/${encodeURIComponent(id)}`,
    });
  }
}
