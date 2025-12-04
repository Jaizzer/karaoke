interface SwitchProps {
	checked: boolean;
	onChange: (checked: boolean) => void;
	disabled?: boolean;
	label: string;
	description?: string;
}

// Pill toggle used everywhere a boolean setting is exposed; the whole row is one <button>, not just the thumb.
export default function Switch({
	checked,
	onChange,
	disabled = false,
	label,
	description,
}: SwitchProps) {
	return (
		<button
			type='button'
			role='switch'
			aria-checked={checked}
			disabled={disabled}
			onClick={() => {
				onChange(!checked);
			}}
			className={`flex w-full items-center justify-between gap-4 text-left disabled:cursor-not-allowed ${
				disabled ? 'opacity-50' : ''
			}`}
		>
			<div>
				<p className='text-sm font-semibold text-text'>{label}</p>
				{description && (
					<p className='text-sm text-text-muted'>{description}</p>
				)}
			</div>
			<span
				className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
					checked ? 'bg-accent' : 'bg-border'
				}`}
			>
				<span
					className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
						checked ? 'translate-x-5' : 'translate-x-0'
					}`}
				/>
			</span>
		</button>
	);
}
