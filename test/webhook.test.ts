import { describe, expect, it } from 'vitest';
import { DanipaWebhook } from '../src/webhook.js';

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

  it('matches the cross-SDK fixture for {"test":true} @ 1700000000', () => {
    // Fixed vector — every SDK (Node / Java / future PHP / Python) must
    // produce the same string for these inputs. Regenerate ONLY if the
    // signing algorithm changes; treat any unintended drift as a bug.
    const sig = DanipaWebhook.computeSignature(
      '{"test":true}',
      'whsec_fixed_test_secret',
      1700000000,
    );
    expect(sig).toBe('sha256=fa1ac332722a04bacd306e53df8eba930d488fbb821ef6ca0cc00041ab5bc140');
  });
});
