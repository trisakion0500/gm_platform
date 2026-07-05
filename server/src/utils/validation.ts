import { ERROR_MAP, ErrorEntry } from '../constants/errors';

/**
 * req.params/req.query에서 온 값을 1 이상의 정수로 파싱한다.
 * @author trisakion
 * @param value 파싱할 값
 * @returns 파싱된 양의 정수, 유효하지 않으면 null
 */
export function parsePositiveInt(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1)
    return null;
  return n;
}

/** 페이지네이션 파라미터 검증 결과 */
export type PaginationResult =
  | { ok: true; page: number; pageSize: number }
  | { ok: false; error: ErrorEntry };

/**
 * page/page_size 쿼리 파라미터를 검증한다. 둘 다 필수이며 page_size는 20/50/100만 허용한다.
 * @author trisakion
 * @param page req.query.page
 * @param pageSize req.query.page_size
 * @returns 성공 시 { ok: true, page, pageSize }, 실패 시 { ok: false, error }
 */
export function parsePagination(page: unknown, pageSize: unknown): PaginationResult {
  if (!page || !pageSize)
    return { ok: false, error: ERROR_MAP.REQUIRED_MISSING };
  const pageNum = Number(page);
  const pageSizeNum = Number(pageSize);
  if (!Number.isInteger(pageNum) || pageNum < 1)
    return { ok: false, error: ERROR_MAP.INVALID_FORMAT };
  if (![20, 50, 100].includes(pageSizeNum))
    return { ok: false, error: ERROR_MAP.INVALID_VALUE };
  return { ok: true, page: pageNum, pageSize: pageSizeNum };
}
