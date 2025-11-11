// Wraps the YouTube IFrame Player API. Loading iframe_api and onYouTubeIframeAPIReady is API
// boilerplate, not React state, so it lives outside the component as a module-level singleton.
import { useEffect, useRef } from 'react';

let apiReadyPromise: Promise<void> | null = null;
function loadYoutubeApi(): Promise<void> {
	apiReadyPromise ??= new Promise((resolve) => {
		// window.YT doesn't exist until the script below has loaded at least once,
		// hence the optional chaining instead of a direct property access.
		if (window.YT?.Player) {
			resolve();
			return;
		}
		const previousCallback: (() => void) | undefined =
			window.onYouTubeIframeAPIReady;
		window.onYouTubeIframeAPIReady = () => {
			previousCallback?.();
			resolve();
		};
		const script = document.createElement('script');
		script.src = 'https://www.youtube.com/iframe_api';
		document.head.appendChild(script);
	});
	return apiReadyPromise;
}

interface YoutubePlayerProps {
	videoId: string;
	onEnded: () => void;
}

export default function YoutubePlayer({
	videoId,
	onEnded,
}: YoutubePlayerProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const playerRef = useRef<YT.Player | null>(null);
	// Lets the mount effect close over the latest onEnded without re-running it (and recreating the player) on every change.
	const onEndedRef = useRef(onEnded);
	useEffect(() => {
		onEndedRef.current = onEnded;
	}, [onEnded]);

	useEffect(() => {
		let cancelled = false;
		void loadYoutubeApi().then(() => {
			if (cancelled || !containerRef.current) {
				return;
			}
			playerRef.current = new window.YT.Player(containerRef.current, {
				videoId,
				events: {
					onStateChange: (event) => {
						if (event.data === window.YT.PlayerState.ENDED) {
							onEndedRef.current();
						}
					},
				},
			});
		});

		return () => {
			cancelled = true;
			playerRef.current?.destroy();
			playerRef.current = null;
		};
		// Recreates the player whenever videoId changes rather than calling
		// loadVideoById on the existing instance — simplest way to guarantee
		// onEnded fires exactly once per song. onEndedRef (a ref) doesn't need
		// to be listed — its identity is stable across renders.
	}, [videoId]);

	return <div ref={containerRef} className='aspect-video w-full bg-black' />;
}
