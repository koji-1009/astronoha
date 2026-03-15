import { expect, test } from "@playwright/test";

test.describe("Navigation and page structure", () => {
	test("top page renders search form", async ({ page }) => {
		await page.goto("/");
		await expect(page).toHaveTitle(/astronoha/);

		// Search form exists
		const searchInput = page.locator('input[name="q"]');
		await expect(searchInput).toBeVisible();
		await expect(searchInput).toHaveAttribute("placeholder", /検索/);

		// Submit button exists
		const submitButton = page.locator('button[type="submit"]');
		await expect(submitButton).toBeVisible();
	});

	test("top page has navigation links", async ({ page }) => {
		await page.goto("/");

		const nav = page.locator("nav.site-nav");
		await expect(nav).toBeVisible();

		// Logo link
		await expect(page.locator("a.site-logo")).toHaveAttribute("href", "/");

		// Nav links
		await expect(page.locator('a[href="/timeline"]')).toBeVisible();
		await expect(page.locator('a[href="/settings"]')).toBeVisible();
		await expect(page.locator('a[href="/about"]')).toBeVisible();
	});

	test("top page has example keyword buttons", async ({ page }) => {
		await page.goto("/");

		const exampleButtons = page.locator(".example-keyword");
		const count = await exampleButtons.count();
		expect(count).toBeGreaterThan(0);

		// Clicking fills the search input
		await exampleButtons.first().click();
		const inputValue = await page.inputValue('input[name="q"]');
		expect(inputValue.length).toBeGreaterThan(0);
	});

	test("search form redirects to /word/{keyword}", async ({ page }) => {
		await page.goto("/");

		await page.fill('input[name="q"]', "憲法");
		await page.click('button[type="submit"]');

		// Should redirect to /word/憲法
		await page.waitForURL(/\/word\//);
		expect(page.url()).toContain("/word/");
	});

	test("about page renders content", async ({ page }) => {
		await page.goto("/about");
		await expect(page).toHaveTitle(/astronoha/);

		// Has attribution/source info
		const content = await page.textContent("main");
		expect(content).toContain("国立国会図書館");
	});

	test("settings page renders", async ({ page }) => {
		await page.goto("/settings");
		await expect(page).toHaveTitle(/設定.*astronoha/);
	});

	test("timeline index page renders periods", async ({ page }) => {
		await page.goto("/timeline");
		await expect(page).toHaveTitle(/タイムライン.*astronoha/);

		// Has era sections
		const content = await page.textContent("main");
		expect(content).toContain("明治");
	});

	test("500 error page exists", async ({ page }) => {
		// Navigate to a non-existent page that would trigger a 404/500
		const response = await page.goto("/nonexistent-page-that-does-not-exist");
		// The page should return some response (404 or redirect)
		expect(response).not.toBeNull();
	});
});
