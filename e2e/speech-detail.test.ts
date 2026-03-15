import { expect, test } from "@playwright/test";

test.describe("Speech detail page (/word/[keyword]/[speechId])", () => {
	// Use a speech ID from the kokkai fixture
	const speechId = "122104024X00620260303_054";

	test("renders speech content", async ({ page }) => {
		await page.goto(`/word/憲法/${speechId}`);

		// Speech body is visible
		const speechBody = page.locator(".speech-body");
		await expect(speechBody).toBeVisible();

		const bodyText = await speechBody.textContent();
		expect(bodyText?.length).toBeGreaterThan(0);
	});

	test("shows breadcrumb navigation", async ({ page }) => {
		await page.goto(`/word/憲法/${speechId}`);

		const breadcrumb = page.locator(".breadcrumb");
		await expect(breadcrumb).toBeVisible();

		// Breadcrumb links back to search results
		const searchLink = breadcrumb.locator('a[href*="/word/"]');
		await expect(searchLink).toBeVisible();
	});

	test("shows speaker information", async ({ page }) => {
		await page.goto(`/word/憲法/${speechId}`);

		const speakerName = page.locator(".speech-speaker-name");
		await expect(speakerName).toBeVisible();

		const text = await speakerName.textContent();
		expect(text?.trim().length).toBeGreaterThan(0);
	});

	test("shows speech metadata", async ({ page }) => {
		await page.goto(`/word/憲法/${speechId}`);

		// House badge
		await expect(page.locator(".speech-house")).toBeVisible();
		// Meeting name
		await expect(page.locator(".speech-meeting")).toBeVisible();
	});

	test("has source links to NDL", async ({ page }) => {
		await page.goto(`/word/憲法/${speechId}`);

		const sourceLink = page.locator(".source-link").first();
		await expect(sourceLink).toBeVisible();

		const href = await sourceLink.getAttribute("href");
		expect(href).toContain("ndl.go.jp");
	});

	test("shows attribution", async ({ page }) => {
		await page.goto(`/word/憲法/${speechId}`);

		const footer = page.locator(".page-footer");
		await expect(footer).toBeVisible();

		const text = await footer.textContent();
		expect(text).toContain("国立国会図書館");
	});
});
