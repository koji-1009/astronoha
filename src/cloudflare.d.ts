declare module "cloudflare:workers" {
	const env: {
		HEATMAP_DB?: D1Database;
		[key: string]: unknown;
	};
}

// Cloudflare D1 types (subset used by this project)
interface D1Database {
	prepare(query: string): D1PreparedStatement;
	batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
	exec(query: string): Promise<D1ExecResult>;
}

interface D1PreparedStatement {
	bind(...values: unknown[]): D1PreparedStatement;
	first<T = unknown>(colName?: string): Promise<T | null>;
	run<T = unknown>(): Promise<D1Result<T>>;
	all<T = unknown>(): Promise<D1Result<T>>;
	raw<T = unknown[]>(): Promise<T[]>;
}

interface D1Result<T = unknown> {
	results: T[];
	success: boolean;
	meta: Record<string, unknown>;
}

interface D1ExecResult {
	count: number;
	duration: number;
}

// Cloudflare Workers extends CacheStorage with a `default` property.
// This is not part of the standard lib.dom CacheStorage type.
interface CacheStorage {
	readonly default: Cache;
}
