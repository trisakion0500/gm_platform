DROP PROCEDURE IF EXISTS SP_GET_CARD_LIST;
DELIMITER $
CREATE PROCEDURE SP_GET_CARD_LIST(
    IN  i_user_id           BIGINT,       -- 유저 ID
    IN  i_card_type         TINYINT,      -- 카드 종류 필터 (NULL=전체, 1:캐릭터, 2:아이템)
    IN  i_card_code         VARCHAR(50),  -- 카드 코드 검색 (NULL/빈문자열=제한없음, 완전일치)
    IN  i_from_acquired_at  DATETIME,     -- 획득일시 시작 (NULL=제한없음)
    IN  i_to_acquired_at    DATETIME,     -- 획득일시 종료 (NULL=제한없음)
    IN  i_from_updated_at   DATETIME,     -- 수정일시 시작 (NULL=제한없음)
    IN  i_to_updated_at     DATETIME      -- 수정일시 종료 (NULL=제한없음)
) COMMENT '유저 보유 카드 목록 조회'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_CARD_LIST
-- 작성 : 2026-07-13 trisakion
-- 내용 : user_id로 보유 카드 목록 조회
--        card_type, card_code(완전일치), acquired_at 범위, updated_at 범위 필터 전부 nullable
--        정렬 : card_type ASC, card_code ASC
-- --------------------------------- --

    SELECT 0 AS RESULT;

    SELECT `card_id`, `user_id`, `card_type`, `card_code`, `quantity`, `acquired_at`, `updated_at`
    FROM `card`
    WHERE `user_id` = i_user_id
      AND (i_card_type        IS NULL OR `card_type`   = i_card_type)
      AND (i_card_code        IS NULL OR i_card_code = '' OR `card_code` = i_card_code)
      AND (i_from_acquired_at IS NULL OR `acquired_at` >= i_from_acquired_at)
      AND (i_to_acquired_at   IS NULL OR `acquired_at` <= i_to_acquired_at)
      AND (i_from_updated_at  IS NULL OR `updated_at`  >= i_from_updated_at)
      AND (i_to_updated_at    IS NULL OR `updated_at`  <= i_to_updated_at)
    ORDER BY `card_type` ASC, `card_code` ASC;

END$

DELIMITER ;
