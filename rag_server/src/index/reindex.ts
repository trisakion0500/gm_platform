import fs from "fs";
import path from "path";
import { chunkMarkdown } from "../embedding/chunker";
import { embed } from "../embedding/embedder";
import { rebuildAndSwap } from "./store";
import { Manifest, hashContent, readManifest, writeManifest, isSameManifest } from "./manifest";
import { runExclusive } from "../config/db";
import logger from "../utils/logger";

// rag_server/src/index -> 저장소 루트. __dirname 기준 절대경로(process.cwd() 상대경로 금지, §5).
const REPO_ROOT = path.join(__dirname, "../../..");
const DOCS_DIR = path.join(REPO_ROOT, "docs");
const README_PATH = path.join(REPO_ROOT, "README.md");

// build.ts(CLI)와 app.ts(부팅 시)가 공유하는 MySQL advisory lock 이름 — 재구축이 겹치지 않게 한다(§3, config/db.ts).
const LOCK_NAME = "rag:reindex";
// 실측 전체 재구축(~669청크) 소요시간(~15초)보다 넉넉하게 — 이 시간 안에 락을 못 잡으면 진짜 이상 상황으로 간주한다.
const LOCK_TIMEOUT_MS = 60_000;

export interface TargetFile {
  // 표시용 상대경로 (예: "docs/07_API_COMMON.md", "README.md")
  file: string;
  content: string;
}

/**
 * 인덱싱 대상 파일(docs/ 하위 모든 .md + 저장소 루트 README.md)을 읽는다.
 * @returns 표시용 상대경로와 원문을 담은 목록
 */
export function loadTargetFiles(): TargetFile[] {
  const docFiles = fs
    .readdirSync(DOCS_DIR)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => ({
      file: `docs/${name}`,
      content: fs.readFileSync(path.join(DOCS_DIR, name), "utf8"),
    }));

  const readme: TargetFile = { file: "README.md", content: fs.readFileSync(README_PATH, "utf8") };

  return [...docFiles, readme];
}

/**
 * 대상 파일 목록으로부터 매니페스트(파일별 SHA-256 해시)를 계산한다.
 * @param files loadTargetFiles()의 결과
 * @returns 매니페스트
 */
export function computeManifest(files: TargetFile[]): Manifest {
  const manifest: Manifest = {};
  for (const f of files)
    manifest[f.file] = hashContent(f.content);
  return manifest;
}

/**
 * 청킹→임베딩→Qdrant 재구축(alias 스왑)→매니페스트 갱신까지 전량 재구축을 무조건 수행한다(락 없는 raw 동작).
 * forceReindex()/reindexIfChanged()가 이 함수를 runExclusive로 감싸 호출한다 — 직접 호출 금지.
 * @returns 재구축 결과 요약(파일 수, 청크 수)
 */
async function rebuild(): Promise<{ fileCount: number; chunkCount: number }> {
  const files = loadTargetFiles();
  const chunks = files.flatMap((f) => chunkMarkdown(f.file, f.content));
  logger.info(`재인덱싱 시작: 파일 ${files.length}개, 청크 ${chunks.length}개`);

  const vectors: number[][] = [];
  for (const chunk of chunks)
    // heading을 함께 임베딩 — 본문이 짧은 의사코드/표 위주라 정작 검색 키워드는 heading에만
    // 있는 청크(예: "9. 비밀번호 변경 > ... > 처리 정책")가 본문만으로는 유사도가 낮게 잡히는 문제가 있었다.
    vectors.push(await embed(`${chunk.heading}\n${chunk.text}`));

  await rebuildAndSwap(chunks, vectors);
  writeManifest(computeManifest(files));

  logger.info(`재인덱싱 완료: 파일 ${files.length}개, 청크 ${chunks.length}개`);
  return { fileCount: files.length, chunkCount: chunks.length };
}

/**
 * build.ts(CLI) 전용 — 매니페스트 비교 없이 항상 강제로 재구축한다("언제든 강제 재구축 가능한 수동
 * CLI"라는 §3의 설계 의도). MySQL advisory lock(§3)으로 app.ts의 부팅 시 재인덱싱과 상호배제되어,
 * 동시에 실행되면 한쪽이 끝날 때까지 나머지는 대기한다(겹쳐서 중복 실행되지 않음).
 * @returns 재구축 결과 요약(파일 수, 청크 수)
 */
export async function forceReindex(): Promise<{ fileCount: number; chunkCount: number }> {
  return runExclusive(LOCK_NAME, LOCK_TIMEOUT_MS, () => rebuild());
}

/**
 * app.ts(부팅 시) 전용 — 락을 잡은 뒤(대기 포함) 매니페스트를 다시 비교해 실제로 변경된 경우에만
 * 재구축한다. 락 대기 중 다른 프로세스(build.ts 등)가 이미 최신 상태로 재구축을 끝냈다면, 락을
 * 잡은 시점의 재비교에서 "변경 없음"으로 판정되어 중복 작업 없이 그냥 넘어간다(§3).
 */
export async function reindexIfChanged(): Promise<void> {
  await runExclusive(LOCK_NAME, LOCK_TIMEOUT_MS, async () => {
    const files = loadTargetFiles();
    const currentManifest = computeManifest(files);
    const storedManifest = readManifest();

    if (isSameManifest(currentManifest, storedManifest)) {
      logger.info("문서 변경 없음 — 재인덱싱을 건너뜁니다.");
      return;
    }

    logger.info("문서 변경 감지 — 재인덱싱을 시작합니다.");
    await rebuild();
  });
}
