const NAMED_ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
};

// YouTube's API returns HTML-entity-encoded titles/names; decodes the handful of forms that actually show up there.
export default function decodeHtmlEntities(text: string): string {
	return text.replace(
		/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g,
		(match, entity: string) => {
			if (entity.startsWith('#x') || entity.startsWith('#X')) {
				return String.fromCodePoint(parseInt(entity.slice(2), 16));
			}
			if (entity.startsWith('#')) {
				return String.fromCodePoint(parseInt(entity.slice(1), 10));
			}
			return NAMED_ENTITIES[entity] ?? match;
		},
	);
}
