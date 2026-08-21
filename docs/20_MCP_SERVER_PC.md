# 20_MCP_SERVER_PC.md

# MCP 서버 (PC용 — admin 관리 확장)

---

# 1. 개요

`mcp_server_dev`(API 실행·승인 흐름만 감싼 개발자 자동화 실험)와 같은 stdio MCP 서버지만, 여기에 **회사/프로젝트/사용자/사용자 역할배정 admin 관리 기능**을 더한 상위 호환 버전이다. SUPER_ADMIN이 이 MCP에 붙으면 여러 회사를 넘나들며 실제로 회사·프로젝트·사용자를 관리해야 하는데, `mcp_server_dev`의 tool 세트(실행/승인 중심)로는 그게 불가능해서 별도 프로젝트로 신설했다.

| 항목 | 값 |
| ---------- | ------------------------------------- |
| 위치 | `mcp_server_pc/` (모노레포 내부) |
| Transport | stdio (Claude Code/Desktop이 자식 프로세스로 직접 spawn) |
| 스택 | Node.js + TypeScript, `@modelcontextprotocol/sdk` + `zod` + `axios` (mcp_server_dev와 동일) |
| 대상 | GM Platform REST API (`server/`)만 감싼다 |
| `mcp_server_dev`와의 관계 | **복사가 아니라 확장** — mcp_server_dev는 기존 결정(관리자 기능 확장 안 함)대로 그대로 유지되고, mcp_server_pc가 그 tool 13개(`RAG_ENABLED=true` 기준, 검색 3종 포함)를 전부 포함하면서 admin tool 20개를 추가로 얹었다 |

---

# 2. 폴더 구조

`mcp_server_dev/`와 스캐폴딩(인증 클라이언트, 로깅, tool 등록 방식)이 완전히 동일하다 — 아래는 이번에 추가된 부분만 표시.

```
mcp_server_pc/
├── src/
│   ├── index.ts                 # tool 33개(RAG_ENABLED=true 기준) 등록 + role 게이팅 그룹 3종
│   ├── gmClient.ts              # mcp_server_dev와 verbatim 동일
│   ├── types.ts                 # 기존 타입 + CompanyRow/ProjectAdminRow/UserAdminRow/UserRoleRow 추가
│   ├── config/, utils/          # mcp_server_dev와 verbatim 동일
│   └── tools/
│       ├── (mcp_server_dev의 13개 tool 파일 verbatim 복사 — search_docs/search_apis/search_log_audits 포함)
│       └── admin*.ts            # 신규 20개 (아래 §4 참고)
├── .env / .env.example          # GM_BASE_URL, GM_LOGIN_ID, GM_PASSWORD (예시 계정: sa/1234)
├── .mcp.json / .mcp.json.example  # mcpServers 키 "gm-platform-pc" (mcp_server_dev의 "gm-platform"과 구분)
```

---

# 3. 인증/role 게이팅

`gmClient.ts`(로그인/재시도/`runExclusive`)는 `mcp_server_dev`와 동일하다. `index.ts`가 로그인 시 확인한 `role_code`로 게이팅 그룹 3종을 조건부 등록한다:

```ts
const APPROVAL_CAPABLE_ROLES = [10, 20, 30];   // 실행 승인/반려/대기목록 (mcp_server_dev와 동일)
const SUPER_ADMIN_AND_DEVELOPER = [10, 20];    // 프로젝트/사용자 조회, 연결정보·API키 발급
const SUPER_ADMIN_ONLY = [10];                 // 회사/프로젝트/사용자 쓰기, 역할 배정
```

이 게이팅은 mcp_server_dev와 동일하게 **UX 차원 1차 필터일 뿐**이고, 최종 방어선은 항상 GM Platform 서버(`requireRole`/`assertCompanyScope`/SP 내부 원자적 재검증)다.

---

# 4. Tool 목록 (33개, `RAG_ENABLED=true` 기준 — false면 30개)

## 전 역할 공통 (12개, RAG_ENABLED=true 기준 — false면 10개)

mcp_server_dev와 동일한 9개(`list_projects`/`list_apis`/`list_code_groups`/`execute_api`/`list_executions`/`get_execution`/`cancel_execution` + `search_docs`/`search_apis`, 검색 2종은 `RAG_ENABLED=true`일 때만 등록) + admin 조회 3개.

| tool | GM Platform API | 설명 |
| --- | --- | --- |
| `admin_list_companies` | GET /companies | 회사 목록 페이지네이션 조회 (SUPER_ADMIN 외 본인 소속 회사만) |
| `admin_get_company` | GET /companies/:id | 회사 상세 조회 |
| `admin_get_my_role` | GET /user-roles/me | 특정 프로젝트에서 본인의 실제 role_code 조회 |

## role 게이팅 — SUPER_ADMIN, DEVELOPER (7개)

mcp_server_dev와 동일한 4개(`list_pending_executions`/`approve_execution`/`reject_execution`/`search_log_audits`, `APPROVAL_CAPABLE_ROLES` 그룹이라 APPROVER도 포함 — `search_log_audits`는 `RAG_ENABLED=true`일 때만 등록) + 아래 `SUPER_ADMIN_AND_DEVELOPER` 그룹 7개.

| tool | GM Platform API | 설명 |
| --- | --- | --- |
| `admin_list_projects` | GET /projects | 프로젝트 목록 (DEVELOPER는 실제 배정된 프로젝트만) |
| `admin_get_project` | GET /projects/:id | 프로젝트 상세 (api_base_url, has_api_key 포함) |
| `admin_update_project_connection` | PATCH /projects/:id/connection | api_base_url 변경 — 기존 API 키 자동 폐기 |
| `admin_issue_project_api_key` | POST /projects/:id/api-key | X-API-Key 신규 발급, 평문은 이 응답에만 노출, 동시수정 시 409(32002) 가능 |
| `admin_list_users` | GET /users | 사용자 목록 (DEVELOPER는 본인 소속 회사만) |
| `admin_get_user` | GET /users/:id | 사용자 상세 |
| `admin_list_user_roles` | GET /user-roles | 역할 배정 목록 (페이지네이션 없음, 배열 직접 반환) |

## role 게이팅 — SUPER_ADMIN 전용 (10개)

| tool | GM Platform API | 설명 |
| --- | --- | --- |
| `admin_create_company` | POST /companies | 회사 등록 |
| `admin_update_company` | PATCH /companies/:id | 회사 부분 수정 |
| `admin_create_project` | POST /projects | 프로젝트 등록 |
| `admin_update_project` | PATCH /projects/:id | 프로젝트 정체성/거버넌스 필드 수정 (api_base_url 제외) |
| `admin_update_user` | PATCH /users/:id | 사용자 프로필/상태 수정 (role_code는 여기서 안 바뀜) |
| `admin_approve_user` | POST /users/:id/approve | 가입 승인 |
| `admin_reject_user` | POST /users/:id/reject | 가입 반려 |
| `admin_reset_user_password` | POST /users/:id/reset-password | 비밀번호 초기화(new_password 직접 지정, 즉시 전체 세션 종료) |
| `admin_assign_user_role` | POST /user-roles | 사용자에게 프로젝트 역할 신규 배정 |
| `admin_update_user_role` | PATCH /user-roles/:user_id/:project_id | 기존 역할 배정 수정 |

계정별 실제 노출 개수(라이브 검증, `RAG_ENABLED=true` 기준): SUPER_ADMIN 33개, DEVELOPER 23개, APPROVER 16개, OPERATOR 12개. 검색 3종 도입 이전(또는 `RAG_ENABLED=false`)에는 각각 30개/20개/13개/10개였다.

---

# 5. 주의가 필요한 tool

- **`admin_reset_user_password`** — 새 비밀번호를 대화(자연어 프롬프트)로 직접 입력받아 그대로 서버에 전달한다. 비밀번호가 LLM 컨텍스트/로그에 평문으로 남는다는 점을 사용 전에 인지해야 한다.
- **`admin_issue_project_api_key`** — 평문 API 키는 이 tool의 응답에서만 1회 노출된다. 이후 `admin_get_project` 등 모든 조회는 `has_api_key`(0/1)만 보여준다.
- **`admin_update_project_connection`** — `api_base_url`을 바꾸면 기존에 발급된 API 키가 같은 요청 안에서 자동 폐기된다.

---

# 6. Claude Code / Desktop 등록

공통: 서버 키는 `"gm-platform-pc"`로 등록(`mcp_server_dev`의 `"gm-platform"`과 키가 달라 둘 다 동시에 등록해도 충돌 없음), `args`는 `mcp_server_pc/dist/index.js`를 가리켜야 한다. `GM_LOGIN_ID`/`GM_PASSWORD`는 admin 기능까지 쓰려면 SUPER_ADMIN 계정(예: `sa`)을 넣어야 한다 — DEVELOPER/APPROVER/OPERATOR 계정을 넣으면 §4 표대로 노출 범위가 좁아질 뿐 오류가 나지는 않는다.

## Claude Code

`mcp_server_dev`(docs/19 §7)와 동일한 절차 — project-scope `.mcp.json` 또는 `claude mcp add-json`(Git Bash에서 실행, PowerShell 5.1은 인자 파싱 결함으로 사용 불가 — docs/19 §7 참고)으로 등록.

```bash
claude mcp add-json gm-platform-pc '{"command":"node","args":["C:/workspace/gm_platform/mcp_server_pc/dist/index.js"],"env":{"GM_BASE_URL":"http://127.0.0.1:3000/api","GM_LOGIN_ID":"sa","GM_PASSWORD":"1234"}}'
```

기본 scope는 `local`(이 프로젝트 경로 안에서 나만 사용, `~/.claude.json`에 기록되며 git 대상 아님). 제거는 `claude mcp remove gm-platform-pc -s local`.

## Claude Desktop 앱 (상세 절차)

Claude Code의 `.mcp.json`/`claude mcp add-json`과 전혀 다른 별도 설정 파일이다 — 서로 무관하며 한쪽 등록이 다른 쪽에 반영되지 않는다.

1. **설정 파일 경로 확인** — Windows Store(MSIX) 배포판은 표준 `%APPDATA%\Claude\claude_desktop_config.json`이 아니라 패키지별 가상화 경로를 쓴다:
   ```
   %LOCALAPPDATA%\Packages\<PackageFamilyName>\LocalCache\Roaming\Claude\claude_desktop_config.json
   ```
   `<PackageFamilyName>`은 PowerShell로 확인:
   ```powershell
   Get-ChildItem "$env:LOCALAPPDATA\Packages" -Filter "*Claude*"
   ```
   (이 환경에서는 `Claude_pzs8sxrjxfjjc`). 일반 설치형(MSIX 아닌) 배포판이면 표준 경로를 그대로 쓴다.

2. **앱을 완전히 종료**(트레이 아이콘까지) — 켜진 채로 파일을 수정하면 앱 재시작 시 자기 메모리 상의 preferences를 그대로 다시 써버려 방금 추가한 `mcpServers`가 사라진다. 종료 확인:
   ```powershell
   Get-Process -Name "Claude*" -ErrorAction SilentlyContinue
   ```
   결과가 비어 있어야 한다. Claude Code CLI 자신의 `claude.exe`(`C:\...\claude-code\bin\claude.exe`)도 이름이 `claude`로 잡혀 혼동될 수 있으니, 남아있으면 `Get-CimInstance Win32_Process -Filter "Name like 'claude%'" | Select ExecutablePath`로 경로를 확인해 Desktop 앱(`...\Packages\Claude_...\...`) 프로세스인지 CLI인지 구분한다.

3. **`mcpServers`에 항목만 추가, 나머지는 그대로 유지** — 이 파일은 `coworkUserFilesPath`/`preferences` 등 앱 자체 설정도 함께 저장하므로 파일 전체를 덮어쓰지 않고 최상위 `mcpServers` 키 안에만 추가한다:
   ```json
   {
     "mcpServers": {
       "gm-platform-pc": {
         "command": "node",
         "args": ["C:/workspace/gm_platform/mcp_server_pc/dist/index.js"],
         "env": {
           "GM_BASE_URL": "http://127.0.0.1:3000/api",
           "GM_LOGIN_ID": "sa",
           "GM_PASSWORD": "1234"
         }
       }
     },
     "coworkUserFilesPath": "...",
     "preferences": { ... }
   }
   ```
   `.mcp.json`(Claude Code)과 달리 `"type": "stdio"` 필드는 없어도 된다.

4. **앱 재시작** — `mcpServers` 변경은 핫 리로드가 안 되므로 반드시 완전 종료 후 재시작해야 반영된다.

5. **연결 확인** — 둘 중 하나:
   - Settings → 데스크톱 앱 → 개발자 → "로컬 MCP 서버" 패널에서 `gm-platform-pc`가 `running`으로 뜨는지 확인
   - 채팅에서 "지엠플랫폼 mcp 사용할 수 있어?"라고 직접 물어보면 tool 목록으로 응답

**주의 — 앱 내 "구성 편집" 메뉴에서 이 파일을 열지 않는다.** 그 메뉴로 방금 수동 편집한 파일을 선택하면 앱이 자기 메모리 상 preferences를 그 파일에 그대로 재기록해 `mcpServers`가 통째로 사라진다(mcp_server_dev 등록 때 실제로 겪은 문제, docs/19 §8). 반드시 앱을 완전히 종료한 상태에서 파일을 직접 편집하고 재시작하는 방식만 안전하다.

Desktop 앱 전용 로그(`mcp.log`/`mcp-server-<이름>.log`) 등 추가 세부사항은 `docs/19_MCP_SERVER_DEV.md` §8 참고 — mcp_server_pc도 동일하게 적용된다.

공통: `claude_desktop_config.json`은 그 컴퓨터/그 Windows 계정 전용 로컬 파일이라, 운영자마다 자기 PC의 이 파일에 자기 GM Platform 계정을 넣는 방식으로 개인화한다 — 별도의 다중 사용자 인증 체계(OAuth 등)는 구현하지 않았다(모바일 지원과 마찬가지로 stdio 구조 자체의 한계이자, 이 프로젝트 규모에서는 투입 대비 실익이 낮다고 판단해 보류).

---

# 7. 다중 사용자(상용) 배포 시 고려사항

로컬 1인 사용을 넘어 GM Platform이 실제 서버로 상용 운영되고 여러 사람이 이 MCP를 쓰는 상황을 가정하면, "ID/PW만 바꾸면 된다"가 아니라 아래 세 가지가 함께 필요하다.

- **`GM_BASE_URL`도 실제 서버 주소로 변경** — `127.0.0.1`은 로컬 PC 전용이라, 상용 서버 주소(도메인/IP)로 바꿔야 한다.
- **계정은 SUPER_ADMIN 공유가 아니라 각자 본인 role 계정** — §3 role 게이팅이 계정별 실제 권한을 근사하는 설계라, 전원이 `sa`를 쓰면 이 필터가 무의미해진다. 각자 자기 GM Platform 계정(DEVELOPER/APPROVER/OPERATOR 등)을 넣는 게 의도된 사용법이다.
- **각자 자기 PC에 `mcp_server_pc` 빌드 필요** — stdio transport라 Claude Desktop이 로컬 node 프로세스로 직접 spawn한다(`args`가 로컬 파일 경로). URL 하나로 붙는 SaaS형 배포가 아니라, 사람마다 이 저장소를 받아 `npm install && npm run build`로 `dist/index.js`를 만들어둬야 한다.

비밀번호가 `claude_desktop_config.json`에 평문으로 남는 것은 §6에서 이미 "그 컴퓨터/그 계정 전용 로컬 파일"이라는 전제로 허용한 설계다 — 다중 사용자 배포에서도 이 전제는 바뀌지 않지만(각자 자기 로컬 파일에 자기 비밀번호만 들어감), 중앙 인증(OAuth 등)이 없다는 한계가 실제 여러 명이 쓰는 상황에서 가장 먼저 부딪히는 지점이라는 건 별도로 밝혀둔다.

---

# 8. 서버/DB 변경 없음

이 프로젝트는 GM Platform의 이미 구현·테스트된 REST 엔드포인트(회사/프로젝트/사용자/역할배정 CRUD)를 그대로 감싸는 순수 클라이언트다. `server/`, `database/`에는 어떤 변경도 없다.
