import { readFileSync } from "node:fs";
import { join } from "node:path";
import { _resetRateLimitTimer } from "../../../../src/features/search/data/ndl-fetch";
import {
	parseOpenSearchResponse,
	parseSruResponse,
	searchBooks,
	searchBooksByYear,
} from "../../../../src/features/search/data/ndl-search";

const fixturesDir = join(__dirname, "../../../fixtures");

const openSearchXml = readFileSync(
	join(fixturesDir, "ndl-search-response.xml"),
	"utf-8",
);
const sruXml = readFileSync(join(fixturesDir, "ndl-sru-response.xml"), "utf-8");

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
	mockFetch.mockReset();
	_resetRateLimitTimer();
});

describe("parseOpenSearchResponse", () => {
	it("parses valid RSS XML response", () => {
		const result = parseOpenSearchResponse(openSearchXml);

		expect(result.totalResults).toBe(150445);
		expect(result.startIndex).toBe(1);
		expect(result.itemsPerPage).toBe(2);
		expect(result.items).toHaveLength(2);
	});

	it("extracts book details from items", () => {
		const result = parseOpenSearchResponse(openSearchXml);

		const firstBook = result.items[0];
		expect(firstBook.title).toBe("アーカイブズ学研究");
		expect(firstBook.link).toBe(
			"https://ndlsearch.ndl.go.jp/books/R100000002-I000007464904-i31187989",
		);
		expect(firstBook.author).toBe(
			"日本アーカイブズ学会,日本アーカイブズ学会 編",
		);
		expect(firstBook.publisher).toBe("日本アーカイブズ学会");
		expect(firstBook.date).toBe("2022");
	});

	it("extracts NDLBibID as identifier", () => {
		const result = parseOpenSearchResponse(openSearchXml);

		const firstBook = result.items[0];
		expect(firstBook.identifier).toBe("000007464904");
	});

	it("handles XML entities in content", () => {
		const xmlWithEntities = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:openSearch="http://a9.com/-/spec/opensearchrss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <openSearch:totalResults>1</openSearch:totalResults>
    <openSearch:startIndex>1</openSearch:startIndex>
    <openSearch:itemsPerPage>1</openSearch:itemsPerPage>
    <item>
      <title>A &amp; B の研究</title>
      <link>https://example.com</link>
      <description>&lt;b&gt;bold&lt;/b&gt; テスト</description>
    </item>
  </channel>
</rss>`;

		const result = parseOpenSearchResponse(xmlWithEntities);
		expect(result.items[0].title).toBe("A & B の研究");
		expect(result.items[0].description).toBe("<b>bold</b> テスト");
	});

	it("handles empty results", () => {
		const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:openSearch="http://a9.com/-/spec/opensearchrss/1.0/">
  <channel>
    <openSearch:totalResults>0</openSearch:totalResults>
    <openSearch:startIndex>1</openSearch:startIndex>
    <openSearch:itemsPerPage>0</openSearch:itemsPerPage>
  </channel>
</rss>`;

		const result = parseOpenSearchResponse(emptyXml);
		expect(result.totalResults).toBe(0);
		expect(result.items).toHaveLength(0);
	});

	it("handles missing optional fields in items", () => {
		const minimalXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:openSearch="http://a9.com/-/spec/opensearchrss/1.0/">
  <channel>
    <openSearch:totalResults>1</openSearch:totalResults>
    <openSearch:startIndex>1</openSearch:startIndex>
    <openSearch:itemsPerPage>1</openSearch:itemsPerPage>
    <item>
      <title>最小限の書籍</title>
      <link>https://example.com/book</link>
    </item>
  </channel>
</rss>`;

		const result = parseOpenSearchResponse(minimalXml);
		expect(result.items[0].title).toBe("最小限の書籍");
		expect(result.items[0].author).toBeUndefined();
		expect(result.items[0].isbn).toBeUndefined();
		expect(result.items[0].date).toBeUndefined();
	});
});

describe("parseSruResponse", () => {
	it("parses valid SRU XML response", () => {
		const result = parseSruResponse(sruXml);

		expect(result.totalResults).toBe(11419);
		expect(result.items).toHaveLength(2);
	});

	it("extracts book details from SRU records", () => {
		const result = parseSruResponse(sruXml);

		const firstBook = result.items[0];
		expect(firstBook.title).toBe("アーカイブズ学研究");
		expect(firstBook.author).toBe("日本アーカイブズ学会 編");
		expect(firstBook.publisher).toBe("日本アーカイブズ学会");
	});

	it("handles empty SRU response", () => {
		const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<searchRetrieveResponse xmlns="http://www.loc.gov/zing/srw/">
  <version>1.2</version>
  <numberOfRecords>0</numberOfRecords>
  <records></records>
</searchRetrieveResponse>`;

		const result = parseSruResponse(emptyXml);
		expect(result.totalResults).toBe(0);
		expect(result.items).toHaveLength(0);
	});
});

describe("searchBooks", () => {
	it("constructs correct URL for OpenSearch", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(openSearchXml, { status: 200 }),
		);

		await searchBooks("憲法");

		expect(mockFetch).toHaveBeenCalledOnce();
		const calledUrl = mockFetch.mock.calls[0][0] as string;
		expect(calledUrl).toContain("ndlsearch.ndl.go.jp/api/opensearch");
		expect(calledUrl).toContain("any=%E6%86%B2%E6%B3%95");
	});

	it("passes count and startIndex options", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(openSearchXml, { status: 200 }),
		);

		await searchBooks("憲法", { count: 20, startIndex: 11 });

		const calledUrl = mockFetch.mock.calls[0][0] as string;
		expect(calledUrl).toContain("cnt=20");
		expect(calledUrl).toContain("idx=11");
	});

	it("parses response correctly", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(openSearchXml, { status: 200 }),
		);

		const result = await searchBooks("憲法");
		expect(result.totalResults).toBe(150445);
		expect(result.items).toHaveLength(2);
		expect(result.items[0].title).toBe("アーカイブズ学研究");
	});

	it("throws on HTTP error", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(null, {
				status: 500,
				statusText: "Internal Server Error",
			}),
		);

		await expect(searchBooks("テスト")).rejects.toThrow(
			"NDL Search API request failed: 500 Internal Server Error",
		);
	});

	it("throws on HTTP 503", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(null, {
				status: 503,
				statusText: "Service Unavailable",
			}),
		);

		await expect(searchBooks("テスト")).rejects.toThrow(
			"NDL Search API request failed: 503 Service Unavailable",
		);
	});

	it("omits count and startIndex when not provided", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(openSearchXml, { status: 200 }),
		);

		await searchBooks("テスト");

		const calledUrl = mockFetch.mock.calls[0][0] as string;
		expect(calledUrl).not.toContain("cnt=");
		expect(calledUrl).not.toContain("idx=");
	});
});

describe("searchBooksByYear", () => {
	it("constructs correct URL for SRU with year range", async () => {
		mockFetch.mockResolvedValueOnce(new Response(sruXml, { status: 200 }));

		await searchBooksByYear("民主主義", 1920, 1930);

		expect(mockFetch).toHaveBeenCalledOnce();
		const calledUrl = mockFetch.mock.calls[0][0] as string;
		expect(calledUrl).toContain("ndlsearch.ndl.go.jp/api/sru");
		expect(calledUrl).toContain("operation=searchRetrieve");
		expect(decodeURIComponent(calledUrl)).toContain("民主主義");
		expect(decodeURIComponent(calledUrl)).toContain("1920");
		expect(decodeURIComponent(calledUrl)).toContain("1930");
	});

	it("passes maximumRecords and startRecord options", async () => {
		mockFetch.mockResolvedValueOnce(new Response(sruXml, { status: 200 }));

		await searchBooksByYear("民主主義", 1920, 1930, {
			count: 5,
			startIndex: 6,
		});

		const calledUrl = mockFetch.mock.calls[0][0] as string;
		expect(calledUrl).toContain("maximumRecords=5");
		expect(calledUrl).toContain("startRecord=6");
	});

	it("parses SRU response correctly", async () => {
		mockFetch.mockResolvedValueOnce(new Response(sruXml, { status: 200 }));

		const result = await searchBooksByYear("民主主義", 1920, 1930);
		expect(result.totalResults).toBe(11419);
		expect(result.items).toHaveLength(2);
	});

	it("throws on HTTP error", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response(null, { status: 400, statusText: "Bad Request" }),
		);

		await expect(searchBooksByYear("テスト", 2000, 2010)).rejects.toThrow(
			"NDL Search SRU API request failed: 400 Bad Request",
		);
	});
});
