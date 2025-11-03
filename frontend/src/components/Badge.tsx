import type { HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
	tone?:
		| 'default'
		| 'accent'
		| 'success'
		| 'error'
		| 'gold'
		| 'silver'
		| 'bronze';
}

const TONE_CLASSES: Record<NonNullable<BadgeProps['tone']>, string> = {
	default: 'bg-surface-hover text-text-muted border-border',
	accent: 'bg-accent/15 text-accent border-accent/30',
	success: 'bg-success/15 text-success border-success/30',
	error: 'bg-error/15 text-error border-error/30',
	gold: 'bg-rank-gold/15 text-rank-gold border-rank-gold/30',
	silver: 'bg-rank-silver/15 text-rank-silver border-rank-silver/30',
	bronze: 'bg-rank-bronze/15 text-rank-bronze border-rank-bronze/30',
};

export default function Badge({
	tone = 'default',
	className = '',
	...rest
}: BadgeProps) {
	return (
		<span
			className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${TONE_CLASSES[tone]} ${className}`}
			{...rest}
		/>
	);
}
