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

	test("shows attribution footer", async ({ page }) => {
		await page.goto("/word/憲法");

		const attribution = page.locator(".results-footer");
		await expect(attribution).toBeVisible();

		const text = await attribution.textContent();
		expect(text).toContain("国立国会図書館");
	});

	test("heatmap section renders", async ({ page }) => {
		await page.goto("/word/憲法");

		const heatmap = page.locator(".heatmap-section");
		await expect(heatmap).toBeVisible();
	});

	test("speech card links to detail page", async ({ page }) => {
		await page.goto("/word/憲法");

		const firstCard = page.locator(".speech-card").first();
		const href = await firstCard.getAttribute("href");

		// Link should point to /word/憲法/{speechId}
		expect(href).toMatch(/^\/word\/.*\//);
	});
});
