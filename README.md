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

## 추가 목적

여러 게임 서비스를 **하나의 플랫폼에서 통합 운영**하는 것도 주요 목표다.

게임사가 여러 타이틀을 운영하는 경우, 각 게임마다 별도의 GM-Tool을 유지하는 것은 비효율적이다.
GM Platform은 회사 → 프로젝트 → API 구조로 다중 서비스를 단일 플랫폼에서 관리할 수 있도록 설계했다.

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

**Frontend**

| 항목      | 스택                  |
| --------- | --------------------- |
| Framework | React 18 + TypeScript |
| Build     | Vite                  |
| UI        | Ant Design            |
| 폼        | React Hook Form       |
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

---

## 프로젝트 구조

```
gm_platform/
├── client/          # Frontend (React)
├── server/          # Backend (Express)
├── database/
│   └── tables/      # DDL SQL 파일
└── docs/            # 설계 문서
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
- 🔧 Backend 구현 중
  - ✅ Auth API — 로그인 / 회원가입 / 토큰 재발급 / 로그아웃 / 내 정보 / 비밀번호 변경
  - ✅ Company API — 목록 / 등록 / 상세 / 수정
  - ✅ Project API — 목록 / 등록 / 상세 / 수정
  - ✅ User API — 목록 / 상세 / 수정 / 가입 승인·반려 / 비밀번호 강제 초기화
  - ✅ User Role API — 목록 / 등록 / 수정
  - ⬜ API API — 목록 / 등록 / 상세 / 수정 / Request·Response 파라미터 관리 / 실행
  - ⬜ API Execution API — 목록 / 상세 / 승인·반려·취소
  - ⬜ Code Group / Code Item API
  - ⬜ Audit Log API
- ⬜ Frontend 구현
