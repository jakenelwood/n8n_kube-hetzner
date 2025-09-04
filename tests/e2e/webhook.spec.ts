import { test, expect } from '@playwright/test';

// Gate: requires a pre-created test webhook URL or the ability to create one.
// Option A: supply WEBHOOK_TEST_URL directly for a running webhook workflow.
// Option B (advanced): create a workflow dynamically (not implemented here by default).
const WEBHOOK_TEST_URL = process.env.WEBHOOK_TEST_URL;

test.describe('webhook (gated)', () => {
  test.skip(!WEBHOOK_TEST_URL, 'Set WEBHOOK_TEST_URL to enable webhook test');

  test('webhook responds 2xx to POST', async ({ request }) => {
    const payload = { e2e: true, at: Date.now() };
    const res = await request.post(WEBHOOK_TEST_URL!, {
      data: payload,
      timeout: 20_000,
    });
    expect(res.status(), await res.text()).toBeLessThan(400);
  });
});

