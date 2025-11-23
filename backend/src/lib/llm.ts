import config from '../config/env.ts';
import ServiceNotConfiguredError from './serviceNotConfiguredError.ts';
import type { YoutubeCandidate } from './youtube.ts';

// A free-tier OpenRouter model, a cost-free stopgap; swap this (and nothing else here) to change provider/model.
const MODEL = 'nvidia/nemotron-3.5-lightning:free';
const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

interface SelectCandidatesInput {
	indices: number[];
}

interface OpenRouterToolCall {
	function: { arguments: string };
}

interface OpenRouterResponse {
	choices?: { message?: { tool_calls?: OpenRouterToolCall[] } }[];
}

// Ranks/filters results against the guest's original query using a forced tool call, so the response is indices, not text to parse.
export async function rankCandidates(
	query: string,
	candidates: YoutubeCandidate[],
	limit: number,
): Promise<YoutubeCandidate[]> {
	if (candidates.length === 0) {
		return [];
	}

	if (!config.openrouterApiKey) {
		throw new ServiceNotConfiguredError(
			'OPENROUTER_API_KEY is not configured.',
		);
	}

	const candidateList = candidates
		.map(
			(candidate, index) =>
				`${String(index)}. "${candidate.title}" — ${candidate.channelTitle} (${String(candidate.viewCount)} views)`,
		)
		.join('\n');

	const response = await fetch(ENDPOINT, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${config.openrouterApiKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			model: MODEL,
			messages: [
				{
					role: 'user',
					content: `A karaoke guest searched for: "${query}" — this may be misspelled, a lyric snippet, an artist name, or a song title. Here are YouTube search results:\n${candidateList}\n\nPick up to ${String(limit)} of these that best match what the guest is actually looking for, best match first. Prefer official audio/video, lyric videos, or karaoke/instrumental versions over unrelated content, reactions, or covers unless the query specifically asks for those. Use view count only as a tiebreaker.`,
				},
			],
			tools: [
				{
					type: 'function',
					function: {
						name: 'select_candidates',
						description:
							'Return the indices of the best-matching candidates, ranked best match first.',
						parameters: {
							type: 'object',
							properties: {
								indices: {
									type: 'array',
									items: { type: 'integer' },
									description: `Up to ${String(limit)} indices into the candidate list, ranked best match first.`,
								},
							},
							required: ['indices'],
						},
					},
				},
			],
			tool_choice: {
				type: 'function',
				function: { name: 'select_candidates' },
			},
		}),
	});

	if (!response.ok) {
		throw new Error(
			`OpenRouter request failed: ${String(response.status)} ${await response.text()}`,
		);
	}

	const data = (await response.json()) as OpenRouterResponse;
	const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
	if (!toolCall) {
		return candidates.slice(0, limit);
	}

	const { indices } = JSON.parse(
		toolCall.function.arguments,
	) as SelectCandidatesInput;
	const picked = indices
		.map((index) => candidates[index])
		.filter(
			(candidate): candidate is YoutubeCandidate =>
				candidate !== undefined,
		)
		.slice(0, limit);

	return picked.length > 0 ? picked : candidates.slice(0, limit);
}
