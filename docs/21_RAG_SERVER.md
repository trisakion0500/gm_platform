# 21_RAG_SERVER.md

# RAG 서버 (문서/API 정의 검색)

---

# 1. 개요

GM Platform의 설계 문서(`docs/`)·프로젝트 소개(`README.md`, Phase 1, §10.1)와 API 정의(`api`/`api_request`/`api_response`, Phase 2, §10.2)를 자연어로 검색할 수 있게 하는 독립 서비스. gm_platform의 서버·DB 코드에는 손대지 않고 완전히 별도 프로세스로 동작하며, `test_game_server/`와 마찬가지로 상시 구동되는 Express+TypeScript HTTP 서비스다.

| 항목 | 값 |
| ---------- | ------------------------------------- |
| 위치 | `rag_server/` (모노레포 내부) |
| 포트 | `3200` (3000/3100 다음 번호) |
| 벡터 DB | Qdrant(로컬, `http://127.0.0.1:6333`) — 별도 설치 없이 이미 떠있는 인스턴스 사용 |
| 임베딩 | 로컬 모델(`@xenova/transformers`, `Xenova/multilingual-e5-base`, 768차원) — 외부 API 키·비용 없음 |
| 스택 | Express + TypeScript, `server/`/`test_game_server/`와 동일 패턴(config/routes/controllers/services/middleware) |
| 대상(Phase 1) | `docs/` 폴더 하위 모든 `.md` + 저장소 루트 `README.md`. `CLAUDE.md`는 보류(§1-1) |
| 사용 주체 | Claude(MCP, `mcp_server_dev`/`mcp_server_pc`를 통해) + GM Platform 자체(`server/` 프록시 경유) 양쪽 |

RAG 대상 후보로 문서 외에 API 정의(`api`/`api_request`/`api_response`)와 감사로그(`log_audit`)도 있었으나, 이 둘은 프로젝트/회사 단위 접근제어가 이미 걸려 있어 검색 경로에도 같은 스코핑을 이식해야 한다. 접근제어가 필요 없는 문서를 Phase 1로 먼저 구현했다(§10.1). API 정의(Phase 2)와 감사로그(Phase 3) 모두 구현·검증 완료(§10.2, §10.3).

## 1-1. `CLAUDE.md`는 이번 범위에서 보류

`docs/`와 `README.md`는 공개 문서라 접근제어 걱정이 없지만, `CLAUDE.md`는 외부 비공개 문서(`.gitignore` 대상)라 인덱싱하려면 이 서비스를 반드시 신뢰된 내부망에만 두고 GM Platform 경유 조회(Stage C)도 항상 `authenticate` 뒤에 있어야 하는 등 별도 신뢰 경계 검토가 필요하다. 지금은 대상에서 제외한다.

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
    ├── app.ts                   # 엔트리포인트 — listen() 즉시 호출, 백그라운드로 임베더 warmUp() → 매니페스트 비교 → 필요시 reindex.ts 재사용(실패 시 지수 백오프 재시도, §3.5), 완료 시 readiness.markReady()
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
    │   ├── store.ts              # Qdrant 컬렉션 생성/upsert/검색 래퍼(gm_docs/gm_apis 공용 저수준 함수 + 각 컬렉션 전용 얇은 wrapper) + alias 원자적 스왑
    │   ├── manifest.ts           # data/index-manifest.json 읽기/쓰기 — 파일별 SHA-256 해시로 변경 여부 판단(gm_docs 전용, gm_apis는 매니페스트 없이 §10.2의 자가치유만 사용)
    │   ├── reindex.ts            # gm_docs — 청킹→임베딩→Qdrant 재구축 흐름 + config/db.ts의 runExclusive로 감싼 forceReindex()/reindexIfChanged() — build.ts와 app.ts 부팅 시 각각 재사용
    │   ├── build.ts               # `npm run build-index` 진입점 — forceReindex()를 호출하는 CLI 래퍼
    │   ├── apiReindex.ts         # gm_apis(Phase 2, §10.2) — upsertOneApi(push 수신 증분)/rebuild(pull 기반 전체 재구축)/apiReindexIfChanged(부팅 자가치유)/forceReindexApis
    │   └── buildApis.ts          # `npm run build-index-apis` 진입점 — forceReindexApis()를 호출하는 CLI 래퍼
    ├── routes/
    │   ├── search.ts             # POST /search
    │   ├── apiSearch.ts          # POST /apis/search, POST /apis/reindex (§10.2)
    │   └── health.ts             # GET /health
    ├── controllers/
    │   ├── search.controller.ts
    │   └── apiSearch.controller.ts
    ├── services/
    │   ├── search.service.ts
    │   └── apiSearch.service.ts  # project_roles → Qdrant should 필터 변환(§10.2 "스코핑")
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

# 3. 동작 방식

## 3.1 임베딩

로컬 모델(`@xenova/transformers`, `Xenova/multilingual-e5-base`, 768차원)로 Node 프로세스 안에서 직접 임베딩을 생성한다 — 외부 API 키·과금 없이 완전 오프라인으로 동작(최초 실행 시 모델 파일만 1회 다운로드, ~283MB). 원래는 경량 다국어 모델(`Xenova/paraphrase-multilingual-MiniLM-L12-v2`, 384차원)을 썼으나, "기술 스택"/"테크스택"처럼 짧고 일반적인 질의에서 실제로 무관한 청크가 상위권을 차지하는 anisotropy(hubness) 현상이 실측으로 확인돼 검색(retrieval) 목적으로 학습된 이 모델로 교체했다. 재검증 결과 실패하던 두 질의가 각각 1~2위로 올라섰고, 기존에 잘 되던 질의도 회귀 없이 스코어가 더 견고해졌다(0.2~0.7의 넓은 분포 → 0.77~0.88의 좁은 분포).

`multilingual-e5` 계열은 문서(passage)와 질의(query)를 비대칭으로 인코딩하도록 학습돼 있어, 임베딩 직전에 반드시 프리픽스를 붙여야 한다 — 청크 쪽은 `reindex.ts`가 `"passage: "`, 질의 쪽은 `search.service.ts`가 `"query: "`를 붙인다. 다른 계열 모델로 바꾸면 이 프리픽스 로직도 함께 재검토해야 한다. 모델을 바꿀 때는 `store.ts`의 `VECTOR_SIZE`도 실제 출력 차원과 맞춰야 하며(다르면 Qdrant `createCollection` 자체가 실패), 차원이 바뀌었어도 `rebuildAndSwap()`이 매번 새 물리 컬렉션을 만드는 구조라 기존 컬렉션을 수동으로 지울 필요는 없다 — `npm run build-index` 한 번이면 충분하다.

청크 임베딩에는 본문(`text`)뿐 아니라 heading(breadcrumb, `heading + "\n" + text`)도 함께 포함한다 — 표·의사코드 위주라 본문에 실제 검색 키워드가 거의 없는 청크도(예: "9. 비밀번호 변경 > ... > 처리 정책") 정확히 검색되게 하기 위함. Qdrant payload의 `heading`/`text` 필드는 이와 무관하게 원본 그대로다.

본문이 마크다운 표로만 이루어진 청크는 임베딩 직전에 표를 파이프·구분행 없는 평문(`embedding/chunker.ts`의 `flattenTablesForEmbedding`)으로 바꿔서 넣는다 — 파이프투성이 원문 그대로는 자연어 문장 위주로 학습된 모델이 의미를 잘 못 잡기 때문. Qdrant에 저장·응답으로 노출되는 `text`는 원본 마크다운 그대로다(표시용/임베딩용 분리).

## 3.2 청킹 (`embedding/chunker.ts`)

문서를 `#`~`####`(레벨 1~4) 헤딩 단위로 분할하고, 상위 헤딩까지 `" > "`로 이어붙인 breadcrumb을 `heading` 필드에 담는다(예: "6. 보안 정책 > 6.4 세션 정리 정책 > 6.4.1 인스턴스 간 중복 실행 방지"). 본문이 30자 미만인 섹션(제목만 있는 헤딩 등)은 독립 청크로 만들지 않고 다음 섹션에 흡수시킨다.

섹션 본문은 길이와 무관하게 항상 문단(빈 줄) 단위로 소주제별 청크로 나눈다(30자 미만인 조각만 인접 조각과 합침) — 표+설명 문단처럼 서로 무관한 소주제가 한 헤딩 아래 섞여 있으면 mean pooling으로 특정 소주제 질의 신호가 희석되는 문제가 있었기 때문. 빈 줄 없이 문단 하나가 그 자체로 1200자를 넘으면(긴 마크다운 표 등) 줄 단위로 한 번 더 재분할한다.

## 3.3 인덱스 저장 (Qdrant)

`gm_docs`는 실제 컬렉션이 아니라 **alias**다. 재구축(`store.ts`의 `rebuildAndSwap()`)마다 새 물리 컬렉션(`gm_docs_<timestamp>`)에 전체 청크를 전량 upsert한 뒤, `updateCollectionAliases()`로 alias를 그 컬렉션으로 원자적으로 재지정하고 나서야 이전 물리 컬렉션을 삭제한다 — 검색은 항상 "완전한 옛 인덱스" 아니면 "완전한 새 인덱스"만 보고, 재구축 도중의 빈 컬렉션이나 컬렉션 없음 오류를 절대 관측하지 않는다.

`config/qdrant.ts`의 `QdrantClient`는 `timeout: env.qdrant.timeoutMs`(기본 60000ms)를 명시한다 — 라이브러리 기본값(300초)을 그대로 두면 Qdrant가 응답 없이 멈춘 상태에서 검색 요청 하나가 최대 5분까지 물릴 수 있었다. 이 타임아웃은 클라이언트가 만드는 모든 호출(검색·재인덱싱의 대량 upsert 포함)에 동일하게 적용되는 전역값이라(`upsert()`는 호출별 override를 지원하지 않음), 너무 짧게 잡으면 정상 재인덱싱까지 끊어버린다 — `reindex.ts`의 `LOCK_TIMEOUT_MS`(60000, "실측 재구축 시간보다 넉넉하게")와 동일한 여유 기준으로 맞췄다.

## 3.4 재인덱싱 트리거

- **부팅 시 자동** — 매니페스트 비교보다 먼저 `store.ts`의 `isIndexHealthy()`로 Qdrant의 실제 인덱스 상태(alias가 존재하고 `points_count > 0`인지)를 확인한다. 비어있으면(alias/컬렉션을 콘솔 등으로 직접 삭제한 경우 등) 매니페스트 일치 여부와 무관하게 즉시 강제 재구축한다(자가 치유) — 매니페스트는 어디까지나 로컬 파일이라 Qdrant 쪽 상태 변화를 전혀 알 수 없기 때문에, 문서 내용이 그대로면 재인덱싱을 스킵하고도 `markReady()`가 호출돼 실제로는 존재하지 않는 alias를 검색이 조회하려다 실패하는 결함이 있었다. 인덱스가 정상이면 그 다음 `data/index-manifest.json`(파일별 SHA-256 해시 + `EMBEDDING_MODEL`명·차원)과 현재 `docs/*.md`+`README.md`, 현재 설정값을 비교해 변경이 있을 때만 재구축한다. 모델명·차원도 매니페스트에 포함시킨 이유: 문서 내용은 그대로여도 `EMBEDDING_MODEL`을 바꾸면 기존 Qdrant 컬렉션의 벡터가 새 모델과 차원이 달라 호환되지 않는데, 문서 해시만 비교하면 이를 "변경 없음"으로 오판해 옛 컬렉션을 그대로 alias에 남겨두게 된다(다음 검색 요청이 벡터 크기 불일치로 실패).
- **수동** — `npm run build-index`. 서버가 이미 떠있는 상태에서 실행해도 무방하다. 매니페스트 비교 없이 항상 무조건 재구축이라 `isIndexHealthy()` 확인 대상이 아니다.

두 경로 모두 `config/db.ts`의 `runExclusive()`(MySQL advisory lock, `SP_LOCK_ACQUIRE`/`SP_LOCK_RELEASE` 재사용)로 감싸져 있어 여러 재구축이 동시에 겹치지 않는다. 락 획득 후 매니페스트를 한 번 더 비교하므로, 대기 중 다른 프로세스가 이미 최신으로 재구축을 끝냈다면 중복 작업 없이 넘어간다.

## 3.5 준비 상태(readiness)

`app.ts`는 `listen()`을 즉시 호출해 서버 자체는 곧장 기동하고, 백그라운드로 모델 로딩(`embedder.ts`의 `warmUp()`) → 필요시 재인덱싱까지 마쳐야 `readiness.ts`의 `isReady()`가 `true`가 된다. 준비 전 `POST /search`는 붙잡아두지 않고 즉시 503(`MODEL_LOADING`)을 반환하며, `GET /health`도 같은 상태를 `loading`/`ok`로 노출한다.

`warmUp()`+`reindexIfChanged()`가 실패하면(예: MySQL/Qdrant가 이 서버보다 늦게 뜨는 배포 순서) `app.ts`의 `bootstrapWithRetry()`가 지수 백오프(1s→2s→4s→...,최대 10s 간격)로 재시도한다. `RAG_BOOT_RETRY_MAX_MS`(기본 60초) 누적 시간 안에 성공 못 하면 포기하고 리턴한다 — 이때 프로세스는 종료하지 않으며(`server/`의 부팅 재시도와 달리 `process.exit()`을 호출하지 않음), `markReady()`가 끝내 호출되지 않아 재시작 전까지 `GET /health`가 `loading`으로 남는다. `warmUp()`은 이미 성공한 뒤에는 캐시된 결과를 즉시 반환하므로(`embedder.ts`), 반복 호출은 `reindexIfChanged()` 쪽 재시도 비용만 든다. 이미 `markReady()`된 이후(런타임 중) 발생하는 Qdrant 장애는 이 재시도 대상이 아니다 — `store.ts`의 `withSocketRetry()`·Qdrant 클라이언트 타임아웃(§3.3)으로 개별 요청 단위에서 이미 격리된다.

## 3.6 인증

선택적 공유키(`RAG_API_KEY`, `X-API-Key` 헤더, `crypto.timingSafeEqual` 상수시간 비교) — `test_game_server/middleware/apiKeyAuth.ts`와 동일 패턴. 미설정 시 검증을 건너뛴다(로컬 개발용). GM Platform `server/`(이미 JWT로 인증된 경로)와 달리 MCP 클라이언트는 JWT 인증 없이 직접 호출하므로, MCP 경로 입장에서는 이 키가 사실상 유일한 방어선이다 — 실사용 전 반드시 실제 값으로 설정한다.

---

# 4. API

응답은 `{ result, message, data: [...] }` 봉투(`server/`/`test_game_server/`와 동일 관례).

## `POST /search`

요청: `{ query: string, top_k?: number }` (`top_k` 기본값 5, 1~20 범위 밖이면 30003)

응답 `data`: `[{ file: string, heading: string, text: string, score: number }]` — `score`는 코사인 유사도(Qdrant가 반환하는 값 그대로).

서버가 아직 준비되지 않았으면(§3.5) 즉시 503(`result: 50002`, "모델을 로드하는 중입니다. 잠시 후 다시 시도하세요")으로 응답한다. `X-API-Key`가 설정된 상태에서 헤더가 없거나 틀리면 401(`result: 10001`).

## `GET /health`

`{ result: 0, data: [{ status: "ok" | "loading" }] }` — `loading`은 §3.5의 준비 상태가 아직 안 끝난 경우.

## `GET /doc-search` (GM Platform `server/` 경유, §7 Stage C)

rag_server가 아니라 GM Platform `server/`가 노출하는 별도 엔드포인트다 — `authenticate`(JWT)만 요구하며 역할 제한은 없다. 내부적으로 위 `POST /search`를 그대로 호출하는 얇은 프록시.

요청: `?q=<string>&top_k=<1~20, 선택>` — 응답 형식은 `{ result: 0, data: [...] }`(GM Platform 공통 관례), `data`의 각 원소 구조는 `POST /search`와 동일.

---

# 5. 인덱스 빌드 (`npm run build-index`)

`src/index/build.ts`가 진입점이다.

1. 저장소 루트 기준 `docs/` 폴더 하위의 모든 `.md` 파일과 저장소 루트의 `README.md`를 읽는다 — `__dirname` 기준 절대경로로 접근한다(`process.cwd()` 상대경로 금지, cwd가 달라지는 실행 환경에서도 안전하도록).
2. `embedding/chunker.ts`로 파일별 청크를 만든다(§3.2).
3. `embedding/embedder.ts`로 각 청크를 768차원 벡터로 변환한다(§3.1).
4. `index/store.ts`의 `rebuildAndSwap()`으로 새 물리 컬렉션을 만들어 전체 청크를 순번 정수 ID로 upsert하고, `gm_docs` alias를 원자적으로 스왑한다(§3.3).

전체 과정은 `forceReindex()`를 통해 MySQL advisory lock으로 감싸져 있어(§3.4), `app.ts`가 이미 떠서 자체 재인덱싱 중이어도 서로 겹치지 않고 순서대로 실행된다.

실행 후 Qdrant REST(`GET /collections/gm_docs`)로 포인트 개수를 확인해 인덱싱이 실제로 반영됐는지 검증할 수 있다(alias로 요청해도 실제 컬렉션과 동일하게 응답한다).

---

# 6. Qdrant 연동

- 접속: `QDRANT_URL`(기본 `http://127.0.0.1:6333`), `QDRANT_API_KEY`(필수 — 이 환경의 Qdrant는 API 키 인증이 걸려 있다) 헤더로 인증.
- `QDRANT_COLLECTION`(기본 `gm_docs`)은 물리 컬렉션이 아니라 **alias**다. 실제 데이터는 `gm_docs_<timestamp>` 형식의 물리 컬렉션에 있고, alias가 그중 "현재 유효한" 컬렉션 하나를 가리킨다(§3.3). 벡터 크기 768, distance `Cosine`은 물리 컬렉션 생성 시 동일하게 적용.
- `@qdrant/js-client-rest`의 `QdrantClient`를 `config/qdrant.ts`에서 싱글톤으로 생성해 `index/store.ts`(인덱싱·alias 스왑)와 `services/search.service.ts`(검색 질의, alias로 조회) 양쪽이 공유한다.
- 이 Qdrant 인스턴스는 rag_server 전용이 아니라 이미 다른 용도로도 떠있는 공용 인스턴스다 — `gm_docs` alias 및 그 물리 컬렉션(`gm_docs_*`)이라는 명확한 이름만 사용해 다른 컬렉션과 섞이지 않게 한다.

---

# 7. MCP / GM Platform 연동

## Stage B — MCP 통합 (완료)

`mcp_server_dev`/`mcp_server_pc` 양쪽에 동일한 구성으로 추가했다(두 프로젝트가 스캐폴딩을 100% 동일하게 복제해 유지하는 기존 관례 그대로).

| 파일 | 역할 |
| --- | --- |
| `src/ragClient.ts` | `gmClient.ts`와 별개의 경량 axios 클라이언트. GM Platform 로그인 상태와 무관하게 `RAG_BASE_URL`로 rag_server를 직접 호출하고, `RAG_API_KEY` 설정 시 `X-API-Key` 헤더를 붙인다. `RagApiError`(rag_server의 result/message를 그대로 담음)를 던진다 |
| `src/tools/searchDocs.ts` | `search_docs` tool. 기존 `safeTool`/`ok()`/`toToolError()` 패턴을 그대로 재사용, `RagApiError` 분기 추가 |
| `index.ts` | 문서 검색은 역할과 무관하게 유용해 role 게이팅 없이 등록 |

**`RAG_ENABLED`(true/false, 기본 `false`)** — `server/`의 `REDIS_ENABLED` 폴백 패턴과 동일하게, `false`면 `RAG_BASE_URL` 검증을 건너뛰고 `search_docs` tool 등록 자체를 생략한다(rag_server를 쓰지 않는 환경에서도 나머지 tool은 정상 기동). `true`인데 `RAG_BASE_URL`이 없으면 즉시 기동 실패한다.

Claude Code CLI뿐 아니라 Claude 데스크탑 앱의 MCP 커넥터로도 동일하게 동작한다(표준 MCP stdio 서버) — 데스크탑 앱 등록과 `search_docs` 실시간 호출까지 end-to-end로 검증 완료.

## Stage C — GM Platform `server/` 프록시 (완료)

`server/`에 `GET /api/doc-search?q=...`(`authenticate`만 요구, 역할 제한 없음)를 신설해 이 서버의 `/search`를 대신 호출한다(§4). GM Platform 자체(향후 `client/` 검색 UI 포함)가 이 프록시를 통해 재사용한다.

`RAG_ENABLED`(true/false, 기본 `false`) — Stage B와 동일한 이름·의미의 토글을 `server/`에도 두었다. `false`면 `/doc-search` 라우트 자체를 등록하지 않는다(`routes/index.ts`, `SWAGGER_ENABLED` 조건부 로드와 동일 패턴) — rag_server 없이도 GM Platform 본체는 정상 기동한다. rag_server 연동 실패(네트워크 오류·타임아웃·모델 로딩 중·rag_server 자체 오류)는 사유를 구분하지 않고 전부 503(`result: 50002`)으로 통일한다.

---

# 8. 환경변수 (`rag_server/.env`)

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `PORT` | 서버 포트 | `3200` |
| `HOST` | 바인딩할 인터페이스 — 신뢰된 내부망 전용 설계 전제(§3)를 강제하기 위해 기본값을 루프백으로 고정. 분리 배포 등으로 원격 호출자를 허용해야 하면 값을 바꾸되, `RAG_API_KEY`만으로는 네트워크 노출 자체를 막지 못하므로 IP 화이트리스트 등 별도 방어를 함께 검토해야 한다 | `127.0.0.1` |
| `EMBEDDING_MODEL` | `@xenova/transformers` 모델 이름(§3.1) — `multilingual-e5` 계열 외 모델로 바꾸면 `query:`/`passage:` 프리픽스 로직과 `store.ts`의 `VECTOR_SIZE`도 함께 재검토 필요 | `Xenova/multilingual-e5-base` |
| `QDRANT_URL` | Qdrant 접속 주소 | `http://127.0.0.1:6333` |
| `QDRANT_API_KEY` | Qdrant API 키 | — |
| `QDRANT_COLLECTION` | 사용할 컬렉션명(alias) | `gm_docs` |
| `QDRANT_TIMEOUT_MS` | Qdrant 클라이언트 응답 대기 타임아웃(ms, §3.3) — 검색·재인덱싱 upsert 모두에 적용되는 전역값이라 `reindex.ts`의 `LOCK_TIMEOUT_MS`와 맞춰뒀다 | `60000` |
| `RAG_BOOT_RETRY_MAX_MS` | 부팅 시 모델 로딩+재인덱싱(`warmUp`/`reindexIfChanged`) 재시도 최대 누적 시간(ms, §3.5) | `60000` |
| `RAG_API_KEY` | `X-API-Key` 헤더 검증값. 미설정 시 검증 스킵(로컬 개발용) — 실사용 전 반드시 설정 | — |
| `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` | GM Platform 본체(`server/`)와 동일한 MySQL 접속 정보 — 재인덱싱 상호배제용 advisory lock(`SP_LOCK_ACQUIRE`/`SP_LOCK_RELEASE`)만 재사용, rag_server 전용 테이블 없음 | — (전부 필수) |

---

# 9. 실행 방법

```powershell
cd rag_server
npm install
npm run build-index   # docs/ 전체 + README.md 인덱싱 (Qdrant gm_docs 컬렉션 생성)
npm run dev            # tsx watch, 기본 포트 3200
```

Qdrant가 로컬에서 먼저 떠있어야 한다(`http://127.0.0.1:6333`). 재인덱싱 동시 실행 방지에 GM Platform 본체가 쓰는 MySQL advisory lock을 재사용하므로(§3.4), `server/`와 동일한 MySQL 인스턴스 접속 정보(`DB_*`, §8)도 필요하다 — SP만 호출할 뿐 rag_server 전용 테이블·스키마는 없다.

---

# 10. 개발 계획 (진행 상황)

RAG 대상 세 가지(§1 — 문서/API 정의/감사로그)별로 진행 상황을 나눠 정리한다.

## 10.1 문서 검색 (`docs/*.md`+`README.md`) — Phase 1

Stage A → B → C → D 순으로 진행하며, 각 Stage 완료 시 실제 동작 검증 후 다음으로 넘어간다.

### Stage A — `rag_server/` 코어 (완료)

- ✅ 프로젝트 스캐폴딩
- ✅ 청킹 모듈 (`embedding/chunker.ts`)
- ✅ 임베딩 래퍼 (`embedding/embedder.ts`)
- ✅ 인덱스 저장소 + 재구축 로직 (`index/store.ts`, `manifest.ts`, `reindex.ts`, `build.ts`, `config/qdrant.ts`, `config/db.ts`)
- ✅ 검색 API 라우트 (`routes/`, `controllers/`, `services/`, `middleware/`)
- ✅ 검증 — `npm run build-index` 실행 후 Qdrant 포인트 개수 확인, `RAG_API_KEY` 설정 상태로 401/400/200 응답 확인

### Stage B — MCP 통합 (완료)

- ✅ `ragClient.ts`/`search_docs` tool 추가 (양쪽 프로젝트 동일)
- ✅ `RAG_ENABLED`(true/false) 토글 추가
- ✅ `tsc` 빌드 통과(양쪽), rag_server 실 인스턴스 상대 end-to-end 검증
- ✅ Claude 데스크탑 앱 연동, `search_docs` 실시간 호출 검증

### Stage C — GM Platform `server/` 프록시 (완료)

- ✅ `server/src/config/env.ts`에 `rag` 그룹 추가(`RAG_ENABLED`/`RAG_BASE_URL`/`RAG_API_KEY`)
- ✅ `server/src/services/docSearch.service.ts` 신설
- ✅ `server/src/routes/docSearch.ts` (`GET /api/doc-search`, `authenticate`만 요구), `RAG_ENABLED=false`면 라우트 자체 미등록
- ✅ `tests/api_test.ps1` 14B 섹션 추가(rag_server 기동 전제 스모크 테스트)
- ✅ Swagger 문서 반영(`DocSearch` 태그)
- ✅ 검증 (JWT로 `GET /api/doc-search` 호출, `tests/api_test.ps1` 전체 회귀)

### Stage D — `client/` 검색 UI (완료)

- ✅ `client/src/api/docSearch.api.ts` — `GET /doc-search` 호출 함수
- ✅ `pages/main/doc-search/DocSearchPage.tsx` — 검색창 + 결과 리스트(파일/헤딩/본문 스니펫/유사도)
- ✅ `router/index.tsx`/`Sidebar.tsx` — `/doc-search` 라우트·메뉴 등록(전 역할 공용, `MAIN_MENU`)

## 10.2 API 정의 (`api`/`api_request`/`api_response`) — Phase 2

Phase 1(문서)과 근본적으로 다른 지점 둘: (1) API 정의는 DB 행이라 정적 파일 해시 비교가 안 통하고, (2) `project_id`+`api_stage` 두 축의 접근제어가 걸려 있다. 여러 차례 설계 논의로 아래를 확정했다(구현은 아직 — Stage 진행 상황 참고).

### 확정된 방향

1. **범위** — rag_server 코어 + GM Platform `server/` 프록시 + `client/` 검색 UI + MCP tool(`search_apis`)까지(Phase 1의 Stage A→B→C→D→MCP를 그대로 반복).
2. **컬렉션** — 기존 `gm_docs`와 분리된 새 컬렉션 `gm_apis` 하나(스테이지·역할별로 더 쪼개지 않는다 — 근거는 아래 "컬렉션 구조").
3. **MSA 경계 유지** — rag_server는 GM Platform 스키마를 모른다. `api`/`api_request`/`api_response` 테이블에 직접 접근하지 않으며, 기존 MySQL 커넥터(`config/db.ts`)는 지금처럼 advisory lock 전용으로만 남는다. rag_server가 붙는 MySQL이 `gm_platform` DB일 필요조차 없다 — 락 재사용을 위해 같은 인스턴스를 쓰고 있을 뿐, MSA 관점에서는 논리적으로 별도 DB로 취급한다.
4. **push 기반 인덱싱** — 인덱싱할 데이터는 rag_server가 pull하지 않고 `server/`가 완성된 형태로 만들어 push한다(아래 "데이터 흐름"). rag_server는 받은 데이터를 그대로 임베딩+upsert할 뿐, API 도메인의 필드 구성·조인 로직을 전혀 모른다.
5. **증분 반영의 신뢰성 보장** — 단순 fire-and-forget이 아니라 DB에 영속하는 아웃박스 큐 + 주기적 워커로 "언젠가는 반드시 rag_server에 도달한다"를 보장한다(아래 "아웃박스 동기화"). Qdrant와 API 데이터 사이에 시간차는 허용되지만 결국은 반드시 일치해야 한다.
6. **역할×스테이지 인식 검색** — `api_stage`(20/30/40)에 따라 실행 가능한 최소 역할이 다르므로(아래 "스코핑"), 검색 결과도 그 기준을 따른다 — 실행할 수 없는 API가 검색에는 걸리는 불일치를 만들지 않는다.

### 데이터 흐름

**증분 경로(생성/수정 시, push)**:
```
관리자(SA/DEV)가 API CRUD
  → SP_CREATE_API 등 6개 SP가 같은 트랜잭션 안에서 api_index_sync_queue에 큐 등록(아웃박스 동기화)
  → server/의 크론 워커(apiIndexSync.job.ts)가 주기적으로 큐를 비움
    → getApi(apiId, 역할10 컨텍스트)로 완성된 데이터(API+request+response 전체) 조립
    → rag_server POST /apis/reindex 로 push
  → rag_server가 받은 데이터를 그대로 임베딩+upsert (point id = api_id)
```

**백필/자가치유 경로(전체 재구축, pull)**:
```
rag_server 부팅 시 gm_apis 컬렉션이 비어있음(최초 배포 또는 외부에서 컬렉션 삭제된 경우)
  → rag_server가 server/ GET /internal/apis 호출(X-API-Key 인증, 방향이 반대)
    → server/가 SP_GET_PROJECT_LIST(role_code=10) → 프로젝트별 SP_GET_API_LIST → API별 SP_GET_API를
      SUPER_ADMIN 컨텍스트로 조합해 전체 활성 API 스냅샷 반환(새 SP 없이 기존 SP 재사용)
  → rag_server가 전량 재구축(rebuildAndSwap, §3.3과 동일한 alias 원자적 스왑)
```
이 pull 호출은 rag_server의 `bootstrapWithRetry()`(부팅 시 지수 백오프 재시도, §3.5)에 그대로 편입된다 — 새 재시도 루프를 따로 만들지 않는다. `npm run build-index-apis`(CLI, 아래 "API" 참고)도 동일 경로를 무조건 실행한다.

두 경로는 상호 보완적이다 — 아웃박스는 "이후 변경분"의 근실시간 반영을, pull은 "처음 채우기"와 "외부에서 인덱스가 망가졌을 때 자가치유"를 담당한다.

### 스코핑 — `project_id` × `role_code` × `api_stage`

1. `GET /api-search?q=...&project_id=...`가 `authenticate`를 통과하면 `req.user = {user_id, role_code, ...}` 확보. `project_id`는 헤더에서 선택된 프로젝트로 **강제 스코핑**되는 필수 파라미터다(다른 프로젝트 종속 화면(`GET /apis` 등)과 동일 원칙 — SUPER_ADMIN도 예외 없이 하나의 project_id로 좁혀서 검색한다, `client/`도 "전체 프로젝트"(`selectedProjectId=null`) 상태에서는 이 API를 호출하지 않고 "프로젝트를 선택하세요"만 보여준다). 누락 시 30001.
2. `callerRoleCode === 10`(SUPER_ADMIN)이면 `[{project_id, role_code: 10}]` 한 항목으로 고정(그 프로젝트 안에서는 무제한과 동치 — `role_code=10`이 모든 `api_stage`를 통과시킴). 아니면 `resolveApiProjectRoles(callerUserId)`가 메인 DB에서 `SP_GET_USER_ROLE_LIST(callerUserId, null, null, 1, null)`로 활성 `user_role` 전체를 조회한 뒤 요청받은 `project_id`로 필터링해 `{project_id, role_code}[]`(0~1개)로 변환 — `logAudit.service.ts`의 `resolveAllowedProjectIds()`와 동일한 선례(물리적으로 분리된 log_audit DB에 `server/`가 계산한 스코프를 그대로 신뢰해 넘기는 패턴)를 따르되, role_code 상한 없이(`GET /apis`가 전 역할 조회 가능이라 log_audit의 `<=30`과 다름) role_code 자체도 함께 보존한다. 호출자가 그 project_id에 실제 활성 배정이 없으면 빈 배열이 되어 rag_server가 즉시 빈 결과를 반환한다(강제 스코핑이 인가 우회를 의미하지 않음 — 접근권한 없는 프로젝트를 지정해도 에러 대신 조용히 빈 결과).
3. `server/`가 rag_server `POST /apis/search`에 `{query, top_k, project_roles}`를 실어 호출(`project_roles: {project_id, role_code}[] | null`). **rag_server는 이 값을 그대로 신뢰한다** — JWT·role을 몰라도 되고, "호출자가 이미 검증한 프로젝트별 실제 권한"으로만 받아들인다.
4. **역할×스테이지 실행 가능 규칙**(`client/src/components/layout/Sidebar.tsx`의 `canExecuteStage()`, `SP_CREATE_API_EXECUTION`의 검사와 동일해야 함):
   ```
   api_stage=20(개발)    → SUPER_ADMIN(10), DEVELOPER(20)만
   api_stage=30(스테이징)  → SUPER_ADMIN(10), DEVELOPER(20), APPROVER(30)
   api_stage=40(운영)     → 전체 역할
   ```
   이 세 경우가 정확히 `project_role_code <= api_stage`와 동치임을 검증했다(10/20/30/40 각각의 20·30·40 대입 결과가 표와 전부 일치). 이 동치 관계가 성립하는 한 rag_server는 스테이지별 화이트리스트 없이 `api_stage` 하나만 payload에 저장하고 부등식 비교로 게이트를 재현할 수 있다 — `Sidebar.tsx`의 세 경우가 나중에 바뀌면(예: 새 role 추가) 이 동치 관계도 재검증해야 한다.
5. rag_server는 `project_roles`를 Qdrant `should`(OR) 필터로 변환:
   ```
   filter: {
     must: [{ key: 'status', match: { value: 1 } }],
     should: [
       { must: [{key:'project_id', match:{value: 1}}, {key:'api_stage', range:{gte: 20}}] },
       { must: [{key:'project_id', match:{value: 2}}, {key:'api_stage', range:{gte: 40}}] },
     ],
   }
   ```
   SUPER_ADMIN(`project_roles: null`)은 `should` 없이 `status=1` 필터만 적용. 이 필터링은 Qdrant 엔진 내부에서 벡터 유사도 계산과 함께 적용되므로, 접근 불가한 프로젝트/실행 불가한 스테이지의 청크는 애초에 결과 후보 자체에 오르지 않는다(클라이언트 사이드 필터링이 아니다).
6. **Fail-closed** — `project_roles` 필드가 요청에 없거나(undefined) 배열/`null`이 아니면 rag_server는 무제한으로 해석하지 않고 즉시 400으로 거부한다. 이번 범위(server/ 프록시만 구현)에선 항상 명시적으로 값을 보내 실무에선 안 걸리지만, 이후 MCP가 rag_server를 직접 호출하게 될 때 이 필드를 빠뜨려 조용히 전체 노출되는 사고를 막는 방어선이다.

### 컬렉션 구조 — 단일 `gm_apis` (스테이지·역할별 분리 안 함)

**검토한 대안**: 스테이지(또는 역할)별로 컬렉션을 쪼개고(`gm_apis_20`/`gm_apis_30`/`gm_apis_40`), 호출자의 역할에 따라 검색할 컬렉션 집합을 정하는 방식.

**단일 컬렉션 + payload 필터를 택한 이유**:
- 스테이지 유효성 규칙이 정확히 `role_code <= api_stage` 범위 조건 하나로 표현되므로(위 "스코핑"), Qdrant의 `range` 필터가 이미 이걸 네이티브로 처리한다 — 컬렉션 분리는 Qdrant가 이미 하는 일을 애플리케이션 레벨에서 재구현하는 셈이다.
- **프로젝트 스코핑과 스테이지 스코핑이 독립 축이 아니다** — 같은 사용자가 A프로젝트에선 DEVELOPER, B프로젝트에선 OPERATOR일 수 있어(role_code는 프로젝트별), 컬렉션을 쪼개도 "이 프로젝트에선 이 컬렉션들만"이라는 프로젝트별 조건이 어차피 남는다 — 컬렉션 분리가 프로젝트 스코핑 문제를 전혀 단순화하지 못한다.
- 프로젝트×역할 조합별로 쪼개면 컬렉션 수 = 프로젝트 수 × 스테이지 티어 수(사실상 3 — SUPER_ADMIN/DEVELOPER는 스테이지 가시성이 동일해 구분 실익이 없다)로, 프로젝트가 늘어날수록 컬렉션 수가 무한정 늘어난다. Qdrant 컬렉션은 각각 자체 HNSW 인덱스·메모리를 갖는 구조라 "데이터 양"이 아니라 "엔티티 개수"에 비례해 컬렉션이 늘어나는 건 실질적인 운영 부담이다(재구축·헬스체크·alias 스왑 로직이 컬렉션 개수만큼 반복돼야 함).
- 컬렉션을 쪼개면 검색 1회가 최대 3개 컬렉션에 대한 개별 질의 + 애플리케이션 레벨 점수 병합·재정렬이 필요해진다(단일 컬렉션은 1회 질의로 Qdrant가 이미 정렬된 top-k를 반환).
- API의 `api_stage`가 나중에 바뀌면(예: 20→30 승급) 컬렉션 분리는 포인트를 컬렉션 간 이동(삭제+재삽입)해야 하지만, 단일 컬렉션은 같은 point id에 payload만 갱신하면 끝난다.

**payload 스키마**(신규): `project_id`(INT), `api_stage`(INT), `status`(INT) — 검색 시 필터 조건, `api_id`/`api_name`/`api_code`/`endpoint`/`project_name`은 표시용.

### 아웃박스 동기화 — 신뢰성 보장 (`api_index_sync_queue`)

단순 fire-and-forget은 "server/가 죽거나 rag_server가 그 순간 응답 없으면 영구 유실"이라 위 "확정된 방향"의 신뢰성 요구를 만족하지 못한다. **DB에 영속하는 큐 + 주기적 워커**로 "언젠가는 반드시 도달한다"를 보장한다 — 무기한 재시도(별도 dead-letter 없음, 시간차는 허용되지만 결국은 반드시 일치해야 한다는 요구사항에 따름).

**`api_index_sync_queue` 테이블**(메인 `gm_platform` DB, 신규):

| 컬럼 | 설명 |
|------|------|
| `sync_id` | PK |
| `api_id` | 대상 API ID, UNIQUE(같은 API가 짧은 시간에 여러 번 수정돼도 큐에 1건만 남도록 dedup) |
| `attempt_count` | 실패 시도 횟수(진단용, cutoff 없음) |
| `last_error` | 마지막 실패 사유(진단용) |
| `created_at` / `updated_at` | |

**기존 SP 6개 수정**(`SP_CREATE_API`/`SP_UPDATE_API`/`SP_CREATE_API_REQUEST`/`SP_UPDATE_API_REQUEST`/`SP_CREATE_API_RESPONSE`/`SP_UPDATE_API_RESPONSE`) — 각 SP의 **동일 트랜잭션 안**에 큐 등록(`INSERT ... ON DUPLICATE KEY UPDATE attempt_count=0`)을 추가한다. 같은 트랜잭션에 넣는 이유: API 변경과 큐 등록이 원자적으로 묶여야 "API는 바뀌었는데 큐 등록은 실패해서 영영 동기화 안 됨" 같은 창이 생기지 않는다 — 감사 로그의 "별도 트랜잭션, fire-and-forget" 패턴보다 더 강한 보장이 필요해 의도적으로 다르게 갔다.

**신규 SP 3개**(큐 조작 전용, 호출자 접근제어 없음 — 내부 워커 전용): `SP_GET_PENDING_API_INDEX_SYNC(IN i_limit INT)`(`updated_at`도 함께 반환), `SP_DELETE_API_INDEX_SYNC(IN i_sync_id BIGINT, IN i_expected_updated_at DATETIME)`, `SP_MARK_API_INDEX_SYNC_FAILED(IN i_sync_id BIGINT, IN i_error VARCHAR(500))`. `SP_DELETE_API_INDEX_SYNC`의 `i_expected_updated_at`은 낙관적 동시성 가드다 — 워커가 조회한 뒤 push하는 사이(왕복 시간) 도메인 SP가 같은 `api_id`를 다시 수정하면 `ON DUPLICATE KEY UPDATE`로 같은 `sync_id` 행이 재큐잉되는데, 이 가드 없이 `sync_id`만으로 삭제하면 방금 push한 구버전 성공을 이유로 재큐잉된 최신 변경분까지 함께 지워버려 그 변경이 `gm_apis`에 영영 반영되지 않는 레이스가 있었다(점검 중 발견·수정). `WHERE sync_id=? AND updated_at=?`로 걸어 조회 이후 재큐잉된 행(`ROW_COUNT()=0`)은 삭제하지 않고 다음 tick 재처리에 맡긴다.

**`server/src/jobs/apiIndexSync.job.ts`**(신규) — `sessionCleanup.job.ts`와 동일하게 `config/db.ts`의 `runExclusive` advisory lock으로 스케일아웃 시 인스턴스 간 중복 실행을 막는다. 다만 스케줄링 자체는 `node-cron`이 아니라 재귀 `setTimeout`을 쓴다 — 이 워커는 특정 시각에 맞춘 크론이 아니라 고정 주기(ms) 폴링이고, 재귀 구조라 한 tick이 `API_INDEX_SYNC_INTERVAL_MS`(기본 15000)보다 오래 걸려도(대량 백로그 등) 다음 tick과 겹치지 않는다(`setInterval`이라면 겹칠 수 있음). 매 tick: pending 조회(최대 20건/tick) → 각 건마다 `getApi(apiId, 역할10 컨텍스트)`+`getProject`로 완성된 데이터 조립 → rag_server `POST /apis/reindex`로 push → 성공 시 큐에서 삭제, 실패 시 `attempt_count`/`last_error` 갱신 후 다음 tick에 재시도(행 단위 개별 try/catch라 한 건 실패가 나머지 건을 막지 않음). `RAG_ENABLED=false`면 `app.ts`가 이 함수 자체를 호출하지 않는다(`doc-search`/`internal` 라우트 조건부 등록과 동일 패턴).

### API

**rag_server**

| 엔드포인트 | 설명 |
|---|---|
| `POST /apis/search` | 요청 `{query, top_k?, project_roles: {project_id, role_code}[] \| null}`(위 "스코핑"). 응답 `data`: `[{api_id, project_id, project_name, api_name, api_code, endpoint, score}]`. `project_roles` 누락/형식 오류 시 400(fail-closed). `apiKeyAuth` 재사용. |
| `POST /apis/reindex` | server/의 아웃박스 워커가 완성된 API 데이터(위 "데이터 흐름" push 경로)를 통째로 넘기는 내부 엔드포인트. `apiKeyAuth` 재사용. |

**server/**

| 엔드포인트 | 설명 |
|---|---|
| `GET /api-search` | `authenticate`만 요구(전 역할 — `GET /apis`와 동일 범위). `q`/`project_id` 둘 다 필수(`project_id`는 헤더 선택 프로젝트로 강제 스코핑, 위 "스코핑" 참고). `RAG_ENABLED=false`면 `/doc-search`와 동일하게 라우트 자체 미등록. |
| `GET /internal/apis` | rag_server 전용 내부 엔드포인트(위 "데이터 흐름" pull 경로). 방향이 반대(rag_server→server/)라 새 미들웨어 `middleware/ragKeyAuth.ts`(`apiKeyAuth.ts`와 동일 패턴, `X-API-Key`를 `env.rag.apiKey`와 상수시간 비교)로 검증 — server/에 "JWT도 완전 공개도 아닌" 라우트가 처음 생기는 지점. |

`npm run build-index-apis`(rag_server CLI) — 위 "데이터 흐름" pull 경로를 무조건 실행하는 수동 전체 재구축.

**환경변수 추가분**

| 변수 | 위치 | 설명 | 기본값 |
|------|------|------|--------|
| `QDRANT_APIS_COLLECTION` | `rag_server/.env` | `gm_apis` alias명(위 "컬렉션 구조") | `gm_apis` |
| `API_INDEX_SYNC_INTERVAL_MS` | `server/.env` | 아웃박스 워커 주기(위 "아웃박스 동기화") | `15000` |

### Stage 진행 상황

설계는 확정됐고(위 전체) Stage A~D + MCP tool 구현·검증 완료.

**Stage A — rag_server 코어 (완료)**
- ✅ `store.ts` 컬렉션 파라미터화(`gm_docs`/`gm_apis` 공용, 새 파일로 복제 안 함 — 기존 `reindex.ts`/`search.service.ts`는 무변경)
- ✅ `gm_apis` 인덱싱(`index/apiReindex.ts` — `upsertOneApi`로 push 수신 증분 upsert, `rebuild`로 pull 기반 전체 재구축, `apiReindexIfChanged`로 부팅 자가치유)
- ✅ `POST /apis/search`(`services/apiSearch.service.ts`의 project_roles→Qdrant `should` 필터 변환, fail-closed 검증)/`POST /apis/reindex`
- ✅ `npm run build-index-apis` CLI(`index/buildApis.ts`), `app.ts`의 `bootstrapWithRetry()`에 `apiReindexIfChanged()` 편입(새 재시도 루프 없음)

**Stage B — 아웃박스 동기화 (완료)**
- ✅ `api_index_sync_queue` 테이블 + SP 6개 수정(같은 트랜잭션 내 `ON DUPLICATE KEY UPDATE` dedup) + SP 3개 신규(`SP_GET_PENDING_API_INDEX_SYNC`/`SP_DELETE_API_INDEX_SYNC`/`SP_MARK_API_INDEX_SYNC_FAILED`)
- ✅ `server/src/jobs/apiIndexSync.job.ts`(재귀 `setTimeout` 폴링 → `getApi`+`getProject` 조립 → `POST /apis/reindex` push, `RAG_ENABLED=true`일 때만 등록)

**Stage C — GM Platform `server/` 프록시 (완료)**
- ✅ `GET /internal/apis`(`services/internal.service.ts` — `SP_GET_PROJECT_LIST(role_code=10)` → 프로젝트별 `SP_GET_API_LIST` → API별 `SP_GET_API` 조합, 새 SP 없음) + `middleware/ragKeyAuth.ts`
- ✅ `GET /api-search`(`services/apiSearch.service.ts`의 `resolveApiProjectRoles` — 기존 `userRoleService.getUserRoleList` 재사용, 새 SP 없음, 메인 DB `SP_GET_USER_ROLE_LIST` 기준 프로젝트별 실제 role_code 계산 후 rag_server에 전달) + Swagger 문서 반영(`ApiSearch` 태그, `RAG_ENABLED=false` 시 `apiSearch.ts`/`internal.ts`도 글롭 제외)
- ✅ `tests/api_test.ps1` 14C 섹션(스모크 + 프로젝트/역할 교차 스코핑 회귀, 13A 스코프 프로젝트/사용자 재사용) — 전체 713/713 PASS

**Stage D — `client/` 검색 UI (완료)**
- ✅ `client/src/api/apiSearch.api.ts` — `GET /api-search` 호출 함수
- ✅ `pages/main/api-search/ApiSearchPage.tsx` — Phase 1의 `DocSearchPage`와 동일 패턴(검색창 + 결과 카드, 레이스 방지용 `requestIdRef`), 단 `globalStore.selectedProjectId`가 없으면(SUPER_ADMIN "전체 프로젝트" 상태) 검색창 자체를 숨기고 "프로젝트를 선택하세요"만 표시(위 "스코핑" 1번 — `project_id` 필수). 결과 카드는 `api_name`+유사도, `api_code`+`endpoint`만 표시 — 한 프로젝트로 스코핑되면 모든 결과의 `project_name`이 동일해 카드마다 반복 표시할 필요가 없고(헤더에 이미 선택된 프로젝트가 항상 보임), 문서 검색과 달리 결과 자체에 request/response 파라미터 상세도 없음(§10.2 payload 스키마상 원래 없는 필드) — 상세가 필요하면 `api_id`로 기존 `GET /apis/:api_id`를 별도 호출해야 한다.
- ✅ `router/index.tsx`/`Sidebar.tsx` — `/api-search` 라우트·"API 검색" 메뉴 등록(전 역할 공용, `MAIN_MENU`), `RAG_ENABLED` 게이팅은 문서 검색과 같은 빌드타임 값 재사용(새 env 없음)

**MCP tool `search_apis` (완료)**
- ✅ `mcp_server_dev`/`mcp_server_pc` 양쪽에 `tools/searchApis.ts` 추가. `search_docs`(rag_server를 `X-API-Key`로 직접 호출)와 달리 **rag_server를 직접 부르지 않고 GM Platform의 `GET /api-search`를 `gmClient.request()`로 호출**한다 — `project_id`×`role_code` 스코핑 계산이 GM Platform 서버 안에서만 이뤄지므로(위 "유저 스코핑"), `list_apis`와 동일한 인증 프록시 경로를 그대로 재사용한 것. `project_id`는 tool 입력값으로 필수 요구(GM Platform의 강제 스코핑과 동일).
- ✅ 두 서버 모두 `env.ragEnabled`일 때만 `search_docs`와 함께 등록, role 게이팅 없음(결과 자체가 GM Platform에서 이미 호출자의 실제 권한으로 좁혀져 나옴).

## 10.3 감사로그 (`log_audit`) — Phase 3 (완료)

`log_audit`은 이미 물리적으로 분리된 별도 DB(`gm_platform_log`, `database_log/`)에 있어, API 정의(Phase 2)와 근본적으로 다른 지점이 있다. 아래는 그 차이에 맞게 갈라진 설계 결정과 구현 결과다(rag_server 코어·`server/` 프록시를 먼저 검증한 뒤 MCP tool·`client/` UI를 후속으로 진행 — Phase 2와 동일한 순서, 아래 "Stage 진행 상황" 참고).

### 확정된 방향

1. **컬렉션** — 새 컬렉션 `gm_apis`와 완전히 분리된 `gm_logs` 하나. `store.ts`의 범용 헬퍼(`rebuildCollectionAndSwap`/`upsertPoints`/`searchCollection`/`withSocketRetry`)를 그대로 재사용.
2. **아웃박스 큐는 메인 DB가 아니라 `database_log`(log_audit과 같은 물리 DB)에 둔다** — Phase 2와 다른 지점. `log_audit` 자체는 도메인 쓰기와 별개 트랜잭션(fire-and-forget)으로 기록되므로 "도메인 변경과 큐 등록의 원자성"은 애초에 목표가 아니다. 여기서 지켜야 할 원자성은 "log_audit 행이 존재하면 그 큐 항목도 반드시 존재한다"이고, 이건 큐가 log_audit과 같은 DB에 있어야만 `SP_INSERT_LOG_AUDIT`의 같은 트랜잭션 안에서 보장할 수 있다.
3. **큐는 Phase 2보다 단순하다** — `log_audit`은 Append-Only라 같은 `log_audit_id`가 재큐잉되는 경우가 구조적으로 없다(API처럼 UPDATE로 같은 PK가 여러 번 바뀌는 게 아니라, 변경이 생길 때마다 새 로그 행이 생성됨). 따라서 Phase 2가 겪은 "조회 이후 재큐잉되어 낡은 데이터를 지워버리는" TOCTOU가 원천적으로 없어, `SP_DELETE_LOG_AUDIT_INDEX_SYNC`에 Phase 2의 `i_expected_updated_at` 같은 낙관적 동시성 가드가 불필요하다 — `sync_id` 하나만으로 삭제한다.
4. **임베딩 텍스트는 `server/`가 완성해서 push한다(diff 문장화)** — `before_json`/`after_json`을 그대로 rag_server에 넘기지 않는다. 대신 `server/`가 두 JSON을 필드 단위로 비교해 `"필드: 이전값 → 이후값"` 형태의 사람이 읽는 문장으로 합성하고(CREATE는 `"필드명=값"` 나열), rag_server는 그 완성된 텍스트를 그대로 임베딩만 한다 — before/after JSON 원본은 Qdrant에 절대 저장하지 않는다(원문이 필요하면 기존 `GET /log-audits/:id`로 드릴다운).
5. **스코핑은 기존 `logAudit.service.ts`의 스코핑 규칙을 그대로 재사용**한다 — project_id 있는 로그는 호출자가 role_code≤30으로 실제 배정된 프로젝트 집합에 속하는지(멤버십 매치, Phase 2처럼 스테이지별 range 조건이 없어 더 단순함), project_id 없는 로그는 호출자 회사와 일치하는지.
6. **`GET /log-audit-search`는 전 역할이 아니라 기존 `GET /log-audits`와 동일하게 SUPER_ADMIN/DEVELOPER/APPROVER로 제한**한다 — doc-search/api-search가 "전체 역할"인 건 원본 리소스가 전 역할 공개이기 때문이고, 감사로그는 원본 자체가 이미 3개 역할로 제한돼 있으니 검색도 동일 범위를 따른다.
7. **물량 문제 대응** — 전체 스냅샷 조회(부팅 자가치유·`build-index-logs` CLI)는 Phase 2처럼 한 번에 전체를 pull하지 않고 `GET /internal/log-audits?page=&page_size=`로 페이지네이션한다(rag_server가 페이지를 순회하며 pull). 증분(아웃박스)은 한 건씩이라 물량 문제가 없다. 보존기간(retention)/오래된 로그 자동 정리는 이번 범위에 넣지 않았다 — 내부 전용 저트래픽 도구라 지금 규모에서 조기 최적화하지 않는다는 기존 원칙을 그대로 따른다.

### 데이터 흐름

**증분 경로(생성/수정 시, push)**:
```
어떤 CUD 작업이든 SP_INSERT_LOG_AUDIT 호출(감사로그 기록)
  → 같은 트랜잭션 안에서 log_audit_index_sync_queue(database_log)에 큐 등록
  → server/의 워커(logAuditIndexSync.job.ts)가 주기적으로 큐를 비움
    → getLogAudit(logAuditId, 역할10 컨텍스트)로 before_json/after_json 포함 전체 행 조회
    → auditDiffText.ts로 diff 문장화(embed_text 생성)
    → rag_server POST /log-audits/reindex 로 push(before_json/after_json 원본은 포함하지 않음)
  → rag_server가 받은 embed_text를 그대로 임베딩+upsert (point id = log_audit_id)
```

**백필/자가치유 경로(전체 재구축, pull, 페이지네이션)**:
```
rag_server 부팅 시 gm_logs 컬렉션이 비어있음
  → rag_server가 server/ GET /internal/log-audits?page=&page_size= 를 페이지 단위로 순회 호출(X-API-Key 인증)
    → server/가 SP_GET_LOG_AUDIT_SYNC_SNAPSHOT(database_log, 접근제어 없음, before_json/after_json 포함)로
      페이지를 조회한 뒤 각 행을 diff 문장화해 embed_text로 변환, before/after 원본은 응답에서 제거
  → rag_server가 전량 재구축(rebuildAndSwap, §3.3과 동일한 alias 원자적 스왑)
```
이 pull 호출도 `bootstrapWithRetry()`(§3.5)에 그대로 편입된다. `npm run build-index-logs`(CLI)도 동일 경로를 무조건 실행한다.

### API

**rag_server**

| 엔드포인트 | 설명 |
|---|---|
| `POST /log-audits/search` | 요청 `{query, top_k?, scope: {allowed_project_ids, caller_company_id} \| null}`. `scope`가 `null`이면 SUPER_ADMIN(무제한). 응답 `data`: `[{log_audit_id, table_name, target_id, target_name, action_type, project_name, created_by_name, created_at, score}]`. `apiKeyAuth` 재사용. |
| `POST /log-audits/reindex` | server/의 아웃박스 워커가 완성된 감사 로그 데이터(embed_text 포함)를 넘기는 내부 엔드포인트. `apiKeyAuth` 재사용. |

**server/**

| 엔드포인트 | 설명 |
|---|---|
| `GET /log-audit-search` | `authenticate`+`requireRole(SUPER_ADMIN, DEVELOPER, APPROVER)`. `q` 필수, `project_id` 파라미터는 없다(단일 프로젝트로 강제 스코핑하지 않고 호출자가 접근 가능한 프로젝트 전체가 한 번에 검색 대상). `RAG_ENABLED=false`면 라우트 자체 미등록. |
| `GET /internal/log-audits?page=&page_size=` | rag_server 전용 내부 엔드포인트(위 "데이터 흐름" pull 경로), `ragKeyAuth`로 보호. 내부 배치 전용 페이지 크기라 공개 API의 20/30/50/100 제약과 무관. |

`npm run build-index-logs`(rag_server CLI) — 전체 재구축을 무조건 실행하는 수동 CLI.

**환경변수 추가분**

| 변수 | 위치 | 설명 | 기본값 |
|------|------|------|--------|
| `QDRANT_LOGS_COLLECTION` | `rag_server/.env` | `gm_logs` alias명 | `gm_logs` |
| `LOG_AUDIT_INDEX_SYNC_INTERVAL_MS` | `server/.env` | 아웃박스 워커 주기 | `15000` |

### Stage 진행 상황

**rag_server 코어 + `server/` 프록시 (완료)**
- ✅ DB: `database_log/tables/log_audit_index_sync_queue.sql`(신규) + `SP_INSERT_LOG_AUDIT` 트랜잭션화(같은 트랜잭션에 큐 등록) + SP 3개 신규(`SP_GET_PENDING_LOG_AUDIT_INDEX_SYNC`/`SP_DELETE_LOG_AUDIT_INDEX_SYNC`/`SP_MARK_LOG_AUDIT_INDEX_SYNC_FAILED`) + `SP_GET_LOG_AUDIT_SYNC_SNAPSHOT`(전체 pull 전용, before/after 포함)
- ✅ `rag_server`: `store.ts`에 `gm_logs` 섹션 추가(공용 헬퍼 재사용) · `index/logAuditReindex.ts`(push 증분 upsert, 페이지네이션 pull 전체 재구축, 부팅 자가치유) · `services/logAuditSearch.service.ts`(scope→Qdrant `should` 필터 변환) · `POST /log-audits/search`·`POST /log-audits/reindex` · `npm run build-index-logs` CLI · `bootstrapWithRetry()`에 `logAuditReindexIfChanged()` 편입
- ✅ `server/`: `utils/auditDiffText.ts`(diff 문장화) · `db/logAuditIndexSync.db.ts`·`jobs/logAuditIndexSync.job.ts`(아웃박스 워커, `logAudit.db.ts`의 기존 `getLogAudit` 재사용) · `logAudit.service.ts`의 `resolveAllowedProjectIds` export 후 재사용 · `services/logAuditSearch.service.ts`·`GET /log-audit-search`(SA/DEV/APV 제한) · `internal.service.ts`/`internal.controller.ts`/`GET /internal/log-audits`(페이지네이션) · Swagger 문서 반영(`LogAuditSearch` 태그, `RAG_ENABLED=false` 시 글롭 제외)
- ✅ `tests/api_test.ps1` 14D 섹션(스모크 + 역할 제한(OPERATOR 20001) + 프로젝트 스코핑, 13A/14A 스코프 프로젝트·사용자·로그 재사용)

**MCP tool `search_log_audits` (완료)**
- ✅ `mcp_server_dev`/`mcp_server_pc` 양쪽에 `tools/searchLogAudits.ts` 추가. `search_apis`와 동일하게 rag_server를 직접 부르지 않고 GM Platform의 `GET /log-audit-search`를 `gmClient.request()`로 호출한다(스코핑 계산이 GM Platform 서버 안에서만 이뤄지므로). `project_id` 파라미터는 없음(단일 프로젝트로 강제 스코핑하지 않음).
- ✅ `GET /log-audit-search` 자체가 SUPER_ADMIN/DEVELOPER/APPROVER 전용이라, `search_docs`/`search_apis`(role 게이팅 없음)와 달리 두 서버 모두 `APPROVAL_CAPABLE_ROLES`([10,20,30], 승인/반려 tool과 동일 그룹) 안에서만 `env.ragEnabled`와 함께 등록한다.

**Stage D — `client/` 검색 UI (완료)**
- ✅ `client/src/api/logAuditSearch.api.ts` — `GET /log-audit-search` 호출 함수
- ✅ `pages/admin/audit-logs/AuditLogSearchPage.tsx` — `DocSearchPage`/`ApiSearchPage`와 동일 패턴(검색창 + 결과 카드, 레이스 방지용 `requestIdRef`). `GET /log-audit-search` 자체가 SA/DEV/APV 전용이라 `/doc-search`·`/api-search`(전 역할, `MainLayout` 메인 메뉴)와 달리 `/admin/audit-logs/search`로 관리 영역(`AdminLayout`) 안에 배치했다 — 상위 `/admin` 라우트의 `RoleGuard allow=[SA,DEV,APV]`를 그대로 상속해 별도 nested guard가 필요 없다(기존 `audit-logs` 목록·상세와 동일). 결과 카드 클릭 시 `GET /log-audits/:id`(기존 상세 화면)로 드릴다운.
- ✅ `router/index.tsx`/`Sidebar.tsx` — `audit-logs/search` 라우트·"감사로그 검색" 메뉴를 `audit-logs` 바로 아래 등록(`RAG_ENABLED` 게이팅, 문서/API 검색과 같은 빌드타임 값 재사용). 관리 화면 헤더 잠금(`ADMIN_LIST_PATHS`)에는 포함하지 않음 — 목록 화면이 아니라 검색 화면이라 기존 원칙(목록만 예외, 나머지 `/admin/*` 잠금)을 그대로 따름.
- ✅ `action_type`/`table_name` 라벨 맵이 `AuditLogListPage.tsx`/`AuditLogDetailPage.tsx`에 중복 정의돼 있던 것을 이번에 발견해 `constants/statusMaps.ts`(기존 `ACTIVE_STATUS_MAP`이 있던 공유 상수 파일)로 통합하고 세 화면 모두 그걸 import하도록 정리했다 — 새 검색 화면이 세 번째 중복을 만들 뻔한 게 계기.

## 범위 밖 (공통)

- `CLAUDE.md` 인덱싱(보류) — §1-1 참고, 신뢰 경계 검토 후 착수
