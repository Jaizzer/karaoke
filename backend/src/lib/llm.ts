import Anthropic from '@anthropic-ai/sdk';
import config from '../config/env.ts';
import ServiceNotConfiguredError from './serviceNotConfiguredError.ts';
import type { YoutubeCandidate } from './youtube.ts';

// Haiku is plenty for this — it's a classification/ranking call over a
// short candidate list, not open-ended reasoning.
const MODEL = 'claude-haiku-4-5';

let client: Anthropic | undefined;
function getClient(): Anthropic {
	if (!config.anthropicApiKey) {
		throw new ServiceNotConfiguredError(
			'ANTHROPIC_API_KEY is not configured.',
		);
	}
	client ??= new Anthropic({ apiKey: config.anthropicApiKey });
	return client;
}

interface SelectCandidatesInput {
	indices: number[];
}

// Ranks/filters YouTube search results against the guest's original query
// (title/artist/lyric snippet, typos and all) using a forced tool call —
// `strict: true` guarantees the response is a well-formed list of indices,
// not free-form text this has to parse.
export async function rankCandidates(
	query: string,
	candidates: YoutubeCandidate[],
	limit: number,
): Promise<YoutubeCandidate[]> {
	if (candidates.length === 0) {
		return [];
	}

	const anthropic = getClient();
	const candidateList = candidates
		.map(
			(candidate, index) =>
				`${String(index)}. "${candidate.title}" — ${candidate.channelTitle} (${String(candidate.viewCount)} views)`,
		)
		.join('\n');

	const response = await anthropic.messages.create({
		model: MODEL,
		max_tokens: 256,
		messages: [
			{
				role: 'user',
				content: `A karaoke guest searched for: "${query}" — this may be misspelled, a lyric snippet, an artist name, or a song title. Here are YouTube search results:\n${candidateList}\n\nPick up to ${String(limit)} of these that best match what the guest is actually looking for, best match first. Prefer official audio/video, lyric videos, or karaoke/instrumental versions over unrelated content, reactions, or covers unless the query specifically asks for those. Use view count only as a tiebreaker.`,
			},
		],
		tools: [
			{
				name: 'select_candidates',
				description:
					'Return the indices of the best-matching candidates, ranked best match first.',
				input_schema: {
					type: 'object',
					properties: {
						indices: {
							type: 'array',
							items: { type: 'integer' },
							description: `Up to ${String(limit)} indices into the candidate list, ranked best match first.`,
						},
					},
					required: ['indices'],
					additionalProperties: false,
				},
				strict: true,
			},
		],
		tool_choice: { type: 'tool', name: 'select_candidates' },
	});

	// TypeScript narrows this to the ToolUseBlock variant directly from the
	// `.type === 'tool_use'` predicate, so `toolUse.input` below is already
	// known-typed without a second check.
	const toolUse = response.content.find((block) => block.type === 'tool_use');
	if (!toolUse) {
		return candidates.slice(0, limit);
	}

	const { indices } = toolUse.input as SelectCandidatesInput;
	const picked = indices
		.map((index) => candidates[index])
		.filter(
			(candidate): candidate is YoutubeCandidate =>
				candidate !== undefined,
		)
		.slice(0, limit);

	return picked.length > 0 ? picked : candidates.slice(0, limit);
}
