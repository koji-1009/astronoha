import { expect, test } from "@playwright/test";

test.describe("Search results page (/word/[keyword])", () => {
	test("renders search results with speech list", async ({ page }) => {
		await page.goto("/word/憲法");

		// Page title includes keyword
		await expect(page).toHaveTitle(/憲法/);

		// Results header shows count
		const header = page.locator(".results-header");
		await expect(header).toBeVisible();

		// Speech list renders
		const speechCards = page.locator(".speech-card");
		const count = await speechCards.count();
		expect(count).toBeGreaterThan(0);
	});

	test("speech cards have correct structure", async ({ page }) => {
		await page.goto("/word/憲法");

		const firstCard = page.locator(".speech-card").first();
		await expect(firstCard).toBeVisible();

		// Each card has metadata: house badge, date, speaker
		await expect(firstCard.locator(".speech-house")).toBeVisible();
		await expect(firstCard.locator(".speech-speaker")).toBeVisible();
	});

	test("shows attribution in site footer", async ({ page }) => {
		await page.goto("/word/憲法");

		const footer = page.locator("footer.site-footer");
		await expect(footer).toBeVisible();

		const text = await footer.textContent();
		expect(text).toContain("国立国会図書館");
	});

	test("heatmap link renders", async ({ page }) => {
		await page.goto("/word/憲法");

		const heatmapLink = page.locator(".heatmap-link");
		await expect(heatmapLink).toBeVisible();
	});

	test("speech card links to detail page", async ({ page }) => {
		await page.goto("/word/憲法");

		const firstCard = page.locator(".speech-card").first();
		const href = await firstCard.getAttribute("href");

		// Link should point to /word/憲法/{speechId}
		expect(href).toMatch(/^\/word\/.*\//);
	});
});
