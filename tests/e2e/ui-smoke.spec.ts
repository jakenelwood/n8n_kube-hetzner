import { test, expect } from '@playwright/test';

test.describe('UI smoke', () => {
  test('loads app shell and primary nav', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // App shell renders
    const html = await page.content();
    expect(html.length).toBeGreaterThan(1000);

    // Look for generic n8n markers (toolbar, logo, or canvas)
    const markers = [
      page.locator('header'),
      page.locator('[data-test-id="ndv-editor"], [data-test-id="node-view"], canvas'),
      page.locator('img[alt*="n8n" i], svg[aria-label*="n8n" i]'),
    ];
    const anyVisible = await Promise.any(markers.map((m) => m.first().isVisible()));
    expect(anyVisible).toBeTruthy();

    expect(consoleErrors, `console errors: ${consoleErrors.join('\n')}`).toHaveLength(0);
  });
});

