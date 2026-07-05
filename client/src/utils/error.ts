import type { AxiosError } from 'axios';
import type { ApiFailure } from '../types';

/**
 * 에러 객체에서 사용자에게 보여줄 메시지를 추출한다.
 * @param err - catch 블록에서 받은 에러 (unknown)
 * @param fallback - 서버 메시지도 err.message도 없을 때 사용할 기본 문구
 * @returns 표시용 에러 메시지
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && !(err as AxiosError).isAxiosError)
    return err.message;
  return (err as AxiosError<ApiFailure>).response?.data?.message ?? fallback;
}
