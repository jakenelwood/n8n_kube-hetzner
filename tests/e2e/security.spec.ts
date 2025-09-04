import { test, expect } from '@playwright/test';

test.describe('security headers', () => {
  test('common headers present on root', async ({ request, baseURL }) => {
    expect(baseURL).toBeTruthy();
    const res = await request.get(baseURL!);
    expect(res.status()).toBeLessThan(400);

    const headers = res.headers();
    // Required
    expect(headers['x-content-type-options']).toBe('nosniff');
    // Recommended (allow some provider variance)
    expect(headers['strict-transport-security'] || headers['strict-transport-security']).toBeTruthy();
    expect(headers['x-frame-options'] || headers['content-security-policy']).toBeTruthy();
    expect(headers['referrer-policy']).toBeTruthy();
    // Cache policy can vary by path; root should be cacheable or explicitly no-store
    expect(headers['cache-control']).toBeTruthy();
  });
});

