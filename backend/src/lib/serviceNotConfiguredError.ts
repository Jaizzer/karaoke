// Thrown when youtube.ts/llm.ts's required API key isn't set, so search.handler.ts can return a clean 503.
export default class ServiceNotConfiguredError extends Error {}
