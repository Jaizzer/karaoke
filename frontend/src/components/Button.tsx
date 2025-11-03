import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: 'primary' | 'ghost';
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
	primary: 'bg-accent text-white hover:bg-accent-hover',
	ghost: 'bg-transparent text-text-muted border border-border hover:text-text hover:border-accent',
};

export default function Button({
	variant = 'primary',
	className = '',
	...rest
}: ButtonProps) {
	return (
		<button
			className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
			{...rest}
		/>
	);
}
