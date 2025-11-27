// Wraps the YouTube IFrame Player API. Loading iframe_api and onYouTubeIframeAPIReady is API
// boilerplate, not React state, so it lives outside the component as a module-level singleton.
import { useEffect, useRef, useState } from 'react';

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
	videoId: string | undefined;
	onEnded: () => void;
}

export default function YoutubePlayer({
	videoId,
	onEnded,
}: YoutubePlayerProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const playerRef = useRef<YT.Player | null>(null);
	const readyRef = useRef(false);
	const [isPlaying, setIsPlaying] = useState(false);

	// Lets the mount effect close over the latest onEnded without re-running it (and recreating the player) on every change.
	const onEndedRef = useRef(onEnded);
	useEffect(() => {
		onEndedRef.current = onEnded;
	}, [onEnded]);

	// Same reasoning: read once by onReady, so it sees whichever song is current when the IFrame API finishes loading.
	const videoIdRef = useRef(videoId);
	useEffect(() => {
		videoIdRef.current = videoId;
	}, [videoId]);

	// Created once for the component's lifetime; switching songs calls loadVideoById on this same instance
	// (avoids the black-flash rebuffer of rebuilding the iframe). Player vars are set once here at creation.
	useEffect(() => {
		let cancelled = false;
		void loadYoutubeApi().then(() => {
			if (cancelled || !containerRef.current) {
				return;
			}
			playerRef.current = new window.YT.Player(containerRef.current, {
				playerVars: {
					controls: 0,
					rel: 0,
					modestbranding: 1,
					cc_load_policy: 0,
					iv_load_policy: 3,
				},
				events: {
					onReady: () => {
						readyRef.current = true;
						if (videoIdRef.current) {
							playerRef.current?.loadVideoById(
								videoIdRef.current,
							);
						}
					},
					onStateChange: (event) => {
						setIsPlaying(
							event.data === window.YT.PlayerState.PLAYING,
						);
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
			readyRef.current = false;
		};
	}, []);

	// Swaps the loaded video when the queue changes (no-op until onReady fires); stops playback when nothing's queued.
	useEffect(() => {
		if (!readyRef.current) {
			return;
		}
		if (videoId) {
			playerRef.current?.loadVideoById(videoId);
		} else {
			playerRef.current?.stopVideo();
		}
	}, [videoId]);

	function togglePlayback() {
		if (isPlaying) {
			playerRef.current?.pauseVideo();
		} else {
			playerRef.current?.playVideo();
		}
	}

	return (
		<div className='group relative aspect-video w-full overflow-hidden rounded-lg bg-black'>
			<div ref={containerRef} className='h-full w-full' />
			{videoId && (
				<div className='pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100'>
					<button
						type='button'
						className='pointer-events-auto m-4 rounded-md bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20'
						onClick={togglePlayback}
					>
						{isPlaying ? 'Pause' : 'Play'}
					</button>
				</div>
			)}
		</div>
	);
}
