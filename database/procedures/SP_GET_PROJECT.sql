DROP PROCEDURE IF EXISTS SP_GET_PROJECT;
DELIMITER $
CREATE PROCEDURE SP_GET_PROJECT(
    IN  i_project_id  BIGINT,  -- 조회할 프로젝트 ID
    IN  i_role_code   INT,     -- 요청자 역할 코드 (10=SUPER_ADMIN)
    IN  i_user_id     BIGINT   -- 요청자 user_id (SUPER_ADMIN 외 user_role 스코핑용)
) COMMENT '프로젝트 단건 조회 - 역할별 스코핑, company 정보 포함'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_PROJECT
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-07-02 trisakion - 스코핑 기준을 company 소속에서 user_role 배정으로 변경
-- 내용 : 프로젝트 단건 조회
--        SUPER_ADMIN(10) : 모든 프로젝트 조회 가능
--        그 외           : 본인이 활성 user_role을 가진 프로젝트만 조회 가능
--        조회 불가 또는 미존재 시 31002 반환
-- --------------------------------- --

    transaction_block: BEGIN

        IF NOT EXISTS (
            SELECT 1 FROM `project`
            WHERE `project_id` = i_project_id
              AND (i_role_code = 10 OR EXISTS (
                    SELECT 1 FROM `user_role` ur
                    WHERE ur.`project_id` = i_project_id
                      AND ur.`user_id` = i_user_id
                      AND ur.`status` = 1
                  ))
        ) THEN
            SELECT 31002 AS RESULT;
            LEAVE transaction_block;
        END IF;

        SELECT 0 AS RESULT;
        SELECT p.`project_id`, p.`company_id`, c.`company_code`, c.`company_name`,
               p.`project_code`, p.`project_name`, p.`api_base_url`, p.`description`,
               p.`status`, p.`created_at`, p.`updated_at`
        FROM `project` p
        JOIN `company` c ON c.`company_id` = p.`company_id`
        WHERE p.`project_id` = i_project_id;

    END;

END$

DELIMITER ;
