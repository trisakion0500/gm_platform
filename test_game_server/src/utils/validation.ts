/**
 * 요청 파라미터를 1 이상의 정수로 파싱한다.
 * @param value 파싱할 값
 * @returns 파싱된 양의 정수, 유효하지 않으면 null
 */
export function parsePositiveInt(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1)
    return null;
  return n;
}
