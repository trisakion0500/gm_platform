// app.ts의 부팅 완료 여부(임베딩 모델 로딩 + 필요시 재인덱싱까지 모두 끝나야 true, §3).
// embedding/embedder.ts의 isReady()는 "모델 로딩 완료"만 반영해 재인덱싱이 진행되는 동안에도 true가 될 수 있어
// (재인덱싱 중엔 Qdrant 컬렉션이 삭제·재생성되는 구간이 있어 검색 게이팅용으로 쓰면 위험하다) 별도로 둔다.
// GET /health · POST /search(controller)가 app.ts를 순환 참조하지 않고 이 상태를 읽기 위한 전용 모듈.
let ready = false;

/**
 * 서버가 검색 요청을 처리할 준비가 됐는지 확인한다(모델 로딩 + 필요시 재인덱싱까지 완료).
 * @returns 준비 완료 시 true
 */
export function isReady(): boolean {
  return ready;
}

/**
 * app.ts의 부팅 시퀀스가 모든 준비를 마쳤을 때 한 번 호출한다.
 */
export function markReady(): void {
  ready = true;
}
