import type { HTMLAttributes } from 'react';

// The one bordered-surface container every page/feature composes with,
// instead of each component hand-writing its own `rounded border p-4`
// string. Deliberately just a styled `div` — for a *clickable* card (the
// hub's game links), style a <Link> directly with matching classes rather
// than forcing navigation semantics through this component.
export default function Card({
	className = '',
	...rest
}: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={`rounded-lg border border-border bg-surface ${className}`}
			{...rest}
		/>
	);
}
