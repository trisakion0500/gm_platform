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

export class DBError extends AppError {
  constructor(result: number, message: string, httpStatus: number, options?: { cause?: unknown }) {
    super(result, message, httpStatus, options);
    this.name = "DBError";
  }
}

export interface UserRow {
  user_id: number;
  nickname: string;
  status: number;
  created_at: string;
  updated_at: string;
}

export interface CurrencyRow {
  currency_id: number;
  user_id: number;
  currency_type: number;
  amount: number;
  updated_at: string;
}

export interface CardRow {
  card_id: number;
  user_id: number;
  card_type: number;
  card_code: string;
  quantity: number;
  acquired_at: string;
  updated_at: string;
}
