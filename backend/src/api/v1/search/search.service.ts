import { searchYoutube } from '../../../lib/youtube.ts';
import { rankCandidates } from '../../../lib/llm.ts';

// useAiSearch on: candidates get LLM-ranked/filtered, autoSelect further picks the single best match instead
// of a top-5. useAiSearch off: just YouTube's own top 5, no LLM call; autoSelect then has no effect.
export async function searchSongs(
	query: string,
	appendKaraoke: boolean,
	useAiSearch: boolean,
	autoSelect: boolean,
) {
	// Biases results toward karaoke/instrumental versions, skipped if the guest already typed "karaoke" themselves.
	const youtubeQuery =
		appendKaraoke && !/karaoke/i.test(query) ? `${query} karaoke` : query;
	const candidates = await searchYoutube(youtubeQuery);

	if (!useAiSearch) {
		return candidates.slice(0, 5);
	}

	const limit = autoSelect ? 1 : 5;
	// Ranked against the guest's original query, not the karaoke-appended one, since that's what they actually asked for.
	return rankCandidates(query, candidates, limit);
}
