import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DanipaWebhook } from '../src/webhook.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Vendored copy of sdks/fixtures/webhook-hmac.json. Lives next to the test
// because Node's mirror (Danipa/node-sdk) re-runs npm test as part of its
// publish workflow, and the mirror's tree only contains sdks/node/ — not
// the cross-SDK sdks/fixtures/ dir. Source of truth still lives at
// sdks/fixtures/webhook-hmac.json; a CI guard (sdk-node-ci.yml) enforces
// byte-for-byte equality with that source file.
const FIXTURE_PATH = join(__dirname, 'webhook-hmac.fixture.json');
type Vector = {
  name: string;
  payload: string;
  secret: string;
  timestamp: number;
  expectedSignature: string;
};
const fixture: { vectors: Vector[] } = JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8'));

const SECRET = 'whsec_test_secret_for_unit_tests';
const PAYLOAD = '{"event":"payment.completed","amount":100}';

describe('DanipaWebhook.verify', () => {
  it('accepts a valid signature', () => {
    const ts = Math.floor(Date.now() / 1000);
    const sig = DanipaWebhook.computeSignature(PAYLOAD, SECRET, ts);
    expect(DanipaWebhook.verify(PAYLOAD, sig, String(ts), SECRET)).toBe(true);
  });

  it('rejects an invalid signature', () => {
    const ts = Math.floor(Date.now() / 1000);
    expect(DanipaWebhook.verify(PAYLOAD, 'sha256=0000', String(ts), SECRET)).toBe(false);
  });

  it('rejects an expired timestamp (replay window)', () => {
    const ts = Math.floor(Date.now() / 1000) - 600;
    const sig = DanipaWebhook.computeSignature(PAYLOAD, SECRET, ts);
    expect(DanipaWebhook.verify(PAYLOAD, sig, String(ts), SECRET)).toBe(false);
  });

  it('rejects a future-dated timestamp (replay window)', () => {
    const ts = Math.floor(Date.now() / 1000) + 600;
    const sig = DanipaWebhook.computeSignature(PAYLOAD, SECRET, ts);
    expect(DanipaWebhook.verify(PAYLOAD, sig, String(ts), SECRET)).toBe(false);
  });

  it('rejects empty inputs', () => {
    expect(DanipaWebhook.verify('', 'sig', '123', SECRET)).toBe(false);
    expect(DanipaWebhook.verify(PAYLOAD, '', '123', SECRET)).toBe(false);
    expect(DanipaWebhook.verify(PAYLOAD, 'sig', '', SECRET)).toBe(false);
    expect(DanipaWebhook.verify(PAYLOAD, 'sig', '123', '')).toBe(false);
  });
});

describe('DanipaWebhook.computeSignature', () => {
  it('produces sha256=<64-hex-chars>', () => {
    const sig = DanipaWebhook.computeSignature(PAYLOAD, SECRET, 1700000000);
    expect(sig).toMatch(/^sha256=[0-9a-f]{64}$/);
  });

  it('changes the signature when the timestamp changes', () => {
    const sig1 = DanipaWebhook.computeSignature(PAYLOAD, SECRET, 1700000000);
    const sig2 = DanipaWebhook.computeSignature(PAYLOAD, SECRET, 1700000001);
    expect(sig1).not.toBe(sig2);
  });

  // Cross-SDK fixture parity — every Danipa SDK (Node, Java, future PHP /
  // Python / Go) MUST produce the exact `expectedSignature` for each vector
  // in `sdks/fixtures/webhook-hmac.json`. Drift means a webhook will validate
  // in one SDK but reject in another — release-blocker.
  describe.each(fixture.vectors)('cross-SDK fixture: $name', (v) => {
    it('matches expectedSignature', () => {
      expect(DanipaWebhook.computeSignature(v.payload, v.secret, v.timestamp))
        .toBe(v.expectedSignature);
    });
  });
});
