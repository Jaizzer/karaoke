// Device-wide, not per-room; the backend re-checks room.aiSearchEnabled on every request regardless.
const KEY = 'karaoke:ai-search-preferences';

export interface AiSearchPreferences {
	useAiSearch: boolean;
	autoSelect: boolean;
}

const DEFAULT_PREFERENCES: AiSearchPreferences = {
	useAiSearch: false,
	autoSelect: false,
};

export function getAiSearchPreferences(): AiSearchPreferences {
	const raw = localStorage.getItem(KEY);
	if (!raw) {
		return DEFAULT_PREFERENCES;
	}
	try {
		return { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as object) };
	} catch {
		return DEFAULT_PREFERENCES;
	}
}

export function setAiSearchPreferences(preferences: AiSearchPreferences): void {
	localStorage.setItem(KEY, JSON.stringify(preferences));
}
