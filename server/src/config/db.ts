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
  timezone: "+00:00", // MySQL 날짜/시간을 항상 UTC 기준으로 처리
  charset: "utf8mb4",
});

/**
 * SP를 호출하고 결과셋 튜플을 반환한다.
 * 첫 번째 결과셋은 항상 RESULT 코드 행이며, 이후 결과셋은 데이터 배열로 반환한다.
 * 데이터 SELECT가 여러 개인 경우 dataSets[0], dataSets[1] 순으로 접근한다.
 * RESULT=99인 경우 DB 시스템 오류로 간주하여 DBError를 던진다.
 * @author trisakion
 * @param sp 호출할 SP 이름 (예: 'SP_GET_USER_BY_ID')
 * @param params SP에 전달할 파라미터 배열
 * @returns [statusRows, dataSets] — statusRows[0].RESULT로 결과 코드 확인, dataSets는 데이터 결과셋 배열
 */
export async function callSP(
  sp: string,
  params: unknown[],
): Promise<[RowDataPacket[], RowDataPacket[][]]> {
  const placeholders = params.map(() => "?").join(", ");
  const [results] = await pool.query(`CALL ${sp}(${placeholders})`, params);
  const sets = results as RowDataPacket[][];
  const statusRow = sets[0]?.[0];
  if (statusRow?.RESULT === undefined) {
    throw new DBError(
      50001,
      `${ERROR_MAP[50001].message} [${sp}]: RESULT 컬럼 없음`,
      ERROR_MAP[50001].httpStatus,
    );
  }
  if (statusRow.RESULT === 99) {
    throw new DBError(
      50001,
      `${ERROR_MAP[50001].message} [${sp}]: ${statusRow.ERROR_MESSAGE ?? ""}`,
      ERROR_MAP[50001].httpStatus,
    );
  }
  const dataSets = sets.slice(1).filter((s) => Array.isArray(s));
  return [sets[0] ?? [], dataSets];
}

export default pool;
