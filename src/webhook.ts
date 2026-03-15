import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Danipa webhook signature verification.
 *
 * Verifies that incoming webhook payloads are authentic by checking the
 * HMAC-SHA256 signature in the `X-Danipa-Signature` header.
 *
 * @example
 * ```typescript
 * import { DanipaWebhook } from '@danipa/sdk/webhook';
 *
 * app.post('/webhooks', (req, res) => {
 *   const isValid = DanipaWebhook.verify(
 *     req.body,                              // raw body string
 *     req.headers['x-danipa-signature'],
 *     req.headers['x-danipa-timestamp'],
 *     process.env.DANIPA_WEBHOOK_SECRET!
 *   );
 *
 *   if (!isValid) {
 *     return res.status(401).json({ error: 'Invalid signature' });
 *   }
 *
 *   // Process the webhook event
 *   const event = JSON.parse(req.body);
 *   res.status(200).json({ received: true });
 * });
 * ```
 */
export class DanipaWebhook {
  /** Maximum allowed age for a webhook timestamp (5 minutes). */
  static readonly REPLAY_WINDOW_SECONDS = 300;

  /**
   * Verify a webhook signature.
   *
   * @param payload   - The raw JSON request body (string, not parsed)
   * @param signature - The `X-Danipa-Signature` header (e.g., `sha256=abcdef...`)
   * @param timestamp - The `X-Danipa-Timestamp` header (epoch seconds)
   * @param secret    - The endpoint signing secret (starts with `whsec_`)
   * @returns `true` if the signature is valid and the timestamp is within the replay window
   */
  static verify(
    payload: string,
    signature: string,
    timestamp: string,
    secret: string
  ): boolean {
    if (!payload || !signature || !timestamp || !secret) {
      return false;
    }

    // Check replay window
    const ts = parseInt(timestamp, 10);
    if (isNaN(ts)) return false;

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - ts) > this.REPLAY_WINDOW_SECONDS) {
      return false;
    }

    // Compute expected signature
    const expected = this.computeSignature(payload, secret, ts);

    // Constant-time comparison
    try {
      const expectedBuf = Buffer.from(expected, 'utf-8');
      const actualBuf = Buffer.from(signature, 'utf-8');
      if (expectedBuf.length !== actualBuf.length) return false;
      return timingSafeEqual(expectedBuf, actualBuf);
    } catch {
      return false;
    }
  }

  /**
   * Compute the expected signature for a payload.
   *
   * @param payload            - The raw JSON payload
   * @param secret             - The signing secret
   * @param timestampEpochSecs - The timestamp in epoch seconds
   * @returns The signature string in format `sha256=<hex>`
   */
  static computeSignature(
    payload: string,
    secret: string,
    timestampEpochSecs: number
  ): string {
    const signedContent = `${timestampEpochSecs}.${payload}`;
    const hmac = createHmac('sha256', secret)
      .update(signedContent, 'utf-8')
      .digest('hex');
    return `sha256=${hmac}`;
  }
}

export default DanipaWebhook;
