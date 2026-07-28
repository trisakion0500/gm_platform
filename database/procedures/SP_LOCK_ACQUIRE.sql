DROP PROCEDURE IF EXISTS SP_LOCK_ACQUIRE;
DELIMITER $
CREATE PROCEDURE SP_LOCK_ACQUIRE(
    IN  i_lock_name  VARCHAR(64)  -- 획득할 advisory lock 이름 (인스턴스 간 공유되는 배치 식별 키)
) COMMENT '인스턴스 간 배치 중복실행 방지용 MySQL advisory lock 획득 (GET_LOCK, non-blocking)'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_LOCK_ACQUIRE
-- 작성 : 2026-07-28 trisakion
-- 내용 : 스케일아웃 시 세션 정리 크론(SP_CLEANUP_EXPIRED_SESSIONS 등)이 인스턴스마다 중복
--        실행되는 문제를 막기 위한 advisory lock 획득 전용 SP. timeout=0(non-blocking)으로
--        시도해 이미 다른 인스턴스가 점유 중이면 대기하지 않고 즉시 포기한다 — 크론은 다음
--        스케줄에 또 돌아오므로 여기서 기다릴 이유가 없다. GET_LOCK이 드물게 NULL(내부 오류,
--        예: 메모리 부족)을 반환해도 COALESCE로 0(미획득)과 동일하게 처리해 항상 안전한 쪽
--        (락을 못 잡은 것으로 간주)으로 fail한다.
--        주의: 반드시 호출부가 pool에서 직접 뽑아 유지하는 단일 커넥션 위에서 호출해야 한다
--        (callSP처럼 매번 pool이 임의로 골라주는 커넥션을 쓰면 락을 건 세션과 다른 세션이
--        되어버려 advisory lock의 세션 종속 특성이 깨진다). SP_LOCK_RELEASE도 반드시 같은
--        커넥션에서 호출해야 한다.
-- --------------------------------- --

    DECLARE sql_state      CHAR(5)       DEFAULT '00000';
    DECLARE error_no       INT           DEFAULT 0;
    DECLARE error_message  VARCHAR(255)  DEFAULT '';
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            sql_state     = RETURNED_SQLSTATE,
            error_no      = MYSQL_ERRNO,
            error_message = MESSAGE_TEXT;
        SELECT 99 AS RESULT, sql_state AS SQL_STATE, error_no AS ERROR_NO, error_message AS ERROR_MESSAGE;
    END;

    SELECT 0 AS RESULT;
    SELECT COALESCE(GET_LOCK(i_lock_name, 0), 0) AS acquired;

END$

DELIMITER ;
