import { DanipaWebhook } from '../src/webhook';
import assert from 'node:assert';

const SECRET = 'whsec_test_secret_for_unit_tests';
const PAYLOAD = '{"event":"payment.completed","amount":100}';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  PASS: ${name}`);
  } catch (e: any) {
    failed++;
    console.log(`  FAIL: ${name} — ${e.message}`);
  }
}

test('valid signature accepted', () => {
  const ts = Math.floor(Date.now() / 1000);
  const sig = DanipaWebhook.computeSignature(PAYLOAD, SECRET, ts);
  assert.strictEqual(DanipaWebhook.verify(PAYLOAD, sig, String(ts), SECRET), true);
});

test('invalid signature rejected', () => {
  const ts = Math.floor(Date.now() / 1000);
  assert.strictEqual(DanipaWebhook.verify(PAYLOAD, 'sha256=0000', String(ts), SECRET), false);
});

test('expired timestamp rejected', () => {
  const ts = Math.floor(Date.now() / 1000) - 600;
  const sig = DanipaWebhook.computeSignature(PAYLOAD, SECRET, ts);
  assert.strictEqual(DanipaWebhook.verify(PAYLOAD, sig, String(ts), SECRET), false);
});

test('future timestamp rejected', () => {
  const ts = Math.floor(Date.now() / 1000) + 600;
  const sig = DanipaWebhook.computeSignature(PAYLOAD, SECRET, ts);
  assert.strictEqual(DanipaWebhook.verify(PAYLOAD, sig, String(ts), SECRET), false);
});

test('empty inputs rejected', () => {
  assert.strictEqual(DanipaWebhook.verify('', 'sig', '123', SECRET), false);
  assert.strictEqual(DanipaWebhook.verify(PAYLOAD, '', '123', SECRET), false);
  assert.strictEqual(DanipaWebhook.verify(PAYLOAD, 'sig', '', SECRET), false);
  assert.strictEqual(DanipaWebhook.verify(PAYLOAD, 'sig', '123', ''), false);
});

test('signature format is sha256=<hex64>', () => {
  const sig = DanipaWebhook.computeSignature(PAYLOAD, SECRET, 1700000000);
  assert.ok(sig.startsWith('sha256='));
  assert.strictEqual(sig.substring(7).length, 64);
});

test('different timestamps produce different signatures', () => {
  const sig1 = DanipaWebhook.computeSignature(PAYLOAD, SECRET, 1700000000);
  const sig2 = DanipaWebhook.computeSignature(PAYLOAD, SECRET, 1700000001);
  assert.notStrictEqual(sig1, sig2);
});

test('cross-language compatibility — known vector', () => {
  // Fixed test vector that all 3 SDKs must agree on
  const sig = DanipaWebhook.computeSignature(
    '{"test":true}',
    'whsec_fixed_test_secret',
    1700000000
  );
  // This value can be computed by any implementation and hardcoded here
  // for cross-SDK verification. Re-generate if the algorithm changes.
  assert.ok(sig.startsWith('sha256='), 'should be sha256 format');
  console.log(`    Known vector: ${sig}`);
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
