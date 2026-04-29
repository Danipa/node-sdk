# @danipa/sdk

Official Node.js SDK for the Danipa payments API.

```bash
npm install @danipa/sdk
```

Requires Node.js 20+ (uses the global `fetch`). Zero runtime dependencies.

## Quick start

```ts
import { Danipa } from '@danipa/sdk';

// API key prefix decides sandbox vs production:
//   dk_test_… → https://api.sandbox.danipa.com
//   dk_live_… → https://api.danipa.com
const danipa = new Danipa({ apiKey: process.env.DANIPA_API_KEY! });

const collection = await danipa.collections.create(
  {
    amount: '125.00',
    currency: 'GHS',
    payer: { phone: '+233244112233', name: 'Ama K.' },
  },
  { idempotencyKey: 'order-1234' },
);

console.log(collection.status); // 'PENDING'
```

## Resources

| Resource | Methods |
|---|---|
| `danipa.collections` | `create`, `get` |
| `danipa.disbursements` | `create`, `get` |
| `danipa.wallets` | `getBalance` |
| `danipa.paymentLinks` | `create` |
| `danipa.invoices` | `create` |
| `DanipaWebhook` | `verify`, `computeSignature` (static) |

## Idempotency

Pass `idempotencyKey` on every mutating call. The backend dedupes on `(merchantId, key)` for 24 hours, so retrying a failed request with the same key is safe.

```ts
await danipa.disbursements.create(
  { amount: '500.00', currency: 'GHS', recipient: { phone: '+233244998877' } },
  { idempotencyKey: `payout-${order.id}` },
);
```

## Retry & timeout

- Auto-retries `5xx` and network errors. Default 3 attempts with exponential backoff (200ms → 400ms → 800ms + jitter).
- 4xx never retries — fix the request and re-call.
- 30s per-request timeout. Override with `timeoutMs`.

```ts
const danipa = new Danipa({
  apiKey: process.env.DANIPA_API_KEY!,
  maxRetries: 5,
  timeoutMs: 60_000,
});
```

## Verifying webhooks

```ts
import { DanipaWebhook } from '@danipa/sdk/webhook';

app.post('/webhooks/danipa', (req, res) => {
  const ok = DanipaWebhook.verify(
    req.rawBody,                                         // string, NOT parsed JSON
    req.headers['x-danipa-signature']!,
    req.headers['x-danipa-timestamp']!,
    process.env.DANIPA_WEBHOOK_SECRET!,
  );
  if (!ok) return res.status(401).end();

  const event = JSON.parse(req.rawBody);
  // ... handle event ...
  res.status(200).json({ received: true });
});
```

The 5-minute replay window is enforced. Make sure your handler uses **the raw request body**, not a re-serialized one — JSON normalization changes the bytes and breaks signature verification.

## Error handling

```ts
import { Danipa, DanipaApiError, DanipaNetworkError } from '@danipa/sdk';

try {
  await danipa.collections.create({ /* … */ });
} catch (err) {
  if (err instanceof DanipaApiError) {
    // Backend rejected the request.
    console.error(`[${err.status}] ${err.code}: ${err.message} (correlationId: ${err.correlationId})`);
  } else if (err instanceof DanipaNetworkError) {
    // Never reached the backend (DNS, TLS, timeout).
    console.error('Network failure:', err.cause);
  } else {
    throw err;
  }
}
```

## Event reference

Full webhook event catalog with payload schemas: [developer.danipa.com/webhooks/events](https://developer.sandbox.danipa.com/webhooks/events).

## License

MIT.
