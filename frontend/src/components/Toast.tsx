// Self-dismissing toast, positioned by the caller so it floats instead of taking up layout space; swipe to dismiss early.
import { useEffect, useState } from 'react';

interface ToastProps {
	message: string;
	onDismiss: () => void;
	durationMs?: number;
	className?: string;
}

const DISMISS_DISTANCE_PX = 80;
const FLY_OUT_DISTANCE_PX = 400;

export default function Toast({
	message,
	onDismiss,
	durationMs = 3000,
	className = '',
}: ToastProps) {
	const [dragStartX, setDragStartX] = useState<number | null>(null);
	const [dragX, setDragX] = useState(0);
	const [dismissing, setDismissing] = useState(false);

	useEffect(() => {
		if (dismissing) {
			return;
		}
		const id = setTimeout(onDismiss, durationMs);
		return () => {
			clearTimeout(id);
		};
	}, [message, onDismiss, durationMs, dismissing]);

	function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
		event.currentTarget.setPointerCapture(event.pointerId);
		setDragStartX(event.clientX);
	}

	function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
		if (dragStartX === null) {
			return;
		}
		setDragX(event.clientX - dragStartX);
	}

	function handlePointerUp() {
		if (dragStartX === null) {
			return;
		}
		if (Math.abs(dragX) > DISMISS_DISTANCE_PX) {
			setDismissing(true);
			setDragX(dragX > 0 ? FLY_OUT_DISTANCE_PX : -FLY_OUT_DISTANCE_PX);
			setTimeout(onDismiss, 200);
		} else {
			setDragX(0);
		}
		setDragStartX(null);
	}

	return (
		<div
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
			onPointerCancel={handlePointerUp}
			style={{
				transform: `translateX(${String(dragX)}px)`,
				opacity: dismissing
					? 0
					: 1 - Math.min(Math.abs(dragX) / FLY_OUT_DISTANCE_PX, 0.6),
				transition:
					dragStartX === null
						? 'transform 200ms ease-out, opacity 200ms ease-out'
						: 'none',
				touchAction: 'pan-y',
			}}
			className={`cursor-grab rounded-lg border border-success bg-surface-hover px-4 py-3 text-center text-sm font-medium text-success shadow-xl select-none active:cursor-grabbing ${className}`}
		>
			{message}
		</div>
	);
}
