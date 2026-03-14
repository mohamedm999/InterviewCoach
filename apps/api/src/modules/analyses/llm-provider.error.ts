export class LlmProviderUnavailableError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'LlmProviderUnavailableError';
  }
}
