import { test, expect } from '@playwright/test';

test.describe('n8n site', () => {
  test('smoke: home loads with no console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    const failedResponses: { url: string; status: number }[] = [];
    page.on('response', async (res) => {
      const status = res.status();
      if (status >= 400) failedResponses.push({ url: res.url(), status });
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Heuristic: page has content and common n8n markers (do not hard-require marker)
    const html = await page.content();
    expect(html.length).toBeGreaterThan(1000);

    // Check there are no console errors and no failed network responses
    expect(consoleErrors, `console errors: ${consoleErrors.join('\n')}`).toHaveLength(0);
    expect(
      failedResponses,
      `failed network responses: ${JSON.stringify(failedResponses, null, 2)}`
    ).toHaveLength(0);
  });

  test('health endpoint returns 200', async ({ request, baseURL }) => {
    expect(baseURL).toBeTruthy();
    const res = await request.get(`${baseURL}/healthz`, { timeout: 10_000 });
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body.length).toBeGreaterThan(0);
  });

  test('http redirects to https when provided BASE_URL_HTTP', async ({ page }) => {
    const httpURL = process.env.BASE_URL_HTTP;
    test.skip(!httpURL, 'BASE_URL_HTTP not set');
    const response = await page.goto(httpURL!, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);
    expect(page.url()).toMatch(/^https:\/\//);
  });

  test('robots.txt and favicon are reachable (non-fatal if missing)', async ({ request, baseURL }) => {
    const robots = await request.get(`${baseURL}/robots.txt`);
    expect([200, 404]).toContain(robots.status());
    const favicon = await request.get(`${baseURL}/favicon.ico`);
    expect([200, 302, 404]).toContain(favicon.status());
  });
});

