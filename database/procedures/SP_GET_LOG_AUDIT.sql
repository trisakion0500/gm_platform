DROP PROCEDURE IF EXISTS SP_GET_LOG_AUDIT;
DELIMITER $
CREATE PROCEDURE SP_GET_LOG_AUDIT(
    IN  i_log_audit_id       BIGINT,  -- 감사 로그 ID
    IN  i_caller_role_code   INT,     -- 요청자 역할 코드
    IN  i_caller_user_id     BIGINT,  -- 요청자 user_id (project_id 있는 로그의 실제 role 재검증용)
    IN  i_caller_company_id  BIGINT   -- 요청자 company_id (project_id 없는 로그의 회사 스코핑용)
) COMMENT '감사 로그 단건 조회 - before_json, after_json 포함'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_LOG_AUDIT
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-07-28 trisakion - project_id 있는 로그는 회사 스코핑 대신 대상 프로젝트에 대한 실제 role_code 일치 여부로 재검증
-- 내용 : 감사 로그 단건 조회
--        SUPER_ADMIN(10)  : 전체 로그 조회 가능
--        project_id 있음  : 호출자가 해당 프로젝트에 실제 caller_role_code(20/30)로 배정된 경우만 조회 가능
--        project_id 없음  : company/user 테이블 로그(특정 프로젝트와 무관) — 기존대로 회사 스코핑
--        조회 불가 또는 미존재 시 31010 반환
-- --------------------------------- --

    check_block: BEGIN

        IF NOT EXISTS (
            SELECT 1 FROM `log_audit`
            WHERE `log_audit_id` = i_log_audit_id
              AND (
                    i_caller_role_code = 10
                    OR (`project_id` IS NOT NULL AND FN_GET_PROJECT_ROLE_CODE(i_caller_user_id, `project_id`) = i_caller_role_code)
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
