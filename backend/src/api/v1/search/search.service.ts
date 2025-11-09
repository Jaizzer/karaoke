import { searchYoutube } from '../../../lib/youtube.ts';
import { rankCandidates } from '../../../lib/llm.ts';

// autoSelect on: the single best match, queued straight away. Off: up to 5
// ranked candidates for the guest to pick from themselves.
export async function searchSongs(query: string, autoSelect: boolean) {
	const candidates = await searchYoutube(query);
	const limit = autoSelect ? 1 : 5;
	return rankCandidates(query, candidates, limit);
}
