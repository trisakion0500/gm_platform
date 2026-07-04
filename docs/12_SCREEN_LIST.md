# 12_SCREEN_LIST.md

# 화면 목록 (Screen List)

GM-Tool 프론트엔드 화면 목록 및 역할별 접근 권한 정의.

역할 정의 및 메뉴별 접근 권한 상세는 `11_MENU_PERMISSION.md` 참고.

---

# 1. 전체 화면 목록

| ID      | 화면명              | Route                           | SUPER_ADMIN | DEVELOPER | APPROVER | OPERATOR | 비고                                                    |
| ------- | ------------------- | ------------------------------- | :---------: | :-------: | :------: | :------: | ------------------------------------------------------- |
| **인증** |
| SCR-001 | 로그인              | `/login`                        | O           | O         | O        | O        | 미인증 전용                                             |
| SCR-002 | 회원가입            | `/signup`                       | O           | O         | O        | O        | 미인증 전용                                             |
| **관리 메뉴** |
| SCR-010 | 회사 목록           | `/admin/companies`                    | O           | O         | -        | -        | DEVELOPER: 본인 회사만                                  |
| SCR-011 | 회사 등록           | `/admin/companies/new`                | O           | -         | -        | -        |                                                         |
| SCR-012 | 회사 상세·수정      | `/admin/companies/:company_id`        | O           | O         | -        | -        | 수정: SUPER_ADMIN만                                     |
| SCR-020 | 프로젝트 목록       | `/admin/projects`                     | O           | O         | O        | O        | SUPER_ADMIN 외: 역할보유 프로젝트만                     |
| SCR-021 | 프로젝트 등록       | `/admin/projects/new`                 | O           | -         | -        | -        |                                                         |
| SCR-022 | 프로젝트 상세·수정  | `/admin/projects/:project_id`         | O           | O         | O        | O        | 수정: SUPER_ADMIN만                                     |
| SCR-030 | 사용자 목록         | `/admin/users`                        | O           | O         | -        | -        | 상태 콤보박스(전체/승인대기/정상/반려/사용중지) 필터; DEVELOPER: 본인 소속 회사 전체 status |
| SCR-031 | 사용자 상세·수정    | `/admin/users/:user_id`               | O           | O         | -        | -        | 수정·승인·반려·사용중지/재개·비밀번호초기화·권한관리: SUPER_ADMIN만                  |
| SCR-040 | 감사 로그 목록      | `/admin/audit-logs`                   | O           | O         | O        | -        | SUPER_ADMIN 외: 자사만                                  |
| SCR-041 | 감사 로그 상세      | `/admin/audit-logs/:log_audit_id`     | O           | O         | O        | -        |                                                         |
| SCR-130 | 코드그룹·코드아이템 | `/admin/code-groups`            | O           | O         | -        | -        | 헤더 프로젝트 선택 필요. 엑셀형 그리드 한 페이지에서 조회·등록·수정(등록/상세 화면 분리 없음). APPROVER/OPERATOR는 이 화면 접근 불가 — `GET /code-groups/active-with-items`로 API 화면에서 코드값만 참조 |
| SCR-140 | API 목록(관리)      | `/admin/apis`                   | O           | O         | -        | -        | 헤더 프로젝트 선택 필요, api_stage/상태 필터                |
| SCR-141 | API 등록(관리)      | `/admin/apis/new`               | O           | O         | -        | -        |                                                         |
| SCR-142 | API 상세·수정(관리) | `/admin/apis/:api_id`           | O           | O         | -        | -        | Request/Response 파라미터 등록·수정 포함(Tabs: 기본정보/Request/Response) |
| **비관리 메뉴** |
| SCR-100 | API (실행 워크스페이스) | `/apis`                     | O           | O         | O        | O        | List/New/Detail 패턴 아님 — 사이드바에서 API를 체크박스로 다중 선택하면 선택 순서대로 우측에 실행 패널(Request 입력폼+Response 결과)이 열림. project_id 선택 필요 |
| SCR-110 | API 실행 이력 목록  | `/executions`                   | O           | O         | O        | O        | OPERATOR: 본인 건만; project_id 선택 필요               |
| SCR-111 | API 실행 이력 상세  | `/executions/:api_execution_id` | O           | O         | O        | O        |                                                         |
| SCR-120 | 승인 대기 목록      | `/executions/pending`           | O           | O         | O        | -        | project_id 선택 필요                                    |
| **내 계정** |
| SCR-200 | 내 계정             | `/my-account`                   | O           | O         | O        | O        | 내 정보 조회 + 비밀번호 변경 + 로그아웃                 |

---

# 2. 화면 상세

## 2.1 인증

### SCR-001. 로그인

- **Route:** `/login`
- **접근:** 미인증 사용자 (로그인 후 자동 리다이렉트)
- **주요 기능:** 로그인 ID / 비밀번호 입력, 상태별 오류 메시지 표시 (승인 대기 / 반려 / 사용 중지)
- **연관 API:**

  | Method | Endpoint      | 설명                       |
  | ------ | ------------- | -------------------------- |
  | POST   | /auth/login   | 로그인 및 토큰 발급        |
  | POST   | /auth/refresh | Access Token 재발급 (자동) |

---

### SCR-002. 회원가입

- **Route:** `/signup`
- **접근:** 미인증 사용자
- **주요 기능:** 회사 선택, 프로젝트 선택 (선택), 로그인 ID / 이름 / 이메일 / 휴대폰번호 / 부서(선택) / 직급(선택) / 비밀번호 입력, 가입 후 승인 대기 안내
- **연관 API:**

  | Method | Endpoint     | 설명                                 |
  | ------ | ------------ | ------------------------------------ |
  | GET    | /companies   | 회사 선택 목록                       |
  | GET    | /projects    | 프로젝트 선택 목록 (company_id 기준) |
  | POST   | /auth/signup | 회원가입                             |

---

## 2.2 관리 메뉴

### SCR-010. 회사 목록

- **Route:** `/admin/companies`
- **접근:** SUPER_ADMIN, DEVELOPER (DEVELOPER: 본인 회사만)
- **주요 기능:** 회사 목록 조회 (상태 필터, 페이지네이션), 등록 버튼 (SUPER_ADMIN), 상세 이동
- **연관 API:**

  | Method | Endpoint   | 설명      |
  | ------ | ---------- | --------- |
  | GET    | /companies | 회사 목록 |

---

### SCR-011. 회사 등록

- **Route:** `/admin/companies/new`
- **접근:** SUPER_ADMIN
- **주요 기능:** 회사 코드 / 이름 / 설명 입력 및 등록
- **연관 API:**

  | Method | Endpoint   | 설명      |
  | ------ | ---------- | --------- |
  | POST   | /companies | 회사 등록 |

---

### SCR-012. 회사 상세·수정

- **Route:** `/admin/companies/:company_id`
- **접근:** SUPER_ADMIN (수정), DEVELOPER (조회만)
- **주요 기능:** 회사 정보 조회, 코드 / 이름 / 설명 / 상태 수정 (SUPER_ADMIN)
- **연관 API:**

  | Method | Endpoint                | 설명      |
  | ------ | ----------------------- | --------- |
  | GET    | /companies/{company_id} | 회사 상세 |
  | PATCH  | /companies/{company_id} | 회사 수정 |

---

### SCR-020. 프로젝트 목록

- **Route:** `/admin/projects`
- **접근:** SUPER_ADMIN, DEVELOPER, APPROVER, OPERATOR (SUPER_ADMIN 외: 자사만)
- **주요 기능:** 프로젝트 목록 조회. 회사 필터는 화면 자체가 아닌 헤더의 전역 회사 선택 콤보박스를 그대로 사용(SUPER_ADMIN만 "전체 회사" 선택 가능, 그 외 역할은 본인 소속 회사로 고정), 화면에는 상태 필터·페이지네이션만 존재. 등록 버튼 (SUPER_ADMIN), 상세 이동
- **연관 API:**

  | Method | Endpoint  | 설명          |
  | ------ | --------- | ------------- |
  | GET    | /projects | 프로젝트 목록 |

---

### SCR-021. 프로젝트 등록

- **Route:** `/admin/projects/new`
- **접근:** SUPER_ADMIN
- **주요 기능:** 회사 선택, 프로젝트 코드 / 이름 / API Base URL / 설명 입력 및 등록
- **연관 API:**

  | Method | Endpoint   | 설명               |
  | ------ | ---------- | ------------------ |
  | GET    | /companies | 회사 선택 목록     |
  | POST   | /projects  | 프로젝트 등록      |

---

### SCR-022. 프로젝트 상세·수정

- **Route:** `/admin/projects/:project_id`
- **접근:** SUPER_ADMIN (수정), DEVELOPER / APPROVER / OPERATOR (조회)
- **주요 기능:** 프로젝트 정보 조회, 코드 / 이름 / API Base URL / 설명 / 상태 수정 (SUPER_ADMIN)
- **연관 API:**

  | Method | Endpoint               | 설명          |
  | ------ | ---------------------- | ------------- |
  | GET    | /projects/{project_id} | 프로젝트 상세 |
  | PATCH  | /projects/{project_id} | 프로젝트 수정 |

---

### SCR-030. 사용자 목록

- **Route:** `/admin/users`
- **접근:** SUPER_ADMIN, DEVELOPER (DEVELOPER: 본인 소속 회사 전체 status 조회 가능)
- **주요 기능:** 사용자 목록 조회. 회사 필터는 화면 자체가 아닌 헤더의 전역 회사 선택 콤보박스를 그대로 사용(SUPER_ADMIN만 "전체 회사" 선택 가능, 그 외 역할은 본인 소속 회사로 고정), 화면에는 상태 콤보박스(전체/승인대기/정상/반려/사용중지) 필터·페이지네이션만 존재, 상세 이동
- **연관 API:**

  | Method | Endpoint | 설명                                      |
  | ------ | -------- | ----------------------------------------- |
  | GET    | /users   | 사용자 목록 (company_id·status 파라미터로 필터링) |

---

### SCR-031. 사용자 상세·수정

- **Route:** `/admin/users/:user_id`
- **접근:** SUPER_ADMIN (수정·승인·반려·권한관리), DEVELOPER (조회만)
- **주요 기능:** 사용자 정보 조회, 이름 / 이메일 / 휴대폰번호 / 부서 / 직급 / 상태 수정, 가입 승인 / 반려, 비밀번호 강제 초기화, User Role 등록·수정 (모두 SUPER_ADMIN만)
- **연관 API:**

  | Method | Endpoint                           | 설명                 |
  | ------ | ---------------------------------- | -------------------- |
  | GET    | /users/{user_id}                   | 사용자 상세          |
  | PATCH  | /users/{user_id}                   | 사용자 수정          |
  | POST   | /users/{user_id}/approve           | 가입 승인            |
  | POST   | /users/{user_id}/reject            | 가입 반려            |
  | POST   | /users/{user_id}/reset-password    | 비밀번호 강제 초기화 |
  | GET    | /user-roles                        | 권한 목록            |
  | POST   | /user-roles                        | 권한 등록            |
  | PATCH  | /user-roles/{user_id}/{project_id} | 권한 수정            |

---

### SCR-040. 감사 로그 목록

- **Route:** `/admin/audit-logs`
- **접근:** SUPER_ADMIN, DEVELOPER, APPROVER (SUPER_ADMIN 외: 자사만)
- **주요 기능:** 감사 로그 목록 조회. 회사·프로젝트 필터는 화면 자체가 아닌 헤더의 전역 회사/프로젝트 선택을 그대로 사용(SUPER_ADMIN만 "전체" 선택 가능), 화면에는 테이블 / 작업 유형 / 기간 필터·페이지네이션 존재(작업자 필터는 없음 — 대신 목록·상세 모두 프로젝트/작업자를 원시 ID가 아닌 이름으로 표시), 상세 이동
- **연관 API:**

  | Method | Endpoint    | 설명           |
  | ------ | ----------- | -------------- |
  | GET    | /log-audits | 감사 로그 목록 |

---

### SCR-041. 감사 로그 상세

- **Route:** `/admin/audit-logs/:log_audit_id`
- **접근:** SUPER_ADMIN, DEVELOPER, APPROVER
- **주요 기능:** before_json / after_json 비교 조회, 작업 유형 (CREATE / UPDATE / STATUS_CHANGE) 확인
- **연관 API:**

  | Method | Endpoint                   | 설명           |
  | ------ | -------------------------- | -------------- |
  | GET    | /log-audits/{log_audit_id} | 감사 로그 상세 |

---

### SCR-130. 코드그룹·코드아이템

- **Route:** `/admin/code-groups`
- **접근:** SUPER_ADMIN, DEVELOPER (APPROVER/OPERATOR는 이 화면에 접근 불가 — 관리 라우트 가드가 회사/프로젝트/사용자와 동일하게 SUPER_ADMIN/DEVELOPER로 제한)
- **주요 기능:** 등록/상세 화면을 따로 두지 않고 **엑셀형 편집 그리드 한 페이지**에서 코드그룹 조회·등록·수정을 모두 처리. 프로젝트는 화면 자체 선택 없이 헤더의 전역 프로젝트 선택을 그대로 사용(미선택 시 안내 문구만 표시). "코드그룹 추가" 버튼으로 그룹ID 없는 신규 행을 그리드에 추가하고, 셀을 직접 편집한 뒤 "적용" 버튼을 눌러야 실제로 저장(신규 행은 POST, 변경된 기존 행은 PATCH)됨 — 셀 변경마다 즉시 저장하지 않음. 그룹ID는 auto_increment라 화면에 노출하지 않고, 신규 행은 코드그룹코드도 함께 입력하지만 저장 후에는 코드값이 수정 불가능해짐(서버 규칙과 동일)
- **코드 아이템**: 코드그룹 행을 확장(expand)하면 하단에 동일한 엑셀형 그리드로 해당 그룹의 코드 아이템을 관리(추가/수정/적용 동일 패턴). 그룹이 아직 저장되지 않은 신규 행이면 확장 불가(그룹ID가 있어야 아이템 등록 가능)
- **저장 실패 처리**: "적용" 시 일부 행만 실패해도 성공한 행은 반영하고 실패한 행만 에러 메시지와 함께 편집 상태로 남겨 재시도 가능(행 배경색으로 강조)
- **APPROVER/OPERATOR의 코드값 참조**: 이 화면에는 접근할 수 없지만, `GET /code-groups/active-with-items?project_id=`(전 역할 허용, 프로젝트의 활성 코드그룹+활성 아이템을 한 번에 반환)를 통해 API 상세/실행 화면(Stage 5 후반)에서 SELECT/RADIO/CHECKBOX 값을 조회한다. N+1 방지를 위해 그룹별 `active-items` 개별 호출 대신 프로젝트 단위로 한 번에 내려주는 전용 엔드포인트다.
- **연관 API:**

  | Method | Endpoint                              | 설명                                          |
  | ------ | -------------------------------------- | --------------------------------------------- |
  | GET    | /code-groups?project_id={id}          | 코드 그룹 목록 (project_id 필수)             |
  | POST   | /code-groups                          | 코드 그룹 등록                               |
  | PATCH  | /code-groups/{code_group_id}          | 코드 그룹 수정                               |
  | GET    | /code-items?code_group_id={id}        | 코드 아이템 목록 (code_group_id 필수)        |
  | POST   | /code-items                           | 코드 아이템 등록                             |
  | PATCH  | /code-items/{code_item_id}            | 코드 아이템 수정                             |
  | GET    | /code-groups/active-with-items?project_id={id} | 프로젝트의 활성 코드그룹+아이템 일괄 조회 (전 역할) |

---

### SCR-140. API 목록(관리)

- **Route:** `/admin/apis`
- **접근:** SUPER_ADMIN, DEVELOPER
- **주요 기능:** 헤더 프로젝트 선택 사용(화면 자체 선택 없음), API 목록 조회(api_stage / 상태 필터, 페이지네이션), 등록 버튼, 상세 이동
- **연관 API:**

  | Method | Endpoint  | 설명                       |
  | ------ | --------- | -------------------------- |
  | GET    | /apis     | API 목록 (project_id 필수) |

---

### SCR-141. API 등록(관리)

- **Route:** `/admin/apis/new`
- **접근:** SUPER_ADMIN, DEVELOPER
- **주요 기능:** 프로젝트 선택, API 코드 / 이름 / 엔드포인트 / 설명 / 승인 필요 여부 / 응답 뷰 타입 / 표시 순서 입력
- **연관 API:**

  | Method | Endpoint  | 설명               |
  | ------ | --------- | ------------------ |
  | GET    | /projects | 프로젝트 선택 목록 |
  | POST   | /apis     | API 등록           |

---

### SCR-142. API 상세·수정(관리)

- **Route:** `/admin/apis/:api_id`
- **접근:** SUPER_ADMIN, DEVELOPER
- **주요 기능:** Tabs(기본정보/Request/Response) 구성. 기본정보 조회·수정, Request/Response 파라미터 등록·수정
- **비고:** 핵심 필드(`api_code`/`endpoint`/`is_required_approval`/`response_view_type`) 수정 시 api_stage 자동 개발(20) 롤백
- **연관 API:**

  | Method | Endpoint                         | 설명                                |
  | ------ | --------------------------------- | ----------------------------------- |
  | GET    | /apis/{api_id}                   | API 상세 (requests, responses 포함) |
  | PATCH  | /apis/{api_id}                   | API 수정                            |
  | POST   | /apis/{api_id}/requests          | Request 파라미터 등록               |
  | PATCH  | /api-requests/{api_request_id}   | Request 파라미터 수정               |
  | POST   | /apis/{api_id}/responses         | Response 파라미터 등록              |
  | PATCH  | /api-responses/{api_response_id} | Response 파라미터 수정              |

---

## 2.3 비관리 메뉴

### SCR-100. API (실행 워크스페이스)

- **Route:** `/apis`
- **접근:** SUPER_ADMIN, DEVELOPER, APPROVER, OPERATOR
- **List/New/Detail 3분할 패턴이 아닌 예외 화면** — 코드그룹(SCR-130)과 마찬가지로 등록·상세를 분리하지 않고, 좌측 사이드바 "API" 메뉴를 펼치면 현재 선택된 프로젝트의 활성 API가 체크박스 목록으로 나타난다(`api_stage`별 실행 가능 역할에 안 맞는 API는 목록에서 아예 숨김 — `11_MENU_PERMISSION.md` §3.2 기준). 체크하면 우측 작업영역에 해당 API 패널이 선택한 순서대로 열리고, 해제(체크 해제 또는 패널의 X 버튼)하면 닫힌다 — 좌측 체크박스와 우측 패널 상태는 항상 동기화.
- **패널 구성**: API Name(승인 필요 API면 OPERATOR에게만 "승인필요" 태그 표시) → Request(파라미터별 `component_type` 입력 컨트롤 + 실행 버튼) → Response(실행 전엔 필드 정의만, 실행 후엔 `response_view_type`에 따라 KEY_VALUE/GRID로 실제 결과 표시, GRID는 20행 초과 시 스크롤).
- **응답 처리**: 외부 API는 모두 `{ result, message, data: [...] }` 봉투로 응답 — `data`는 항상 배열이며 KEY_VALUE는 `data[0]`, GRID는 `data` 전체를 사용. `result`가 0이 아니면(HTTP 200이어도) 실행이력을 FAILED로 처리하고 `message`를 오류로 표시.
- **상태 유지**: 열린 패널·입력값·실행결과는 zustand 스토어(`apiWorkspaceStore`)에 보관되어 다른 메뉴로 이동했다 돌아와도 유지되고, 로그아웃 또는 프로젝트 변경 시 초기화됨.
- **연관 API:**

  | Method | Endpoint                                       | 설명                                          |
  | ------ | ----------------------------------------------- | --------------------------------------------- |
  | GET    | /apis                                           | 프로젝트의 활성 API 목록 (project_id 필수)   |
  | GET    | /apis/{api_id}                                  | API 상세 (requests, responses 포함)          |
  | GET    | /code-groups/active-with-items?project_id={id} | SELECT/RADIO/CHECKBOX 옵션 + 응답 코드 치환용 |
  | POST   | /apis/{api_id}/execute                          | API 실행 (api_stage/역할 기준 제한)          |

---

### SCR-110. API 실행 이력 목록

- **Route:** `/executions`
- **접근:** SUPER_ADMIN, DEVELOPER, APPROVER, OPERATOR (OPERATOR: 본인 건만)
- **주요 기능:** 프로젝트 선택, 실행 이력 목록 조회 (API / 상태 / 요청자 필터, 페이지네이션), 상세 이동, 취소 버튼 (요청자 본인·PENDING 상태만)
- **연관 API:**

  | Method | Endpoint                    | 설명                                  |
  | ------ | --------------------------- | ------------------------------------- |
  | GET    | /api-executions             | 실행 이력 목록 (project_id 필수)      |
  | POST   | /api-executions/{id}/cancel | 실행 취소                             |

---

### SCR-111. API 실행 이력 상세

- **Route:** `/executions/:api_execution_id`
- **접근:** SUPER_ADMIN, DEVELOPER, APPROVER, OPERATOR
- **주요 기능:** 실행 정보 (API명 / 엔드포인트 / 요청 파라미터 / 응답 데이터 / 상태 / 승인자 / 반려 사유 / 일시) 조회
- **연관 API:**

  | Method | Endpoint                           | 설명           |
  | ------ | ---------------------------------- | -------------- |
  | GET    | /api-executions/{api_execution_id} | 실행 이력 상세 |

---

### SCR-120. 승인 대기 목록

- **Route:** `/executions/pending`
- **접근:** SUPER_ADMIN, DEVELOPER, APPROVER
- **주요 기능:** 프로젝트 선택, PENDING 실행 목록 조회 (요청 오래된 순), 승인 / 반려 처리
- **연관 API:**

  | Method | Endpoint                       | 설명                             |
  | ------ | ------------------------------ | -------------------------------- |
  | GET    | /api-executions/pending        | 승인 대기 목록 (project_id 필수) |
  | POST   | /api-executions/{id}/approve   | 실행 승인                        |
  | POST   | /api-executions/{id}/reject    | 실행 반려                        |

---

## 2.4 내 계정

### SCR-200. 내 계정

- **Route:** `/my-account`
- **접근:** SUPER_ADMIN, DEVELOPER, APPROVER, OPERATOR
- **주요 기능:** 내 정보 조회 (이름 / 이메일 / 소속 회사 / 최근 로그인), 비밀번호 변경, 로그아웃
- **연관 API:**

  | Method | Endpoint       | 설명          |
  | ------ | -------------- | ------------- |
  | GET    | /auth/me       | 내 정보 조회  |
  | PATCH  | /auth/password | 비밀번호 변경 |
  | POST   | /auth/logout   | 로그아웃      |
