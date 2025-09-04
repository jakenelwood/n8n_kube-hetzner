import { test, expect } from '@playwright/test';

test.describe('n8n API', () => {
  test('settings endpoint returns JSON', async ({ request, baseURL }) => {
    const url = `${baseURL}/rest/settings`;
    const res = await request.get(url);
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json).toBeTruthy();
    expect(typeof json).toBe('object');
    // basic shape checks (non-breaking)
    expect(json).toHaveProperty('endpointWebhook');
    expect(json).toHaveProperty('endpointWebhookTest');
  });

  test('healthz is healthy', async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/healthz`);
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body.length).toBeGreaterThan(0);
  });
});

