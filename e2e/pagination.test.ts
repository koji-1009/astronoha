import { expect, test } from "@playwright/test";

test.describe("Pagination", () => {
	test("pagination nav renders for multi-page results", async ({ page }) => {
		// Fixture has numberOfRecords: 182725 with pageSize 20 → many pages
		await page.goto("/word/憲法?target=kokkai");

		const pagination = page.locator("nav[aria-label='ページナビゲーション']");
		await expect(pagination).toBeVisible();
	});

	test("current page is highlighted", async ({ page }) => {
		await page.goto("/word/憲法?target=kokkai");

		const currentPage = page.locator("[aria-current='page']");
		await expect(currentPage).toBeVisible();

		const text = await currentPage.textContent();
		expect(text?.trim()).toBe("1");
	});

	test("next page link navigates correctly", async ({ page }) => {
		await page.goto("/word/憲法?target=kokkai");

		const nextLink = page.locator("a[aria-label='次のページ']");
		await expect(nextLink).toBeVisible();

		const href = await nextLink.getAttribute("href");
		expect(href).toContain("page=2");
	});

	test("previous link is disabled on first page", async ({ page }) => {
		await page.goto("/word/憲法?target=kokkai");

		// On first page, prev should be a span (disabled), not a link
		const disabledPrev = page.locator("[aria-disabled='true']");
		const count = await disabledPrev.count();
		expect(count).toBeGreaterThan(0);
	});

	test("pagination preserves query params", async ({ page }) => {
		await page.goto(
			"/word/憲法?target=kokkai&from=2020-01-01&until=2024-12-31",
		);

		const nextLink = page.locator("a[aria-label='次のページ']");
		const href = await nextLink.getAttribute("href");

		// Should preserve from, until, and target params
		expect(href).toContain("from=2020-01-01");
		expect(href).toContain("until=2024-12-31");
		expect(href).toContain("target=kokkai");
	});
});
