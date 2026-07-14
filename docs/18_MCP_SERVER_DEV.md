# 18_MCP_SERVER_DEV.md

# MCP 서버 (개발자 자동화)

---

# 1. 개요

GM Platform의 API 정의·실행·승인 기능을 LLM(Claude Code)이 직접 조작할 수 있도록 노출하는 MCP(Model Context Protocol) 서버. GM Platform의 REST API를 감싼 tool 세트를 제공하며, gm_platform의 서버·DB 코드에는 손대지 않고 완전히 독립된 클라이언트로 동작한다.

| 항목 | 값 |
| ---------- | ------------------------------------- |
| 위치 | `mcp_server_dev/` (모노레포 내부) |
| Transport | stdio (Claude Code가 자식 프로세스로 직접 spawn — 별도 포트/VM 불필요) |
| 스택 | Node.js + TypeScript, `@modelcontextprotocol/sdk` + `zod` + `axios` |
| 대상 | GM Platform REST API (`server/`)만 감싼다 — test_game_server는 GM Platform을 통해서만 간접 조작 |

---

# 2. 폴더 구조

```
mcp_server_dev/
├── src/
│   ├── index.ts                # 엔트리포인트 — 로그인 → role_code 확인 → tool 등록 → stdio 연결
│   ├── gmClient.ts              # GM Platform 로그인/토큰 갱신/요청 래퍼 (자체 인증 클라이언트)
│   ├── types.ts                 # GM Platform 응답 타입 (봉투, ApiExecution, Project 등)
│   ├── config/
│   │   ├── env.ts               # GM_BASE_URL/GM_LOGIN_ID/GM_PASSWORD 검증
│   │   └── logger.ts            # log4js 설정 — console 어펜더 없음(아래 §3 참고)
│   ├── tools/
│   │   ├── listProjects.ts      # GET /projects
│   │   ├── listApis.ts          # GET /apis/active
│   │   ├── listCodeGroups.ts    # GET /code-groups/active-with-items
│   │   ├── executeApi.ts        # POST /apis/:id/execute
│   │   ├── listExecutions.ts    # GET /api-executions
│   │   ├── getExecution.ts      # GET /api-executions/:id
│   │   ├── cancelExecution.ts   # POST /api-executions/:id/cancel
│   │   ├── listPendingExecutions.ts  # GET /api-executions/pending (role 게이팅)
│   │   ├── approveExecution.ts       # POST /api-executions/:id/approve (role 게이팅)
│   │   └── rejectExecution.ts        # POST /api-executions/:id/reject (role 게이팅)
│   └── utils/
│       ├── logger.ts
│       └── toolResult.ts        # ok()/toToolError()/safeTool() — CallToolResult 변환 공통 처리
├── .env / .env.example          # GM_BASE_URL, GM_LOGIN_ID, GM_PASSWORD
├── .mcp.json / .mcp.json.example  # Claude Code project-scope 등록 파일
├── package.json / tsconfig.json
```

`server/`·`test_game_server/`와 달리 controller/service/db 계층이 없다 — 이 서버는 GM Platform이라는 이미 존재하는 API를 그대로 호출만 하는 얇은 클라이언트라, `gmClient.request()` 하나가 인증까지 포함해 모든 tool의 "db 계층" 역할을 겸한다.

---

# 3. 인증/세션 관리 (`gmClient.ts`)

- 최초 tool 호출 시(또는 `index.ts` 시작 시 `getRoleCode()` 호출 시) `.env`의 계정으로 `POST /auth/login`을 실행해 `access_token`/`refresh_token`/`role_code`를 메모리에 보관한다.
- `request()`가 GM Platform 응답의 `result`를 검사해 자동 재시도한다: `10003`(Access Token 만료) → `refresh()` 후 1회 재시도, `10008`/`10009`(Refresh 만료·세션 무효) → 재로그인 후 1회 재시도. `client/`의 axios 인터셉터와 동일한 정책을 tool 호출 경로에 맞춰 재구성한 것.
- `runExclusive()`로 동시 요청이 로그인/refresh를 중복 트리거하지 않도록 직렬화한다.
- GM Platform이 `result!==0`으로 응답한 비즈니스 오류는 `GmApiError(code, message)`로 던져지고, `utils/toolResult.ts`의 `safeTool()`이 이를 잡아 `isError:true`인 `CallToolResult`로 변환해 LLM에게 그대로 전달한다 — CLAUDE.md 오류 코드 표와 대조 가능한 형태 유지.
- **stdio transport에서는 stdout이 MCP JSON-RPC 메시지 전용 채널**이라, `config/logger.ts`는 `server/`·`test_game_server/`와 달리 **console 어펜더를 두지 않는다** — 파일(`logs/app.log`, `logs/error.log`)로만 기록한다. console 어펜더를 두면 로그 출력이 프로토콜 스트림에 섞여 Claude Code(Host)의 파싱이 깨진다.

---

# 4. Tool 목록

전 역할 공통(항상 노출)과 승인 권한 역할 전용(role 게이팅)으로 나뉜다. **승인/반려 자체를 노출하지 않는 방향도 검토했으나("승인은 GM Platform 화면에서")**, 최종적으로는 role_code로 노출 여부를 자체 판단하는 방향을 택했다(§5 참고).

## 전 역할 공통

| tool | GM Platform API | 설명 |
| --- | --- | --- |
| `list_projects` | `GET /projects` | 로그인 계정이 실제 `user_role`을 가진 프로젝트 목록(SUPER_ADMIN은 전체). 다른 tool에 넘길 `project_id`를 확인하는 진입점 — 가장 먼저 호출해야 한다 |
| `list_apis` | `GET /apis/active` | 프로젝트의 실행 가능한 활성 API 목록 (`api_id`/`api_name`/`api_stage`) |
| `list_code_groups` | `GET /code-groups/active-with-items` | 프로젝트의 활성 코드그룹+코드아이템 — SELECT/RADIO/CHECKBOX 파라미터 값이나 응답 코드 해석에 사용 |
| `execute_api` | `POST /apis/:api_id/execute` | API 실행. 승인 필요 API는 PENDING으로 등록되고 실제 승인/반려는 GM Platform 화면 또는 아래 role 게이팅된 tool로 처리 |
| `list_executions` | `GET /api-executions` | 실행 이력 조회. OPERATOR 계정은 서버가 본인 요청 건만 자동 스코핑 |
| `get_execution` | `GET /api-executions/:id` | 실행 이력 단건(요청 파라미터·응답 데이터 포함) |
| `cancel_execution` | `POST /api-executions/:id/cancel` | 본인이 요청한 PENDING 건 취소 |

## role 게이팅 (SUPER_ADMIN/DEVELOPER/APPROVER, role_code ∈ {10,20,30})

| tool | GM Platform API | 설명 |
| --- | --- | --- |
| `list_pending_executions` | `GET /api-executions/pending` | 승인 대기(PENDING) 목록 |
| `approve_execution` | `POST /api-executions/:id/approve` | 승인 — 즉시 실제 외부 API 호출 발생 |
| `reject_execution` | `POST /api-executions/:id/reject` | 반려 |

---

# 5. role 게이팅 설계

`index.ts`가 시작 시점에 로그인해 받은 `role_code`로 위 3개 tool의 등록 여부를 분기한다(`registerTool` 호출 자체를 조건부로 실행 — tool이 아예 노출되지 않으므로 LLM이 시도조차 할 수 없다).

```ts
const APPROVAL_CAPABLE_ROLES = [10, 20, 30]; // SUPER_ADMIN/DEVELOPER/APPROVER
if (APPROVAL_CAPABLE_ROLES.includes(roleCode)) {
  registerListPendingExecutionsTool(server);
  registerApproveExecutionTool(server);
  registerRejectExecutionTool(server);
}
```

이 게이팅은 **UX 차원의 1차 필터일 뿐**이고, 최종 방어선은 여전히 GM Platform 서버의 프로젝트별 재검증(`SP_APPROVE_API_EXECUTION`/`SP_REJECT_API_EXECUTION`의 `i_caller_role_code` 기반 검증, CLAUDE.md 핵심 결정사항 참고)이다. `role_code`는 "가진 프로젝트 중 최고 권한"이라 세션 전역 값인데, MCP 서버는 계정 하나로 프로세스 하나가 뜨는 구조라 이 근사치로도 충분하다 — 실제 프로젝트별 최종 판정은 서버가 한다.

**계정만 바꿔서 여러 인스턴스를 등록하면**, 각 인스턴스가 자기 role_code만큼만 tool을 스스로 노출한다(코드 하나, 등록은 계정 수만큼). OP 계정으로 role_code=40 확인 시 tool 7개, APPROVER 계정(role_code=30)으로는 10개가 노출됨을 실제 계정 전환 테스트로 확인했다.

---

# 6. GM Platform 연동 검증 (실행→승인 end-to-end)

OP 계정으로 `execute_api`(재화 지급, `is_required_approval=1`) 호출 → PENDING 등록 → APPROVER 계정으로 `list_pending_executions` 확인 → `approve_execution` → test_game_server의 실제 재화 잔액이 변경됨(1600→1610)까지 라이브로 확인했다. 이미 처리된 건 재승인 시도 시 `31009`(정보 은닉 정책)가 `isError:true`로 정확히 전달되는 것도 확인.

---

# 7. Claude Code 등록

## `.env` (필수 환경변수)

```
GM_BASE_URL=http://127.0.0.1:3000/api
GM_LOGIN_ID=op
GM_PASSWORD=1234
```

`localhost` 대신 `127.0.0.1` 리터럴 사용 — Node의 `localhost` DNS 조회가 IPv6(`::1`)를 먼저 시도해 간헐적 연결 실패가 날 수 있어, 프로젝트 전반의 `api_base_url` 관례(CLAUDE.md)와 통일했다.

## `.mcp.json` (project scope, `mcp_server_dev/` 하위에 위치)

```json
{
  "mcpServers": {
    "gm-platform": {
      "type": "stdio",
      "command": "node",
      "args": ["C:/workspace/gm_platform/mcp_server_dev/dist/index.js"],
      "env": {
        "GM_BASE_URL": "http://127.0.0.1:3000/api",
        "GM_LOGIN_ID": "op",
        "GM_PASSWORD": "1234"
      }
    }
  }
}
```

**project-scope `.mcp.json`은 Claude Code를 실행한 위치(cwd) 기준으로 인식된다** — `mcp_server_dev/`를 프로젝트 루트로 열 때만 자동 인식되며, gm_platform 레포 루트에서 열면 인식되지 않는다. `.gitignore`에 `.mcp.json`(경로 무관 패턴)이 등록돼 있어 이 파일 자체는 git에 커밋되지 않는다 — 템플릿은 `.mcp.json.example`로 별도 관리하며 git에 커밋된다. `GM_LOGIN_ID`/`GM_PASSWORD`는 `op`/`1234` 실값을 그대로 넣어뒀다(CLAUDE.md·`tests/api_test.ps1`에 이미 있는 시드 계정이라 노출 문제 없음). 다만 `args`의 절대경로는 로컬 폴더 구조(사용자명 등)를 드러내는 정보라 `.mcp.json.example`에는 `/absolute/path/to/...` placeholder로 남겨뒀다 — 실제 경로가 필요한 위 `.mcp.json`(gitignored)에만 채워 넣는다.

`.mcp.json`이 이미 존재하면 이 파일 자체가 곧 등록 정보라 **별도 CLI 등록 명령어가 필요 없다** — `mcp_server_dev/`에서 `claude`를 실행하면 자동으로 pending 서버로 잡히고, 승인만 하면 된다.

**CLI(`claude mcp add`/`add-json`)로 직접 등록해야 한다면 반드시 Git Bash(또는 다른 POSIX 셸)에서 실행한다 — PowerShell 5.1에서는 실행하지 않는다.** 직접 테스트해 확인한 PowerShell 5.1의 결함 두 가지 때문이다:

- 네이티브 실행파일(`node.exe` 등)에 인자를 넘길 때 **문자열 안의 큰따옴표(`"`)를 이스케이프 방식과 무관하게 통째로 제거**한다(`\"`, `""` 어느 쪽으로 escape해도 동일하게 깨짐 — `node -e "console.log(process.argv[1])" '{"command":"node"}'`로 직접 재현, 결과가 `{command:node}`로 따옴표가 전부 사라짐). 그래서 `add-json`에 넘기는 JSON 문자열이 항상 깨진다.
- **bare `--` 토큰을 네이티브 명령어에 그대로 전달하지 않고 삼켜버린다**(`node -e "..." -- node foo` 테스트 시 argv에 `--`가 아예 안 잡힘). 그래서 `claude mcp add <name> -- <command>` 형태가 `commandOrUrl` 인자를 못 찾고 실패한다.
- `--%`(stop-parsing 토큰)로 우회를 시도했으나, `claude`가 진짜 네이티브 exe가 아니라 스크립트 래퍼(`.ps1`)라 `--%` 자체가 적용되지 않고 `unknown option '--%'`로 그대로 전달돼 실패했다.

Git Bash에서는 아래처럼 그대로 실행하면 정상 동작한다(경로에 역슬래시(`\`) 대신 슬래시(`/`)를 써야 한다 — MSYS가 백슬래시를 임의로 축약해 JSON을 깨뜨리는 별도 문제가 있다):

```bash
claude mcp add-json gm-platform '{"command":"node","args":["C:/workspace/gm_platform/mcp_server_dev/dist/index.js"],"env":{"GM_BASE_URL":"http://127.0.0.1:3000/api","GM_LOGIN_ID":"op","GM_PASSWORD":"1234"}}'
```

등록 확인/제거:

```bash
claude mcp list
claude mcp get gm-platform
claude mcp remove gm-platform
```

세션 안에서는 `/mcp`로 연결 상태 확인 및 pending 서버 승인이 가능하다.

## 세션을 열지 않는 1회성 사용

```bash
claude -p "project_id=2 API 목록 보여줘" --mcp-config mcp_server_dev/.mcp.json --strict-mcp-config
```

`--mcp-config`로 명시적으로 지정한 서버는 project `.mcp.json` 자동 스캔과 달리 별도 승인 프롬프트 없이 바로 연결된다.

---

# 8. 실행 방법 (수동 기동/디버깅용)

```powershell
cd mcp_server_dev
npm install
npm run build   # dist/index.js 생성
npm run dev     # tsx watch, stdio로 대기 (Claude Code가 아닌 수동 테스트용)
```

정상적인 사용 흐름에서는 Claude Code가 `.mcp.json`/`claude mcp add` 등록에 따라 자동으로 spawn하므로 수동 기동이 필요 없다 — 위 명령은 코드 변경 후 tool 스키마·인증 흐름을 독립적으로 점검할 때만 사용한다.

---

# 9. 후기 — 실효성에 대한 평가

구현·등록·검증까지 마친 뒤 되짚어본 솔직한 평가.

- **개인 로컬 개발 용도로는 투입 대비 효용이 크지 않다.** "이 API 호출해줘"라는 요청은 MCP 서버 없이도 Claude Code가 Bash로 직접 GM Platform에 HTTP 요청을 보내는 것으로 충분히 처리 가능하다. 빌드·`.env`/`.mcp.json` 등록·PowerShell 인자 전달 문제(§7) 같은 부가 비용을 감수할 만큼 혼자 쓰는 로컬 환경에서 얻는 이득이 크지 않았다.
- **더 근본적으로는 MCP 대상으로 GM Platform을 고른 것 자체가 안 맞는 선택이었다.** MCP의 가치는 "사람이 쓸 UI가 없거나 파편화된 시스템을 자연어로 조작"하는 데 있는데, GM Platform은 반대로 SELECT/RADIO/CHECKBOX 입력폼과 GRID/KEY_VALUE 결과 렌더링까지 갖춘 전용 웹 워크스페이스(`/apis`)가 이미 있어서, 사람이 쓰는 용도라면 웹 UI가 채팅으로 JSON 주고받는 것보다 명백히 빠르고 정확하다.
- **MCP가 실제로 값을 하는 지점은 두 가지로 좁혀진다** — ① role_code 기반으로 **tool 자체를 원천 노출하지 않는 구조적 권한 차단**("Claude Code가 알아서 조심하는" 방식보다 확실함, §5), ② **호스트에 종속되지 않는 재사용성**(Claude Code 전용 스크립트가 아니라 프로토콜 레벨 자산이라 다른 MCP 클라이언트에서도 그대로 붙는다). 이 두 장점은 여러 사람·여러 클라이언트가 공유하는 시나리오나 UI 투자가 안 된 시스템에서 의미가 커지고, 지금처럼 UI가 이미 잘 갖춰진 시스템을 혼자 로컬에서 쓰는 상황에서는 체감이 약하다.
- **"Claude Code가 하는 건지 MCP가 하는 건지 구분이 안 된다"는 관찰은 버그가 아니라 MCP의 설계 의도 자체다** — tool 호출이 대화 흐름에 자연스럽게 녹아들도록 만든 것이 MCP의 목표이기 때문. 다만 그 투명함이 "지금 실제로 무엇이 실행되고 있는지" 파악하기 어렵게 만드는 트레이드오프이기도 하다는 점은 실제로 써보고서야 체감됐다.
- **결론: 이 컴포넌트는 "MCP 서버를 실제로 설계·구현·등록까지 해보는 학습/실험" 자체가 목적이었고, GM Platform 운영에 필수적인 인프라는 아니다.** 앞으로 GM Platform에 새 API가 추가되더라도 mcp_server_dev를 따라서 확장(기능 동기화)하지 않고 지금 tool 세트로 고정한다. 굳이 더 투자할 지점이 있다면 아직 검증 안 된 ②(호스트 비종속 재사용성) — 지금은 Claude Code 하나로만 붙여봤으니, 다른 MCP 클라이언트에서도 동일 서버가 그대로 동작하는 걸 보여주는 것 정도가 남은 값어치 있는 확장이다.
