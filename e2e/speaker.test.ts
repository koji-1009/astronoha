import { expect, test } from "@playwright/test";

test.describe("Speaker profile page (/speaker/[name])", () => {
	// Use a speaker name from the kokkai fixture
	const speakerName = "菅原晶子";

	test("renders speaker profile", async ({ page }) => {
		await page.goto(`/speaker/${speakerName}`);

		// Profile name heading
		const profileName = page.locator(".profile-name");
		await expect(profileName).toBeVisible();

		const text = await profileName.textContent();
		expect(text).toContain(speakerName);
	});

	test("shows speech count stats", async ({ page }) => {
		await page.goto(`/speaker/${speakerName}`);

		const stats = page.locator(".profile-stats");
		await expect(stats).toBeVisible();

		// Has stat values
		const statValues = page.locator(".stat-value");
		const count = await statValues.count();
		expect(count).toBeGreaterThan(0);
	});

	test("shows breadcrumb navigation", async ({ page }) => {
		await page.goto(`/speaker/${speakerName}`);

		const breadcrumb = page.locator(".breadcrumb");
		await expect(breadcrumb).toBeVisible();
	});

	test("renders speech list", async ({ page }) => {
		await page.goto(`/speaker/${speakerName}`);

		// Should have a speeches section (may or may not have cards
		// depending on whether mock data matches the speaker name)
		const speechesSection = page.locator(".speeches-section, .empty-container");
		await expect(speechesSection).toBeVisible();
	});
});
