DROP PROCEDURE IF EXISTS SP_GET_LOG_AUDIT_LIST;
DELIMITER $
CREATE PROCEDURE SP_GET_LOG_AUDIT_LIST(
    IN  i_company_id         BIGINT,       -- 회사 ID 필터 (NULL=전체)
    IN  i_project_id         BIGINT,       -- 프로젝트 ID 필터 (NULL=전체)
    IN  i_table_name         VARCHAR(100), -- 테이블명 필터 (NULL=전체)
    IN  i_target_id          VARCHAR(100), -- 대상 ID 필터 (NULL=전체)
    IN  i_action_type        TINYINT,      -- 작업 유형 필터 (NULL=전체)
    IN  i_from_created_at    DATETIME,     -- 시작 일시 (NULL=제한없음)
    IN  i_to_created_at      DATETIME,     -- 종료 일시 (NULL=제한없음)
    IN  i_page               INT,          -- 페이지 번호 (1부터)
    IN  i_page_size          INT,          -- 페이지 크기 (20/30/50/100)
    IN  i_caller_role_code   INT,          -- 요청자 역할 코드
    IN  i_caller_company_id  BIGINT        -- 요청자 company_id (DEVELOPER/APPROVER 스코핑용)
) COMMENT '감사 로그 목록 조회 - 역할 스코핑, 페이지네이션'
BEGIN
    DECLARE v_offset INT DEFAULT (i_page - 1) * i_page_size;

    SELECT 0 AS RESULT;

    SELECT COUNT(*) AS total_count
    FROM `log_audit`
    WHERE (i_caller_role_code = 10 OR `company_id` = i_caller_company_id)
      AND (i_company_id        IS NULL OR `company_id`   = i_company_id)
      AND (i_project_id        IS NULL OR `project_id`   = i_project_id)
      AND (i_table_name        IS NULL OR `table_name`   = i_table_name)
      AND (i_target_id         IS NULL OR `target_id`    = i_target_id)
      AND (i_action_type       IS NULL OR `action_type`  = i_action_type)
      AND (i_from_created_at   IS NULL OR `created_at`  >= i_from_created_at)
      AND (i_to_created_at     IS NULL OR `created_at`  <= i_to_created_at);

    SELECT la.`log_audit_id`, la.`company_id`, la.`project_id`, p.`project_name`,
           la.`table_name`, la.`target_id`, la.`target_name`, la.`action_type`,
           u.`user_name` AS `created_by_name`, la.`created_at`
    FROM `log_audit` la
    LEFT JOIN `project` p ON p.`project_id` = la.`project_id`
    LEFT JOIN `user`    u ON u.`user_id`    = la.`created_by`
    WHERE (i_caller_role_code = 10 OR la.`company_id` = i_caller_company_id)
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
