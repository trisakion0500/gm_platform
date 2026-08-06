export class AppError extends Error {
  constructor(
    readonly result: number,
    message: string,
    readonly httpStatus: number,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "AppError";
  }
}

export interface Chunk {
  file: string;
  heading: string;
  text: string;
}

export interface SearchResult {
  file: string;
  heading: string;
  text: string;
  score: number;
}
