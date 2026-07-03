import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-cbc';
const KEY = Buffer.from(env.encryptionKey, 'hex');

/**
 * 평문을 AES-256-CBC로 암호화한다. 매 호출마다 랜덤 IV를 생성해 앞에 붙인 뒤 Base64로 인코딩한다.
 * @author trisakion
 * @param plainText 암호화할 평문
 * @returns `IV(16byte) + 암호문`을 Base64로 인코딩한 문자열
 */
export function encrypt(plainText: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, encrypted]).toString('base64');
}

/**
 * `encrypt()`로 암호화된 문자열을 복호화한다.
 * @author trisakion
 * @param cipherText `encrypt()`가 반환한 Base64 문자열
 * @returns 복호화된 평문
 */
export function decrypt(cipherText: string): string {
  const buf = Buffer.from(cipherText, 'base64');
  const iv = buf.subarray(0, 16);
  const encrypted = buf.subarray(16);
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
