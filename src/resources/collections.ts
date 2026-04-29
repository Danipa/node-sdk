import type { HttpClient } from '../http.js';
import type { Collection, CreateCollectionRequest } from '../types.js';

export class CollectionsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Initiate a pull-from-payer collection (request-to-pay over MoMo,
   * card debit, etc.). Returns a Collection in `PENDING` state — listen
   * for `collection.completed` / `collection.failed` webhooks for the
   * terminal state, or poll {@link CollectionsResource.get}.
   */
  async create(request: CreateCollectionRequest, opts: { idempotencyKey?: string } = {}): Promise<Collection> {
    return this.http.request<Collection>({
      method: 'POST',
      path: '/v1/collections',
      body: request,
      ...(opts.idempotencyKey !== undefined ? { idempotencyKey: opts.idempotencyKey } : {}),
    });
  }

  async get(id: string): Promise<Collection> {
    return this.http.request<Collection>({
      method: 'GET',
      path: `/v1/collections/${encodeURIComponent(id)}`,
    });
  }
}
