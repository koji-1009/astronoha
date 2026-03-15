import { expect, test } from "@playwright/test";

test.describe("Theme and design tokens", () => {
	test("pages inject MD3 color tokens", async ({ page }) => {
		await page.goto("/");

		// Color tokens should be injected via <style> in <head>
		const primaryColor = await page.evaluate(() => {
			return getComputedStyle(document.documentElement).getPropertyValue(
				"--md-sys-color-primary",
			);
		});
		expect(primaryColor.trim()).toBeTruthy();
		expect(primaryColor.trim()).toMatch(/^#[0-9a-fA-F]{6}$/);
	});

	test("global CSS defines spacing tokens", async ({ page }) => {
		await page.goto("/");

		const spacing4 = await page.evaluate(() => {
			return getComputedStyle(document.documentElement).getPropertyValue(
				"--md-sys-spacing-4",
			);
		});
		expect(spacing4.trim()).toBe("16px");
	});

	test("global CSS defines shape tokens", async ({ page }) => {
		await page.goto("/");

		const cornerMedium = await page.evaluate(() => {
			return getComputedStyle(document.documentElement).getPropertyValue(
				"--md-sys-shape-corner-medium",
			);
		});
		expect(cornerMedium.trim()).toBe("12px");
	});

	test("body uses system-ui font stack", async ({ page }) => {
		await page.goto("/");

		const fontFamily = await page.evaluate(() => {
			return getComputedStyle(document.body).fontFamily;
		});
		expect(fontFamily).toContain("system-ui");
	});

	test("page has correct lang attribute", async ({ page }) => {
		await page.goto("/");

		const lang = await page.getAttribute("html", "lang");
		expect(lang).toBe("ja");
	});

	test("page has viewport meta tag", async ({ page }) => {
		await page.goto("/");

		const viewport = page.locator('meta[name="viewport"]');
		await expect(viewport).toHaveAttribute("content", /width=device-width/);
	});
});
