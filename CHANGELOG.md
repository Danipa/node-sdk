# Changelog

## 0.1.0 — 2026-04-29 (unreleased)

Initial release. M1.5 of `DEVELOPER_PORTAL_FEATURE_GAPS`.

- `Danipa` client with auto-inferred sandbox/production base URL from API key prefix
- Resource modules: `collections`, `disbursements`, `wallets`, `paymentLinks`, `invoices`
- `DanipaWebhook.verify` / `computeSignature` for HMAC verification + replay-window enforcement
- 5xx + network retry with exponential backoff (3 attempts default)
- `X-Idempotency-Key` support on every mutating call
- Typed error envelope: `DanipaApiError` (4xx/5xx) and `DanipaNetworkError` (transport)
- ESM + CJS dual entry; types included
