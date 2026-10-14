/**
 * An error we throw on purpose, carrying the HTTP status to send back.
 * Anything that is NOT an AppError is treated as an unexpected 500.
 */
export class AppError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = "AppError";
  }
}
