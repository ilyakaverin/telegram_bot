export type ParsedQueryParams = Record<string, string>;
export type RequestLike = { text(): Promise<string> };
