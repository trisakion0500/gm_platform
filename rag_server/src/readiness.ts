// app.ts의 부팅 완료 여부(임베딩 모델 로딩 + 필요시 재인덱싱까지 모두 끝나야 true, §3).
// embedding/embedder.ts의 isReady()는 "모델 로딩 완료"만 반영해 재인덱싱이 진행되는 동안에도 true가 될 수 있다.
// index/store.ts의 alias 원자적 스왑 덕분에 재인덱싱 중에도 다른 프로세스의 검색은 항상 완전한 옛
// 인덱스를 보므로(§3) 이 자체가 위험하진 않지만, 이 프로세스 본인이 진행 중인 재인덱싱이 끝나기 전에
// 자기 자신이 검색 요청을 받는 것까진 막고 싶어(부팅 초기 alias가 아직 없는 최초 구축 시점 등) 별도로 둔다.
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
