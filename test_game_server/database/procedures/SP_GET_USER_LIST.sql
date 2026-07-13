DROP PROCEDURE IF EXISTS SP_GET_USER_LIST;
DELIMITER $
CREATE PROCEDURE SP_GET_USER_LIST(
    IN  i_nickname         VARCHAR(100),  -- 닉네임 LIKE 검색 (NULL/빈문자열=제한없음)
    IN  i_from_created_at  DATETIME,      -- 생성일시 시작 (NULL=제한없음)
    IN  i_to_created_at    DATETIME,      -- 생성일시 종료 (NULL=제한없음)
    IN  i_from_updated_at  DATETIME,      -- 수정일시 시작 (NULL=제한없음)
    IN  i_to_updated_at    DATETIME       -- 수정일시 종료 (NULL=제한없음)
) COMMENT '유저 목록 조회'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_USER_LIST
-- 작성 : 2026-07-13 trisakion
-- 내용 : 유저 목록 조회
--        nickname LIKE 검색, created_at 범위, updated_at 범위 필터 전부 nullable
--        정렬 : user_id ASC
-- --------------------------------- --

    SELECT 0 AS RESULT;

    SELECT `user_id`, `nickname`, `status`, `created_at`, `updated_at`
    FROM `user`
    WHERE (i_nickname         IS NULL OR i_nickname = '' OR `nickname` LIKE CONCAT('%', i_nickname, '%'))
      AND (i_from_created_at  IS NULL OR `created_at` >= i_from_created_at)
      AND (i_to_created_at    IS NULL OR `created_at` <= i_to_created_at)
      AND (i_from_updated_at  IS NULL OR `updated_at` >= i_from_updated_at)
      AND (i_to_updated_at    IS NULL OR `updated_at` <= i_to_updated_at)
    ORDER BY `user_id` ASC;

END$

DELIMITER ;
