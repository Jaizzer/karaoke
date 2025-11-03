// Thin fetch wrapper for the backend's non-auth routes; auth routes go through authClient.ts instead. `path`
// resolves against the page's own origin (see authClient.ts for why requests stay same-origin).
export class ApiError extends Error {
	// Can't use a constructor parameter property here since tsconfig's erasableSyntaxOnly rejects that TS-only syntax.
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

export async function apiFetch<T>(
	path: string,
	options: RequestInit = {},
): Promise<T> {
	const response = await fetch(path, {
		...options,
		credentials: 'include',
		headers: { 'Content-Type': 'application/json', ...options.headers },
	});

	const body: unknown = await response.json();

	if (!response.ok) {
		const message =
			typeof body === 'object' && body !== null && 'message' in body
				? String((body as { message: unknown }).message)
				: response.statusText;
		throw new ApiError(response.status, message);
	}

	return body as T;
}
