import config from '../config/env.ts';
import ServiceNotConfiguredError from './serviceNotConfiguredError.ts';
import decodeHtmlEntities from './decodeHtmlEntities.ts';

export interface YoutubeCandidate {
	videoId: string;
	title: string;
	channelTitle: string;
	thumbnailUrl: string;
	viewCount: number;
}

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
// YouTube's free quota is 10,000 units/day; kept small to stretch that quota rather than maximize recall.
const MAX_RESULTS = 10;

interface YoutubeSearchResponse {
	items: {
		id: { videoId?: string };
		snippet: {
			title: string;
			channelTitle: string;
			thumbnails: {
				default: { url: string };
				medium?: { url: string };
			};
		};
	}[];
}

interface YoutubeVideosResponse {
	items: { id: string; statistics: { viewCount?: string } }[];
}

// Two calls: search.list finds candidates, videos.list fetches view counts as a ranking signal for llm.ts.
export async function searchYoutube(
	query: string,
): Promise<YoutubeCandidate[]> {
	if (!config.youtubeApiKey) {
		throw new ServiceNotConfiguredError(
			'YOUTUBE_API_KEY is not configured.',
		);
	}
	const apiKey = config.youtubeApiKey;

	const searchUrl = new URL(`${YOUTUBE_API_BASE}/search`);
	searchUrl.searchParams.set('part', 'snippet');
	searchUrl.searchParams.set('type', 'video');
	// Only embeddable videos, since the host plays them back via the
	// YouTube IFrame Player. A non-embeddable result would be a dead end.
	searchUrl.searchParams.set('videoEmbeddable', 'true');
	searchUrl.searchParams.set('maxResults', String(MAX_RESULTS));
	searchUrl.searchParams.set('q', query);
	searchUrl.searchParams.set('key', apiKey);

	const searchResponse = await fetch(searchUrl);
	if (!searchResponse.ok) {
		throw new Error(
			`YouTube search.list failed: ${String(searchResponse.status)}`,
		);
	}
	const searchBody = (await searchResponse.json()) as YoutubeSearchResponse;

	const videoIds = searchBody.items
		.map((item) => item.id.videoId)
		.filter((id): id is string => Boolean(id));
	if (videoIds.length === 0) {
		return [];
	}

	const statsUrl = new URL(`${YOUTUBE_API_BASE}/videos`);
	statsUrl.searchParams.set('part', 'statistics');
	statsUrl.searchParams.set('id', videoIds.join(','));
	statsUrl.searchParams.set('key', apiKey);

	const statsResponse = await fetch(statsUrl);
	if (!statsResponse.ok) {
		throw new Error(
			`YouTube videos.list failed: ${String(statsResponse.status)}`,
		);
	}
	const statsBody = (await statsResponse.json()) as YoutubeVideosResponse;
	const viewCountByVideoId = new Map(
		statsBody.items.map((item) => [
			item.id,
			Number(item.statistics.viewCount ?? 0),
		]),
	);

	return searchBody.items
		.filter(
			(item): item is typeof item & { id: { videoId: string } } =>
				item.id.videoId !== undefined,
		)
		.map((item) => ({
			videoId: item.id.videoId,
			title: decodeHtmlEntities(item.snippet.title),
			channelTitle: decodeHtmlEntities(item.snippet.channelTitle),
			thumbnailUrl:
				item.snippet.thumbnails.medium?.url ??
				item.snippet.thumbnails.default.url,
			viewCount: viewCountByVideoId.get(item.id.videoId) ?? 0,
		}));
}
