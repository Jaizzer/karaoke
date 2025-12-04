// Search -> pick -> queue flow, shared by the host (cookie session) and a guest (bearer token). useAiSearch/
// autoSelect are the searcher's own choice; a single best match queues immediately, otherwise up to 5 candidates float below the search bar.
import { useEffect, useRef, useState } from 'react';
import { apiFetch, ApiError } from '../../lib/api.ts';
import {
	getAiSearchPreferences,
	setAiSearchPreferences,
} from '../../lib/aiSearchPreferences.ts';
import Card from '../../components/Card.tsx';
import Input from '../../components/Input.tsx';
import Button from '../../components/Button.tsx';
import Switch from '../../components/Switch.tsx';
import Overlay from '../../components/Overlay.tsx';
import Toast from '../../components/Toast.tsx';

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
	const [useAiSearch, setUseAiSearch] = useState(
		() => getAiSearchPreferences().useAiSearch,
	);
	const [autoSelect, setAutoSelect] = useState(
		() => getAiSearchPreferences().autoSelect,
	);
	const [showAiCard, setShowAiCard] = useState(false);

	useEffect(() => {
		setAiSearchPreferences({ useAiSearch, autoSelect });
	}, [useAiSearch, autoSelect]);
	const [results, setResults] = useState<SearchResult[] | null>(null);
	const [status, setStatus] = useState<'idle' | 'searching' | 'queueing'>(
		'idle',
	);
	const [error, setError] = useState<string | null>(null);
	const [confirmation, setConfirmation] = useState<string | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// The results dropdown floats over the page; without this listener it'd sit open forever, blocking clicks underneath.
	useEffect(() => {
		if (!results) {
			return;
		}
		function handlePointerDown(event: MouseEvent) {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setResults(null);
			}
		}
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				setResults(null);
			}
		}
		document.addEventListener('mousedown', handlePointerDown);
		window.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('mousedown', handlePointerDown);
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [results]);

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
		<Card ref={containerRef} className='relative space-y-3 p-4'>
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
				<button
					type='button'
					aria-label='AI search settings'
					disabled={!aiSearchAvailable}
					onClick={() => {
						setShowAiCard(true);
					}}
					className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:border disabled:border-border disabled:bg-transparent disabled:text-text-muted disabled:opacity-40 ${
						useAiSearch && aiSearchAvailable
							? 'ai-glow text-accent'
							: 'border border-border bg-surface text-text-muted hover:border-accent hover:text-text'
					}`}
				>
					<svg
						viewBox='0 0 24 24'
						fill='currentColor'
						className='h-4 w-4'
					>
						<path d='M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z' />
						<path d='M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14z' />
					</svg>
					AI
				</button>
				<Button
					type='submit'
					disabled={status === 'searching' || status === 'queueing'}
				>
					{status === 'searching' ? 'Searching…' : 'Search'}
				</Button>
			</form>

			{error && <p className='text-sm text-error'>{error}</p>}
			{confirmation && (
				<Toast
					message={confirmation}
					onDismiss={() => {
						setConfirmation(null);
					}}
				/>
			)}

			{/* floats over whatever's below instead of pushing it down, absolutely
			positioned against the Card's own relative frame. */}
			{results && (
				<ul className='absolute top-full right-0 left-0 z-40 mt-1 max-h-80 space-y-2 overflow-y-auto rounded-lg border-2 border-accent bg-surface-hover p-2 shadow-xl'>
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

			{showAiCard && (
				<Overlay
					onClose={() => {
						setShowAiCard(false);
					}}
				>
					<h2 className='text-lg font-bold text-text'>AI search</h2>

					<Switch
						label='Use AI search'
						description="Rank/filter results with an LLM instead of using YouTube's own order."
						checked={useAiSearch}
						onChange={(checked) => {
							setUseAiSearch(checked);
							if (!checked) {
								setAutoSelect(false);
							}
						}}
					/>

					{useAiSearch && (
						<Switch
							label='Auto-select the best match'
							description='Skip the picker — queue the single best match automatically.'
							checked={autoSelect}
							onChange={(checked) => {
								setAutoSelect(checked);
							}}
						/>
					)}
				</Overlay>
			)}
		</Card>
	);
}
