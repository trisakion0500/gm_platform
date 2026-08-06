import fs from "fs";
import path from "path";
import crypto from "crypto";
import logger from "../utils/logger";

// __dirname 기준 절대경로 — process.cwd() 상대경로 금지(§5, mcp_server_dev 로그 경로 버그와 동일한 함정).
const MANIFEST_PATH = path.join(__dirname, "../../data/index-manifest.json");

// 파일 경로(표시용) -> 내용 SHA-256 해시(hex)
export type Manifest = Record<string, string>;

/**
 * 텍스트 내용의 SHA-256 해시(hex)를 계산한다. mtime 대신 내용 해시를 쓰는 이유는 git checkout/clone이
 * mtime을 보존하지 않고, 내용 변경 없는 touch로 불필요한 재인덱싱이 도는 것도 피해야 하기 때문(§3).
 * @param content 파일 원문
 * @returns 64자 hex 해시
 */
export function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * data/index-manifest.json을 읽는다.
 * @returns 저장된 매니페스트, 파일이 없거나(최초 부팅) 파싱에 실패하면 null
 */
export function readManifest(): Manifest | null {
  if (!fs.existsSync(MANIFEST_PATH))
    return null;

  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  } catch (err) {
    logger.warn("index-manifest.json 파싱 실패 — 재인덱싱을 트리거합니다", err);
    return null;
  }
}

/**
 * data/index-manifest.json에 매니페스트를 기록한다. Qdrant upsert가 완전히 끝난 뒤에만 호출해야 한다
 * — 재인덱싱 도중 프로세스가 죽어도 다음 부팅 때 매니페스트가 갱신 전 상태로 남아 안전하게 재시도된다(§3).
 * @param manifest 저장할 매니페스트
 */
export function writeManifest(manifest: Manifest): void {
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
}

/**
 * 두 매니페스트의 내용이 완전히 동일한지 비교한다(파일 구성·해시 값 모두 일치해야 함).
 * @param a 비교 대상
 * @param b 비교 대상
 * @returns 완전히 동일하면 true
 */
export function isSameManifest(a: Manifest | null, b: Manifest | null): boolean {
  if (!a || !b)
    return false;

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length)
    return false;

  return aKeys.every((key) => a[key] === b[key]);
}
