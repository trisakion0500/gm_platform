-- ------------------------------------------------------------------------------------------------------------ --
-- 로그 전용 DB(예: gm_platform_log) 통합 Procedure 파일. 메인 DB(gm_platform) 대상 Procedure는
-- database/procedures/all_procedures.sql에 별도로 있다 — logPool(로그 DB 전용 커넥션 풀,
-- server/src/config/db.ts)만 이 파일의 SP를 호출한다. 이 DB는 메인 DB의 어떤 테이블에도
-- 물리적으로 접근할 수 없으므로, 아래 SP들은 log_audit 단일 테이블만 참조하고 FN_*/JOIN을 쓰지 않는다.
-- 개별 파일을 수정하면 이 파일도 반드시 함께 갱신할 것(all_procedures.sql과 동일한 동기화 원칙).
-- ------------------------------------------------------------------------------------------------------------ --
DROP PROCEDURE IF EXISTS SP_GET_LOG_AUDIT;
DELIMITER $
CREATE PROCEDURE SP_GET_LOG_AUDIT(
    IN  i_log_audit_id         BIGINT,        -- 감사 로그 ID
    IN  i_caller_role_code     INT,           -- 요청자 역할 코드
    IN  i_allowed_project_ids  VARCHAR(4000), -- 요청자가 role_code<=30(SA/DEV/APV)으로 실제 배정된 project_id 콤마 목록 (없으면 빈 문자열)
    IN  i_caller_company_id    BIGINT         -- 요청자 company_id (project_id 없는 로그의 회사 스코핑용)
) COMMENT '감사 로그 단건 조회 - before_json, after_json 포함'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_LOG_AUDIT
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-07-28 trisakion - project_id 있는 로그는 회사 스코핑 대신 대상 프로젝트에 대한 실제 role_code 일치 여부로 재검증
-- 수정 : 2026-08-02 trisakion - database_log(별도 물리 DB) 이관에 맞춰 user_role(메인 DB) 테이블을 직접 읽던
--        FN_GET_PROJECT_ROLE_CODE 호출을 제거 — 이 SP가 실행되는 DB는 메인 DB 테이블에 물리적으로 접근할 수
--        없다. 대신 TS 레이어(logAudit.service.ts)가 메인 DB에서 미리 조회한 "호출자가 role_code<=30으로
--        실제 배정된 project_id 목록"을 i_allowed_project_ids로 그대로 전달받아 FIND_IN_SET으로 판정한다.
--        이 김에 판정 기준도 "세션 role_code와 정확히 일치"에서 "role_code<=30(SA/DEV/APV)으로 실제
--        배정된 프로젝트 전체 허용"으로 완화했다 — 세션 role_code가 여러 프로젝트 중 최고 권한(MIN)으로
--        고정되는 이 앱의 특성상, A프로젝트 DEVELOPER·B프로젝트 APPROVER인 사용자가 세션이 DEVELOPER로
--        고정돼 있다는 이유만으로 B프로젝트 로그를 못 보던 문제를 없앤다. OPERATOR로만 배정된 프로젝트는
--        여전히 제외된다(라우트 자체가 OPERATOR를 차단하는 것과 같은 기준).
-- 내용 : 감사 로그 단건 조회
--        SUPER_ADMIN(10)  : 전체 로그 조회 가능
--        project_id 있음  : 호출자가 해당 프로젝트에 role_code<=30으로 실제 배정된 경우만 조회 가능
--        project_id 없음  : company/user 테이블 로그(특정 프로젝트와 무관) — 기존대로 회사 스코핑
--        조회 불가 또는 미존재 시 31010 반환
-- --------------------------------- --

    check_block: BEGIN

        IF NOT EXISTS (
            SELECT 1 FROM `log_audit`
            WHERE `log_audit_id` = i_log_audit_id
              AND (
                    i_caller_role_code = 10
                    OR (`project_id` IS NOT NULL AND FIND_IN_SET(`project_id`, i_allowed_project_ids) > 0)
                    OR (`project_id` IS NULL AND `company_id` = i_caller_company_id)
                  )
        ) THEN
            SELECT 31010 AS RESULT;
            LEAVE check_block;
        END IF;

        SELECT 0 AS RESULT;

        SELECT la.`log_audit_id`, la.`company_id`, la.`project_id`, la.`project_name`,
               la.`table_name`, la.`target_id`, la.`target_name`, la.`action_type`,
               la.`before_json`, la.`after_json`, la.`created_by_name`, la.`created_at`
        FROM `log_audit` la
        WHERE la.`log_audit_id` = i_log_audit_id;

    END;

END$
DELIMITER ;
DROP PROCEDURE IF EXISTS SP_GET_LOG_AUDIT_LIST;
DELIMITER $
CREATE PROCEDURE SP_GET_LOG_AUDIT_LIST(
    IN  i_company_id          BIGINT,        -- 회사 ID 필터 (NULL=전체)
    IN  i_project_id          BIGINT,        -- 프로젝트 ID 필터 (NULL=전체)
    IN  i_table_name          VARCHAR(100),  -- 테이블명 필터 (NULL=전체)
    IN  i_target_id           VARCHAR(100),  -- 대상 ID 필터 (NULL=전체)
    IN  i_action_type         TINYINT,       -- 작업 유형 필터 (NULL=전체)
    IN  i_from_created_at     DATETIME,      -- 시작 일시 (NULL=제한없음)
    IN  i_to_created_at       DATETIME,      -- 종료 일시 (NULL=제한없음)
    IN  i_page                INT,           -- 페이지 번호 (1부터)
    IN  i_page_size           INT,           -- 페이지 크기 (20/30/50/100)
    IN  i_caller_role_code    INT,           -- 요청자 역할 코드
    IN  i_allowed_project_ids VARCHAR(4000), -- 요청자가 role_code<=30(SA/DEV/APV)으로 실제 배정된 project_id 콤마 목록 (없으면 빈 문자열)
    IN  i_caller_company_id   BIGINT         -- 요청자 company_id (project_id 없는 로그의 회사 스코핑용)
) COMMENT '감사 로그 목록 조회 - 역할 스코핑, 페이지네이션'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_LOG_AUDIT_LIST
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-07-28 trisakion - project_id 있는 로그는 회사 스코핑 대신 대상 프로젝트에 대한 실제 role_code 일치 여부로 재검증
-- 수정 : 2026-08-02 trisakion - database_log(별도 물리 DB) 이관에 맞춰 user_role(메인 DB) 테이블을 직접 읽던
--        FN_GET_PROJECT_ROLE_CODE 호출을 제거 — 이 SP가 실행되는 DB는 메인 DB 테이블에 물리적으로 접근할 수
--        없다. 대신 TS 레이어(logAudit.service.ts)가 메인 DB에서 미리 조회한 "호출자가 role_code<=30으로
--        실제 배정된 project_id 목록"을 i_allowed_project_ids로 그대로 전달받아 FIND_IN_SET으로 판정한다.
--        이 김에 판정 기준도 "세션 role_code와 정확히 일치"에서 "role_code<=30(SA/DEV/APV)으로 실제
--        배정된 프로젝트 전체 허용"으로 완화했다 — 세션 role_code가 여러 프로젝트 중 최고 권한(MIN)으로
--        고정되는 이 앱의 특성상, A프로젝트 DEVELOPER·B프로젝트 APPROVER인 사용자가 세션이 DEVELOPER로
--        고정돼 있다는 이유만으로 B프로젝트 로그를 못 보던 문제를 없앤다. OPERATOR로만 배정된 프로젝트는
--        여전히 제외된다(라우트 자체가 OPERATOR를 차단하는 것과 같은 기준).
-- 내용 : 감사 로그 목록 조회
--        SUPER_ADMIN(10)  : 전체 로그 반환
--        project_id 있음  : 호출자가 해당 프로젝트에 role_code<=30으로 실제 배정된 경우만 반환
--        project_id 없음  : company/user 테이블 로그(특정 프로젝트와 무관) — 기존대로 회사 스코핑
-- --------------------------------- --

    DECLARE v_offset INT DEFAULT (i_page - 1) * i_page_size;

    SELECT 0 AS RESULT;

    SELECT COUNT(*) AS total_count
    FROM `log_audit`
    WHERE (
            i_caller_role_code = 10
            OR (`project_id` IS NOT NULL AND FIND_IN_SET(`project_id`, i_allowed_project_ids) > 0)
            OR (`project_id` IS NULL AND `company_id` = i_caller_company_id)
          )
      AND (i_company_id        IS NULL OR `company_id`   = i_company_id)
      AND (i_project_id        IS NULL OR `project_id`   = i_project_id)
      AND (i_table_name        IS NULL OR `table_name`   = i_table_name)
      AND (i_target_id         IS NULL OR `target_id`    = i_target_id)
      AND (i_action_type       IS NULL OR `action_type`  = i_action_type)
      AND (i_from_created_at   IS NULL OR `created_at`  >= i_from_created_at)
      AND (i_to_created_at     IS NULL OR `created_at`  <= i_to_created_at);

    SELECT la.`log_audit_id`, la.`company_id`, la.`project_id`, la.`project_name`,
           la.`table_name`, la.`target_id`, la.`target_name`, la.`action_type`,
           la.`created_by_name`, la.`created_at`
    FROM `log_audit` la
    WHERE (
            i_caller_role_code = 10
            OR (la.`project_id` IS NOT NULL AND FIND_IN_SET(la.`project_id`, i_allowed_project_ids) > 0)
            OR (la.`project_id` IS NULL AND la.`company_id` = i_caller_company_id)
          )
      AND (i_company_id        IS NULL OR la.`company_id`   = i_company_id)
      AND (i_project_id        IS NULL OR la.`project_id`   = i_project_id)
      AND (i_table_name        IS NULL OR la.`table_name`   = i_table_name)
      AND (i_target_id         IS NULL OR la.`target_id`    = i_target_id)
      AND (i_action_type       IS NULL OR la.`action_type`  = i_action_type)
      AND (i_from_created_at   IS NULL OR la.`created_at`  >= i_from_created_at)
      AND (i_to_created_at     IS NULL OR la.`created_at`  <= i_to_created_at)
    ORDER BY la.`created_at` DESC
    LIMIT i_page_size OFFSET v_offset;
END$
DELIMITER ;
DROP PROCEDURE IF EXISTS SP_INSERT_LOG_AUDIT;
DELIMITER $
CREATE PROCEDURE SP_INSERT_LOG_AUDIT(
    IN  i_company_id       BIGINT,        -- 회사 ID
    IN  i_project_id       BIGINT,        -- 프로젝트 ID (NULL 허용)
    IN  i_project_name     VARCHAR(100),  -- 프로젝트명 스냅샷 (project_id NULL이면 NULL)
    IN  i_table_name       VARCHAR(100),  -- 대상 테이블명
    IN  i_target_id        VARCHAR(100),  -- 대상 PK (복합키는 JSON 문자열)
    IN  i_target_name      VARCHAR(200),  -- 대상 표시명
    IN  i_action_type      TINYINT,       -- 작업 유형 (10:CREATE, 20:UPDATE, 30:STATUS_CHANGE)
    IN  i_before_json      LONGTEXT,      -- 변경 전 데이터 (CREATE 시 NULL)
    IN  i_after_json       LONGTEXT,      -- 변경 후 데이터
    IN  i_created_by       BIGINT,        -- 작업 수행 사용자 ID
    IN  i_created_by_name  VARCHAR(50)    -- 작업 수행 사용자명 스냅샷
) COMMENT '감사 로그 단건 INSERT'
BEGIN
    INSERT INTO `log_audit` (
        `company_id`, `project_id`, `project_name`, `table_name`, `target_id`, `target_name`,
        `action_type`, `before_json`, `after_json`, `created_by`, `created_by_name`
    ) VALUES (
        i_company_id, i_project_id, i_project_name, i_table_name, i_target_id, i_target_name,
        i_action_type, i_before_json, i_after_json, i_created_by, i_created_by_name
    );
    SELECT 0 AS RESULT;
END$
DELIMITER ;
