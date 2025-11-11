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

		interface PlayerOptions {
			videoId: string;
			events?: {
				onStateChange?: (event: OnStateChangeEvent) => void;
			};
		}

		class Player {
			constructor(element: HTMLElement, options: PlayerOptions);
			destroy(): void;
		}
	}

	interface Window {
		YT: typeof YT;
		onYouTubeIframeAPIReady?: () => void;
	}
}
