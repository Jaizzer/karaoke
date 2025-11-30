// The search -> pick -> queue flow, shared by both the host (cookie
// session, no sessionToken prop) and a guest (bearer token). useAiSearch/
// autoSelect are the searcher's own per-search choice, not room state —
// aiSearchAvailable (from the room) only controls whether the "Use AI
// search" checkbox is offered at all; the backend re-enforces that gate
// regardless of what this sends. When useAiSearch+autoSelect both apply,
// the backend returns a single best match and this queues it immediately
// (no confirmation step — that's the point of auto-select); otherwise up
// to 5 candidates are shown to pick from.
import { useState } from 'react';
import { apiFetch, ApiError } from '../../lib/api.ts';
import Card from '../../components/Card.tsx';
import Input from '../../components/Input.tsx';
import Button from '../../components/Button.tsx';

export interface SearchResult {
	videoId: string;
	title: string;
	channelTitle: string;
	thumbnailUrl: string;
	viewCount: number;
}

interface SearchResponse {
	results: SearchResult[];
	autoSelect: boolean;
}

interface SongSearchProps {
	code: string;
	sessionToken?: string;
	aiSearchAvailable: boolean;
	onQueued: () => void;
}

export default function SongSearch({
	code,
	sessionToken,
	aiSearchAvailable,
	onQueued,
}: SongSearchProps) {
	const [query, setQuery] = useState('');
	const [useAiSearch, setUseAiSearch] = useState(false);
	const [autoSelect, setAutoSelect] = useState(false);
	const [results, setResults] = useState<SearchResult[] | null>(null);
	const [status, setStatus] = useState<'idle' | 'searching' | 'queueing'>(
		'idle',
	);
	const [error, setError] = useState<string | null>(null);
	const [confirmation, setConfirmation] = useState<string | null>(null);

	const authHeaders = sessionToken
		? { Authorization: `Bearer ${sessionToken}` }
		: undefined;

	async function addToQueue(result: SearchResult) {
		await apiFetch(`/api/v1/rooms/${code}/queue`, {
			method: 'POST',
			headers: authHeaders,
			body: JSON.stringify({
				youtubeVideoId: result.videoId,
				title: result.title,
				channelTitle: result.channelTitle,
				thumbnailUrl: result.thumbnailUrl,
			}),
		});
		onQueued();
	}

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		setStatus('searching');
		setError(null);
		setResults(null);
		setConfirmation(null);
		try {
			const response = await apiFetch<SearchResponse>(
				`/api/v1/rooms/${code}/search`,
				{
					method: 'POST',
					headers: authHeaders,
					body: JSON.stringify({
						query,
						useAiSearch: aiSearchAvailable && useAiSearch,
						autoSelect,
					}),
				},
			);

			const [top] = response.results;
			if (response.autoSelect && top) {
				setStatus('queueing');
				await addToQueue(top);
				setConfirmation(`Added "${top.title}" to the queue.`);
				setQuery('');
				setStatus('idle');
				return;
			}

			setResults(response.results);
			setStatus('idle');
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: 'Something went wrong.',
			);
			setStatus('idle');
		}
	}

	async function handlePick(result: SearchResult) {
		setStatus('queueing');
		setError(null);
		try {
			await addToQueue(result);
			setConfirmation(`Added "${result.title}" to the queue.`);
			setResults(null);
			setQuery('');
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: 'Something went wrong.',
			);
		} finally {
			setStatus('idle');
		}
	}

	return (
		<Card className='space-y-4 p-4'>
			<form
				onSubmit={(event) => void handleSubmit(event)}
				className='flex gap-2'
			>
				<Input
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder='Song title, artist, or lyrics'
					required
					className='flex-1'
				/>
				<Button
					type='submit'
					disabled={status === 'searching' || status === 'queueing'}
				>
					{status === 'searching' ? 'Searching…' : 'Search'}
				</Button>
			</form>

			{aiSearchAvailable && (
				<div className='space-y-2'>
					<label className='flex items-center gap-2 text-sm text-text-muted'>
						<input
							type='checkbox'
							checked={useAiSearch}
							onChange={(event) => {
								setUseAiSearch(event.target.checked);
								if (!event.target.checked) {
									setAutoSelect(false);
								}
							}}
						/>
						Use AI search
					</label>
					{useAiSearch && (
						<label className='ml-6 flex items-center gap-2 text-sm text-text-muted'>
							<input
								type='checkbox'
								checked={autoSelect}
								onChange={(event) => {
									setAutoSelect(event.target.checked);
								}}
							/>
							Auto-select the best match
						</label>
					)}
				</div>
			)}

			{error && <p className='text-sm text-error'>{error}</p>}
			{confirmation && (
				<p className='text-sm text-success'>{confirmation}</p>
			)}

			{results && (
				<ul className='space-y-2'>
					{results.map((result) => (
						<li key={result.videoId}>
							<button
								type='button'
								onClick={() => void handlePick(result)}
								disabled={status === 'queueing'}
								className='flex w-full items-center gap-3 rounded-md border border-border p-2 text-left hover:border-accent disabled:cursor-not-allowed disabled:opacity-50'
							>
								<img
									src={result.thumbnailUrl}
									alt=''
									className='h-10 w-16 rounded object-cover'
								/>
								<div className='min-w-0 flex-1'>
									<p className='truncate text-sm font-medium text-text'>
										{result.title}
									</p>
									<p className='truncate text-xs text-text-muted'>
										{result.channelTitle}
									</p>
								</div>
							</button>
						</li>
					))}
				</ul>
			)}
		</Card>
	);
}
