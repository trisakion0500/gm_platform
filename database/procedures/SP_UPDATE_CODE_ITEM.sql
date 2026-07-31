DROP PROCEDURE IF EXISTS SP_UPDATE_CODE_ITEM;
DELIMITER $
CREATE PROCEDURE SP_UPDATE_CODE_ITEM(
    IN  i_code_item_id   BIGINT,        -- 수정할 코드 아이템 ID
    IN  i_code_name      VARCHAR(200),  -- 코드명 (NULL=변경 없음)
    IN  i_description    VARCHAR(1000), -- 설명 (NULL=변경 없음)
    IN  i_display_order  INT,           -- 표시 순서 (NULL=변경 없음)
    IN  i_status         TINYINT,       -- 상태 (NULL=변경 없음)
    IN  i_updated_by     BIGINT,        -- 수정자 user_id
    IN  i_caller_role_code INT          -- 수정자 역할 코드 (10=SUPER_ADMIN 외에는 대상 코드 그룹 소속 프로젝트 실제 DEVELOPER 권한 재검증)
) COMMENT '코드 아이템 수정 - code_item UPDATE, 프로젝트 DEVELOPER 권한 원자적 재검증'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_UPDATE_CODE_ITEM
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-07-31 trisakion - i_caller_role_code 추가, FN_GET_PROJECT_ROLE_CODE로 DEVELOPER 권한을
--        검증+UPDATE 한 트랜잭션에서 처리(TOCTOU 창 제거). code_group JOIN으로 project_id 함께 조회.
-- 내용 : 코드 아이템 수정
--        code_item 존재 검사 (31005)
--        SUPER_ADMIN 외 대상 프로젝트에 DEVELOPER 활성 권한 없음 → 20001
--        NULL 입력 시 기존 값 유지 (COALESCE)
--        code_group_id, code_value 수정 불가
-- 테이블 적용 순서 : code_item
-- --------------------------------- --

    DECLARE v_code_group_id    INT;
    DECLARE v_project_id       BIGINT;
    DECLARE v_actual_role_code INT;

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

        SELECT `code_group_id` INTO v_code_group_id FROM `code_item` WHERE `code_item_id` = i_code_item_id;

        IF v_code_group_id IS NULL THEN
            SELECT 31005 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF i_caller_role_code != 10 THEN
            SELECT `project_id` INTO v_project_id FROM `code_group` WHERE `code_group_id` = v_code_group_id;
            SET v_actual_role_code = FN_GET_PROJECT_ROLE_CODE(i_updated_by, v_project_id);
            IF v_actual_role_code IS NULL OR v_actual_role_code != 20 THEN
                SELECT 20001 AS RESULT;
                LEAVE transaction_block;
            END IF;
        END IF;

        START TRANSACTION;

            UPDATE `code_item`
            SET `code_name`     = COALESCE(i_code_name,     `code_name`),
                `description`   = COALESCE(i_description,   `description`),
                `display_order` = COALESCE(i_display_order, `display_order`),
                `status`        = COALESCE(i_status,        `status`),
                `updated_by`    = i_updated_by
            WHERE `code_item_id` = i_code_item_id;

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT `code_item_id`, `code_group_id`, `code_value`, `code_name`,
               `description`, `display_order`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
        FROM `code_item`
        WHERE `code_item_id` = i_code_item_id;

    END;

END$

DELIMITER ;
