// Thrown by youtube.ts/llm.ts when the upstream API itself rejects the request. Distinct from
// ServiceNotConfiguredError so callers can still return a clean 503 even when the key is valid.
export default class ExternalServiceError extends Error {}
