DROP PROCEDURE IF EXISTS SP_UPDATE_PROJECT;
DELIMITER $
CREATE PROCEDURE SP_UPDATE_PROJECT(
    IN  i_project_id    BIGINT,        -- 수정할 프로젝트 ID
    IN  i_project_code  VARCHAR(20),   -- 프로젝트 코드 (NULL=변경 없음)
    IN  i_project_name  VARCHAR(100),  -- 프로젝트명 (NULL=변경 없음)
    IN  i_description   VARCHAR(1000), -- 설명 (NULL=변경 없음)
    IN  i_status        TINYINT        -- 상태 (NULL=변경 없음)
) COMMENT '프로젝트 수정 - project 테이블 UPDATE'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_UPDATE_PROJECT
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-07-15 trisakion - api_base_url을 SP_UPDATE_PROJECT_CONNECTION으로 분리(DEVELOPER도 수정 가능하게 열 예정이라 프로젝트 정체성 필드와 쓰기 권한을 나눔)
-- 수정 : 2026-07-15 trisakion - has_api_key(발급 여부) 반환 추가
-- 내용 : 프로젝트 정보 수정 (project_code/project_name/description/status만, api_base_url은 SP_UPDATE_PROJECT_CONNECTION 전용)
--        project 존재 검사 후 UPDATE
--        project_code 변경 시 동일 company 내 중복 검사 (본인 제외)
--        NULL 입력 시 기존 값 유지 (COALESCE)
--        수정된 project 전체 정보 반환 (company 정보 포함)
-- 테이블 적용 순서 : project
-- --------------------------------- --

    DECLARE sql_state       CHAR(5)       DEFAULT '00000';
    DECLARE error_no        INT           DEFAULT 0;
    DECLARE error_message   VARCHAR(255)  DEFAULT '';
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            sql_state     = RETURNED_SQLSTATE,
            error_no      = MYSQL_ERRNO,
            error_message = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 99 AS RESULT, sql_state AS SQL_STATE, error_no AS ERROR_NO, error_message AS ERROR_MESSAGE;
    END;

    transaction_block: BEGIN

        IF NOT EXISTS (SELECT 1 FROM `project` WHERE `project_id` = i_project_id) THEN
            SELECT 31002 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF i_project_code IS NOT NULL AND
           EXISTS (
               SELECT 1 FROM `project`
               WHERE `company_id` = (SELECT `company_id` FROM `project` WHERE `project_id` = i_project_id)
                 AND `project_code` = i_project_code
                 AND `project_id` != i_project_id
           ) THEN
            SELECT 32001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            UPDATE `project`
            SET `project_code` = COALESCE(i_project_code, `project_code`),
                `project_name` = COALESCE(i_project_name, `project_name`),
                `description`  = COALESCE(i_description,  `description`),
                `status`       = COALESCE(i_status,       `status`)
            WHERE `project_id` = i_project_id;

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT p.`project_id`, p.`company_id`, c.`company_code`, c.`company_name`,
               p.`project_code`, p.`project_name`, p.`api_base_url`, p.`description`,
               p.`status`, IF(p.`api_key` IS NOT NULL, 1, 0) AS has_api_key,
               p.`created_at`, p.`updated_at`
        FROM `project` p
        JOIN `company` c ON c.`company_id` = p.`company_id`
        WHERE p.`project_id` = i_project_id;

    END;

END$

DELIMITER ;
