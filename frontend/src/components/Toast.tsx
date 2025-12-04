// A brief, self-dismissing notification — used where a message (e.g. "Added
// X to the queue") shouldn't permanently occupy layout space the way an
// inline <p> would.
import { useEffect } from 'react';

interface ToastProps {
	message: string;
	onDismiss: () => void;
	durationMs?: number;
}

export default function Toast({
	message,
	onDismiss,
	durationMs = 3000,
}: ToastProps) {
	useEffect(() => {
		const id = setTimeout(onDismiss, durationMs);
		return () => {
			clearTimeout(id);
		};
	}, [message, onDismiss, durationMs]);

	return (
		<div className='fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-success bg-surface-hover px-4 py-3 text-center text-sm font-medium text-success shadow-xl'>
			{message}
		</div>
	);
}
