DROP PROCEDURE IF EXISTS SP_GET_CODE_ITEM_LIST;
DELIMITER $
CREATE PROCEDURE SP_GET_CODE_ITEM_LIST(
    IN  i_code_group_id      INT,      -- 코드 그룹 ID
    IN  i_status             TINYINT,  -- 상태 필터 (NULL=전체)
    IN  i_caller_role_code   INT,      -- 요청자 역할 코드 (10=SUPER_ADMIN)
    IN  i_caller_user_id     BIGINT    -- 요청자 user_id (비SUPER_ADMIN 프로젝트 접근 검사)
) COMMENT '코드 아이템 목록 조회 - 역할별 스코핑'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_CODE_ITEM_LIST
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-07-17 trisakion - 프로젝트 스코핑 추가 (i_caller_role_code, i_caller_user_id)
-- 수정 : 2026-07-17 trisakion - EXISTS 인라인 체크를 FN_HAS_PROJECT_ROLE() 호출로 공용화
-- 수정 : 2026-07-17 trisakion - 미권한 시 빈 목록 대신 20001 반환, 가드절을 최상단으로 이동
-- 내용 : 코드 아이템 목록 조회
--        SUPER_ADMIN(10) : 해당 코드 그룹 전체 조회
--        일반 사용자     : 코드 그룹 소속 프로젝트에 user_role 등록되지 않으면 20001
--        status 필터 nullable
--        정렬 : status DESC, display_order ASC
-- --------------------------------- --

    DECLARE v_project_id  BIGINT DEFAULT NULL;

    proc_block: BEGIN

        SELECT `project_id` INTO v_project_id FROM `code_group` WHERE `code_group_id` = i_code_group_id;

        IF NOT FN_HAS_PROJECT_ROLE(i_caller_role_code, i_caller_user_id, v_project_id) THEN
            SELECT 20001 AS RESULT;
            LEAVE proc_block;
        END IF;

        SELECT 0 AS RESULT;

        SELECT `code_item_id`, `code_group_id`, `code_value`, `code_name`,
               `description`, `display_order`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
        FROM `code_item`
        WHERE `code_group_id` = i_code_group_id
          AND (i_status IS NULL OR `status` = i_status)
        ORDER BY `status` DESC, `display_order` ASC;

    END;

END$

DELIMITER ;
