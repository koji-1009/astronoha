import { expect, test } from "@playwright/test";

test.describe("Layout structure (CRZ Layer 1-2)", () => {
	test("header is present on all pages", async ({ page }) => {
		for (const path of ["/", "/about", "/settings", "/timeline"]) {
			await page.goto(path);
			await expect(page.locator("header.site-header")).toBeVisible();
		}
	});

	test("footer with attribution is present", async ({ page }) => {
		await page.goto("/");

		const footer = page.locator("footer.site-footer");
		await expect(footer).toBeVisible();

		const footerText = await footer.textContent();
		expect(footerText).toContain("国立国会図書館");
	});

	test("main content area exists", async ({ page }) => {
		await page.goto("/");

		const main = page.locator("main");
		await expect(main).toBeVisible();
	});

	test("ClientRouter (ViewTransition) is active", async ({ page }) => {
		await page.goto("/");

		// ClientRouter injects a meta tag when enabled
		const viewTransitionMeta = page.locator(
			"meta[name='astro-view-transitions-enabled']",
		);
		await expect(viewTransitionMeta).toHaveCount(1);
	});

	test("navigation links work without JavaScript", async ({ page }) => {
		// Disable JavaScript to test Layer 1
		await page.route("**/*.js", (route) => route.abort());

		await page.goto("/");

		// Navigation should still be rendered as HTML links
		const aboutLink = page.locator('a[href="/about"]');
		await expect(aboutLink).toBeVisible();
	});

	test("search form works without JavaScript (Layer 1)", async ({ page }) => {
		await page.goto("/");

		// Form should be a standard HTML form
		const form = page.locator("form[method='GET']");
		await expect(form).toBeVisible();

		// Input and button should be standard HTML elements
		const input = form.locator("input[type='text']");
		await expect(input).toBeVisible();

		const button = form.locator("button[type='submit']");
		await expect(button).toBeVisible();
	});
});
