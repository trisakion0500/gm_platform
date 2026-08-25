-- ------------------------------------------------------------------------------------------------------------ --
-- 로그 DB(예: gm_platform_log) 통합 테이블 파일 — database/tables/all_tables.sql과 동일한 목적(로컬 개발 편의용 한 번에 적용).
-- 2026.08.02부터 메인 서비스 DB와 물리적으로 분리된 별도 DB에 적용한다.
-- 개별 파일을 수정하면 이 파일도 반드시 함께 갱신할 것(all_tables.sql과 동일한 동기화 원칙).
-- ------------------------------------------------------------------------------------------------------------ --
-- ------------------------------------------------------------------------------------------------------------ --
-- 명칭 : log_audit
-- 작성 : 2026.06.22 trisakion
-- 수정 : 2026.08.02 trisakion - database_log(별도 물리 DB)로 이관. 메인 DB(database/)에서는 완전히 제거.
-- 내용 : 운영 데이터 변경 이력을 저장하는 Append-Only 테이블
--        CREATE / UPDATE / STATUS_CHANGE 작업 기록
--        변경 전후 전체 Row를 JSON 형태로 저장
--        api_execution 은 실행 이력 테이블이므로 감사 대상에서 제외
--        물리 수정 및 삭제를 허용하지 않음
-- ------------------------------------------------------------------------------------------------------------ --
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `log_audit`;
CREATE TABLE `log_audit` (
  `log_audit_id`			BIGINT		UNSIGNED	NOT NULL	AUTO_INCREMENT											COMMENT '감사 로그 ID',
  `company_id`				BIGINT		UNSIGNED				DEFAULT NULL											COMMENT '회사 ID (로그 스코핑용, FK 없음)',
  `project_id`				BIGINT		UNSIGNED				DEFAULT NULL											COMMENT '프로젝트 ID (로그 스코핑용, company/user는 NULL, FK 없음)',
  `project_name`			VARCHAR(100)			DEFAULT NULL														COMMENT '프로젝트명 스냅샷 (로그 생성 시점 값 고정, project_id NULL이면 NULL, 별도 DB 분리로 project 테이블 조인 불가하여 필수)',
  `table_name`				VARCHAR(100)			NOT NULL															COMMENT '대상 테이블명 (company, project, user, user_role, api, api_request, api_response, code_group, code_item)',
  `target_id`				VARCHAR(100)			NOT NULL															COMMENT '대상 PK 값 또는 복합 PK 식별값 (예: 100, {"user_id":100,"project_id":200})',
  `target_name`				VARCHAR(200)			DEFAULT NULL														COMMENT '대상 표시명 스냅샷 (예: 프로젝트명, API명, 코드그룹명)',
  `action_type`				TINYINT		UNSIGNED	NOT NULL															COMMENT '작업 유형 (10:CREATE, 20:UPDATE, 30:STATUS_CHANGE)',
  `before_json`				LONGTEXT				DEFAULT NULL														COMMENT '변경 전 데이터(JSON) (CREATE 시 NULL, UPDATE/STATUS_CHANGE 시 수정 전 Row 전체)',
  `after_json`				LONGTEXT				NOT NULL															COMMENT '변경 후 데이터(JSON) (CREATE/UPDATE/STATUS_CHANGE 시 항상 필수)',
  `created_by`				BIGINT		UNSIGNED	NOT NULL															COMMENT '작업 수행 사용자 ID (FK 없음, 물리적으로 분리된 DB라 user 테이블 참조 불가)',
  `created_by_name`		VARCHAR(50)				DEFAULT NULL														COMMENT '작업 수행 사용자명 스냅샷 (로그 생성 시점 값 고정, 별도 DB 분리로 user 테이블 조인 불가하여 필수)',
  `created_at`				DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP								COMMENT '로그 생성일시',
  PRIMARY KEY (`log_audit_id`),
  KEY `ix_table_target` (`table_name`, `target_id`),
  KEY `ix_company_id` (`company_id`),
  KEY `ix_project_id` (`project_id`),
  KEY `ix_created_by` (`created_by`),
  KEY `ix_created_at` (`created_at`)
  -- CONSTRAINT `fk_log_audit_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`user_id`)	-- 로그테이블이므로 FK 사용하지 않음 (물리적으로도 다른 DB라 FK 자체가 불가능)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='시스템 설정 변경 감사 로그 (api_execution 제외, 변경 전후 전체 Row를 JSON 형태로 저장하는 Append-Only 테이블)';
SET FOREIGN_KEY_CHECKS = 1;
-- ------------------------------------------------------------------------------------------------------------ --
-- 명칭 : log_audit_index_sync_queue
-- 작성 : 2026.08.16 trisakion
-- 수정 : 2026.08.25 trisakion - updated_at 컬럼 추가. 이 테이블은 log_audit과 같은 물리 DB(gm_platform_log)에
--        있지만 그 자체는 로그(Append-Only)가 아니라 실패 시 attempt_count/last_error가 갱신되고 성공 시
--        행이 삭제되는 아웃박스 큐다 — "Append-Only 테이블만 updated_at 생략 가능"이라는 컨벤션 예외는
--        "물리적으로 로그 DB에 있는지"가 아니라 "실제로 UPDATE/DELETE가 없는지"로 판단해야 하므로, 이
--        테이블은 예외 대상이 아니다.
-- 내용 : 감사 로그(log_audit) 변경분을 rag_server(gm_logs 컬렉션)에 반영하기 위한 아웃박스 큐.
--        api_index_sync_queue(database/, RAG Phase 2)와 달리 log_audit은 Append-Only라 같은
--        log_audit_id가 재큐잉되는 경우가 구조적으로 없다(UPDATE로 재사용되는 PK가 아니라, 변경이
--        생길 때마다 새 로그 행이 생성됨) — 그래서 api_index_sync_queue가 updated_at을 쓰는 낙관적
--        동시성 가드(WHERE updated_at = expected)는 여기서는 불필요하다. 다만 updated_at 컬럼 자체는
--        일반 테이블 컨벤션(16.1)대로 유지한다 — 이 큐 항목이 마지막으로 언제 재시도됐는지 확인하는
--        용도로는 여전히 필요하기 때문이다. log_audit과 물리적으로 같은 DB(gm_platform_log)에 두는
--        이유는 SP_INSERT_LOG_AUDIT과 같은 트랜잭션으로 묶어 "log_audit 행이 있으면 큐 항목도 반드시
--        있다"를 보장하기 위함 — 메인 DB에 뒀다면 이 원자성을 낼 수 없다(서로 다른 물리 DB라 분산
--        트랜잭션 불가).
--        server/의 logAuditIndexSync.job.ts가 주기적으로 이 테이블을 폴링해 rag_server에 push하고,
--        성공하면 해당 행을 삭제한다 — 실패하면 attempt_count/last_error만 갱신하고 남겨둬 다음 tick에
--        무기한 재시도한다("확실한 전달 보장", RAG Phase 2와 동일 설계 의도).
-- ------------------------------------------------------------------------------------------------------------ --
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `log_audit_index_sync_queue`;
CREATE TABLE `log_audit_index_sync_queue` (
  `sync_id`			BIGINT		UNSIGNED	NOT NULL	AUTO_INCREMENT											COMMENT '동기화 큐 ID',
  `log_audit_id`	BIGINT		UNSIGNED	NOT NULL															COMMENT '동기화 대상 감사 로그 ID',
  `attempt_count`	INT			UNSIGNED	NOT NULL	DEFAULT 0												COMMENT '재시도 횟수',
  `last_error`		VARCHAR(500)						DEFAULT NULL											COMMENT '마지막 실패 사유',
  `created_at`		DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP								COMMENT '생성일시',
  `updated_at`		DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP	COMMENT '수정일시',
  PRIMARY KEY (`sync_id`),
  UNIQUE KEY `uk_log_audit_id` (`log_audit_id`),
  CONSTRAINT `fk_log_audit_index_sync_queue_log_audit` FOREIGN KEY (`log_audit_id`) REFERENCES `log_audit` (`log_audit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='감사 로그 rag_server 동기화 아웃박스 큐';
SET FOREIGN_KEY_CHECKS = 1;
