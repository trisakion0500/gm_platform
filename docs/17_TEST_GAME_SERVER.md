# 17_TEST_GAME_SERVER.md

# 테스트 게임서버

---

# 1. 개요

GM Platform의 API 등록/실행/승인 기능을 실제로 검증하기 위한 목적으로 만든 독립 서비스. gm_platform의 서버·DB와 완전히 분리되어 있으며, GM Platform이 실제로 호출하는 "외부 API 타깃"(게임서버) 역할을 한다.

| 항목 | 값 |
| ---------- | ------------------------------------- |
| 위치 | `test_game_server/` (모노레포 내부) |
| 포트 | `3100` |
| DB | `test_game_server` (gm_platform DB와 별도 스키마) |
| 스택 | Express + TypeScript + mysql2, `server/`와 동일 패턴 |

---

# 2. 폴더 구조

```
test_game_server/
├── src/
│   ├── app.ts                  # 엔트리포인트
│   ├── config/
│   │   ├── db.ts               # mysql2 pool + callSP()
│   │   ├── env.ts              # dotenv 로드 및 검증
│   │   └── logger.ts           # log4js 설정 (gm_platform과 동일)
│   ├── constants/
│   │   └── errors.ts           # ERROR_MAP, toAppError(), toDBError()
│   ├── controllers/            # 요청 파싱 · 응답 반환 (gm_platform server/와 동일 계층 구조)
│   │   ├── user.controller.ts
│   │   ├── currency.controller.ts
│   │   └── card.controller.ts
│   ├── services/                # db 호출 위임 (권한 재검증 등 로직이 없어 얇음)
│   │   ├── user.service.ts
│   │   ├── currency.service.ts
│   │   └── card.service.ts
│   ├── db/
│   │   ├── user.db.ts
│   │   ├── currency.db.ts
│   │   └── card.db.ts
│   ├── middleware/
│   │   ├── errorHandler.ts
│   │   └── requestLogger.ts
│   ├── routes/
│   │   ├── index.ts            # 라우터 통합
│   │   ├── health.ts
│   │   ├── user.ts
│   │   ├── currency.ts
│   │   └── card.ts
│   ├── types/
│   │   └── index.ts            # AppError/DBError, UserRow/CurrencyRow/CardRow
│   └── utils/
│       ├── logger.ts
│       ├── mask.ts
│       ├── validation.ts       # parsePositiveInt
│       └── response.ts         # success/fail — { result, message, data } 봉투
├── database/
│   ├── tables/                 # user.sql, currency.sql, card.sql
│   └── procedures/             # SP 7개
├── .env / .env.example
├── package.json
└── tsconfig.json
```

`.gitignore`는 별도로 두지 않는다 — 루트 `.gitignore`의 `node_modules/`, `dist/`, `.env` 패턴이 슬래시 없이 정의돼 있어 하위 디렉터리에도 그대로 적용된다.

---

# 3. DB 스키마

## user — 게임 유저

| 컬럼 | 타입 | 설명 |
| ------------ | -------- | ------------------------------------ |
| user_id | BIGINT | PK |
| nickname | VARCHAR(100) | 닉네임 |
| status | TINYINT | 1:정상, 2:일시정지, 3:영구정지 |
| created_at / updated_at | DATETIME | |

## currency — 유저별 재화 잔액 (유저당 재화종류마다 1행)

| 컬럼 | 타입 | 설명 |
| -------------- | -------- | ------------------------------------------ |
| currency_id | BIGINT | PK |
| user_id | BIGINT | FK → user |
| currency_type | TINYINT | 1:유료다이아, 2:무료다이아, 3:골드 |
| amount | BIGINT | 보유 수량 |
| updated_at | DATETIME | |

UNIQUE(user_id, currency_type)로 재화종류당 1행만 유지한다. "카탈로그+보유" 구조가 아니라 잔액을 직접 저장하는 단순 구조로 설계했다.

## card — 유저 보유 카드 (캐릭터/아이템 겸용, 보유 인스턴스 단위)

| 컬럼 | 타입 | 설명 |
| ------------ | -------- | ------------------------------------------- |
| card_id | BIGINT | PK |
| user_id | BIGINT | FK → user |
| card_type | TINYINT | 1:캐릭터, 2:아이템 |
| card_code | VARCHAR(50) | 카드 코드 (예: CHAR_001, ITEM_001) |
| quantity | INT | 보유 수량 (아이템은 중첩 가능, 캐릭터는 보통 1) |
| acquired_at | DATETIME | 최초 획득일시 |
| updated_at | DATETIME | |

`card_name` 컬럼은 두지 않았다 — 카드 정의(카탈로그)가 따로 없어 유저별 보유 인스턴스에 이름을 중복 저장할 필요가 없다는 판단.

## 시드 데이터

유저 100명(한글 닉네임), 유저당 재화 3종, 유저당 캐릭터 카드 100 + 아이템 카드 100(총 20,000행). 날짜 필드는 2026-01-01~생성 시점 사이에서 무작위 생성하되 `created_at ≤ updated_at`(user), `user.created_at ≤ currency.updated_at`(유저당 3행 순차 체이닝), `user.created_at ≤ card.acquired_at ≤ card.updated_at`(카드별 독립) 관계를 보장한다.

---

# 4. Stored Procedures

| SP | 설명 | 주요 오류코드 |
| ----------------------- | -------------------------------------------- | ------------------------ |
| SP_GET_USER | 유저 상세 조회 | 31001(유저없음) |
| SP_GET_USER_LIST | 유저 목록 (닉네임 LIKE, created_at/updated_at 범위 필터) | — |
| SP_UPDATE_USER_STATUS | 유저 상태 변경 | 31001, 30003(허용안됨값) |
| SP_GET_CURRENCY_LIST | 유저 재화 잔액 목록 | — |
| SP_GRANT_CURRENCY | 재화 지급/차감 (amount 음수=차감, 원자적 잔액검증) | 31001, 30003, 31002(잔액부족) |
| SP_GET_CARD_LIST | 보유 카드 목록 (card_type/card_code/acquired_at·updated_at 범위 필터) | — |
| SP_GRANT_CARD | 카드 지급 (기존 보유 시 수량 누적, `ON DUPLICATE KEY UPDATE`) | 31001, 30003 |

`SP_GRANT_CURRENCY`는 잔액 부족 검증을 UPDATE의 WHERE 절(`amount + i_amount >= 0`)에 직접 넣어 원자적으로 처리한다 — 사전 EXISTS 체크 방식은 동시 차감 시 레이스컨디션으로 음수 잔액이 될 수 있어 채택하지 않았다.

---

# 5. API 목록

GM Platform은 등록된 API를 항상 `POST {api_base_url}{endpoint}`로 호출하므로(`apiExecution.service.ts`), 이 서버의 모든 엔드포인트는 GET 없이 POST 하나씩으로 설계했다. 응답은 전부 `{ result, message, data: [...] }` 봉투(`data`는 항상 배열).

| endpoint | 설명 | 주요 요청 파라미터 |
| ---------------------------- | -------------- | ------------------------------------------------------------------------- |
| POST /api/get-user | 유저 상세 | user_id |
| POST /api/get-user-list | 유저 목록 | nickname?, from_created_at?, to_created_at?, from_updated_at?, to_updated_at? |
| POST /api/update-user-status | 유저 상태 변경 | user_id, status |
| POST /api/get-currency-list | 재화 잔액 목록 | user_id |
| POST /api/grant-currency | 재화 지급/차감 | user_id, currency_type, amount |
| POST /api/get-card-list | 보유 카드 목록 | user_id, card_type?, card_code?, from_acquired_at?, to_acquired_at?, from_updated_at?, to_updated_at? |
| POST /api/grant-card | 카드 지급 | user_id, card_type, card_code, quantity |

---

# 6. GM Platform 연동

- 대상 프로젝트: `project_id=2`(company_id=2, DEV_PROJECT). `api_base_url`을 `http://127.0.0.1:3100`으로 지정.
- 위 7개 API를 `project_id=2`에 등록(`api_id` 1~7). `update-user-status`/`grant-currency`/`grant-card`(상태·재화·카드를 실제로 바꾸는 액션) 3개는 `is_required_approval=1`, 나머지 조회 4개는 `0`.
- `card_type`은 대응하는 코드그룹이 없어 SELECT 대신 NUMBER 직접입력(1:캐릭터, 2:아이템)으로 등록했다.
- 코드그룹 매핑 (project_id=2, gm_platform DB): `USER_STATUS`(code_group_id=1, 1:정상/2:일시정지/3:영구정지), `CURRENCY_TYPE`(id=2, 1:유료다이아/2:무료다이아/3:골드), `CARD`(id=3, `CHAR_001`~`CHAR_100`/`ITEM_001`~`ITEM_100`에 한글 이름 매핑 — 캐릭터는 "속성+직업" 조합, 아이템은 "등급+장비" 조합).
- `api_stage`는 필요에 따라 조정: 20(개발)은 SUPER_ADMIN/DEVELOPER만, 40(운영)은 OPERATOR까지 실행 가능(`docs/03_DATABASE_SCHEMA.md` §api_stage 별 실행 가능 역할). OPERATOR 승인대기 흐름까지 테스트하려면 stage를 40으로 올려야 한다.
- Execution 승인 워크플로우(OPERATOR 요청 → APPROVER 승인 → 실제 test_game_server 반영)까지 라이브로 검증 완료.

---

# 7. 실행 방법

```powershell
cd test_game_server
npm install
npm run dev     # tsx watch, 기본 포트 3100
```

DB는 별도로 준비해야 한다 — `database/tables/*.sql` → `database/procedures/*.sql` 순서로 실행.
