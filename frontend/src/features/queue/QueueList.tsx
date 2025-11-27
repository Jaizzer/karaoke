// Shared between the host dashboard and the member queue view — both poll
// the same GET /rooms/:code/queue endpoint and just differ in which items
// they're allowed to remove (see `canRemove`), and in how NowPlayingCard /
// UpNextList are arranged (HostDisplayPage puts UpNextList above the
// video player; QueueList's own default order is used everywhere else).
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

interface NowPlayingCardProps extends RemoveControls {
	item: QueueItem | undefined;
}

// `canRemove` is ownership-only (see MemberRoomPage/HostDashboard), not
// status-aware, so the same predicate that gates removing a still-queued
// song also gates stopping this one while it's playing — the host can
// always stop it, a guest only if they're the one who added it.
export function NowPlayingCard({
	item,
	canRemove,
	onRemove,
}: NowPlayingCardProps) {
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
					Now playing
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
					Stop
				</Button>
			)}
		</Card>
	);
}

interface UpNextListProps extends RemoveControls {
	items: QueueItem[];
}

export function UpNextList({ items, canRemove, onRemove }: UpNextListProps) {
	if (items.length === 0) {
		return <p className='text-sm text-text-muted'>Nothing queued yet.</p>;
	}

	return (
		<ul className='space-y-2'>
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
