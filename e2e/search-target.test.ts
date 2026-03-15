import { expect, test } from "@playwright/test";

test.describe("Search target switching", () => {
	test("target chips render on search results page", async ({ page }) => {
		await page.goto("/word/憲法");

		const targetChips = page.locator(".target-chip");
		const count = await targetChips.count();
		expect(count).toBe(3); // both, kokkai, teikoku
	});

	test("default target is 'both' (active chip)", async ({ page }) => {
		await page.goto("/word/憲法");

		const activeChip = page.locator(".target-chip.active");
		await expect(activeChip).toBeVisible();

		const text = await activeChip.textContent();
		expect(text).toContain("両方");
	});

	test("kokkai target shows only kokkai results", async ({ page }) => {
		await page.goto("/word/憲法?target=kokkai");

		const activeChip = page.locator(".target-chip.active");
		const text = await activeChip.textContent();
		expect(text).toContain("国会");

		// Results count should be visible
		const resultsCount = page.locator(".results-count");
		await expect(resultsCount).toBeVisible();
	});

	test("teikoku target shows only teikoku results", async ({ page }) => {
		await page.goto("/word/憲法?target=teikoku");

		const activeChip = page.locator(".target-chip.active");
		const text = await activeChip.textContent();
		expect(text).toContain("帝国議会");

		const resultsCount = page.locator(".results-count");
		await expect(resultsCount).toBeVisible();
	});

	test("target chips link to correct URLs", async ({ page }) => {
		await page.goto("/word/憲法");

		// kokkai chip should link with target=kokkai
		const kokkaiChip = page.locator(".target-chip").nth(1);
		const kokkaiHref = await kokkaiChip.getAttribute("href");
		expect(kokkaiHref).toContain("target=kokkai");

		// teikoku chip should link with target=teikoku
		const teikokuChip = page.locator(".target-chip").nth(2);
		const teikokuHref = await teikokuChip.getAttribute("href");
		expect(teikokuHref).toContain("target=teikoku");
	});

	test("target chips preserve date range params", async ({ page }) => {
		await page.goto("/word/憲法?from=2020-01-01&until=2024-12-31");

		const kokkaiChip = page.locator(".target-chip").nth(1);
		const href = await kokkaiChip.getAttribute("href");

		expect(href).toContain("target=kokkai");
		expect(href).toContain("from=2020-01-01");
		expect(href).toContain("until=2024-12-31");
	});

	test("switching target navigates correctly", async ({ page }) => {
		await page.goto("/word/憲法");

		// Click kokkai chip
		const kokkaiChip = page.locator(".target-chip").nth(1);
		await kokkaiChip.click();

		await page.waitForURL(/target=kokkai/);
		expect(page.url()).toContain("target=kokkai");

		// Active chip should now be kokkai
		const activeChip = page.locator(".target-chip.active");
		const text = await activeChip.textContent();
		expect(text).toContain("国会");
	});
});
