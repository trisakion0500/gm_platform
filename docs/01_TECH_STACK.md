# 01_TECH_STACK.md

## Backend

| 항목            | 결정                                        |
| --------------- | ------------------------------------------- |
| Runtime         | Node.js 22 LTS                              |
| Framework       | Express                                     |
| Language        | TypeScript                                  |
| Database        | MySQL 8.4                                   |
| Data Access     | mysql2 (Native SQL, Stored Procedure & Function) |
| Authentication  | JWT (HS256) + user_session                  |
| Password Hash   | bcrypt (rounds=12)                          |
| API Style       | REST + JSON                                 |
| Logging         | log_audit (감사 로그) + application log (log4js) |
| S2S Call        | HTTP/HTTPS POST (JSON Payload)                   |

---

## Frontend

| 항목          | 결정                  |
| ------------- | --------------------- |
| Framework     | React 18 + TypeScript |
| Build         | Vite                  |
| UI 컴포넌트   | Ant Design (antd)     |
| 폼 상태 관리  | React Hook Form       |
| 상태 관리     | Zustand               |
| HTTP          | Axios                 |

---

## 환경변수 관리 항목

```text
DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
DB_NAME
JWT_SECRET
CORS_ALLOWED_ORIGINS
```
