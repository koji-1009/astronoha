import {
	_getBaseUrl,
	getThumbnailUrl,
} from "../../../../src/features/search/data/ndl-thumbnail";

describe("getThumbnailUrl", () => {
	it("constructs correct URL for ISBN", () => {
		const url = getThumbnailUrl("978-4-12-206864-3");
		expect(url).toBe("https://ndlsearch.ndl.go.jp/thumbnail/978-4-12-206864-3");
	});

	it("constructs correct URL for JP number", () => {
		const url = getThumbnailUrl("JP95048312");
		expect(url).toBe("https://ndlsearch.ndl.go.jp/thumbnail/JP95048312");
	});

	it("encodes special characters in identifier", () => {
		const url = getThumbnailUrl("test/identifier");
		expect(url).toBe("https://ndlsearch.ndl.go.jp/thumbnail/test%2Fidentifier");
	});

	it("throws on empty identifier", () => {
		expect(() => getThumbnailUrl("")).toThrow("Identifier must not be empty");
	});

	it("uses correct base URL", () => {
		expect(_getBaseUrl()).toBe("https://ndlsearch.ndl.go.jp/thumbnail");
	});
});
