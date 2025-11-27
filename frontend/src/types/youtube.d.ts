// Minimal ambient types for the slice of the YouTube IFrame Player API this app actually uses; a full @types/youtube package would be overkill.
export {};

declare global {
	namespace YT {
		enum PlayerState {
			ENDED = 0,
			PLAYING = 1,
			PAUSED = 2,
			BUFFERING = 3,
			CUED = 5,
		}

		interface OnStateChangeEvent {
			data: PlayerState;
		}

		interface PlayerVars {
			controls?: 0 | 1;
			rel?: 0 | 1;
			modestbranding?: 0 | 1;
			cc_load_policy?: 0 | 1;
			iv_load_policy?: 1 | 3;
			autoplay?: 0 | 1;
		}

		interface PlayerOptions {
			videoId?: string;
			playerVars?: PlayerVars;
			events?: {
				onReady?: () => void;
				onStateChange?: (event: OnStateChangeEvent) => void;
			};
		}

		class Player {
			constructor(element: HTMLElement, options: PlayerOptions);
			destroy(): void;
			loadVideoById(videoId: string): void;
			stopVideo(): void;
			playVideo(): void;
			pauseVideo(): void;
			getPlayerState(): PlayerState;
		}
	}

	interface Window {
		YT: typeof YT;
		onYouTubeIframeAPIReady?: () => void;
	}
}
