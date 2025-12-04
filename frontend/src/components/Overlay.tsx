// shared modal shell for every card-style popup (room code/QR, host settings, ai
// search card). closes on Escape, a backdrop click, or the built-in Close button.
import { useEffect, type ReactNode } from 'react';
import Card from './Card.tsx';
import Button from './Button.tsx';

interface OverlayProps {
	onClose: () => void;
	children: ReactNode;
}

export default function Overlay({ onClose, children }: OverlayProps) {
	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				onClose();
			}
		}
		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [onClose]);

	return (
		<div
			className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm'
			onClick={onClose}
		>
			<Card
				className='w-full max-w-sm space-y-4 p-6 text-center'
				onClick={(event) => {
					event.stopPropagation();
				}}
			>
				{children}
				<Button type='button' variant='ghost' onClick={onClose}>
					Close
				</Button>
			</Card>
		</div>
	);
}
