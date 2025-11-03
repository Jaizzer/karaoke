export default function AuthHero() {
	return (
		<svg
			className='pointer-events-none absolute inset-0 -z-10 h-full w-full'
			viewBox='0 0 800 600'
			preserveAspectRatio='xMidYMid slice'
			aria-hidden='true'
		>
			<defs>
				<pattern
					id='dot-grid'
					width='32'
					height='32'
					patternUnits='userSpaceOnUse'
				>
					<circle cx='2' cy='2' r='1.5' fill='#8b949e' opacity='0.25' />
				</pattern>
			</defs>
			<rect width='800' height='600' fill='url(#dot-grid)' />

			{/* Soft accent blobs. */}
			<circle cx='120' cy='120' r='180' fill='#3b82f6' opacity='0.08' />
			<circle cx='680' cy='480' r='220' fill='#3b82f6' opacity='0.06' />
		</svg>
	);
}
