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
-- 수정 : 2026-08-18 trisakion - SP_GET_LOG_AUDIT와 반복되던 스코핑 조건절을 FN_HAS_LOG_AUDIT_ACCESS로 추출
-- 내용 : 감사 로그 목록 조회
--        SUPER_ADMIN(10)  : 전체 로그 반환
--        project_id 있음  : 호출자가 해당 프로젝트에 role_code<=30으로 실제 배정된 경우만 반환
--        project_id 없음  : company/user 테이블 로그(특정 프로젝트와 무관) — 기존대로 회사 스코핑
-- --------------------------------- --

    DECLARE v_offset INT DEFAULT (i_page - 1) * i_page_size;

    SELECT 0 AS RESULT;

    SELECT COUNT(*) AS total_count
    FROM `log_audit`
    WHERE FN_HAS_LOG_AUDIT_ACCESS(i_caller_role_code, i_allowed_project_ids, i_caller_company_id, `project_id`, `company_id`)
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
    WHERE FN_HAS_LOG_AUDIT_ACCESS(i_caller_role_code, i_allowed_project_ids, i_caller_company_id, la.`project_id`, la.`company_id`)
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
