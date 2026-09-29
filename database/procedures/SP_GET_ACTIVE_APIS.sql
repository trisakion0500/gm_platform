DROP PROCEDURE IF EXISTS SP_GET_ACTIVE_APIS;
DELIMITER $
CREATE PROCEDURE SP_GET_ACTIVE_APIS(
    IN  i_project_id            BIGINT,   -- 대상 프로젝트 ID
    IN  i_caller_role_code      INT,      -- 요청자 역할 코드 (10=SUPER_ADMIN)
    IN  i_caller_user_id        BIGINT    -- 요청자 user_id (비SUPER_ADMIN 프로젝트 접근 검사)
) COMMENT '활성 API 전체 조회 - 페이지네이션 없음, 사이드바 실행 메뉴/관리 화면 공용'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_ACTIVE_APIS
-- 작성 : 2026-07-05 trisakion
-- 수정 : 2026-07-17 trisakion - EXISTS 인라인 체크를 FN_HAS_PROJECT_ROLE() 호출로 공용화
-- 수정 : 2026-07-17 trisakion - 미권한 시 빈 목록 대신 20001 반환, 가드절을 최상단으로 이동
-- 수정 : 2026-09-29 trisakion - i_exclude_save_targets 제거(save_api_id 자체가 update_endpoint 컬럼으로
--        대체되며 "저장 전용 API" 개념이 사라짐 — 이제 모든 API가 일반 실행 대상)
-- 내용 : 활성(status=1) API 전체 조회 (페이지네이션 없음)
--        SUPER_ADMIN(10) : 해당 프로젝트 전체 조회
--        일반 사용자     : user_role 에 등록된 프로젝트가 아니면 20001
-- --------------------------------- --

    proc_block: BEGIN

        IF NOT FN_HAS_PROJECT_ROLE(i_caller_role_code, i_caller_user_id, i_project_id) THEN
            SELECT 20001 AS RESULT;
            LEAVE proc_block;
        END IF;

        SELECT 0 AS RESULT;

        SELECT a.`api_id`, a.`api_name`, a.`api_stage`
        FROM `api` a
        WHERE a.`project_id` = i_project_id
          AND a.`status` = 1
        ORDER BY a.`display_order` ASC;

    END;

END$

DELIMITER ;
