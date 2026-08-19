DROP PROCEDURE IF EXISTS SP_UPDATE_CODE_GROUP;
DELIMITER $
CREATE PROCEDURE SP_UPDATE_CODE_GROUP(
    IN  i_code_group_id    INT,            -- 수정할 코드 그룹 ID
    IN  i_code_group_name  VARCHAR(200),   -- 코드 그룹명 (NULL=변경 없음)
    IN  i_description      VARCHAR(1000),  -- 설명 (NULL=변경 없음)
    IN  i_status           TINYINT,        -- 상태 (NULL=변경 없음)
    IN  i_updated_by       BIGINT,         -- 수정자 user_id
    IN  i_caller_role_code INT             -- 수정자 역할 코드 (10=SUPER_ADMIN 외에는 대상 프로젝트 실제 DEVELOPER 권한 재검증)
) COMMENT '코드 그룹 수정 - code_group UPDATE, 프로젝트 DEVELOPER 권한 원자적 재검증'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_UPDATE_CODE_GROUP
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-07-31 trisakion - i_caller_role_code 추가, FN_GET_PROJECT_ROLE_CODE로 DEVELOPER 권한을
--        검증+UPDATE 한 트랜잭션에서 처리(TOCTOU 창 제거). 존재 검사를 project_id도 함께
--        얻도록 SELECT INTO로 변경.
-- 수정 : 2026-08-19 trisakion - 인라인 스코핑 블록을 FN_IS_PROJECT_DEVELOPER() 호출로 공용화(중복 제거)
-- 내용 : 코드 그룹 수정
--        code_group 존재 검사 (31004)
--        SUPER_ADMIN 외 대상 프로젝트에 DEVELOPER 활성 권한 없음 → 20001
--        NULL 입력 시 기존 값 유지 (COALESCE)
--        code_group_code, project_id 수정 불가
-- 테이블 적용 순서 : code_group
-- --------------------------------- --

    DECLARE v_project_id       BIGINT;

    DECLARE sql_state      CHAR(5)       DEFAULT '00000';
    DECLARE error_no       INT           DEFAULT 0;
    DECLARE error_message  VARCHAR(255)  DEFAULT '';
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

        SELECT `project_id` INTO v_project_id FROM `code_group` WHERE `code_group_id` = i_code_group_id;

        IF v_project_id IS NULL THEN
            SELECT 31004 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF NOT FN_IS_PROJECT_DEVELOPER(i_caller_role_code, i_updated_by, v_project_id) THEN
            SELECT 20001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            UPDATE `code_group`
            SET `code_group_name` = COALESCE(i_code_group_name, `code_group_name`),
                `description`     = COALESCE(i_description,     `description`),
                `status`          = COALESCE(i_status,          `status`),
                `updated_by`      = i_updated_by
            WHERE `code_group_id` = i_code_group_id;

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT `code_group_id`, `project_id`, `code_group_code`, `code_group_name`,
               `description`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
        FROM `code_group`
        WHERE `code_group_id` = i_code_group_id;

    END;

END$

DELIMITER ;
