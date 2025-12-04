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

// omitted by HostDashboard, only MemberRoomPage passes this, so only a guest sees
// their own songs picked out from everyone else's.
interface OwnershipHighlight {
	isOwn?: (item: QueueItem) => boolean;
}

// Only HostDashboard passes this, so only the host sees reorder arrows; queue.service.ts 409s past either end.
interface MoveControls {
	onMove?: (item: QueueItem, direction: 'up' | 'down') => void;
}

interface FeaturedQueueCardProps
	extends RemoveControls, MoveControls, OwnershipHighlight {
	item: QueueItem | undefined;
	label: string;
	actionLabel: string;
	// NextUpCard is always the first QUEUED item, so it can only ever move down
	// (into UpNextList); NowPlayingCard never reorders at all.
	canMoveUp?: boolean;
}

// canRemove is ownership-only, not status-aware, so the same predicate gates removing and stopping a song.
function FeaturedQueueCard({
	item,
	label,
	actionLabel,
	canRemove,
	onRemove,
	onMove,
	canMoveUp = false,
	isOwn,
}: FeaturedQueueCardProps) {
	if (!item) {
		return null;
	}

	return (
		<Card
			className={`flex items-center gap-3 p-4 ${isOwn?.(item) ? 'border-l-4 border-l-accent bg-accent/5' : ''}`}
		>
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
			{onMove && (
				<div className='flex flex-col gap-1'>
					{canMoveUp && (
						<button
							type='button'
							aria-label='Move up'
							onClick={() => {
								onMove(item, 'up');
							}}
							className='text-text-muted hover:text-text'
						>
							▲
						</button>
					)}
					<button
						type='button'
						aria-label='Move down'
						onClick={() => {
							onMove(item, 'down');
						}}
						className='text-text-muted hover:text-text'
					>
						▼
					</button>
				</div>
			)}
			{canRemove(item) && (
				<Button
					type='button'
					variant='ghost'
					className='w-20 px-2 py-1 text-xs'
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

interface SingleItemCardProps
	extends RemoveControls, MoveControls, OwnershipHighlight {
	item: QueueItem | undefined;
}

export function NowPlayingCard(props: SingleItemCardProps) {
	return (
		<FeaturedQueueCard {...props} label='Now playing' actionLabel='Stop' />
	);
}

export function NextUpCard({ onMove, ...props }: SingleItemCardProps) {
	return (
		<FeaturedQueueCard
			{...props}
			label='Up next'
			actionLabel='Remove'
			onMove={onMove}
		/>
	);
}

interface UpNextListProps
	extends RemoveControls, MoveControls, OwnershipHighlight {
	items: QueueItem[];
	// HostDashboard's queue competes for space and keeps the tighter default; MemberRoomPage passes a taller cap.
	maxHeightClassName?: string;
}

// Height-capped and scrollable since a queue can get long; holds everything beyond the one song in NextUpCard.
export function UpNextList({
	items,
	canRemove,
	onRemove,
	onMove,
	isOwn,
	maxHeightClassName = 'max-h-72',
}: UpNextListProps) {
	if (items.length === 0) {
		return <p className='text-sm text-text-muted'>Nothing queued yet.</p>;
	}

	return (
		<ul className={`${maxHeightClassName} space-y-2 overflow-y-auto pr-1`}>
			{items.map((item) => (
				<li key={item.id}>
					<Card
						className={`flex items-center gap-3 p-3 ${isOwn?.(item) ? 'border-l-4 border-l-accent bg-accent/5' : ''}`}
					>
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
						{onMove && (
							<div className='flex flex-col gap-1'>
								<button
									type='button'
									aria-label='Move up'
									onClick={() => {
										onMove(item, 'up');
									}}
									className='text-text-muted hover:text-text'
								>
									▲
								</button>
								<button
									type='button'
									aria-label='Move down'
									onClick={() => {
										onMove(item, 'down');
									}}
									className='text-text-muted hover:text-text'
								>
									▼
								</button>
							</div>
						)}
						{canRemove(item) && (
							<Button
								type='button'
								variant='ghost'
								className='w-20 px-2 py-1 text-xs'
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

interface QueueListProps extends RemoveControls, OwnershipHighlight {
	queueItems: QueueItem[];
}

export default function QueueList({
	queueItems,
	canRemove,
	onRemove,
	isOwn,
}: QueueListProps) {
	const nowPlaying = queueItems.find((item) => item.status === 'PLAYING');
	const upNext = queueItems.filter((item) => item.status === 'QUEUED');

	return (
		<div className='space-y-4'>
			<NowPlayingCard
				item={nowPlaying}
				canRemove={canRemove}
				onRemove={onRemove}
				isOwn={isOwn}
			/>
			<UpNextList
				items={upNext}
				canRemove={canRemove}
				onRemove={onRemove}
				isOwn={isOwn}
				maxHeightClassName='max-h-[60vh]'
			/>
		</div>
	);
}
