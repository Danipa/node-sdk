import type { HttpClient } from '../http.js';
import type { CurrencyCode, WalletBalance } from '../types.js';

export class WalletsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Fetch the current wallet balance. `currency` is optional — when
   * omitted the backend returns the merchant's default-currency wallet.
   */
  async getBalance(opts: { currency?: CurrencyCode } = {}): Promise<WalletBalance> {
    return this.http.request<WalletBalance>({
      method: 'GET',
      path: '/v1/wallets/balance',
      ...(opts.currency !== undefined ? { query: { currency: opts.currency } } : {}),
    });
  }
}
