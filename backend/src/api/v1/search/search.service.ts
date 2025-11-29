import { searchYoutube } from '../../../lib/youtube.ts';
import { rankCandidates } from '../../../lib/llm.ts';

// autoSelect on: the single best match, queued straight away. Off: up to 5
// candidates for the guest to pick from themselves.
export async function searchSongs(
	query: string,
	autoSelect: boolean,
	aiSearchEnabled: boolean,
	appendKaraoke: boolean,
) {
	// Biases results toward karaoke/instrumental versions, skipped if the guest already typed "karaoke" themselves.
	const youtubeQuery =
		appendKaraoke && !/karaoke/i.test(query) ? `${query} karaoke` : query;
	const candidates = await searchYoutube(youtubeQuery);
	const limit = autoSelect ? 1 : 5;

	// With AI search off, YouTube's own relevance order is the final
	// answer — no LLM call, so no dependency on its latency or availability.
	if (!aiSearchEnabled) {
		return candidates.slice(0, limit);
	}

	// Ranked against the guest's original query, not the karaoke-appended one, since that's what they actually asked for.
	return rankCandidates(query, candidates, limit);
}
