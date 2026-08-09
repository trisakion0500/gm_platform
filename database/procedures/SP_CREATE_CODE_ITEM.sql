DROP PROCEDURE IF EXISTS SP_CREATE_CODE_ITEM;
DELIMITER $
CREATE PROCEDURE SP_CREATE_CODE_ITEM(
    IN  i_code_group_id  INT,            -- 코드 그룹 ID
    IN  i_code_value     VARCHAR(100),   -- 코드 값 (그룹 내 유일)
    IN  i_code_name      VARCHAR(200),   -- 코드명
    IN  i_description    VARCHAR(1000),  -- 설명 (NULL 허용)
    IN  i_display_order  INT,            -- 표시 순서
    IN  i_created_by     BIGINT,         -- 생성자 user_id
    IN  i_caller_role_code INT           -- 생성자 역할 코드 (10=SUPER_ADMIN 외에는 대상 코드 그룹 소속 프로젝트 실제 DEVELOPER 권한 재검증)
) COMMENT '코드 아이템 등록 - code_item INSERT, 프로젝트 DEVELOPER 권한 원자적 재검증'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_CREATE_CODE_ITEM
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-07-31 trisakion - i_caller_role_code 추가, FN_GET_PROJECT_ROLE_CODE로 DEVELOPER 권한을
--        검증+INSERT 한 트랜잭션에서 처리(TOCTOU 창 제거). code_group 존재 검사를 project_id도
--        함께 얻도록 SELECT INTO로 변경.
-- 수정 : 2026-08-09 trisakion - UNIQUE 제약 위반(MySQL 1062)을 32001로 매핑하는 전용 핸들러 추가
--        (사전 중복검사 이후 동시 요청이 끼어드는 TOCTOU 레이스 시 50001 대신 32001로 정확히 응답)
-- 내용 : 코드 아이템 등록
--        code_group 존재 검사 (31004)
--        SUPER_ADMIN 외 대상 프로젝트에 DEVELOPER 활성 권한 없음 → 20001
--        code_value 그룹 내 중복 검사 (32001)
-- 테이블 적용 순서 : code_item
-- --------------------------------- --

    DECLARE v_project_id       BIGINT;
    DECLARE v_actual_role_code INT;

    DECLARE sql_state      CHAR(5)       DEFAULT '00000';
    DECLARE error_no       INT           DEFAULT 0;
    DECLARE error_message  VARCHAR(255)  DEFAULT '';
    DECLARE EXIT HANDLER FOR 1062
    BEGIN
        ROLLBACK;
        SELECT 32001 AS RESULT;
    END;

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

        SELECT `project_id` INTO v_project_id FROM `code_group` WHERE `code_group_id` = i_code_group_id AND `status` = 1;

        IF v_project_id IS NULL THEN
            SELECT 31004 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF i_caller_role_code != 10 THEN
            SET v_actual_role_code = FN_GET_PROJECT_ROLE_CODE(i_created_by, v_project_id);
            IF v_actual_role_code IS NULL OR v_actual_role_code != 20 THEN
                SELECT 20001 AS RESULT;
                LEAVE transaction_block;
            END IF;
        END IF;

        IF EXISTS (SELECT 1 FROM `code_item` WHERE `code_group_id` = i_code_group_id AND `code_value` = i_code_value) THEN
            SELECT 32001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            INSERT INTO `code_item` (`code_group_id`, `code_value`, `code_name`, `description`, `display_order`, `status`, `created_by`, `updated_by`)
            VALUES (i_code_group_id, i_code_value, i_code_name, i_description, i_display_order, 1, i_created_by, i_created_by);

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT `code_item_id`, `code_group_id`, `code_value`, `code_name`,
               `description`, `display_order`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
        FROM `code_item`
        WHERE `code_item_id` = LAST_INSERT_ID();

    END;

END$

DELIMITER ;
