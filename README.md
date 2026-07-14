# GM Platform

> 게임 서비스 운영을 위한 데이터 기반 GM-Tool 플랫폼

---

## 왜 만들었나

게임 서비스를 운영하다 보면 반드시 필요한 것이 **GM-Tool**이다.
아이템 지급, 유저 제재, 캐시 지급, 이벤트 적용 등 운영 담당자가 직접 게임 서버에 명령을 내릴 수 있는 내부 관리 도구다.

문제는 이 도구를 **백엔드 개발자가 함께 만들어야 한다**는 점이다.

백엔드 개발자는 게임 서버 API를 설계하고, 동시에 GM-Tool의 프론트엔드까지 구현해야 한다.
하지만 대부분의 백엔드 개발자는 Web Front-End에 대한 경험이 충분하지 않다.
React, Vue, 상태관리, UI 컴포넌트... 익숙하지 않은 영역과 마주하는 것은 큰 스트레스로 이어진다.

**GM Platform은 이 문제를 해결하기 위해 설계했다.**

---

## 핵심 아이디어

GM-Tool에서 이루어지는 대부분의 작업은 단순하다.

```
입력 폼 → 게임 서비스 API 호출 → 결과 확인
```

이 구조는 항상 같다. 달라지는 것은 **어떤 파라미터를 어떤 방식으로 입력받느냐**뿐이다.

GM Platform은 백엔드 개발자가 **데이터로 화면을 구성**할 수 있도록 한다.

- API의 요청 파라미터를 등록하면 → 입력 폼이 자동으로 렌더링된다
- 응답 파라미터를 등록하면 → 결과 화면이 자동으로 구성된다
- 컴포넌트 타입(텍스트, 숫자, 날짜, 셀렉트, 라디오, 체크박스)을 선택하면 → UI가 그에 맞게 생성된다

프론트엔드 코드를 한 줄도 작성하지 않고도 새로운 GM 기능을 추가할 수 있다.

---

## 다중 서비스 통합 운영

여러 게임 서비스를 **하나의 플랫폼에서 통합 운영**하는 것도 주요 목표다.

게임사가 여러 타이틀을 운영하는 경우, 각 게임마다 별도의 GM-Tool을 유지하는 것은 비효율적이다.
GM Platform은 **회사 → 프로젝트 → API** 계층 구조로 데이터 모델 자체를 설계했다.
회사 단위로 모든 하위 리소스(프로젝트, API 정의, 사용자, 권한, 감사 로그)가 격리되는 구조이기 때문에, 처음부터 다중 테넌트 운영을 전제로 만들어졌다.

지금은 하나의 조직이 여러 게임 타이틀을 통합 관리하는 시나리오에 맞춰져 있지만, 회사 단위 격리가 이미 데이터 모델에 반영되어 있어 추후 여러 고객사가 하나의 플랫폼을 공유하는 SaaS 형태로 확장할 때도 테이블 구조를 크게 바꾸지 않고 접근할 수 있다.

---

## 향후 확장 아이디어

API 정의(요청/응답 파라미터)와 감사로그·실행이력 같은 운영 데이터가 구조화된 형태로 축적되기 때문에, 이 데이터를 자연어로 조회할 수 있는 RAG 기반 확장도 아이디어 차원에서 고려하고 있다. 다만 현재는 구현 계획에 포함되어 있지 않으며, 데이터 구조상 나중에 시도해볼 수 있는 방향 정도로 남겨둔 것이다.

---

## 개인적인 동기

나는 JDK 6 시대에 웹 개발자로 일한 경험이 있다.

당시의 웹 개발과 현재의 웹 개발은 완전히 다른 세계다.
컴포넌트 기반 프레임워크, 상태 관리, 번들러, TypeScript... 적응에 어려움을 느끼는 것이 사실이다.

이 프로젝트는 그 어려움을 정면으로 마주하고,
현시점의 기술 스택을 실제 서비스 수준으로 설계하고 구현하는 과정의 기록이기도 하다.

---

## 기술 스택

**Backend**

| 항목        | 스택                           |
| ----------- | ------------------------------ |
| Runtime     | Node.js 22 LTS                 |
| Framework   | Express + TypeScript           |
| Database    | MySQL 8.4                      |
| Data Access | mysql2 (Native SQL)            |
| 인증        | JWT (HS256) + user_session     |
| 비밀번호    | bcrypt (rounds=12)             |
| S2S 호출    | HTTP/HTTPS POST (JSON Payload) |
| 로깅        | log_audit + log4js             |
| API 문서    | Swagger UI (swagger-jsdoc)     |

> **JWT + user_session을 함께 쓰는 이유**
> JWT만 사용하면 발급된 토큰이 만료되기 전까지는 서버가 강제로 무효화할 방법이 없다. 하지만 운영 도구 특성상 계정 정지, 권한 변경, 강제 로그아웃처럼 **즉시 반영되어야 하는 상황**이 자주 발생한다. 그래서 JWT는 API 인증(stateless 검증)에 사용하고, `user_session`을 별도로 두어 세션 단위로 무효화 여부를 확인함으로써 토큰이 살아있어도 서버 쪽에서 즉시 접근을 차단할 수 있도록 했다. 세션 무효화가 핵심 이유다.

**Frontend**

| 항목      | 스택                  |
| --------- | --------------------- |
| Framework | React 18 + TypeScript |
| Build     | Vite                  |
| UI        | Ant Design            |
| 폼        | Ant Design Form       |
| 상태 관리 | Zustand               |
| HTTP      | Axios                 |

---

## 주요 기능

- **회사 / 프로젝트 관리** — 다중 게임 서비스 통합 운영
- **사용자 관리** — 가입 승인 워크플로우 / 역할 기반 권한(SUPER_ADMIN / DEVELOPER / APPROVER / OPERATOR)
- **API 정의** — 요청/응답 파라미터 등록으로 자동 UI 생성
- **API 실행 / 승인 워크플로우** — 즉시 실행 또는 OPERATOR → 승인자 2단계 실행
- **공통 코드 관리** — 셀렉트/라디오/체크박스 데이터 소스 관리
- **감사 로그** — 모든 운영 데이터 변경 이력 Append-Only 기록

> **즉시 실행 vs 승인 워크플로우 기준**
> 실행 방식은 역할(Role)과 API별 승인 필요 여부(`is_required_approval`) 조합으로 결정된다. `OPERATOR`가 `is_required_approval=1`로 설정된 API를 실행하는 경우에만 직접 실행이 막히고 `APPROVER` 이상의 승인을 거쳐 2단계로 처리되며, 그 외(승인 불필요 API이거나 요청자가 `DEVELOPER`/`APPROVER`/`SUPER_ADMIN`인 경우)는 즉시 실행된다. 이는 운영 실수(오지급, 오제재 등)를 승인이 필요한 API에 한해 한 번 더 걸러내기 위한 구조다.

---

## 문서 목록

| 파일                                                | 설명                                       |
| --------------------------------------------------- | ------------------------------------------ |
| [01_TECH_STACK.md](docs/01_TECH_STACK.md)           | 기술 스택 및 환경변수 목록                 |
| [02_ERD.md](docs/02_ERD.md)                         | Entity Relationship Diagram                |
| [03_DATABASE_SCHEMA.md](docs/03_DATABASE_SCHEMA.md) | 테이블 정의 및 공통 정책                   |
| [04_API_COMMON.md](docs/04_API_COMMON.md)           | API 공통 규약 (인증, 응답 형식, 오류 코드) |
| [05_AUTH_API.md](docs/05_AUTH_API.md)               | 인증 API (로그인, 토큰, 세션, JWT 명세)    |
| [06_API_SPEC_Part1.md](docs/06_API_SPEC_Part1.md)   | Company / Project / User / UserRole API    |
| [07_API_SPEC_Part2.md](docs/07_API_SPEC_Part2.md)   | API / API Request / API Response           |
| [08_API_SPEC_Part3.md](docs/08_API_SPEC_Part3.md)   | API 실행 및 승인 워크플로우                |
| [09_API_SPEC_Part4.md](docs/09_API_SPEC_Part4.md)   | Code Group / Code Item                     |
| [10_API_SPEC_Part5.md](docs/10_API_SPEC_Part5.md)   | 감사 로그                                  |
| [11_MENU_PERMISSION.md](docs/11_MENU_PERMISSION.md) | 역할별 메뉴 접근 권한                      |
| [12_SCREEN_LIST.md](docs/12_SCREEN_LIST.md)         | 화면 목록 및 연관 API                      |
| [13_LAYOUT.md](docs/13_LAYOUT.md)                   | 공통 레이아웃 구조                         |
| [14_DEV_SETUP.md](docs/14_DEV_SETUP.md)             | 로컬 개발 환경 설정                        |
| [15_PROJECT_STRUCTURE.md](docs/15_PROJECT_STRUCTURE.md) | 프로젝트 폴더 구조                     |
| [16_FRONTEND_BUILD_PLAN.md](docs/16_FRONTEND_BUILD_PLAN.md) | 프론트엔드 구현 계획 (Stage 0~7)       |
| [17_TEST_GAME_SERVER.md](docs/17_TEST_GAME_SERVER.md) | API 실행 검증용 테스트 게임서버            |
| [18_MCP_SERVER_DEV.md](docs/18_MCP_SERVER_DEV.md)   | GM Platform을 LLM이 조작하는 MCP 서버       |

---

## 프로젝트 구조

```
gm_platform/
├── client/            # Frontend (React)
├── server/            # Backend (Express)
├── test_game_server/  # GM Platform API 실행 검증용 테스트 게임서버 (별도 DB/서버, 포트 3100)
├── mcp_server_dev/    # GM Platform을 LLM(Claude Code)이 조작하는 MCP 서버 (stdio, 개발자 자동화)
├── database/
│   ├── tables/        # DDL SQL 파일 (all_tables.sql 포함)
│   └── procedures/    # Stored Procedure SQL 파일
└── docs/              # 설계 문서
```

---

## AI 활용

이 프로젝트는 AI를 개발 보조 도구로 활용한 워크플로우를 실험하기 위해 진행되었다.

요구사항 정의, 아키텍처 설계, 의사결정, 검증은 모두 개발자가 직접 수행하였으며,
AI는 문서 초안 작성과 반복적인 코드 작업의 속도를 높이는 데 활용하였다.

| 도구        | 용도                                    |
| ----------- | --------------------------------------- |
| ChatGPT     | 설계 아이디어 검토 및 트레이드오프 논의 |
| Claude Code | 문서 초안 작성 및 코드 보조             |

---

## 현재 상태

- ✅ 데이터베이스 설계 완료
- ✅ API 명세 작성 완료
- ✅ 역할별 권한 설계 완료
- ✅ 화면 목록 작성 완료
- ✅ 레이아웃 구조 정의 완료
- ✅ 로컬 개발 환경 설정 완료
- ✅ 프로젝트 폴더 구조 정의 완료
- ✅ Backend 구현 완료
  - ✅ Auth API — 로그인 / 회원가입 / 토큰 재발급 / 로그아웃 / 내 정보 / 비밀번호 변경
  - ✅ Company API — 목록 / 등록 / 상세 / 수정 / 코드조회(lookup, 회원가입 화면 전용 인증 불필요)
  - ✅ Project API — 목록 / 등록 / 상세 / 수정 / 코드조회(lookup, 회원가입 화면 전용 인증 불필요)
  - ✅ User API — 목록 / 상세 / 수정 / 가입 승인·반려 / 비밀번호 강제 초기화
  - ✅ User Role API — 목록 / 등록 / 수정
  - ✅ API API — 목록 / 등록 / 상세 / 수정 / Request·Response 파라미터 관리 / 실행
  - ✅ API Execution API — 목록 / 상세 / PENDING 목록 / 승인·반려·취소
  - ✅ Code Group API — 목록 / 등록 / 상세 / 수정 / 활성 아이템 조회
  - ✅ Code Item API — 목록 / 등록 / 상세 / 수정
  - ✅ Audit Log API — 목록 / 상세
  - ✅ Swagger UI — `GET /api/docs` (`SWAGGER_ENABLED=true` 시 활성화)
- ✅ Frontend 구현 — [16_FRONTEND_BUILD_PLAN.md](docs/16_FRONTEND_BUILD_PLAN.md) 기준 Stage 0~7 전체 완료
  - ✅ Stage 0 — 프로젝트 스캐폴딩 (Vite + React 18 + TypeScript, 의존성 설치, CORS 연동 확인, 프로덕션 빌드 검증)
  - ✅ Stage 1 — 인증 인프라 (authStore, axios 인터셉터의 401 자동 refresh, 로그인 화면)
  - ✅ Stage 2 — 라우터·레이아웃·가드·공통 컴포넌트 (AuthGuard/RoleGuard/GuestGuard, Header/Sidebar/Footer, globalStore, PermissionGuard/DataTable/ConfirmModal 등)
  - ✅ Stage 3 — 그룹 A: 회사·프로젝트 관리 (List/New/Detail 표준 패턴 확정, 목록 회사 필터는 헤더 전역 선택 사용, listFilterStore로 검색조건 유지)
  - ✅ Stage 4 — 그룹 B: 사용자·권한·감사로그 (사용자 목록/상세, User Role 서브테이블, 감사로그 목록/상세 — 가입승인·반려/비밀번호초기화/정지·재개/권한부여 액션이 감사로그에 정확히 기록됨을 검증)
  - ✅ Stage 5 — 그룹 C: API 정의·실행·코드그룹 (코드그룹 엑셀형 그리드, API 정의 List/New/Detail, API 실행 워크스페이스, 실행이력 목록/상세, 승인대기 목록/상세 — 승인/반려는 상세에서만 처리)
  - ✅ Stage 6 — 그룹 D: 회원가입·내 계정 (회사/프로젝트코드 직접 입력 방식 회원가입, 내 정보 조회·비밀번호 변경·로그아웃)
  - ✅ Stage 7 — 마무리 (403/404·오류 메시지 점검 중 발견한 백엔드 다운 시 강제 로그아웃 버그 등 2건 수정, 역할별 접근 매트릭스 재대조, 프로덕션 빌드 확인)
- ✅ 테스트 게임서버 — API 정의·실행·승인 워크플로우를 실제 외부 서비스 대상으로 검증하기 위한 독립 서비스 구축, GM Platform에 API 7개 등록 후 즉시실행/승인대기 흐름까지 라이브 검증 완료 ([17_TEST_GAME_SERVER.md](docs/17_TEST_GAME_SERVER.md))
- ✅ MCP 서버 — GM Platform REST API를 tool로 감싸 Claude Code가 직접 조회·실행·승인할 수 있도록 하는 독립 stdio MCP 서버 구축, 로그인 계정의 role_code에 따라 노출 tool을 동적으로 게이팅(승인/반려는 SUPER_ADMIN/DEVELOPER/APPROVER만), OP→APPROVER 계정 전환 실행·승인 end-to-end 라이브 검증 완료 ([18_MCP_SERVER_DEV.md](docs/18_MCP_SERVER_DEV.md))

---

## 해야할 일

- ⬜ GM Platform → 외부 API(게임서버) 호출 인증 — 현재 `callExternalApi`(server/src/services/apiExecution.service.ts)가 인증 헤더 없이 순수 POST만 보내, 외부 서비스가 무방비로 요청을 받는 상태. 외부 서버가 `X-API-Key`를 발급 → GM Platform에 등록 → 실행 시 헤더에 실어 호출 → 외부 서버가 헤더 검증하는 구조로 개선 예정.
  - `api_base_url`이 API 단위가 아닌 프로젝트 단위 컬럼이라 `api_key`도 프로젝트 단위로 저장 (1프로젝트=1대상서버=1키)
  - `phone_number`와 같은 AES-256-CBC 암호화 패턴을 재사용하되, 비밀번호처럼 완전 write-only(GET 응답에 절대 미노출)로 설계
  - 감사로그(`log_audit`)는 row 스냅샷을 암호화 이후 시점에 찍는 기존 순서를 지켜 평문 유출 방지
  - `api_execution`의 실행 시점 스냅샷 컬럼(`api_name`/`endpoint` 등)에는 포함시키지 않음 — 호출 직전에만 복호화해 헤더 구성 후 버림
  - nullable — 키 미설정 프로젝트는 헤더 없이 기존 동작 유지(하위호환)
  - 즉시실행/승인 후 실행 두 경로 모두 `callExternalApi` 한 곳을 거치므로 한 번의 수정으로 커버

---

## 라이선스

이 프로젝트는 포트폴리오/학습 목적으로 공개됩니다. 개인적인 학습·열람·참고 용도로는 자유롭게 사용할 수 있으나, 상업적 이용(영리 목적 사용, 재배포, 상용 서비스에의 포함 등)은 금지됩니다. 자세한 내용은 [LICENSE.md](LICENSE.md)를 참고하세요.