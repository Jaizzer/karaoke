import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from './api.ts';

// The realtime-sync mechanism this app uses instead of WebSockets, since a karaoke queue doesn't need
// sub-second sync and this keeps the backend fully stateless (Vercel-serverless-compatible).
export function usePolling<T>(path: string | null, intervalMs: number) {
	const [data, setData] = useState<T | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [refetchNonce, setRefetchNonce] = useState(0);

	useEffect(() => {
		if (!path) {
			return;
		}
		const url = path;
		let cancelled = false;

		async function poll() {
			try {
				const result = await apiFetch<T>(url);
				if (!cancelled) {
					setData(result);
					setError(null);
				}
			} catch (caught) {
				if (!cancelled) {
					setError(
						caught instanceof ApiError
							? caught.message
							: 'Something went wrong.',
					);
				}
			}
		}

		void poll();
		const id = setInterval(() => void poll(), intervalMs);
		return () => {
			cancelled = true;
			clearInterval(id);
		};
		// refetchNonce only exists to be bumped, re-running this effect whenever the caller wants a fetch sooner.
	}, [path, intervalMs, refetchNonce]);

	// Memoized so callers can put `refetch` in their own effect dependency
	// arrays without triggering a re-run on every render.
	const refetch = useCallback(() => {
		setRefetchNonce((n) => n + 1);
	}, []);

	return { data, error, refetch };
}
