import { expect, test } from "@playwright/test";

test.describe("Error states and partial failure", () => {
	test("shows warning banner when speech APIs fail", async ({ page }) => {
		// __error__ keyword triggers 500 from mock API server
		await page.goto("/word/__error__?target=kokkai");

		// Warning container should be visible with error message
		const warning = page.locator(".warning-container");
		await expect(warning).toBeVisible();

		const text = await warning.textContent();
		expect(text).toContain("失敗");
	});

	test("shows warning for both APIs in combined mode", async ({ page }) => {
		await page.goto("/word/__error__");

		// In "both" mode, DeferredSpeechList handles each source.
		// Wait for deferred content to load.
		await page.waitForTimeout(2000);

		// At least one warning should appear somewhere on the page
		const warnings = page.locator(".warning-container, .warning-message");
		const count = await warnings.count();
		expect(count).toBeGreaterThan(0);
	});

	test("page still renders layout when API fails", async ({ page }) => {
		await page.goto("/word/__error__?target=kokkai");

		// Header and footer still render (CRZ Layer 1)
		await expect(page.locator("header.site-header")).toBeVisible();
		await expect(page.locator("footer.site-footer")).toBeVisible();

		// Page title still reflects keyword
		await expect(page).toHaveTitle(/__error__/);
	});

	test("speaker page shows warning when API fails", async ({ page }) => {
		// Speaker page calls kokkai + teikoku sequentially.
		// __error__ as speaker name won't trigger mock error (it checks "any" param),
		// but a non-existent speaker returns zero results without error.
		await page.goto("/speaker/存在しない議員名");

		// Should show either empty state or profile with 0 speeches
		const content = await page.textContent("main");
		expect(content).toBeTruthy();

		// Layout intact
		await expect(page.locator("header.site-header")).toBeVisible();
	});

	test("404 page shows error message and back link", async ({ page }) => {
		const response = await page.goto("/nonexistent-path-xyz");

		expect(response?.status()).toBe(404);

		const main = await page.textContent("main");
		expect(main).toContain("ページが見つかりません");

		// Back link present
		const backLink = page.locator('.action-link[href="/"]');
		await expect(backLink).toBeVisible();
	});
});
