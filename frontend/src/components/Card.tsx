import type { ComponentProps } from 'react';

// Just a styled div, not clickable: style a <Link> directly for that instead. ComponentProps<'div'> (not
// HTMLAttributes) so ref is a valid prop too, for SongSearch's click-outside-to-dismiss handler.
export default function Card({
	className = '',
	...rest
}: ComponentProps<'div'>) {
	return (
		<div
			className={`rounded-lg border border-border bg-surface ${className}`}
			{...rest}
		/>
	);
}
