// Shared between the host dashboard and member queue view; they differ only in canRemove and layout
// (HostDashboard splits out a featured NextUpCard, everywhere else just stacks NowPlayingCard + UpNextList).
import Card from '../../components/Card.tsx';
import Button from '../../components/Button.tsx';

export interface QueueItem {
	id: string;
	youtubeVideoId: string;
	title: string;
	channelTitle: string;
	thumbnailUrl: string;
	status: 'QUEUED' | 'PLAYING' | 'PLAYED' | 'REMOVED';
	addedById: string;
}

interface RemoveControls {
	canRemove: (item: QueueItem) => boolean;
	onRemove: (item: QueueItem) => void;
}

interface FeaturedQueueCardProps extends RemoveControls {
	item: QueueItem | undefined;
	label: string;
	actionLabel: string;
}

// canRemove is ownership-only, not status-aware, so the same predicate gates removing and stopping a song.
function FeaturedQueueCard({
	item,
	label,
	actionLabel,
	canRemove,
	onRemove,
}: FeaturedQueueCardProps) {
	if (!item) {
		return null;
	}

	return (
		<Card className='flex items-center gap-3 p-4'>
			<img
				src={item.thumbnailUrl}
				alt=''
				className='h-12 w-20 rounded object-cover'
			/>
			<div className='min-w-0 flex-1'>
				<p className='text-xs font-semibold tracking-wide text-accent uppercase'>
					{label}
				</p>
				<p className='truncate text-sm font-semibold text-text'>
					{item.title}
				</p>
				<p className='truncate text-xs text-text-muted'>
					{item.channelTitle}
				</p>
			</div>
			{canRemove(item) && (
				<Button
					type='button'
					variant='ghost'
					className='px-2 py-1 text-xs'
					onClick={() => {
						onRemove(item);
					}}
				>
					{actionLabel}
				</Button>
			)}
		</Card>
	);
}

interface SingleItemCardProps extends RemoveControls {
	item: QueueItem | undefined;
}

export function NowPlayingCard(props: SingleItemCardProps) {
	return (
		<FeaturedQueueCard {...props} label='Now playing' actionLabel='Stop' />
	);
}

export function NextUpCard(props: SingleItemCardProps) {
	return (
		<FeaturedQueueCard {...props} label='Up next' actionLabel='Remove' />
	);
}

interface UpNextListProps extends RemoveControls {
	items: QueueItem[];
}

// Height-capped and scrollable since a queue can get long; holds everything beyond the one song in NextUpCard.
export function UpNextList({ items, canRemove, onRemove }: UpNextListProps) {
	if (items.length === 0) {
		return <p className='text-sm text-text-muted'>Nothing queued yet.</p>;
	}

	return (
		<ul className='max-h-72 space-y-2 overflow-y-auto pr-1'>
			{items.map((item) => (
				<li key={item.id}>
					<Card className='flex items-center gap-3 p-3'>
						<img
							src={item.thumbnailUrl}
							alt=''
							className='h-10 w-16 rounded object-cover'
						/>
						<div className='min-w-0 flex-1'>
							<p className='truncate text-sm font-medium text-text'>
								{item.title}
							</p>
							<p className='truncate text-xs text-text-muted'>
								{item.channelTitle}
							</p>
						</div>
						{canRemove(item) && (
							<Button
								type='button'
								variant='ghost'
								className='px-2 py-1 text-xs'
								onClick={() => {
									onRemove(item);
								}}
							>
								Remove
							</Button>
						)}
					</Card>
				</li>
			))}
		</ul>
	);
}

interface QueueListProps extends RemoveControls {
	queueItems: QueueItem[];
}

export default function QueueList({
	queueItems,
	canRemove,
	onRemove,
}: QueueListProps) {
	const nowPlaying = queueItems.find((item) => item.status === 'PLAYING');
	const upNext = queueItems.filter((item) => item.status === 'QUEUED');

	return (
		<div className='space-y-4'>
			<NowPlayingCard
				item={nowPlaying}
				canRemove={canRemove}
				onRemove={onRemove}
			/>
			<UpNextList
				items={upNext}
				canRemove={canRemove}
				onRemove={onRemove}
			/>
		</div>
	);
}
