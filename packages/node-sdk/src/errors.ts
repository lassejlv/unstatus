export class UnstatusApiError extends Error {
  readonly name = "UnstatusApiError";

  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly payload?: unknown,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
