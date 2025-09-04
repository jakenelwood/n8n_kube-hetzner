import { test, expect } from '@playwright/test';

// Gate: requires ability to create/edit workflows (n8n app auth if enabled)
const RUN_WORKFLOW_CRUD = process.env.RUN_WORKFLOW_CRUD === '1';

test.describe('workflow CRUD (gated)', () => {
  test.skip(!RUN_WORKFLOW_CRUD, 'Set RUN_WORKFLOW_CRUD=1 to enable workflow CRUD tests');

  test('create, execute manual workflow, and delete', async ({ page }) => {
    const wfName = `e2e-auto-${Date.now()}`;

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // If app login is enabled, allow a custom hook via JS snippet
    // Provide a global function in the app if needed; otherwise this step is a no-op.
    // Alternatively, rely on basic auth (handled via httpCredentials in config).

    // Click "New workflow" (label may vary slightly across versions)
    const newButton = page.locator('button:has-text("New workflow")');
    if (await newButton.isVisible()) {
      await newButton.click();
    }

    // Set name
    const nameInput = page.locator('[data-test-id="workflow-name-input"], input[placeholder*="workflow name" i]');
    if (await nameInput.isVisible()) {
      await nameInput.fill(wfName);
    }

    // Add a Manual Trigger node via keyboard or UI menu
    await page.keyboard.press('Control+K').catch(() => {});
    const palette = page.locator('[role="dialog"], [data-test-id*="node-creator"], [data-modal]');
    await palette.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await page.keyboard.type('manual');
    await page.keyboard.press('Enter').catch(() => {});

    // Save workflow
    const saveBtn = page.locator('button:has-text("Save")');
    if (await saveBtn.isVisible()) await saveBtn.click();

    // Run once / Execute workflow
    const executeBtn = page.locator('button:has-text("Execute") , button:has-text("Run once")');
    await executeBtn.first().click();

    // Expect successful execution indicator
    const successBadge = page.locator('[data-test-id*="execution-success"], [class*="success" i]');
    await expect(successBadge.first()).toBeVisible({ timeout: 30_000 });

    // Delete workflow: open menu and delete
    const menuBtn = page.locator('button:has-text("Menu"), [aria-label*="menu" i]');
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      const deleteItem = page.locator('text=Delete');
      if (await deleteItem.isVisible()) await deleteItem.click();
      const confirm = page.locator('button:has-text("Delete")');
      if (await confirm.isVisible()) await confirm.click();
    }

    // Verify no error toast
    const errorToast = page.locator('[role="alert"]:has-text("error" i)');
    await expect(errorToast).toHaveCount(0);
  });
});

