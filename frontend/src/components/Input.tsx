import type { InputHTMLAttributes } from 'react';

// promoted to a shared component once a third consumer (ResetPasswordPage) was about
// to duplicate the className string, same "promote on third use" rule as Card/Button/Badge.
export default function Input({
	className = '',
	...rest
}: InputHTMLAttributes<HTMLInputElement>) {
	return (
		<input
			className={`block w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-dim focus:border-accent focus:outline-none ${className}`}
			{...rest}
		/>
	);
}
