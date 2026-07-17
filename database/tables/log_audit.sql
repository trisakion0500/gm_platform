-- ------------------------------------------------------------------------------------------------------------ --
-- 명칭 : log_audit
-- 작성 : 2026.06.22 trisakion
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
  `project_name`			VARCHAR(100)			DEFAULT NULL														COMMENT '프로젝트명 스냅샷 (로그 생성 시점 값 고정, project_id NULL이면 NULL, 별도 DB 분리 대비 project 테이블 조인 제거용)',
  `table_name`				VARCHAR(100)			NOT NULL															COMMENT '대상 테이블명 (company, project, user, user_role, api, api_request, api_response, code_group, code_item)',
  `target_id`				VARCHAR(100)			NOT NULL															COMMENT '대상 PK 값 또는 복합 PK 식별값 (예: 100, {"user_id":100,"project_id":200})',
  `target_name`				VARCHAR(200)			DEFAULT NULL														COMMENT '대상 표시명 스냅샷 (예: 프로젝트명, API명, 코드그룹명)',
  `action_type`				TINYINT		UNSIGNED	NOT NULL															COMMENT '작업 유형 (10:CREATE, 20:UPDATE, 30:STATUS_CHANGE)',
  `before_json`				LONGTEXT				DEFAULT NULL														COMMENT '변경 전 데이터(JSON) (CREATE 시 NULL, UPDATE/STATUS_CHANGE 시 수정 전 Row 전체)',
  `after_json`				LONGTEXT				NOT NULL															COMMENT '변경 후 데이터(JSON) (CREATE/UPDATE/STATUS_CHANGE 시 항상 필수)',
  `created_by`				BIGINT		UNSIGNED	NOT NULL															COMMENT '작업 수행 사용자 ID',
  `created_by_name`		VARCHAR(50)				DEFAULT NULL														COMMENT '작업 수행 사용자명 스냅샷 (로그 생성 시점 값 고정, 별도 DB 분리 대비 user 테이블 조인 제거용)',
  `created_at`				DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP								COMMENT '로그 생성일시',
  PRIMARY KEY (`log_audit_id`),
  KEY `ix_table_target` (`table_name`, `target_id`),
  KEY `ix_company_id` (`company_id`),
  KEY `ix_project_id` (`project_id`),
  KEY `ix_created_by` (`created_by`),
  KEY `ix_created_at` (`created_at`)
  -- CONSTRAINT `fk_log_audit_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`user_id`)	-- 로그테이블이므로 FK 사용하지 않음
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='시스템 설정 변경 감사 로그 (api_execution 제외, 변경 전후 전체 Row를 JSON 형태로 저장하는 Append-Only 테이블)';
SET FOREIGN_KEY_CHECKS = 1;