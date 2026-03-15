import { expect, test } from "@playwright/test";

test.describe("Accessibility basics", () => {
	test("top page has h1 heading", async ({ page }) => {
		await page.goto("/");

		const h1 = page.locator("h1");
		await expect(h1).toBeVisible();
	});

	test("about page has semantic structure", async ({ page }) => {
		await page.goto("/about");

		// Should have headings
		const headings = page.locator("h1, h2, h3");
		const count = await headings.count();
		expect(count).toBeGreaterThan(0);
	});

	test("navigation has semantic nav element", async ({ page }) => {
		await page.goto("/");

		const nav = page.locator("nav");
		const count = await nav.count();
		expect(count).toBeGreaterThan(0);
	});

	test("interactive elements are keyboard accessible", async ({ page }) => {
		await page.goto("/");

		// Tab to the search input
		await page.keyboard.press("Tab");
		// Eventually we should reach the search input
		const focusedTag = await page.evaluate(() => {
			return document.activeElement?.tagName?.toLowerCase();
		});
		// Should focus on an interactive element (a, input, button)
		expect(["a", "input", "button"]).toContain(focusedTag);
	});

	test("buttons use semantic button elements", async ({ page }) => {
		await page.goto("/");

		// All clickable submit actions should be <button>, not <div>
		const submitButtons = page.locator('button[type="submit"]');
		const count = await submitButtons.count();
		expect(count).toBeGreaterThan(0);
	});

	test("links have discernible text", async ({ page }) => {
		await page.goto("/");

		const links = page.locator("a");
		const count = await links.count();

		for (let i = 0; i < Math.min(count, 20); i++) {
			const link = links.nth(i);
			const text = await link.textContent();
			const ariaLabel = await link.getAttribute("aria-label");
			const title = await link.getAttribute("title");

			// Each link should have either text content, aria-label, or title
			const hasAccessibleName =
				(text && text.trim().length > 0) ||
				(ariaLabel && ariaLabel.trim().length > 0) ||
				(title && title.trim().length > 0);
			expect(hasAccessibleName).toBe(true);
		}
	});
});
