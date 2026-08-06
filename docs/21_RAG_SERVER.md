# 21_RAG_SERVER.md

# RAG 서버 (문서 검색)

---

# 1. 개요

GM Platform의 설계 문서(`docs/`)와 프로젝트 소개(`README.md`)를 자연어로 검색할 수 있게 하는 독립 서비스. gm_platform의 서버·DB 코드에는 손대지 않고 완전히 별도 프로세스로 동작하며, `test_game_server/`와 마찬가지로 상시 구동되는 Express+TypeScript HTTP 서비스다.

| 항목 | 값 |
| ---------- | ------------------------------------- |
| 위치 | `rag_server/` (모노레포 내부) |
| 포트 | `3200` (3000/3100 다음 번호) |
| 벡터 DB | Qdrant(로컬, `http://127.0.0.1:6333`) — 별도 설치 없이 이미 떠있는 인스턴스 사용 |
| 임베딩 | 로컬 모델(`@xenova/transformers`, `Xenova/paraphrase-multilingual-MiniLM-L12-v2`, 384차원) — 외부 API 키·비용 없음 |
| 스택 | Express + TypeScript, `server/`/`test_game_server/`와 동일 패턴(config/routes/controllers/services/middleware) |
| 대상(Phase 1) | `docs/` 폴더 하위 모든 `.md` + 저장소 루트 `README.md`. `CLAUDE.md`는 보류(§1-1) |
| 사용 주체 | Claude(MCP, `mcp_server_dev`/`mcp_server_pc`를 통해) + GM Platform 자체(`server/` 프록시 경유) 양쪽 |

**세 대상 중 문서부터**: RAG 대상 후보로 문서 외에 API 정의(`api`/`api_request`/`api_response`)와 감사로그(`log_audit`, 별도 물리 DB `gm_platform_log`)도 있었으나, 이 둘은 프로젝트/회사 단위 접근제어가 이미 걸려 있어(`FN_HAS_PROJECT_ROLE` 등) 검색 경로에도 같은 스코핑을 이식해야 한다. 문서는 그런 제약이 없어 가장 먼저 구현한다 — Phase 2/Phase 3는 별도 설계.

## 1-1. `CLAUDE.md`는 이번 범위에서 보류

`docs/`와 `README.md`는 공개 문서라 접근제어 걱정이 없지만, `CLAUDE.md`는 외부 비공개 문서(`.gitignore` 대상)라 인덱싱하려면 이 서비스를 반드시 신뢰된 내부망에만 두고 GM Platform 경유 조회(Stage C)도 항상 `authenticate` 뒤에 있어야 하는 등 별도 신뢰 경계 검토가 필요하다. 지금은 이 검토 없이 대상에서 제외한다 — 추후 포함하기로 하면 이 절을 갱신하고 §3의 청킹 전략(`CLAUDE.md`의 "핵심 결정사항" 불릿 단위 분할 등)도 함께 되살려야 한다.

---

# 2. 폴더 구조

```
rag_server/
├── .env / .env.example        # PORT, EMBEDDING_MODEL, QDRANT_URL, QDRANT_API_KEY, QDRANT_COLLECTION, RAG_API_KEY, DB_HOST/PORT/USER/PASSWORD/NAME
├── package.json                 # express, @xenova/transformers, @qdrant/js-client-rest, log4js, dotenv, mysql2
├── tsconfig.json
├── data/                        # gitignore 대상 (index-manifest.json — 파일별 SHA-256 해시)
├── logs/                        # gitignore 대상 (app.log/error.log, log4js dateFile)
└── src/
    ├── app.ts                   # 엔트리포인트 — listen() 즉시 호출, 백그라운드로 임베더 warmUp() → 매니페스트 비교 → 필요시 reindex.ts 재사용, 완료 시 readiness.markReady()
    ├── readiness.ts             # app.ts 부팅(모델 로딩+필요시 재인덱싱) 완료 여부 — embedder.ts의 isReady()(모델 로딩만 반영)와 별개로 둔 검색 게이팅용 전역 상태(순환참조 회피)
    ├── config/
    │   ├── env.ts                # dotenv 로드 및 검증
    │   ├── logger.ts             # log4js 설정 (gm_platform과 동일 패턴)
    │   ├── qdrant.ts             # QdrantClient 싱글톤
    │   └── db.ts                 # GM Platform 본체와 동일 MySQL — runExclusive()(advisory lock, server/의 동일 패턴 재사용). rag_server 전용 테이블 없음
    ├── embedding/
    │   ├── embedder.ts           # @xenova/transformers pipeline('feature-extraction', model) 래퍼 + isReady()/warmUp() 논블로킹 로딩
    │   └── chunker.ts            # docs/*.md + README.md 헤딩 분할
    ├── index/
    │   ├── store.ts              # Qdrant 컬렉션 생성/upsert/검색 래퍼 + alias 원자적 스왑(rebuildAndSwap)
    │   ├── manifest.ts           # data/index-manifest.json 읽기/쓰기 — 파일별 SHA-256 해시로 변경 여부 판단
    │   ├── reindex.ts            # 청킹→임베딩→Qdrant 재구축 흐름 + config/db.ts의 runExclusive로 감싼 forceReindex()/reindexIfChanged() — build.ts와 app.ts 부팅 시 각각 재사용
    │   └── build.ts               # `npm run build-index` 진입점 — forceReindex()를 호출하는 CLI 래퍼
    ├── routes/
    │   ├── search.ts             # POST /search
    │   └── health.ts             # GET /health
    ├── controllers/
    │   └── search.controller.ts
    ├── services/
    │   └── search.service.ts
    ├── middleware/
    │   ├── apiKeyAuth.ts         # test_game_server와 동일 패턴 — X-API-Key 상수시간 비교
    │   ├── errorHandler.ts
    │   └── requestLogger.ts
    ├── constants/
    │   └── errors.ts
    ├── types/
    │   └── index.ts
    └── utils/
        ├── logger.ts
        └── response.ts           # success/fail — { result, message, data } 봉투 (gm_platform과 동일 관례)
```

`.gitignore`는 별도로 두지 않는다 — 루트 `.gitignore`의 `node_modules/`, `dist/`, `.env`, `logs/` 패턴이 슬래시 없이 정의돼 있어 `rag_server/`에도 그대로 적용된다.

---

# 3. 설계 결정

- **임베딩은 로컬 모델** — `@xenova/transformers`(transformers.js)로 Node 프로세스 안에서 직접 임베딩을 생성한다. OpenAI 등 외부 API를 쓰면 품질·속도는 낫지만 새 API 키 관리와 재인덱싱마다 과금이 발생한다. 이 프로젝트가 지금까지 외부 AI API를 전혀 쓰지 않아온 것과 일관되게, 완전 오프라인·무비용인 로컬 모델을 택했다. 최초 실행 시 모델 파일 1회 다운로드 후에는 네트워크 없이 동작한다.
- **모델은 `Xenova/all-MiniLM-L6-v2`가 아니라 `Xenova/paraphrase-multilingual-MiniLM-L12-v2`(둘 다 384차원)** — 처음엔 표준적으로 많이 쓰이는 경량 모델 `all-MiniLM-L6-v2`로 시작했으나, `npm run build-index`로 668개 청크를 실제 인덱싱한 뒤 계획서에 적어둔 검증 질의("비밀번호 변경하면 세션은 어떻게 되나요?")로 직접 검색해보니 상위 결과가 완전히 무관한 내용(예: "DEVELOPER 역할 정의")으로 나오는 걸 발견했다 — 이 모델이 사실상 영어 위주로 학습돼 있어, 질의와 문서에 동일 영단어(예: "Refresh Token", "UUID")가 겹치는 경우엔 그럭저럭 맞아도 순수 한국어 의미 유사도는 거의 못 잡았기 때문이다. 같은 청크·같은 Qdrant 스키마(384차원 그대로라 `store.ts` 변경 불필요) 상태에서 모델만 다국어 모델로 바꿔 재인덱싱하니, 같은 질의에 대해 상위 5개 전부 인증/비밀번호/세션 관련 문서로 좁혀지는 걸 확인했다(완벽히 그 문장 하나가 1위는 아니지만 무관한 결과는 사라짐) — 이론적 추정 대신 실제 질의 결과로 모델을 교체한 사례.
- **(해결됨) `embedder.ts` 로딩 실패가 영구 고착되던 상태전이 버그** — `loadExtractor()`가 `pipeline()` 호출 결과를 `extractorPromise`에 캐싱하는데, 최초 코드는 성공/실패를 구분하지 않고 캐싱해 한 번이라도 실패(예: 최초 모델 다운로드 중 일시적 네트워크 장애)하면 이후 모든 `warmUp()`/`embed()` 호출이 재시도 없이 같은 실패를 즉시 재던지는 상태로 영구 고착됐다 — `app.ts`의 `bootstrap()`은 이 실패 시 `markReady()`를 호출하지 않으므로 `isReady()`가 영원히 `false`로 남고, `npm start`(운영 경로)는 `tsx watch`처럼 파일 저장 시 자동 재기동되지 않아 수동 재시작 전까지 서버가 복구 불가능했다. `loadExtractor()`의 `pipeline(...).then(...)` 체인에 `.catch((err) => { extractorPromise = null; throw err; })`를 추가해, 실패 시 캐시를 비우고 다음 호출이 실제로 재시도하도록 고쳤다. 존재하지 않는 모델명으로 실패를 실제 재현("로딩 시작" 로그가 1차에만 찍히고 2차는 캐시된 실패를 즉시 재던짐) → 수정 후 재현(2차 호출에도 "로딩 시작"이 다시 찍히며 진짜 재시도됨)으로 검증, 정상 모델 경로 회귀(로딩 1회 후 캐시 재사용 4ms)도 확인.
- **모델 로딩은 논블로킹 기동 + readiness 체크, 단 게이팅용 `isReady()`는 `embedder.ts`가 아니라 `readiness.ts`의 것** — `index/build.ts`(1회성 배치)는 시작하자마자 모델이 필요하므로 즉시 로드하지만, 계속 떠있는 `app.ts`(검색 API)는 다르게 처리한다: `listen()`을 바로 호출해 서버 자체는 곧장 기동하고, 그 직후 `bootstrap()` 함수가 `embedder.ts`의 `warmUp()`을 `await`해 백그라운드(모듈 top-level에서 `await` 없이 `bootstrap()`만 호출)로 모델을 로드한다. `embedder.ts` 자체도 로드 완료 여부를 동기 확인하는 `isReady()`를 노출하지만, 이건 어디까지나 "모델이 로드됐는지"만 반영한다 — 실제로 검색 요청을 받아도 되는 시점은 그보다 늦다(아래 항목 참고). 그래서 `search.controller.ts`/`GET /health`가 실제로 체크하는 건 `readiness.ts`라는 별도의 얇은 모듈이 노출하는 `isReady()`다: `app.ts`를 순환 참조하지 않으면서 "부팅 시퀀스 전체가 끝났는가"를 양쪽이 함께 볼 수 있게 상태를 분리해뒀다. 준비 전이면 요청을 붙잡아두지 않고 즉시 503(`MODEL_LOADING`, "모델을 로드하는 중입니다")으로 응답한다. `GET /health`도 같은 상태를 함께 노출해(`status: "ok" | "loading"`) 별도 readiness 엔드포인트 없이 기동 상태를 바로 확인할 수 있게 한다.
- **부팅 시 문서 변경 감지 후 자동 재인덱싱** — `data/index-manifest.json`(gitignore 대상)에 마지막으로 인덱싱한 대상 파일들의 SHA-256 해시를 저장해둔다. `app.ts`의 `bootstrap()`은 임베딩 모델 로드가 끝나면(위 항목의 `warmUp()` 완료 시점) 현재 `docs/*.md`+`README.md`의 해시를 다시 계산해 매니페스트와 비교하고, 하나라도 다르거나 매니페스트가 없으면(최초 부팅) 이미 로드된 모델을 그대로 재사용해 `index/reindex.ts`의 전량 재구축(청킹→임베딩→Qdrant 컬렉션 재생성→upsert)을 수행한 뒤 매니페스트를 갱신한다. 이 재인덱싱이 끝나야 비로소 `readiness.ts`의 `markReady()`가 호출되어 `isReady()`가 `true`가 되므로(바로 위 항목 참고 — `embedder.ts`의 `isReady()`는 이보다 먼저 `true`가 되지만 게이팅에는 안 쓰인다), "모델 로딩 중"과 "재인덱싱 중"이 `GET /health`의 `loading` 상태 하나로 자연스럽게 합쳐진다. 매니페스트는 Qdrant upsert가 완전히 끝난 뒤에만 기록해, 재인덱싱 도중 프로세스가 죽어도 다음 부팅 때 안전하게 재시도된다. mtime 대신 내용 해시를 쓰는 이유: git checkout/clone은 mtime을 보존하지 않고, 내용 변경 없는 touch로 불필요한 재인덱싱이 도는 것도 피해야 하기 때문. `npm run build-index`는 이 로직과 별개로 언제든 강제 재구축할 수 있는 수동 CLI로 남긴다. 실제로 이 작업 도중 `docs/21_RAG_SERVER.md` 자체를 편집한 뒤 서버를 재기동해 자동 재인덱싱이 조건 그대로(매니페스트 불일치 감지 → 재구축 → 669개 청크) 트리거되는 것을 실제 상황에서 확인했다(청크 수가 668→669로 바뀐 건 이 문서 자체가 인덱싱 대상이라 편집한 만큼 반영된 것).
- **벡터 저장소는 Qdrant** — 로컬에 이미 떠있는 인스턴스(`http://127.0.0.1:6333`)를 그대로 사용한다. 문서(Phase 1)만이면 청크 수가 (`chunker.ts` 구현 후 실측) 약 670개 수준이라 브루트포스 코사인 유사도로도 충분했겠지만, Phase 2(API 정의)로 확장하면 프로젝트마다 API·파라미터 정의가 많아 청크 수가 크게 늘어날 수 있어 처음부터 ANN 인덱스를 갖춘 Qdrant로 시작한다. 컬렉션명 `gm_docs`, 벡터 크기 384(모델 출력 차원과 일치), distance는 Cosine.
- **(해결됨) 인덱스 재생성은 전량 교체 방식 — 단, Qdrant collection alias로 원자적 스왑** — `index/reindex.ts`의 재구축은 매번 전체를 다시 upsert한다(부분 upsert만 하면 문서에서 삭제된 섹션이 인덱스에 유령으로 남는 문제 방지). 처음엔 `env.qdrant.collection`("gm_docs")이라는 이름의 컬렉션 자체를 delete→recreate→upsert하는 방식이었는데, Stage A 완료 후 재검토하며 이 방식엔 실제 결함이 있었다: delete 직후~upsert 완료 사이에 그 컬렉션으로 들어오는 검색 요청이 "컬렉션 없음"(에러) 또는 "컬렉션은 있지만 비어있음"(200 OK + `data:[]`, 더 나쁜 쪽 — 검색 실패가 아니라 "관련 문서 없음"으로 조용히 오인됨)을 실제로 관측할 수 있었다. `env.qdrant.collection`을 실제 컬렉션이 아니라 **alias**로 바꿔, `index/store.ts`의 `rebuildAndSwap()`이 매번 새 물리 컬렉션(`gm_docs_<timestamp>`)에 전량 upsert를 끝낸 뒤 `updateCollectionAliases()`로 alias를 그 컬렉션으로 원자적으로 재지정하고 나서야 이전 물리 컬렉션을 삭제하도록 고쳤다 — Qdrant 공식 문서가 "no collection modifications can happen between alias operations"라고 명시하는 원자성 보장을 그대로 활용한 것이다. `search.service.ts`/`store.ts`의 `searchSimilar()`는 alias 이름을 그대로 조회하므로 검색 쪽 코드 변경은 없다. alias 도입 이전에 만들어진, 이름이 같은 물리 컬렉션이 남아있으면(과거 버전으로 이미 구축해둔 환경) 최초 1회에 한해 감지해 삭제하고 alias로 전환한다(그 1회 전환 구간에만 짧은 검색 불가 창이 남는다 — 반복되는 정상 재구축에는 해당 없음). 언제 이 재구축이 트리거되는지는 위 "부팅 시 문서 변경 감지" 항목과 아래 "동시 재인덱싱 방지" 항목 참고.
- **동시 재인덱싱 방지 — GM Platform 본체와 동일한 MySQL advisory lock(GET_LOCK) 재사용** — 위 alias 스왑은 "재구축 1회의 정합성"만 보장할 뿐, `npm run build-index`(수동, §3 설계상 "언제든 강제 재구축 가능"하도록 열어둔 CLI)를 서버가 이미 떠있는 상태에서 실행하거나, `tsx watch`가 소스 저장 시 이전 부팅의 재구축이 끝나기 전에 새 프로세스를 띄우는 등으로 재구축이 여러 개 동시에 도는 것 자체는 막지 못한다(각자 새 컬렉션을 중복으로 만들고 임베딩을 반복하는 낭비가 생김 — 정합성은 깨지지 않지만 비효율적). 파일 락(`fs.openSync(path,"wx")`)도 검토했으나 이건 같은 호스트에서만 유효해 스케일아웃(여러 인스턴스)에서는 애초에 무력화된다. Redis 같은 새 인프라를 끌어오는 대신, "이 솔루션은 어차피 MySQL 기반"이라는 점에 착안해 GM Platform `server/`가 세션 정리 크론 중복 실행 방지에 이미 쓰고 있는 MySQL advisory lock(`SP_LOCK_ACQUIRE`/`SP_LOCK_RELEASE`, `GET_LOCK`/`RELEASE_LOCK` 기반, 같은 `gm_platform` DB에 이미 배포돼 있음)을 그대로 재사용했다 — MySQL은 `server/`가 기동 자체를 못 하는 필수 의존성이라(Redis는 `REDIS_ENABLED`로 꺼도 인메모리 폴백 가능한 선택 의존성인 것과 대조적), 이걸 쓰는 게 새 인프라를 들이는 것보다 이 솔루션의 기존 원칙에 더 부합한다고 판단했다. `config/db.ts`에 `runExclusive(lockName, timeoutMs, fn)`을 신설했는데, `server/`의 동일 이름 함수와 달리 **블로킹**이다 — `SP_LOCK_ACQUIRE`는 `timeout=0`(non-blocking) 고정으로 만들어져 있어(크론은 "이번에 못 하면 다음 스케줄에" 식이라 대기할 이유가 없었음) 이 함수 자체를 그대로 쓰되, 획득 실패 시 즉시 포기하는 대신 일정 간격(2초)으로 재시도하며 지정된 타임아웃(기본 60초 — 실측 전체 재구축 ~15초보다 넉넉하게)까지 애플리케이션 레벨에서 블로킹 대기하도록 감쌌다. 블로킹으로 설계한 이유: rag_server의 부팅은 검증된 인덱스 없이는 서비스를 열 수 없어 "이번에 못 하면 다음에"가 성립하지 않기 때문이다. `index/reindex.ts`는 이 락으로 감싼 두 함수를 노출한다 — `forceReindex()`(락 획득 후 매니페스트 비교 없이 무조건 재구축, `build.ts` 전용)와 `reindexIfChanged()`(락 획득 후 매니페스트를 **다시** 비교해 실제로 다를 때만 재구축, `app.ts` 부팅 전용 — 락 대기 중 다른 프로세스가 이미 최신으로 재구축을 끝냈다면 이 재비교에서 "변경 없음"으로 판정돼 중복 작업 없이 넘어간다). 락 보유 프로세스가 죽어도 MySQL이 세션(커넥션) 종료 시 advisory lock을 자동 해제해주므로, 파일 락 때 필요했을 "stale lock 정리" 로직이 필요 없다. 두 build-index 프로세스를 실제로 동시에 실행해 하나가 다른 하나의 완료를 기다린 뒤 순차 진행되는 것(로그 타임스탬프로 겹침 없음 확인), 최종적으로 물리 컬렉션이 정확히 1개만 남고 고아 컬렉션이 없는 것을 라이브로 확인했다.
- **청킹은 헤딩 단위 분할(breadcrumb)** — 이 저장소의 문서는 실제로는 `#`(레벨1)을 "N. 제목" 형식의 주 섹션으로 쓰고 `##`~`####`를 그 안의 하위 섹션으로 쓰는 관례라(초안 작성 시 `##`/`###`만 분할 기준으로 가정했던 게 틀렸음 — 실제 파일로 검증하며 확인), `chunker.ts`는 `#`~`####`(레벨 1~4) 전부를 분할 기준으로 삼는다. 상위 헤딩까지 `" > "`로 이어붙인 breadcrumb을 `heading` 필드에 담는다(예: "6. 보안 정책 > 6.4 세션 정리 정책 > 6.4.1 인스턴스 간 중복 실행 방지"). 파일 앞부분의 제목 중복처럼 본문이 거의 없는 섹션(30자 미만)은 독립 청크로 만들지 않고 다음 섹션에 흡수시키고, 반대로 너무 긴 섹션(최대 ~1200자)은 문단(빈 줄) 단위로 재분할하며, 마크다운 표처럼 빈 줄 없이 긴 문단 하나가 그 자체로 한도를 넘으면 줄 단위로 한 번 더 쪼갠다(`02_TECH_STACK.md`의 환경변수 표에서 4444자짜리 단일 청크가 나오는 걸 실측으로 발견해 추가한 fallback). (`CLAUDE.md`를 포함하게 되면 "핵심 결정사항" 섹션은 `- **...**` 최상위 불릿 하나하나가 자기완결적인 의사결정 기록이라 헤딩 대신 불릿 단위로 쪼개는 별도 분기가 필요하다 — §1-1 참고, 지금은 대상이 아니라 미구현.)
- **신뢰 경계는 선택적 공유키(`RAG_API_KEY`)** — `test_game_server/middleware/apiKeyAuth.ts`와 동일한 패턴(`X-API-Key` 헤더, `crypto.timingSafeEqual` 상수시간 비교, 미설정 시 검증 스킵 + 경고 로그)을 그대로 쓴다. 다만 이 서버는 test_game_server와 달리 GM Platform `server/`(이미 JWT로 인증된 경로)뿐 아니라 MCP 클라이언트(Stage B)에서도 JWT 인증 없이 직접 호출된다 — MCP 경로 입장에서는 이 키가 사실상 유일한 방어선이므로, 로컬 반복 개발 단계를 지나면 반드시 실제 값으로 설정해야 한다(미설정 상태로 운영하지 않는다).

---

# 4. API

응답은 `{ result, message, data: [...] }` 봉투(`server/`/`test_game_server/`와 동일 관례).

## `POST /search`

요청: `{ query: string, top_k?: number }` (`top_k` 기본값 5, 1~20 범위 밖이면 30003)

응답 `data`: `[{ file: string, heading: string, text: string, score: number }]` — `score`는 코사인 유사도(Qdrant가 반환하는 값 그대로).

서버가 아직 준비되지 않았으면(§3의 `readiness.ts` 기준 — 모델 로딩 또는 재인덱싱 중) 즉시 503(`result: 50002`, "모델을 로드하는 중입니다. 잠시 후 다시 시도하세요")으로 응답한다. `X-API-Key`가 설정된 상태에서 헤더가 없거나 틀리면 401(`result: 10001`).

## `GET /health`

`{ result: 0, data: [{ status: "ok" | "loading" }] }` — `loading`은 임베딩 모델이 아직 준비되지 않은 상태(§3).

---

# 5. 인덱스 빌드 (`npm run build-index`)

`src/index/build.ts`가 진입점이다.

1. 저장소 루트 기준 `docs/` 폴더 하위의 모든 `.md` 파일(glob)과 저장소 루트의 `README.md`(별도 경로 1개, `docs/` 밖에 있어 glob에 안 걸림)를 읽는다 — **`__dirname` 기준 절대경로로 접근**한다(`process.cwd()` 상대경로 금지). `mcp_server_dev`의 로그 경로가 `process.cwd()` 상대경로였다가 Claude Desktop이 다른 cwd로 spawn하면서 EPERM 크래시가 났던 것과 동일한 함정이라, 처음부터 이 패턴을 피한다.
2. `embedding/chunker.ts`로 파일별 청크를 만든다(§3 청킹 전략).
3. `embedding/embedder.ts`로 각 청크를 384차원 벡터로 변환한다.
4. `index/store.ts`의 `rebuildAndSwap()`으로 새 물리 컬렉션(`gm_docs_<timestamp>`)을 만들어 전체 청크를 순번 정수 ID로 upsert하고, `gm_docs` alias를 그 컬렉션으로 원자적으로 스왑한 뒤 이전 물리 컬렉션을 삭제한다(§3 "동시 재인덱싱 방지" 항목).

이 전체 과정은 `forceReindex()`를 통해 MySQL advisory lock으로 감싸져 있어(§3), `app.ts`가 이미 떠서 자체 재인덱싱 중이어도 서로 겹치지 않고 순서대로 실행된다.

실행 후 Qdrant REST(`GET /collections/gm_docs`)로 포인트 개수를 확인해 인덱싱이 실제로 반영됐는지 검증할 수 있다(alias로 요청해도 실제 컬렉션과 동일하게 응답한다).

---

# 6. Qdrant 연동

- 접속: `QDRANT_URL`(기본 `http://127.0.0.1:6333`), `QDRANT_API_KEY`(필수 — 이 환경의 Qdrant는 API 키 인증이 걸려 있다) 헤더로 인증.
- `QDRANT_COLLECTION`(기본 `gm_docs`)은 물리 컬렉션이 아니라 **alias**다. 실제 데이터는 `gm_docs_<timestamp>` 형식의 물리 컬렉션에 있고, alias가 그중 "현재 유효한" 컬렉션 하나를 가리킨다(§3 "동시 재인덱싱 방지" 항목). 벡터 크기 384, distance `Cosine`은 물리 컬렉션 생성 시 동일하게 적용.
- `@qdrant/js-client-rest`의 `QdrantClient`를 `config/qdrant.ts`에서 싱글톤으로 생성해 `index/store.ts`(인덱싱·alias 스왑)와 `services/search.service.ts`(검색 질의, alias로 조회) 양쪽이 공유한다.
- 이 Qdrant 인스턴스는 rag_server 전용이 아니라 이미 다른 용도로도 떠있는 공용 인스턴스다(기존 `test_collection` 확인됨) — `gm_docs` alias 및 그 물리 컬렉션(`gm_docs_*`)이라는 명확한 이름만 사용해 다른 컬렉션과 섞이지 않게 한다.

---

# 7. MCP / GM Platform 연동 (예정)

Phase 1 구현은 세 단계로 나눠 진행하며, 이 문서는 뼈대만 먼저 정리해두고 각 단계가 실제로 구현·검증된 뒤 세부 내용(등록 절차, 라이브 검증 결과 등)을 추가한다.

- **Stage B — MCP 통합**: `mcp_server_dev`/`mcp_server_pc` 양쪽에 `ragClient.ts`(GM Platform 로그인과 무관한 경량 axios 클라이언트, `RAG_BASE_URL`로 이 서버를 호출)와 `search_docs` tool을 동일하게 추가한다. 문서 검색은 역할과 무관하게 유용하므로 role 게이팅 없이 전 역할에 노출한다.
- **Stage C — GM Platform `server/` 프록시**: `server/`에 `GET /api/doc-search?q=...`(`authenticate`만 요구, 역할 제한 없음)를 신설해 이 서버의 `/search`를 대신 호출한다. GM Platform 자체(향후 `client/` 검색 UI 포함)가 이 프록시를 통해 재사용한다. 프론트엔드 검색 화면 자체는 Stage C 검증 이후 별도로 진행한다.

---

# 8. 환경변수 (`rag_server/.env`)

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `PORT` | 서버 포트 | `3200` |
| `EMBEDDING_MODEL` | `@xenova/transformers` 모델 이름 | `Xenova/paraphrase-multilingual-MiniLM-L12-v2` |
| `QDRANT_URL` | Qdrant 접속 주소 | `http://127.0.0.1:6333` |
| `QDRANT_API_KEY` | Qdrant API 키 | — |
| `QDRANT_COLLECTION` | 사용할 컬렉션명 | `gm_docs` |
| `RAG_API_KEY` | `X-API-Key` 헤더 검증값. 미설정 시 검증 스킵(로컬 개발용) — 실사용 전 반드시 설정 | — |
| `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` | GM Platform 본체(`server/`)와 동일한 MySQL 접속 정보 — 재인덱싱 상호배제용 advisory lock(`SP_LOCK_ACQUIRE`/`SP_LOCK_RELEASE`)만 재사용, rag_server 전용 테이블 없음(§3) | — (전부 필수) |

---

# 9. 실행 방법

```powershell
cd rag_server
npm install
npm run build-index   # docs/ 전체 + README.md 인덱싱 (Qdrant gm_docs 컬렉션 생성)
npm run dev            # tsx watch, 기본 포트 3200
```

Qdrant가 로컬에서 먼저 떠있어야 한다(`http://127.0.0.1:6333`). (변경됨) 처음엔 `test_game_server/`처럼 MySQL 의존성이 없다고 설계했으나, 재인덱싱 동시 실행 방지에 GM Platform 본체가 이미 쓰는 MySQL advisory lock을 재사용하기로 하면서(§3) `server/`와 동일한 MySQL 인스턴스에 대한 접속(`DB_*`, §8)이 필수가 됐다 — SP만 호출할 뿐 rag_server 전용 테이블·스키마는 없다.

---

# 10. 개발 계획 (진행 상황)

Stage A → B → C 순으로 진행하며, 각 Stage 완료 시 실제 동작 검증 후 다음으로 넘어간다. 이 표는 작업 진행에 맞춰 계속 갱신한다.

## Stage A — `rag_server/` 코어 (인덱스 빌드 + 검색 API)

- [x] 프로젝트 스캐폴딩 (`package.json`, `tsconfig.json`, `config/env.ts`, `config/logger.ts`, `utils/logger.ts`, `.env`/`.env.example`)
- [x] 청킹 모듈 (`embedding/chunker.ts` — docs/*.md + README.md 헤딩(#~####) breadcrumb 분할, 실제 문서 21개+README 검증 완료, 약 670개 청크)
- [x] 임베딩 래퍼 (`embedding/embedder.ts` — `warmUp()`/`isReady()`/`embed()`, 실제 모델 로딩·384차원 출력·L2 정규화(norm≈1.0)·워밍업 후 재호출 캐싱(3ms) 검증 완료)
- [x] 인덱스 저장소 + 재구축 로직 (`index/store.ts`, `index/manifest.ts`, `index/reindex.ts`, `index/build.ts`, `config/qdrant.ts`, `config/db.ts` — `npm run build-index` 실행해 실제 Qdrant `gm_docs` alias에 670개 포인트(384차원, Cosine) 생성 확인, 검색 결과 품질 검증 과정에서 임베딩 모델을 `paraphrase-multilingual-MiniLM-L12-v2`로 교체(§3). Stage A 완료 후 동시성 리뷰에서 발견한 두 결함(재구축 중 검색이 빈 결과를 조용히 반환하는 문제, 로딩 실패 영구 고착)을 alias 원자적 스왑 + MySQL advisory lock(`runExclusive`) + `embedder.ts` 재시도 로직으로 수정 완료(§3) — 레거시 물리 컬렉션 1회성 마이그레이션, 두 `build-index` 동시 실행 시 순차 직렬화(고아 컬렉션 없음)까지 라이브로 검증)
- [x] 검색 API 라우트 (`routes/search.ts`, `routes/health.ts`, `app.ts`의 논블로킹 기동+`readiness.ts`+부팅 시 자동 재인덱싱, `middleware/{apiKeyAuth,errorHandler,requestLogger}.ts`, `constants/errors.ts`, `controllers/search.controller.ts`, `services/search.service.ts`, `utils/response.ts` — 실 서버 기동해 `GET /health`(loading→ok 전환), `POST /search` 401(키 없음/오답)·400(query 누락/top_k 범위 밖)·200(정상 검색) 전부 curl로 검증 완료)
- [x] `npm install`
- [x] Stage A 검증 (`npm run build-index` → Qdrant 포인트 개수 실측 일치 확인 → `RAG_API_KEY` 설정 상태로 401/400/200 curl 검증 — 위 항목과 함께 완료)

## Stage B — MCP 통합 (`mcp_server_dev`, `mcp_server_pc`)

- [ ] `ragClient.ts` 추가 (양쪽 프로젝트 동일)
- [ ] `search_docs` tool 추가 (양쪽 프로젝트 동일, role 게이팅 없음)
- [ ] `.env.example`에 `RAG_BASE_URL` 추가
- [ ] 검증 (Claude Code 세션에서 `search_docs` 실제 호출)

## Stage C — GM Platform `server/` 프록시

- [ ] `server/src/config/env.ts`에 `ragServer` 그룹 추가
- [ ] `server/src/services/docSearch.service.ts` 신설
- [ ] `server/src/routes/docSearch.ts` (`GET /api/doc-search`, `authenticate`만 요구)
- [ ] `tests/api_test.ps1` 케이스 추가
- [ ] Swagger 문서 반영
- [ ] 검증 (JWT로 `GET /api/doc-search` 호출)

## 범위 밖 (후속 논의)

- `client/` 프론트엔드 검색 UI — 위 세 Stage 검증 후 별도 Stage로 진행
- Phase 2(API 정의)/Phase 3(감사로그) RAG — `FN_HAS_PROJECT_ROLE`/`allowedProjectIds` 스코핑 이식 필요, 별도 설계
- `CLAUDE.md` 인덱싱(보류) — §1-1 참고, 신뢰 경계 검토 후 착수
- **(백로그) `index/manifest.ts`의 `writeManifest()` 비원자적 쓰기** — `fs.writeFileSync`로 대상 경로에 직접 쓴다(temp 파일 후 rename 아님). 쓰는 도중 프로세스가 죽으면 매니페스트가 잘린 JSON으로 남을 수 있는데, `readManifest()`가 파싱 실패를 "매니페스트 없음"으로 처리해 다음 부팅 때 전체 재구축을 트리거하므로 결과적으로 안전하다(불필요한 재구축 한 번 더 도는 정도, 데이터가 조용히 틀리게 쓰이는 경우는 없음) — 동시성 리뷰에서 발견됐으나 심각도가 낮고 자가치유되어 보류. 고칠 경우 `<path>.tmp`에 쓴 뒤 `fs.renameSync`로 교체하는 표준 원자적 쓰기 패턴 적용.
