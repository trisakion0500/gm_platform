import bcrypt from 'bcrypt';

const ROUNDS = 12;

/**
 * 평문 비밀번호를 bcrypt로 해시한다.
 * @author trisakion
 * @param plain 해시할 평문 비밀번호
 * @returns bcrypt 해시 문자열
 */
export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, ROUNDS);

/**
 * 평문 비밀번호와 bcrypt 해시를 비교한다.
 * @author trisakion
 * @param plain 검증할 평문 비밀번호
 * @param hash 저장된 bcrypt 해시 문자열
 * @returns 일치하면 true, 불일치하면 false
 */
export const comparePassword = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);
