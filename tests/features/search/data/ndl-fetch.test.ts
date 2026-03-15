import {
	_resetRateLimitTimer,
	ndlFetch,
} from "../../../../src/features/search/data/ndl-fetch";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
	mockFetch.mockReset();
	_resetRateLimitTimer();
});

describe("ndlFetch", () => {
	it("fetches URL and returns response", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response("OK", { status: 200, headers: [["x-test", "1"]] }),
		);

		const res = await ndlFetch("https://example.com/api");
		expect(res.status).toBe(200);
		expect(await res.text()).toBe("OK");
		expect(mockFetch).toHaveBeenCalledTimes(1);
	});

	it("retries once on fetch failure", async () => {
		mockFetch
			.mockRejectedValueOnce(new Error("Network error"))
			.mockResolvedValueOnce(new Response("recovered", { status: 200 }));

		const res = await ndlFetch("https://example.com/api");
		expect(await res.text()).toBe("recovered");
		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	it("throws after retry exhausted", async () => {
		mockFetch
			.mockRejectedValueOnce(new Error("fail 1"))
			.mockRejectedValueOnce(new Error("fail 2"));

		await expect(ndlFetch("https://example.com/api")).rejects.toThrow("fail 2");
		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	it("converts timeout error to descriptive message", async () => {
		const timeoutError = new DOMException("Signal timed out", "TimeoutError");
		mockFetch
			.mockRejectedValueOnce(timeoutError)
			.mockRejectedValueOnce(timeoutError);

		await expect(ndlFetch("https://example.com/api")).rejects.toThrow(
			"NDL API request timed out after 10 seconds",
		);
	});

	it("passes AbortSignal.timeout to fetch", async () => {
		mockFetch.mockResolvedValueOnce(new Response("ok", { status: 200 }));

		await ndlFetch("https://example.com/api");

		const callArgs = mockFetch.mock.calls[0];
		expect(callArgs[1]).toHaveProperty("signal");
	});

	it("enforces rate limiting between requests", async () => {
		mockFetch.mockImplementation(
			async () => new Response("ok", { status: 200 }),
		);

		const start = Date.now();
		await ndlFetch("https://example.com/a");
		await ndlFetch("https://example.com/b");
		const elapsed = Date.now() - start;

		expect(elapsed).toBeGreaterThanOrEqual(900);
	}, 10000);

	it("returns non-OK responses without caching", async () => {
		mockFetch.mockResolvedValueOnce(
			new Response("error", { status: 500, statusText: "Server Error" }),
		);

		const res = await ndlFetch("https://example.com/api");
		expect(res.status).toBe(500);
		expect(await res.text()).toBe("error");
	});
});
