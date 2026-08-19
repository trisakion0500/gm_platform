-- ------------------------------------------------------------------------------------------------------------ --
-- 메인 DB(gm_platform) 통합 Function 파일. 개별 파일을 알파벳순으로 이어붙인 것으로,
-- database/procedures/all_procedures.sql과 동일한 관례를 따른다. 개별 파일을 수정하면
-- 이 파일도 반드시 함께 갱신할 것.
-- ------------------------------------------------------------------------------------------------------------ --
DROP FUNCTION IF EXISTS FN_GET_PROJECT_ROLE_CODE;
DELIMITER $
CREATE FUNCTION FN_GET_PROJECT_ROLE_CODE(
    p_user_id     BIGINT,  -- 확인할 사용자 ID
    p_project_id  BIGINT   -- 확인할 프로젝트 ID
) RETURNS INT
DETERMINISTIC
READS SQL DATA
COMMENT '사용자의 해당 프로젝트 활성 role_code 반환, 배정 없으면 NULL - SUPER_ADMIN 우회는 호출부에서 처리'
BEGIN
-- --------------------------------- --
-- 명칭 : FN_GET_PROJECT_ROLE_CODE
-- 작성 : 2026-07-17 trisakion
-- 내용 : p_user_id가 p_project_id에 대해 가진 활성(status=1) user_role의 role_code를 반환.
--        배정이 없으면 NULL.
--        FN_HAS_PROJECT_ROLE(boolean 반환)과 달리 role_code "값 자체"가 필요한
--        승인/반려/실행 게이트 판정(SP_APPROVE_API_EXECUTION 등)용이라 SUPER_ADMIN
--        우회를 함수에 넣지 않고 호출부에서 그대로 처리한다(호출부마다 허용 role_code
--        조합이 달라 우회 값을 단일하게 정의할 수 없음).
-- --------------------------------- --

    DECLARE v_role_code INT DEFAULT NULL;

    SELECT `role_code` INTO v_role_code
    FROM `user_role`
    WHERE `user_id` = p_user_id
      AND `project_id` = p_project_id
      AND `status` = 1
    LIMIT 1;

    RETURN v_role_code;

END$

DELIMITER ;
DROP FUNCTION IF EXISTS FN_HAS_COMPANY_ROLE;
DELIMITER $
CREATE FUNCTION FN_HAS_COMPANY_ROLE(
    p_role_code           INT,    -- (더 이상 신뢰하지 않음, 무시됨 — 콜사이트 불변을 위해 파라미터만 유지) SUPER_ADMIN 판정은 FN_IS_SUPER_ADMIN(p_caller_user_id)로 재검증
    p_caller_user_id      BIGINT, -- 요청자 user_id (SUPER_ADMIN 재검증용, 신규)
    p_caller_company_id   BIGINT, -- 요청자 소속 회사 ID
    p_target_company_id   BIGINT  -- 확인할 대상 회사 ID
) RETURNS TINYINT(1)
DETERMINISTIC
READS SQL DATA
COMMENT 'SUPER_ADMIN이거나 요청자 소속 회사와 대상 회사가 일치하는지 여부 반환 - 회사 스코핑 체크 공용화'
BEGIN
-- --------------------------------- --
-- 명칭 : FN_HAS_COMPANY_ROLE
-- 작성 : 2026-08-18 trisakion
-- 수정 : 2026-08-19 trisakion - p_role_code(앱이 전달한 값)를 그대로 신뢰하던 것을
--        FN_IS_SUPER_ADMIN(p_caller_user_id) DB 재검증으로 전환(sp-convention-validator 지적, 4.2
--        "SP는 호출자의 role_code 값을 앱으로부터 전달받아 신뢰하지 않는다" 위반). 이 함수는
--        FN_HAS_PROJECT_ROLE/FN_IS_PROJECT_DEVELOPER와 달리 애초에 user_id를 받지 않아 그 둘처럼
--        파라미터만 무시하는 식으로는 재검증이 불가능했다 — p_caller_user_id를 신규 파라미터로
--        추가(2번째 자리)했고, 이를 원래 안 받던 SP_GET_COMPANY/SP_GET_COMPANY_LIST/SP_GET_USER_LIST
--        3개 SP에 i_caller_user_id 파라미터를 신설해 TS 컨트롤러의 req.user.user_id까지 관통시켰다.
--        company.service.ts의 updateCompany가 "before" 상태 조회에 쓰는 db.getCompany(companyId, 10, 0)
--        (스코핑 우회, 항상 조회 성공해야 함)도 이 함수를 거치므로, FN_HAS_PROJECT_ROLE과 동일하게
--        p_caller_user_id=0(실제 로그인 사용자일 수 없는 내부 전용 sentinel, 5.3 SYSTEM sentinel과
--        동일 원리)이면 p_role_code를 그대로 신뢰하는 예외를 둔다.
-- 내용 : p_caller_user_id=0(내부 전용 sentinel)이면 p_role_code를 그대로 신뢰(항상 10으로 호출됨).
--        그 외에는 p_caller_user_id가 실제 SUPER_ADMIN으로 배정돼 있으면 배정과 무관하게 항상 TRUE,
--        아니면 p_caller_company_id와 p_target_company_id 일치 여부를 반환.
--        SP들의 "i_role_code = 10 OR company_id = i_company_id" 반복 패턴을 공용 함수로 추출
--        (FN_HAS_PROJECT_ROLE이 프로젝트 스코핑을 공용화한 것과 동일한 사유 - 4곳 6군데 반복).
-- --------------------------------- --

    IF p_caller_user_id = 0 THEN
        RETURN p_role_code = 10;
    END IF;

    IF FN_IS_SUPER_ADMIN(p_caller_user_id) THEN
        RETURN 1;
    END IF;

    RETURN p_caller_company_id = p_target_company_id;

END$
DELIMITER ;
DROP FUNCTION IF EXISTS FN_HAS_PROJECT_ROLE;
DELIMITER $
CREATE FUNCTION FN_HAS_PROJECT_ROLE(
    p_role_code   INT,     -- (더 이상 신뢰하지 않음, 무시됨 — 콜사이트 불변을 위해 파라미터만 유지) SUPER_ADMIN 판정은 FN_IS_SUPER_ADMIN(p_user_id)로 재검증
    p_user_id     BIGINT,  -- 확인할 사용자 ID
    p_project_id  BIGINT   -- 확인할 프로젝트 ID
) RETURNS TINYINT(1)
DETERMINISTIC
READS SQL DATA
COMMENT 'SUPER_ADMIN이거나 해당 프로젝트에 활성(status=1) user_role을 보유했는지 여부 반환 - 조회 SP들의 프로젝트 스코핑 체크 공용화'
BEGIN
-- --------------------------------- --
-- 명칭 : FN_HAS_PROJECT_ROLE
-- 작성 : 2026-07-17 trisakion
-- 수정 : 2026-07-17 trisakion - SUPER_ADMIN 우회(p_role_code=10)를 호출부 대신 함수 내부로 이동
-- 수정 : 2026-08-19 trisakion - p_role_code(앱이 전달한 값)를 그대로 신뢰하던 것을
--        FN_IS_SUPER_ADMIN(p_user_id) DB 재검증으로 전환(sp-convention-validator 지적: 4.2
--        "SP는 호출자의 role_code 값을 앱으로부터 전달받아 신뢰하지 않는다" 위반). 시그니처를
--        바꾸면 39곳 호출부 전체를 고쳐야 해 파라미터는 그대로 두고 내부에서만 무시한다.
--        단, logAudit.service.ts의 resolveApiScope/resolveCodeGroupScope, project.service.ts의
--        "before" 상태 조회 등 감사로그·내부 조회 전용 호출부는 실제 요청자가 아니라 TS 소스에
--        박힌 상수 (project_id/api_id, 10, 0)으로 SP_GET_API/SP_GET_CODE_GROUP/SP_GET_PROJECT를
--        호출해 스코핑을 의도적으로 우회한다(항상 조회 성공해야 함) — p_user_id=0은 실제 로그인
--        사용자일 수 없는 값(AUTO_INCREMENT는 1부터, JWT user_id는 항상 양수)이라 안전한 내부
--        전용 sentinel로 재사용(5.3 SYSTEM sentinel과 동일 원리)해 이 경우만 p_role_code를
--        그대로 신뢰하도록 예외를 둔다 — 이 값은 요청 경로로는 절대 도달할 수 없다.
-- 내용 : p_user_id=0(내부 전용 sentinel)이면 p_role_code를 그대로 신뢰(항상 10으로 호출됨).
--        그 외에는 p_user_id가 실제 SUPER_ADMIN으로 배정돼 있으면 배정과 무관하게 항상 TRUE,
--        아니면 p_user_id가 p_project_id에 대해 활성 user_role을 보유했는지 반환
--        SP들의 "i_caller_role_code = 10 OR EXISTS(user_role...)" 패턴 전체를 공용 함수로 추출
-- --------------------------------- --

    IF p_user_id = 0 THEN
        RETURN p_role_code = 10;
    END IF;

    IF FN_IS_SUPER_ADMIN(p_user_id) THEN
        RETURN 1;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM `user_role`
        WHERE `user_id` = p_user_id
          AND `project_id` = p_project_id
          AND `status` = 1
    );

END$

DELIMITER ;
DROP FUNCTION IF EXISTS FN_IS_PROJECT_DEVELOPER;
DELIMITER $
CREATE FUNCTION FN_IS_PROJECT_DEVELOPER(
    p_role_code   INT,     -- (더 이상 신뢰하지 않음, 무시됨 — 콜사이트 불변을 위해 파라미터만 유지) SUPER_ADMIN 판정은 FN_IS_SUPER_ADMIN(p_user_id)로 재검증
    p_user_id     BIGINT,  -- 확인할 사용자 ID
    p_project_id  BIGINT   -- 확인할 프로젝트 ID
) RETURNS TINYINT(1)
DETERMINISTIC
READS SQL DATA
COMMENT 'SUPER_ADMIN이거나 해당 프로젝트에 실제 DEVELOPER(20)로 배정됐는지 여부 반환 - 프로젝트 단위 DEVELOPER 권한 스코핑 체크 공용화'
BEGIN
-- --------------------------------- --
-- 명칭 : FN_IS_PROJECT_DEVELOPER
-- 작성 : 2026-08-18 trisakion
-- 수정 : 2026-08-19 trisakion - API/CodeGroup/CodeItem/ProjectConnection/ProjectApiKey 계열 12개 SP에
--        반복되던 "IF i_caller_role_code != 10 THEN v_actual_role_code = FN_GET_PROJECT_ROLE_CODE(...) ...
--        END IF" 인라인 블록을 이 함수 호출로 공용화(sp-convention-validator 지적) — COMMENT의
--        "관리 화면" 한정 표현도 실제 재사용 범위에 맞춰 일반화
-- 수정 : 2026-08-19 trisakion - 미배정(NULL) 시 FN_GET_PROJECT_ROLE_CODE(...) = 20이 NULL이 되어
--        "IF NOT FN_IS_PROJECT_DEVELOPER(...) THEN"가 조건 자체를 거짓 취급(NOT NULL도 NULL)하며
--        20001 분기를 건너뛰는 권한 우회가 있었음(테스트로 실측 발견) — COALESCE로 NULL을 0으로
--        명시 확정해 미배정이면 항상 false가 되도록 수정
-- 수정 : 2026-08-19 trisakion - p_role_code(앱이 전달한 값)를 그대로 신뢰하던 것을
--        FN_IS_SUPER_ADMIN(p_user_id) DB 재검증으로 전환(sp-convention-validator 지적, FN_HAS_PROJECT_ROLE과
--        동일 사유). 시그니처를 바꾸면 여러 호출부를 고쳐야 해 파라미터는 그대로 두고 내부에서만 무시한다.
--        project.service.ts의 "before" 상태 조회(db.getProject(projectId, 10, 0))가 SP_GET_PROJECT를
--        경유해 이 함수를 호출하므로, FN_HAS_PROJECT_ROLE과 동일하게 p_user_id=0(실제 로그인 사용자일
--        수 없는 내부 전용 sentinel, 5.3 SYSTEM sentinel과 동일 원리)이면 p_role_code를 그대로
--        신뢰하는 예외를 둔다 — 이 값은 요청 경로로는 절대 도달할 수 없다.
-- 내용 : p_user_id=0(내부 전용 sentinel)이면 p_role_code를 그대로 신뢰(항상 10으로 호출됨).
--        그 외에는 p_user_id가 실제 SUPER_ADMIN으로 배정돼 있으면 배정과 무관하게 항상 TRUE,
--        아니면 p_user_id가 p_project_id에 실제 role_code=20(DEVELOPER)으로 배정됐는지 반환
--        (FN_HAS_PROJECT_ROLE은 "아무 역할이나 배정"이면 통과하는 전 역할 공용 화면 기준이라
--        DEVELOPER 전용 쓰기 권한 스코핑에는 쓸 수 없어 별도 함수로 분리).
-- --------------------------------- --

    IF p_user_id = 0 THEN
        RETURN p_role_code = 10;
    END IF;

    IF FN_IS_SUPER_ADMIN(p_user_id) THEN
        RETURN 1;
    END IF;

    RETURN COALESCE(FN_GET_PROJECT_ROLE_CODE(p_user_id, p_project_id), 0) = 20;

END$
DELIMITER ;
DROP FUNCTION IF EXISTS FN_IS_SUPER_ADMIN;
DELIMITER $
CREATE FUNCTION FN_IS_SUPER_ADMIN(
    p_user_id  BIGINT  -- 확인할 사용자 ID
) RETURNS TINYINT(1)
DETERMINISTIC
READS SQL DATA
COMMENT '해당 사용자가 실제 SUPER_ADMIN(10)으로 활성 배정돼 있는지 여부 반환 - SUPER_ADMIN 전용 SP 9곳의 반복 게이트 공용화'
BEGIN
-- --------------------------------- --
-- 명칭 : FN_IS_SUPER_ADMIN
-- 작성 : 2026-08-18 trisakion
-- 수정 : 2026-08-19 trisakion - 앱이 넘긴 role_code 값을 그대로 신뢰하던 것을 user_id 기반
--        DB 재검증으로 변경(sp-convention-validator 지적: 4.2 "SP는 호출자의 role_code
--        값을 앱으로부터 전달받아 신뢰하지 않는다" 위반 — 앱 레이어 버그나 우회 호출 시
--        DB가 마지막 방어선이 되지 못했음). SUPER_ADMIN은 어떤 project_id에 배정되어도
--        무관하므로(user_role.role_code 컬럼 COMMENT 참고) project_id 조건 없이 확인한다.
-- 내용 : p_user_id가 user_role에 role_code=10(SUPER_ADMIN)으로 활성(status=1) 배정돼
--        있는지 EXISTS로 재조회해 반환.
-- --------------------------------- --

    RETURN EXISTS (
        SELECT 1 FROM `user_role`
        WHERE `user_id` = p_user_id
          AND `role_code` = 10
          AND `status` = 1
    );

END$
DELIMITER ;
