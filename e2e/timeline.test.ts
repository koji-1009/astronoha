import { expect, test } from "@playwright/test";

test.describe("Timeline index page (/timeline)", () => {
	test("renders page title and description", async ({ page }) => {
		await page.goto("/timeline");

		await expect(page).toHaveTitle(/タイムライン.*astronoha/);

		const title = page.locator("h1");
		await expect(title).toContainText("タイムライン");

		const description = page.locator(".page-description");
		await expect(description).toBeVisible();
	});

	test("displays era sections grouped by era", async ({ page }) => {
		await page.goto("/timeline");

		const eraSections = page.locator(".era-section");
		const count = await eraSections.count();
		expect(count).toBeGreaterThanOrEqual(4); // 明治, 大正, 昭和, 平成, 令和

		// Check for major eras
		const content = await page.textContent("main");
		expect(content).toContain("明治");
		expect(content).toContain("大正");
		expect(content).toContain("昭和");
		expect(content).toContain("平成");
		expect(content).toContain("令和");
	});

	test("period cards link to detail pages", async ({ page }) => {
		await page.goto("/timeline");

		const periodCards = page.locator(".period-card");
		const count = await periodCards.count();
		expect(count).toBeGreaterThan(0);

		// First card should link to /timeline/YYYY-MM
		const href = await periodCards.first().getAttribute("href");
		expect(href).toMatch(/^\/timeline\/\d{4}-\d{2}$/);
	});

	test("period cards display year-month and label", async ({ page }) => {
		await page.goto("/timeline");

		const firstCard = page.locator(".period-card").first();
		const periodValue = firstCard.locator(".period-value");
		const periodLabel = firstCard.locator(".period-label");

		await expect(periodValue).toBeVisible();
		await expect(periodLabel).toBeVisible();

		const value = await periodValue.textContent();
		expect(value).toMatch(/^\d{4}-\d{2}$/);
	});
});

test.describe("Timeline detail page (/timeline/[period])", () => {
	test("shows search form when no keyword", async ({ page }) => {
		await page.goto("/timeline/1947-05");

		await expect(page).toHaveTitle(/タイムライン/);

		// Breadcrumb should be present
		const breadcrumb = page.locator("nav[aria-label='パンくずリスト']");
		await expect(breadcrumb).toBeVisible();

		// Search form should be visible
		const searchInput = page.locator("#timeline-keyword");
		await expect(searchInput).toBeVisible();

		// Prompt message should appear
		const prompt = page.locator(".prompt-message");
		await expect(prompt).toBeVisible();
	});

	test("renders timeline entries with keyword", async ({ page }) => {
		await page.goto("/timeline/1947-05?q=憲法");

		await expect(page).toHaveTitle(/憲法.*タイムライン/);

		// Stats section should show speech and publication counts
		const stats = page.locator(".timeline-stats");
		await expect(stats).toBeVisible();

		const statValues = page.locator(".stat-value");
		const count = await statValues.count();
		expect(count).toBe(2); // speeches + publications
	});

	test("breadcrumb navigation works", async ({ page }) => {
		await page.goto("/timeline/1947-05?q=憲法");

		const breadcrumb = page.locator("nav[aria-label='パンくずリスト']");
		await expect(breadcrumb).toBeVisible();

		// Should contain links to top and timeline index
		await expect(breadcrumb.locator('a[href="/"]')).toBeVisible();
		await expect(breadcrumb.locator('a[href="/timeline"]')).toBeVisible();

		// Current page shown as text
		const current = breadcrumb.locator("[aria-current='page']");
		await expect(current).toBeVisible();
	});

	test("search form submits keyword", async ({ page }) => {
		await page.goto("/timeline/1947-05");

		await page.fill("#timeline-keyword", "憲法");
		await page.click('button[type="submit"]');

		await page.waitForURL(/\/timeline\/1947-05\?q=/);
		expect(page.url()).toContain("q=");
	});

	test("timeline entries show filter links", async ({ page }) => {
		await page.goto("/timeline/1947-05?q=憲法");

		const filterLinks = page.locator(".filter-link");
		const count = await filterLinks.count();
		expect(count).toBe(3); // all, speeches, publications
	});

	test("filter links preserve keyword param", async ({ page }) => {
		await page.goto("/timeline/1947-05?q=憲法");

		const speechesFilter = page.locator(".filter-link").nth(1);
		const href = await speechesFilter.getAttribute("href");

		expect(href).toContain("q=");
		expect(href).toContain("filter=speeches");
	});

	test("layout remains intact", async ({ page }) => {
		await page.goto("/timeline/1947-05?q=憲法");

		await expect(page.locator("header.site-header")).toBeVisible();
		await expect(page.locator("footer.site-footer")).toBeVisible();
	});
});
