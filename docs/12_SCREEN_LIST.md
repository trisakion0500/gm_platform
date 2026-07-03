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
| SCR-030 | 사용자 목록         | `/admin/users`                        | O           | O         | -        | -        | DEVELOPER: 승인 사용자만; 탭: 전체 / 가입 승인 대기    |
| SCR-031 | 사용자 상세·수정    | `/admin/users/:user_id`               | O           | O         | -        | -        | 수정·승인·반려·권한관리: SUPER_ADMIN만                  |
| SCR-040 | 감사 로그 목록      | `/admin/audit-logs`                   | O           | O         | O        | -        | SUPER_ADMIN 외: 자사만                                  |
| SCR-041 | 감사 로그 상세      | `/admin/audit-logs/:log_audit_id`     | O           | O         | O        | -        |                                                         |
| **비관리 메뉴** |
| SCR-100 | API 목록            | `/apis`                         | O           | O         | O        | O        | project_id 선택 필요                                    |
| SCR-101 | API 등록            | `/apis/new`                     | O           | O         | -        | -        |                                                         |
| SCR-102 | API 상세·수정       | `/apis/:api_id`                 | O           | O         | O        | O        | 수정·파라미터관리: SUPER_ADMIN/DEVELOPER만; 실행: api_stage별 권한 |
| SCR-110 | API 실행 이력 목록  | `/executions`                   | O           | O         | O        | O        | OPERATOR: 본인 건만; project_id 선택 필요               |
| SCR-111 | API 실행 이력 상세  | `/executions/:api_execution_id` | O           | O         | O        | O        |                                                         |
| SCR-120 | 승인 대기 목록      | `/executions/pending`           | O           | O         | O        | -        | project_id 선택 필요                                    |
| SCR-130 | 코드 그룹 목록      | `/code-groups`                  | O           | O         | O        | O        | project_id 선택 필요                                    |
| SCR-131 | 코드 그룹 상세·수정 | `/code-groups/:code_group_id`   | O           | O         | O        | O        | 수정·아이템관리: SUPER_ADMIN/DEVELOPER만                |
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
- **주요 기능:** 프로젝트 목록 조회 (회사 필터 (SUPER_ADMIN), 상태 필터, 페이지네이션), 등록 버튼 (SUPER_ADMIN), 상세 이동
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
- **주요 기능:** 사용자 목록 조회 (상태 필터, 페이지네이션), 탭 전환: 전체 목록 / 가입 승인 대기, 상세 이동
- **연관 API:**

  | Method | Endpoint | 설명                                    |
  | ------ | -------- | --------------------------------------- |
  | GET    | /users   | 사용자 목록 (status 파라미터로 탭 전환) |

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
- **주요 기능:** 감사 로그 목록 조회 (테이블 / 작업 유형 / 작업자 / 기간 필터, 페이지네이션), 상세 이동
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

## 2.3 비관리 메뉴

### SCR-100. API 목록

- **Route:** `/apis`
- **접근:** SUPER_ADMIN, DEVELOPER, APPROVER, OPERATOR
- **주요 기능:** 프로젝트 선택, API 목록 조회 (api_stage / 상태 필터, 페이지네이션), 등록 버튼 (SUPER_ADMIN/DEVELOPER), 상세 이동
- **연관 API:**

  | Method | Endpoint  | 설명                       |
  | ------ | --------- | -------------------------- |
  | GET    | /projects | 프로젝트 선택 목록         |
  | GET    | /apis     | API 목록 (project_id 필수) |

---

### SCR-101. API 등록

- **Route:** `/apis/new`
- **접근:** SUPER_ADMIN, DEVELOPER
- **주요 기능:** 프로젝트 선택, API 코드 / 이름 / 엔드포인트 / 설명 / 승인 필요 여부 / 응답 뷰 타입 / 표시 순서 입력
- **연관 API:**

  | Method | Endpoint  | 설명               |
  | ------ | --------- | ------------------ |
  | GET    | /projects | 프로젝트 선택 목록 |
  | POST   | /apis     | API 등록           |

---

### SCR-102. API 상세·수정

- **Route:** `/apis/:api_id`
- **접근:** SUPER_ADMIN, DEVELOPER, APPROVER, OPERATOR (수정·파라미터관리·실행: api_stage 및 역할 기준 제한)
- **주요 기능:** API 정보 조회·수정 (SUPER_ADMIN/DEVELOPER), Request / Response 파라미터 등록·수정 (SUPER_ADMIN/DEVELOPER), API 실행 (api_stage별 접근 역할 다름)
- **비고:** 핵심 필드 수정 시 api_stage 자동 개발(20) 롤백
- **연관 API:**

  | Method | Endpoint                         | 설명                                |
  | ------ | -------------------------------- | ----------------------------------- |
  | GET    | /apis/{api_id}                   | API 상세 (requests, responses 포함) |
  | PATCH  | /apis/{api_id}                   | API 수정                            |
  | POST   | /apis/{api_id}/requests          | Request 파라미터 등록               |
  | PATCH  | /api-requests/{api_request_id}   | Request 파라미터 수정               |
  | POST   | /apis/{api_id}/responses         | Response 파라미터 등록              |
  | PATCH  | /api-responses/{api_response_id} | Response 파라미터 수정              |
  | POST   | /apis/{api_id}/execute           | API 실행                            |
  | GET    | /code-groups/{id}/active-items   | SELECT / RADIO / CHECKBOX 옵션 조회 |

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

### SCR-130. 코드 그룹 목록

- **Route:** `/code-groups`
- **접근:** SUPER_ADMIN, DEVELOPER, APPROVER, OPERATOR
- **주요 기능:** 프로젝트 선택, 코드 그룹 목록 조회 (상태 필터, 페이지네이션), 등록 버튼 (SUPER_ADMIN/DEVELOPER), 상세 이동
- **연관 API:**

  | Method | Endpoint                           | 설명                              |
  | ------ | ---------------------------------- | --------------------------------- |
  | GET    | /projects/{project_id}/code-groups | 코드 그룹 목록 (project_id 필수)  |

---

### SCR-131. 코드 그룹 상세·수정

- **Route:** `/code-groups/:code_group_id`
- **접근:** SUPER_ADMIN, DEVELOPER, APPROVER, OPERATOR (수정·아이템관리: SUPER_ADMIN/DEVELOPER만)
- **주요 기능:** 코드 그룹 정보 조회·수정 (SUPER_ADMIN/DEVELOPER), 코드 아이템 목록 조회, 코드 아이템 등록·수정 (SUPER_ADMIN/DEVELOPER)
- **연관 API:**

  | Method | Endpoint                           | 설명              |
  | ------ | ---------------------------------- | ----------------- |
  | GET    | /code-groups/{code_group_id}       | 코드 그룹 상세    |
  | PATCH  | /code-groups/{code_group_id}       | 코드 그룹 수정    |
  | GET    | /code-groups/{code_group_id}/items | 코드 아이템 목록  |
  | POST   | /code-groups/{code_group_id}/items | 코드 아이템 등록  |
  | PATCH  | /code-items/{code_item_id}         | 코드 아이템 수정  |

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
