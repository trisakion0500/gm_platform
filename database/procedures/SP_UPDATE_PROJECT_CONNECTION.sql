DROP PROCEDURE IF EXISTS SP_UPDATE_PROJECT_CONNECTION;
DELIMITER $
CREATE PROCEDURE SP_UPDATE_PROJECT_CONNECTION(
    IN  i_project_id        BIGINT,       -- 수정할 프로젝트 ID
    IN  i_api_base_url      VARCHAR(255), -- 변경할 API Base URL
    IN  i_caller_user_id    BIGINT,       -- 호출자 user_id (프로젝트별 역할 재검증용)
    IN  i_caller_role_code  INT           -- 호출자 역할 코드 (10=SUPER_ADMIN 외에는 대상 프로젝트 실제 DEVELOPER 권한 재검증)
) COMMENT '프로젝트 연결 정보(api_base_url) 수정 - project 테이블 UPDATE, 프로젝트 DEVELOPER 권한 원자적 재검증'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_UPDATE_PROJECT_CONNECTION
-- 작성 : 2026-07-15 trisakion
-- 수정 : 2026-07-15 trisakion - api_base_url 변경 시 저장된 api_key를 함께 NULL 폐기(대상 서버가 바뀌었는데
--        옛 키를 그대로 보내는 조용한 실수 방지), has_api_key(발급 여부) 반환 추가
-- 수정 : 2026-07-31 trisakion - i_caller_user_id/i_caller_role_code 추가(기존엔 호출자 정보 자체가
--        없어 서비스 레이어가 별도 SP 라운드트립인 assertProjectRole로 먼저 검증했음), FN_GET_PROJECT_ROLE_CODE로
--        DEVELOPER 권한을 검증+UPDATE 한 트랜잭션에서 처리(TOCTOU 창 제거)
-- 내용 : 프로젝트의 api_base_url만 수정 (project_code/project_name/description/status는 SP_UPDATE_PROJECT 전용)
--        project 존재 검사 (31002)
--        SUPER_ADMIN 외 대상 프로젝트에 DEVELOPER 활성 권한 없음 → 20001
--        UPDATE (api_base_url 변경과 함께 api_key도 NULL로 폐기)
--        SUPER_ADMIN 외에 DEVELOPER도 호출 가능한 라우트라 project_code 등 정체성 필드와 SP 자체를 분리해둠
--        수정된 project 전체 정보 반환 (company 정보 포함)
-- 테이블 적용 순서 : project
-- --------------------------------- --

    DECLARE v_actual_role_code  INT;

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

        IF i_caller_role_code != 10 THEN
            SET v_actual_role_code = FN_GET_PROJECT_ROLE_CODE(i_caller_user_id, i_project_id);
            IF v_actual_role_code IS NULL OR v_actual_role_code != 20 THEN
                SELECT 20001 AS RESULT;
                LEAVE transaction_block;
            END IF;
        END IF;

        START TRANSACTION;

            UPDATE `project`
            SET `api_base_url` = i_api_base_url,
                `api_key`      = NULL
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
