DROP PROCEDURE IF EXISTS SP_GET_API_LIST;
DELIMITER $
CREATE PROCEDURE SP_GET_API_LIST(
    IN  i_project_id         BIGINT,   -- 프로젝트 ID (필수)
    IN  i_status             TINYINT,  -- 상태 필터 (NULL=전체)
    IN  i_api_stage          TINYINT,  -- 운영 단계 필터 (NULL=전체)
    IN  i_page               INT,      -- 페이지 번호 (1부터)
    IN  i_page_size          INT,      -- 페이지 크기 (20/30/50/100)
    IN  i_caller_role_code   INT,      -- 요청자 역할 코드 (10=SUPER_ADMIN)
    IN  i_caller_user_id     BIGINT    -- 요청자 user_id (비SUPER_ADMIN 프로젝트 접근 검사)
) COMMENT 'API 목록 조회 - 페이지네이션, 역할별 스코핑'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_API_LIST
-- 작성 : 2026-06-30 trisakion
-- 수정 : 2026-07-17 trisakion - EXISTS 인라인 체크를 FN_HAS_PROJECT_ROLE() 호출로 공용화
-- 수정 : 2026-07-17 trisakion - 미권한 시 빈 목록 대신 20001 반환, 가드절을 최상단으로 이동
-- 내용 : API 목록 조회
--        SUPER_ADMIN(10) : 해당 프로젝트 전체 조회
--        일반 사용자     : user_role 에 등록된 프로젝트가 아니면 20001
--        페이지네이션 : total_count + items 순서로 반환
--        정렬 : status DESC, display_order ASC
-- --------------------------------- --

    DECLARE v_offset  INT DEFAULT (i_page - 1) * i_page_size;

    proc_block: BEGIN

        IF NOT FN_HAS_PROJECT_ROLE(i_caller_role_code, i_caller_user_id, i_project_id) THEN
            SELECT 20001 AS RESULT;
            LEAVE proc_block;
        END IF;

        SELECT 0 AS RESULT;

        SELECT COUNT(a.`api_id`) AS total_count
        FROM `api` a
        WHERE a.`project_id` = i_project_id
          AND (i_status    IS NULL OR a.`status`    = i_status)
          AND (i_api_stage IS NULL OR a.`api_stage` = i_api_stage);

        SELECT a.`api_id`, a.`project_id`, a.`api_code`, a.`api_name`, a.`endpoint`,
               a.`description`, a.`api_stage`, a.`is_required_approval`, a.`response_view_type`,
               a.`status`, a.`display_order`, a.`created_by`, a.`updated_by`, a.`created_at`, a.`updated_at`
        FROM `api` a
        WHERE a.`project_id` = i_project_id
          AND (i_status    IS NULL OR a.`status`    = i_status)
          AND (i_api_stage IS NULL OR a.`api_stage` = i_api_stage)
        ORDER BY a.`status` DESC, a.`display_order` ASC
        LIMIT i_page_size OFFSET v_offset;

    END;

END$

DELIMITER ;
