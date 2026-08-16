import { pipeline, FeatureExtractionPipeline } from "@xenova/transformers";
import { env } from "../config/env";
import logger from "../utils/logger";

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;
let ready = false;

/**
 * 임베딩 모델 로딩을 시작(이미 시작했으면 그 Promise를 재사용)하고, 완료 시 ready 플래그를 세운다.
 * 실패 시 extractorPromise를 null로 되돌려 다음 호출이 새로 재시도하게 한다 — 되돌리지 않으면
 * 실패한 Promise가 캐싱되어 이후 모든 호출이 재시도 없이 같은 실패를 즉시 재던지는 상태로 영구 고착된다.
 * @returns 로딩된 파이프라인 인스턴스
 */
function loadExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    logger.info(`임베딩 모델 로딩 시작: ${env.embeddingModel}`);
    extractorPromise = pipeline("feature-extraction", env.embeddingModel)
      .then((extractor) => {
        ready = true;
        logger.info("임베딩 모델 로딩 완료");
        return extractor;
      })
      .catch((err) => {
        extractorPromise = null;
        throw err;
      });
  }
  return extractorPromise;
}

/**
 * 모델 로딩을 시작(이미 시작했으면 재사용)하고 완료될 때까지 대기할 수 있는 Promise를 반환한다.
 * app.ts의 bootstrap()이 이 Promise를 await해 "모델 로딩 완료 후 재인덱싱 판단"을 순서대로 진행한다
 * — listen() 자체는 이 함수 호출 이전에 이미 동기 호출되어 있으므로 서버 기동 자체를 막지 않는다(§3).
 * @returns 로딩 완료 시 resolve되는 Promise (실패 시 reject — 호출부가 처리)
 */
export function warmUp(): Promise<void> {
  return loadExtractor().then(() => undefined);
}

/**
 * 모델 로딩 완료 여부를 동기적으로 확인한다. docSearch.controller.ts가 임베딩 시도 전 먼저 체크하는 용도.
 * @returns 로딩 완료 시 true
 */
export function isReady(): boolean {
  return ready;
}

/**
 * 텍스트를 임베딩 벡터로 변환한다(차원은 env.embeddingModel에 따라 달라짐 — 현재 768차원, store.ts의
 * VECTOR_SIZE와 반드시 일치해야 함). 프리픽스("query: "/"passage: ")는 이 함수가 아닌 호출부
 * (reindex.ts/docSearch.service.ts)에서 붙인다 — 이 함수는 어떤 텍스트가 들어오든 그대로 벡터화하는 범용 함수다.
 * 모델이 아직 로딩 중이면 로딩이 끝날 때까지 대기한다 — build.ts(CLI)처럼 즉시 로딩이 필요한 경로용이며,
 * app.ts의 검색 API는 항상 isReady()를 먼저 체크해 이 대기 자체를 피한다.
 * @param text 임베딩할 텍스트
 * @returns 임베딩 벡터(mean pooling + L2 정규화)
 */
export async function embed(text: string): Promise<number[]> {
  const extractor = await loadExtractor();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}
