import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';
import { AccessTokenPayload } from '../types';

/**
 * Access Token을 발급한다.
 * HS256 알고리즘으로 서명하며, JTI(UUID v4)를 자동 생성하여 페이로드에 포함한다.
 * @author trisakion
 * @param payload jti를 제외한 Access Token 페이로드 (user_id, company_id, role_code)
 * @returns token — 서명된 JWT 문자열, jti — 토큰 고유 식별자 (세션 조회 키), expiredAt — 만료일시
 */
export function signAccessToken(payload: Omit<AccessTokenPayload, 'jti'>): {
  token: string;
  jti: string;
  expiredAt: Date;
} {
  const jti = uuidv4();
  const token = jwt.sign({ ...payload, jti }, env.jwt.secret, {
    expiresIn: env.jwt.accessExpiresIn as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
  const decoded = jwt.decode(token) as { exp: number };
  return { token, jti, expiredAt: new Date(decoded.exp * 1000) };
}

/**
 * Access Token을 검증하고 페이로드를 반환한다.
 * 만료된 경우 TokenExpiredError, 서명이 유효하지 않은 경우 JsonWebTokenError를 던진다.
 * @author trisakion
 * @param token 검증할 JWT 문자열
 * @returns 검증된 AccessTokenPayload (jti, user_id, company_id, role_code, exp, iat 포함)
 */
export function verifyAccessToken(token: string): AccessTokenPayload & { exp: number; iat: number } {
  return jwt.verify(token, env.jwt.secret) as AccessTokenPayload & { exp: number; iat: number };
}
