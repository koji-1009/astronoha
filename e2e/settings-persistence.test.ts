import { expect, test } from "@playwright/test";

test.describe("Settings persistence", () => {
	test("dark mode selection persists across navigation", async ({ page }) => {
		await page.goto("/settings");

		// Select dark mode
		const darkRadio = page.locator('input[name="colorMode"][value="dark"]');
		await darkRadio.check();

		// Verify data-color-mode is set on <html>
		const mode = await page.getAttribute("html", "data-color-mode");
		expect(mode).toBe("dark");

		// Navigate to another page
		await page.goto("/about");

		// data-color-mode should persist (set from localStorage before render)
		const modeAfterNav = await page.getAttribute("html", "data-color-mode");
		expect(modeAfterNav).toBe("dark");
	});

	test("light mode selection persists across navigation", async ({ page }) => {
		await page.goto("/settings");

		const lightRadio = page.locator('input[name="colorMode"][value="light"]');
		await lightRadio.check();

		const mode = await page.getAttribute("html", "data-color-mode");
		expect(mode).toBe("light");

		await page.goto("/");

		const modeAfterNav = await page.getAttribute("html", "data-color-mode");
		expect(modeAfterNav).toBe("light");
	});

	test("system mode removes data-color-mode attribute", async ({ page }) => {
		await page.goto("/settings");

		// First set dark mode
		await page.locator('input[name="colorMode"][value="dark"]').check();
		expect(await page.getAttribute("html", "data-color-mode")).toBe("dark");

		// Then switch back to system
		await page.locator('input[name="colorMode"][value="system"]').check();

		const mode = await page.getAttribute("html", "data-color-mode");
		expect(mode).toBeNull();
	});

	test("autoSummary checkbox state is saved", async ({ page }) => {
		await page.goto("/settings");

		const checkbox = page.locator('input[name="autoSummary"]');

		// Check autoSummary
		await checkbox.check();
		expect(await checkbox.isChecked()).toBe(true);

		// Reload page — state should be restored from localStorage
		await page.reload();

		const checkboxAfterReload = page.locator('input[name="autoSummary"]');
		expect(await checkboxAfterReload.isChecked()).toBe(true);
	});

	test("settings page loads saved state", async ({ page }) => {
		// Set localStorage before visiting settings
		await page.goto("/");
		await page.evaluate(() => {
			localStorage.setItem("astronoha_colorMode", "dark");
			localStorage.setItem("astronoha_autoSummary", "true");
		});

		await page.goto("/settings");

		// Dark mode radio should be checked
		const darkRadio = page.locator('input[name="colorMode"][value="dark"]');
		expect(await darkRadio.isChecked()).toBe(true);

		// autoSummary checkbox should be checked
		const checkbox = page.locator('input[name="autoSummary"]');
		expect(await checkbox.isChecked()).toBe(true);
	});
});
