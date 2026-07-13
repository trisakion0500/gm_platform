import mysql, { RowDataPacket } from "mysql2/promise";
import { env } from "./env";
import { DBError } from "../types";
import { ERROR_MAP } from "../constants/errors";

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "local",
  charset: "utf8mb4",
});

/**
 * SP를 호출하고 결과셋 튜플을 반환한다.
 * 첫 번째 결과셋은 항상 RESULT 코드 행이며, 이후 결과셋은 데이터 배열로 반환한다.
 * @param sp 호출할 SP 이름
 * @param params SP에 전달할 파라미터 배열
 * @returns [statusRows, dataSets]
 */
export async function callSP(
  sp: string,
  params: unknown[],
): Promise<[RowDataPacket[], RowDataPacket[][]]> {
  const placeholders = params.map(() => "?").join(", ");
  let results;
  try {
    [results] = await pool.query(`CALL ${sp}(${placeholders})`, params);
  } catch (err) {
    throw new DBError(
      ERROR_MAP.DB_ERROR.code,
      `${ERROR_MAP.DB_ERROR.message} [${sp}]: ${err instanceof Error ? err.message : String(err)}`,
      ERROR_MAP.DB_ERROR.httpStatus,
      { cause: err },
    );
  }
  const sets = results as RowDataPacket[][];
  const statusRow = sets[0]?.[0];
  if (statusRow?.RESULT === undefined) {
    throw new DBError(
      ERROR_MAP.DB_ERROR.code,
      `${ERROR_MAP.DB_ERROR.message} [${sp}]: RESULT column missing`,
      ERROR_MAP.DB_ERROR.httpStatus,
    );
  }
  if (statusRow.RESULT === 99) {
    throw new DBError(
      ERROR_MAP.DB_ERROR.code,
      `${ERROR_MAP.DB_ERROR.message} [${sp}]: ${statusRow.ERROR_MESSAGE ?? ""}`,
      ERROR_MAP.DB_ERROR.httpStatus,
    );
  }
  const dataSets = sets.slice(1).filter((s) => Array.isArray(s));
  return [sets[0] ?? [], dataSets];
}

export default pool;
