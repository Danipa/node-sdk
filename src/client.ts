import { HttpClient, type HttpClientOptions } from './http.js';
import { CollectionsResource } from './resources/collections.js';
import { DisbursementsResource } from './resources/disbursements.js';
import { WalletsResource } from './resources/wallets.js';
import { PaymentLinksResource } from './resources/payment-links.js';
import { InvoicesResource } from './resources/invoices.js';

/**
 * The main entry point. Construct once with your API key and reuse the
 * same instance across requests — every resource shares the underlying
 * HTTP client (auth, retry, timeout).
 *
 * @example
 * ```ts
 * import { Danipa } from '@danipa/sdk';
 *
 * const danipa = new Danipa({ apiKey: process.env.DANIPA_API_KEY! });
 *
 * const collection = await danipa.collections.create({
 *   amount: '125.00',
 *   currency: 'GHS',
 *   payer: { phone: '+233244112233', name: 'Ama K.' },
 * }, { idempotencyKey: 'order-1234' });
 * ```
 */
export class Danipa {
  readonly collections: CollectionsResource;
  readonly disbursements: DisbursementsResource;
  readonly wallets: WalletsResource;
  readonly paymentLinks: PaymentLinksResource;
  readonly invoices: InvoicesResource;

  constructor(options: HttpClientOptions) {
    const http = new HttpClient(options);
    this.collections = new CollectionsResource(http);
    this.disbursements = new DisbursementsResource(http);
    this.wallets = new WalletsResource(http);
    this.paymentLinks = new PaymentLinksResource(http);
    this.invoices = new InvoicesResource(http);
  }
}
