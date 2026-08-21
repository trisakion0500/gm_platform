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

  /**
   * 로그·콘솔 출력용 문자열 표현. cause가 있으면 구분선으로 감싸 함께 표시한다.
   * (뒤에 이어붙는 자신의 err.stack과 시각적으로 섞이지 않도록 위아래 구분선을 둔다.)
   * @author trisakion
   * @returns "{name}: [{result}] {message}\n----- cause -----\n...\n------------------" 형태 문자열
   */
  override toString(): string {
    const base = `${this.name}: [${this.result}] ${this.message}`;
    if (this.cause === undefined)
      return base;
    const causeStr = this.cause instanceof Error ? this.cause.stack ?? this.cause.message : String(this.cause);
    const line = "-".repeat(50);
    return `${base}\n${line} cause ${line}\n${causeStr}\n${line}${"-".repeat(7)}${line}\n`;
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
