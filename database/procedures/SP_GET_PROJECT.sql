DROP PROCEDURE IF EXISTS SP_GET_PROJECT;

DELIMITER $

CREATE PROCEDURE SP_GET_PROJECT(
    IN  i_project_id       BIGINT,  -- 조회할 프로젝트 ID
    IN  i_role_code        INT,     -- 요청자 역할 코드 (10=SUPER_ADMIN)
    IN  i_user_company_id  BIGINT   -- 요청자 소속 회사 ID (SUPER_ADMIN 외 스코핑용)
)
COMMENT '프로젝트 단건 조회 - 역할별 스코핑, company 정보 포함'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_PROJECT
-- 작성 : 2026-06-29 trisakion
-- 내용 : 프로젝트 단건 조회
--        SUPER_ADMIN(10) : 모든 프로젝트 조회 가능
--        그 외           : 본인 소속 company_id 의 프로젝트만 조회 가능
--        조회 불가 또는 미존재 시 31002 반환
-- --------------------------------- --

    transaction_block: BEGIN

        IF NOT EXISTS (
            SELECT 1 FROM `project`
            WHERE `project_id` = i_project_id
              AND (i_role_code = 10 OR `company_id` = i_user_company_id)
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
