-- ------------------------------------------------------------------------------------------------------------ --
-- 명칭 : api
-- 작성 : 2026.06.17 trisakion
-- 내용 : GM API 정의
--        개발자가 등록하는 GM 기능 정의 테이블
--        API 운영 단계(개발/승인/운영) 및 승인 정책 관리
--        GM-Tool → 서비스 간 S2S 호출 정보 저장
-- ------------------------------------------------------------------------------------------------------------ --
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `api`;
CREATE TABLE `api` (
  `api_id`					BIGINT		UNSIGNED	NOT NULL	AUTO_INCREMENT											COMMENT 'API ID',
  `project_id`				BIGINT		UNSIGNED	NOT NULL															COMMENT '프로젝트 ID(수정불가)',
  `api_code`				VARCHAR(100)			NOT NULL															COMMENT 'API 고유 코드',
  `api_name`				VARCHAR(200)			NOT NULL															COMMENT 'API 이름',
  `endpoint`				VARCHAR(500)			NOT NULL															COMMENT '서비스 호출 Endpoint',
  `description`				VARCHAR(1000)						DEFAULT NULL											COMMENT 'API 설명',
  `api_stage`				TINYINT		UNSIGNED	NOT NULL	DEFAULT 20												COMMENT 'API 운영 단계 (20:개발, 30:승인, 40:운영)',
  `is_required_approval`	TINYINT		UNSIGNED	NOT NULL	DEFAULT 0												COMMENT '승인 필요 여부 (0:즉시 실행, 1:승인 필요)',
  `response_view_type`		TINYINT		UNSIGNED	NOT NULL	DEFAULT 1												COMMENT '응답 표시 방식 (1:KEY_VALUE, 2:GRID)',
  `status`					TINYINT		UNSIGNED	NOT NULL	DEFAULT 1												COMMENT '상태 (1:사용, 0:중지)',
  `display_order`			INT			UNSIGNED	NOT NULL	DEFAULT 0												COMMENT '화면 표시 순서',
  `created_by`				BIGINT		UNSIGNED	NOT NULL															COMMENT '생성자 사용자 ID',
  `updated_by`				BIGINT		UNSIGNED				DEFAULT NULL											COMMENT '수정자 사용자 ID',
  `created_at`				DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP								COMMENT '생성일시',
  `updated_at`				DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP	COMMENT '수정일시',
  PRIMARY KEY (`api_id`),
  UNIQUE KEY `uk_project_api_code` (`project_id`,`api_code`),
  KEY `ix_project_id` (`project_id`),
  KEY `ix_api_stage` (`api_stage`),
  KEY `ix_status` (`status`),
  CONSTRAINT `fk_api_project` FOREIGN KEY (`project_id`) REFERENCES `project` (`project_id`),
  CONSTRAINT `fk_api_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`user_id`),
  CONSTRAINT `fk_api_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='GM API 정의';
SET FOREIGN_KEY_CHECKS = 1;

--  ------------------------------------------------------------------------------------------------------------ --
-- 명칭 : api_execution
-- 작성 : 2026.06.17 trisakion
-- 내용 : API 요청 승인 및 실행 관리
--        API 요청, 승인, 반려, 실행 결과를 관리
--        요청 데이터는 JSON 문자열로 저장
--        응답 데이터는 원문 그대로 저장
--        감사 로그(log_audit)는 별도 테이블에서 관리
--        상태 (10:PENDING, 20:APPROVED, 30:REJECTED, 40:SUCCESS, 50:FAILED, 60:CANCELED)
--        상태전이 승인 A [즉시실행 가능] (10:SUPER_ADMIN, 20:DEVELOPER, 30:APPROVER)
--          is_required_approval=0 또는 1 모두: 10 -> (40, 50, 60)
--        상태전이 승인 B (40:OPERATOR)
--          is_required_approval=0: 10 -> (40, 50, 60)
--          is_required_approval=1: OPERATOR는 10(PENDING) 생성만 가능
--            승인: SUPER_ADMIN/DEVELOPER/APPROVER 가 10 -> (20, 30) 처리
--            승인 이후: 20 -> (40, 50, 60)
--        반려 시 reject_reason 필수
--        60:CANCELED 은 요청자만 가능
-- ------------------------------------------------------------------------------------------------------------ --
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `api_execution`;
CREATE TABLE `api_execution` (
  `api_execution_id`		BIGINT		UNSIGNED	NOT NULL	AUTO_INCREMENT											COMMENT 'API 실행 ID',
  `api_id`					BIGINT		UNSIGNED	NOT NULL															COMMENT 'API ID',
  `api_name`				VARCHAR(200)			NOT NULL															COMMENT '실행 시점 API명',
  `endpoint`				VARCHAR(500)			NOT NULL															COMMENT '실행 시점 서비스 호출 Endpoint',
  `request_user_id`			BIGINT		UNSIGNED	NOT NULL															COMMENT '요청 사용자 ID',
  `approve_user_id`			BIGINT		UNSIGNED				DEFAULT NULL											COMMENT '승인 사용자 ID',
  `status`					TINYINT		UNSIGNED	NOT NULL	DEFAULT 10												COMMENT '상태 (10:PENDING, 20:APPROVED, 30:REJECTED, 40:SUCCESS, 50:FAILED, 60:CANCELED)',
  `request_json`			LONGTEXT				NOT NULL															COMMENT '요청 원문(JSON 문자열)',
  `response_data`			LONGTEXT							DEFAULT NULL											COMMENT '응답 원문',
  `reject_reason`			VARCHAR(1000)						DEFAULT NULL											COMMENT '반려 사유',
  `error_message`			VARCHAR(2000)						DEFAULT NULL											COMMENT '실행 오류 메시지',
  `requested_at`			DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP								COMMENT '요청일시',
  `approved_at`				DATETIME							DEFAULT NULL											COMMENT '승인일시',
  `executed_at`				DATETIME							DEFAULT NULL											COMMENT '실행일시',
  `updated_at`				DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP	COMMENT '수정일시',
  PRIMARY KEY (`api_execution_id`),
  KEY `ix_api_id` (`api_id`),
  KEY `ix_request_user_id` (`request_user_id`),
  KEY `ix_approve_user_id` (`approve_user_id`),
  KEY `ix_status` (`status`),
  KEY `ix_requested_at` (`requested_at`),
  CONSTRAINT `fk_api_execution_api` FOREIGN KEY (`api_id`) REFERENCES `api` (`api_id`),
  CONSTRAINT `fk_api_execution_request_user` FOREIGN KEY (`request_user_id`) REFERENCES `user` (`user_id`),
  CONSTRAINT `fk_api_execution_approve_user` FOREIGN KEY (`approve_user_id`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='API 요청 승인 및 실행 관리';
SET FOREIGN_KEY_CHECKS = 1;

--  ------------------------------------------------------------------------------------------------------------ --
-- 명칭 : api_request
-- 작성 : 2026.06.17 trisakion
-- 내용 : API 요청 파라미터 정의
--        GM-Tool 화면 자동 생성 및 입력값 검증에 사용
--        code_group_id 는 미사용일 수 있으므로 FK 지정 안함
--            단, code_group.status = 1 인 것만 대상이다.
-- ------------------------------------------------------------------------------------------------------------ --
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `api_request`;
CREATE TABLE `api_request` (
  `api_request_id`			BIGINT		UNSIGNED	NOT NULL	AUTO_INCREMENT											COMMENT 'API 요청 파라미터 ID',
  `api_id`					BIGINT		UNSIGNED	NOT NULL															COMMENT 'API ID',
  `parameter_name`			VARCHAR(100)			NOT NULL															COMMENT '파라미터명(JSON Key)',
  `parameter_label`			VARCHAR(100)			NOT NULL															COMMENT '파라미터 화면 표시명',
  `parameter_type`			TINYINT		UNSIGNED	NOT NULL															COMMENT '데이터 타입 (1:STRING, 2:NUMBER, 3:BOOLEAN, 4:DATE, 5:DATETIME, 6:JSON)',
  `component_type`			TINYINT		UNSIGNED	NOT NULL	DEFAULT 1												COMMENT '입력 컴포넌트 타입 (1:TEXT, 2:NUMBER, 3:DATE, 4:DATETIME, 5:SELECT, 6:RADIO, 7:CHECKBOX)',
  `code_group_id`			INT			UNSIGNED	NOT NULL	DEFAULT 0												COMMENT 'code_group.code_group_id 코드 그룹 ID (0:사용안함. 단, 등록 시 component_type 이 5, 6, 7 일 경우 0이면 오류)',
  `is_required`				TINYINT		UNSIGNED	NOT NULL	DEFAULT 1												COMMENT '필수 여부 (0:선택, 1:필수)',
  `description`				VARCHAR(1000)						DEFAULT NULL											COMMENT '파라미터 설명',
  `display_order`			INT			UNSIGNED	NOT NULL	DEFAULT 0												COMMENT '화면 표시 순서',
  `status`					TINYINT		UNSIGNED	NOT NULL	DEFAULT 1												COMMENT '상태 (1:사용, 0:중지)',
  `created_by`				BIGINT		UNSIGNED	NOT NULL															COMMENT '생성자 사용자 ID',
  `updated_by`				BIGINT		UNSIGNED				DEFAULT NULL											COMMENT '수정자 사용자 ID',
  `created_at`				DATETIME				NOT NULL	DEFAULT	CURRENT_TIMESTAMP								COMMENT '생성일시',
  `updated_at`				DATETIME				NOT NULL	DEFAULT	CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP	COMMENT '수정일시',
  PRIMARY KEY (`api_request_id`),
  UNIQUE KEY `uk_api_request_parameter_name` (`api_id`,`parameter_name`),
  KEY `ix_api_id` (`api_id`),
  KEY `ix_code_group_id` (`code_group_id`),
  KEY `ix_status` (`status`),
  CONSTRAINT `fk_api_request_api` FOREIGN KEY (`api_id`) REFERENCES `api` (`api_id`),
  CONSTRAINT `fk_api_request_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`user_id`),
  CONSTRAINT `fk_api_request_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='API 요청 파라미터 정의';
SET FOREIGN_KEY_CHECKS = 1;

--  ------------------------------------------------------------------------------------------------------------ --
-- 명칭 : api_response
-- 작성 : 2026.06.17 trisakion
-- 내용 : API 응답 데이터 정의
--        GM-Tool 응답 결과 화면 구성에 사용
--        응답 데이터는 Key-Value 또는 Grid 형태를 지원
--        code_group_id 는 미사용일 수 있으므로 FK 지정 안함
--        code_group_id 가 0 일 경우 응답 된 내용의 parameter_name 값을 노출하며,
--        0 이 아닐 경우 `api_response.code_group_id = code_item.code_group_id AND code_item.code_value = 응답 된 내용의 parameter_name 값` 에 맞는 code_item.code_name 을 노출한다.
--            단, 없을 경우 응답 된 내용의 parameter_name 값 그대로 노출한다.
--            단, code_group.status = 1 인 것만 대상이다.
-- ------------------------------------------------------------------------------------------------------------ --
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `api_response`;
CREATE TABLE `api_response` (
  `api_response_id`			BIGINT		UNSIGNED	NOT NULL	AUTO_INCREMENT											COMMENT 'API 응답 정의 ID',
  `api_id`					BIGINT		UNSIGNED	NOT NULL															COMMENT 'API ID',
  `parameter_name`			VARCHAR(100)			NOT NULL															COMMENT '응답 항목명(JSON Key)',
  `parameter_label`			VARCHAR(100)			NOT NULL															COMMENT '파라미터 화면 표시명',
  `parameter_type`			TINYINT		UNSIGNED	NOT NULL															COMMENT '데이터 타입 (1:STRING, 2:NUMBER, 3:BOOLEAN, 4:DATE, 5:DATETIME, 6:JSON)',
  `code_group_id`			INT			UNSIGNED	NOT NULL	DEFAULT 0												COMMENT 'code_group.code_group_id 코드 그룹 ID',
  `description`				VARCHAR(1000)						DEFAULT NULL											COMMENT '응답 항목 설명',
  `display_order`			INT			UNSIGNED	NOT NULL	DEFAULT 0												COMMENT '화면 표시 순서',
  `status`					TINYINT		UNSIGNED	NOT NULL	DEFAULT 1												COMMENT '상태 (1:사용, 0:중지)',
  `created_by`				BIGINT		UNSIGNED	NOT NULL															COMMENT '생성자 사용자 ID',
  `updated_by`				BIGINT		UNSIGNED				DEFAULT NULL											COMMENT '수정자 사용자 ID',
  `created_at`				DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP								COMMENT '생성일시',
  `updated_at`				DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP	COMMENT '수정일시',
  PRIMARY KEY (`api_response_id`),
  UNIQUE KEY `uk_api_response_parameter_name` (`api_id`,`parameter_name`),
  KEY `ix_api_id` (`api_id`),
  KEY `ix_code_group_id` (`code_group_id`),
  KEY `ix_status` (`status`),
  CONSTRAINT `fk_api_response_api` FOREIGN KEY (`api_id`) REFERENCES `api` (`api_id`),
  CONSTRAINT `fk_api_response_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`user_id`),
  CONSTRAINT `fk_api_response_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='API 응답 데이터 정의';
SET FOREIGN_KEY_CHECKS = 1;

--  ------------------------------------------------------------------------------------------------------------ --
-- 명칭 : code_group
-- 작성 : 2026.06.17 trisakion
-- 내용 : 공통 코드 그룹 정의
--        API 요청/응답에서 사용하는 코드 그룹 관리
-- ------------------------------------------------------------------------------------------------------------ --
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `code_group`;
CREATE TABLE `code_group` (
  `code_group_id`			INT			UNSIGNED	NOT NULL	AUTO_INCREMENT											COMMENT '코드 그룹 ID',
  `project_id`         		BIGINT		UNSIGNED	NOT NULL															COMMENT '프로젝트 ID',
  `code_group_code`    		VARCHAR(100)			NOT NULL															COMMENT '코드 그룹 코드',
  `code_group_name`    		VARCHAR(200)			NOT NULL															COMMENT '코드 그룹명',
  `description`        		VARCHAR(1000)						DEFAULT NULL											COMMENT '설명',
  `status`             		TINYINT		UNSIGNED	NOT NULL	DEFAULT 1												COMMENT '상태 (1:사용, 0:중지)',
  `created_by`				BIGINT		UNSIGNED	NOT NULL															COMMENT '생성자 사용자 ID',
  `updated_by`				BIGINT		UNSIGNED				DEFAULT NULL											COMMENT '수정자 사용자 ID',
  `created_at`				DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP								COMMENT '생성일시',
  `updated_at`				DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP	COMMENT '수정일시',
  PRIMARY KEY (`code_group_id`),
  UNIQUE KEY `uk_project_code_group_code`(`project_id`, `code_group_code`),
  KEY `ix_project_id` (`project_id`),
  KEY `ix_status` (`status`),
  CONSTRAINT `fk_code_group_project` FOREIGN KEY (`project_id`) REFERENCES `project` (`project_id`),
  CONSTRAINT `fk_code_group_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`user_id`),
  CONSTRAINT `fk_code_group_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='공통 코드 그룹 정의';
SET FOREIGN_KEY_CHECKS = 1;

--  ------------------------------------------------------------------------------------------------------------ --
-- 명칭 : code_item
-- 작성 : 2026.06.17 trisakion
-- 내용 : 공통 코드 상세 정의
--        code_group 하위 코드 데이터 관리
-- ------------------------------------------------------------------------------------------------------------ --
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `code_item`;
CREATE TABLE `code_item` (
  `code_item_id`			BIGINT		UNSIGNED	NOT NULL	AUTO_INCREMENT											COMMENT '코드 항목 ID',
  `code_group_id`			INT			UNSIGNED	NOT NULL															COMMENT '코드 그룹 ID',
  `code_value`				VARCHAR(100)			NOT NULL															COMMENT '코드 값',
  `code_name`				VARCHAR(200)			NOT NULL															COMMENT '코드명',
  `description`				VARCHAR(1000)						DEFAULT NULL											COMMENT '설명',
  `display_order`			INT			UNSIGNED	NOT NULL	DEFAULT 0												COMMENT '표시 순서',
  `status`					TINYINT		UNSIGNED	NOT NULL	DEFAULT 1												COMMENT '상태 (1:사용, 0:중지)',
  `created_by`				BIGINT		UNSIGNED	NOT NULL															COMMENT '생성자 사용자 ID',
  `updated_by`				BIGINT		UNSIGNED				DEFAULT NULL											COMMENT '수정자 사용자 ID',
  `created_at`				DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP								COMMENT '생성일시',
  `updated_at`				DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP	COMMENT '수정일시',
  PRIMARY KEY (`code_item_id`),
  UNIQUE KEY `uk_code_group_value` (`code_group_id`,`code_value`),
  KEY `ix_code_group_id` (`code_group_id`),
  KEY `ix_display_order` (`display_order`),
  KEY `ix_status` (`status`),
  CONSTRAINT `fk_code_item_code_group` FOREIGN KEY (`code_group_id`) REFERENCES `code_group` (`code_group_id`),
  CONSTRAINT `fk_code_item_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`user_id`),
  CONSTRAINT `fk_code_item_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='공통 코드 상세 정의';
SET FOREIGN_KEY_CHECKS = 1;

--  ------------------------------------------------------------------------------------------------------------ --
-- 명칭 : company
-- 작성 : 2026.06.17 trisakion
-- 내용 : 플랫폼 이용 회사 정보
-- ------------------------------------------------------------------------------------------------------------ --
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `company`;
CREATE TABLE `company` (
  `company_id`				BIGINT		UNSIGNED	NOT NULL	AUTO_INCREMENT											COMMENT '회사 ID',
  `company_code`			VARCHAR(20)				NOT NULL															COMMENT '회사 코드',
  `company_name`			VARCHAR(100)			NOT NULL															COMMENT '회사명',
  `description`				VARCHAR(1000)						DEFAULT NULL											COMMENT '설명',
  `status`					TINYINT		UNSIGNED	NOT NULL	DEFAULT 1												COMMENT '상태 (1:사용, 0:중지)',
  `created_at`				DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP								COMMENT '생성일시',
  `updated_at`				DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP	COMMENT '수정일시',
  PRIMARY KEY (`company_id`),
  UNIQUE KEY `uk_company_code` (`company_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='플랫폼 이용 회사';
INSERT INTO `company` (`company_id`, `company_code`, `company_name`, `description`, `status`, `created_at`, `updated_at`)
VALUES
(1, 'ADMIN', 'Administrator Company', NULL, 1, '1970-01-01 00:00:00', '1970-01-01 00:00:00'),
(2, 'DEV',   'Developer Company',     NULL, 1, '1970-01-01 00:00:00', '1970-01-01 00:00:00');
SET FOREIGN_KEY_CHECKS = 1;

--  ------------------------------------------------------------------------------------------------------------ --
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
  `table_name`				VARCHAR(100)			NOT NULL															COMMENT '대상 테이블명 (company, project, user, user_role, api, api_request, api_response, code_group, code_item)',
  `target_id`				VARCHAR(100)			NOT NULL															COMMENT '대상 PK 값 또는 복합 PK 식별값 (예: 100, {"user_id":100,"project_id":200})',
  `target_name`				VARCHAR(200)			DEFAULT NULL														COMMENT '대상 표시명 스냅샷 (예: 프로젝트명, API명, 코드그룹명)',
  `action_type`				TINYINT		UNSIGNED	NOT NULL															COMMENT '작업 유형 (10:CREATE, 20:UPDATE, 30:STATUS_CHANGE)',
  `before_json`				LONGTEXT				DEFAULT NULL														COMMENT '변경 전 데이터(JSON) (CREATE 시 NULL, UPDATE/STATUS_CHANGE 시 수정 전 Row 전체)',
  `after_json`				LONGTEXT				NOT NULL															COMMENT '변경 후 데이터(JSON) (CREATE/UPDATE/STATUS_CHANGE 시 항상 필수)',
  `created_by`				BIGINT		UNSIGNED	NOT NULL															COMMENT '작업 수행 사용자 ID',
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

--  ------------------------------------------------------------------------------------------------------------ --
-- 명칭 : project
-- 작성 : 2026.06.17 trisakion
-- 내용 : 서비스 프로젝트 정보
-- ------------------------------------------------------------------------------------------------------------ --
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `project`;
CREATE TABLE `project` (
  `project_id`				BIGINT		UNSIGNED	NOT NULL	AUTO_INCREMENT											COMMENT '프로젝트 ID',
  `company_id`				BIGINT		UNSIGNED	NOT NULL															COMMENT '회사 ID',
  `project_code`			VARCHAR(20)				NOT NULL															COMMENT '프로젝트 코드',
  `project_name`			VARCHAR(100)			NOT NULL															COMMENT '프로젝트명',
  `api_base_url`			VARCHAR(255)			NOT NULL															COMMENT 'API Base URL (루트 주소)',
  `description`				VARCHAR(1000)						DEFAULT NULL											COMMENT 'Project 설명',
  `status`					TINYINT		UNSIGNED	NOT NULL	DEFAULT 1												COMMENT '상태 (1:사용, 0:중지)',
  `created_at`				DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP								COMMENT '생성일시',
  `updated_at`				DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP	COMMENT '수정일시',
  PRIMARY KEY (`project_id`),
  UNIQUE KEY `uk_company_project_code` (`company_id`,`project_code`),
  KEY `ix_project_company_id` (`company_id`),
  CONSTRAINT `fk_project_company_id` FOREIGN KEY (`company_id`) REFERENCES `company` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='서비스 프로젝트 정보';
INSERT INTO `project` (`project_id`, `company_id`, `project_code`, `project_name`, `api_base_url`, `description`, `status`, `created_at`, `updated_at`)
VALUES
(1, 1, 'ADMIN_PROJECT', 'Administrator Company Default Project', 'https://127.0.0.1:3000', NULL, 1, '1970-01-01 00:00:00', '1970-01-01 00:00:00'),
(2, 2, 'DEV_PROJECT',   'Developer Company Default Project',     'https://127.0.0.1:3000', NULL, 1, '1970-01-01 00:00:00', '1970-01-01 00:00:00');
SET FOREIGN_KEY_CHECKS = 1;

--  ------------------------------------------------------------------------------------------------------------ --
-- 명칭 : user
-- 작성 : 2026.06.17 trisakion
-- 내용 : 플랫폼 사용자 계정 (회사 소속 사용자)
-- ------------------------------------------------------------------------------------------------------------ --
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `user_id`					BIGINT		UNSIGNED	NOT NULL	AUTO_INCREMENT											COMMENT '사용자 ID',
  `company_id`				BIGINT		UNSIGNED	NOT NULL															COMMENT '회사 ID',
  `requested_project_id`	BIGINT		UNSIGNED				DEFAULT NULL											COMMENT '가입 신청 프로젝트 ID(회원가입시의 값 영구 유지)',
  `login_id`				VARCHAR(100)			NOT NULL															COMMENT '로그인 ID',
  `password_hash`			VARCHAR(255)			NOT NULL															COMMENT '비밀번호 해시',
  `user_name`				VARCHAR(100)			NOT NULL															COMMENT '사용자명',
  `email`					VARCHAR(200)			NOT NULL															COMMENT '이메일 (알림/연락용)',
  `status`					TINYINT		UNSIGNED	NOT NULL	DEFAULT 0												COMMENT '상태 (0:가입승인대기, 1:가입승인, 2: 가입반려, 3: 사용중지)',
  `last_login_at`			DATETIME							DEFAULT NULL											COMMENT '마지막 로그인 일시',
  `created_at`				DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP								COMMENT '생성일시',
  `updated_at`				DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP	COMMENT '수정일시',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uk_login_id` (`login_id`),
  UNIQUE KEY `uk_email` (`email`),
  KEY `ix_user_company_id` (`company_id`),
  KEY `ix_requested_project_id` (`requested_project_id`),
  CONSTRAINT `fk_user_company_id` FOREIGN KEY (`company_id`) REFERENCES `company` (`company_id`),
  CONSTRAINT `fk_user_requested_project` FOREIGN KEY (`requested_project_id`) REFERENCES `project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='플랫폼 사용자 계정';
INSERT INTO `user` (`user_id`, `company_id`, `requested_project_id`, `login_id`, `password_hash`, `user_name`, `email`, `status`, `created_at`, `updated_at`)
VALUES
(1, 1, 1, 'sa',  '$2b$12$P9T8Tsrnvqw7RX4e/UxQHuqjD6qEe7SJ7cYSBBf2HY1bTt5iV0BoG', 'Super Admin', 'sa@example.com',  1, '1970-01-01 00:00:00', '1970-01-01 00:00:00'),
(2, 2, 2, 'dev', '$2b$12$F6tSaPz673OpLoLtGwJuceez38jfCV79KGRv/vk3FSkiDKVngM.zK',  'Developer',   'dev@example.com', 1, '1970-01-01 00:00:00', '1970-01-01 00:00:00'),
(3, 2, 2, 'apv', '$2b$12$kIHtGsC1nrUxKcooDXyHhe9LREZPM4Q6v5N4VSwrYrfF7qCD61WaC',  'Approver',    'apv@example.com', 1, '1970-01-01 00:00:00', '1970-01-01 00:00:00'),
(4, 2, 2, 'op',  '$2b$12$uEM0RqK8zY/r4S2EmmPCEu7PNfMAdWKA3fwFWUMCc4.Ydcx2q926.',  'Operator',    'op@example.com',  1, '1970-01-01 00:00:00', '1970-01-01 00:00:00');
SET FOREIGN_KEY_CHECKS = 1;

--  ------------------------------------------------------------------------------------------------------------ --
-- 명칭 : user_role
-- 작성 : 2026.06.17 trisakion
-- 내용 : 사용자 - 프로젝트 권한 매핑 (10단위 role 레벨 코드)
-- ------------------------------------------------------------------------------------------------------------ --
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `user_role`;
CREATE TABLE `user_role` (
  `user_id`					BIGINT		UNSIGNED	NOT NULL															COMMENT '사용자 ID',
  `project_id`				BIGINT		UNSIGNED	NOT NULL															COMMENT '프로젝트 ID',
  `role_code`				TINYINT		UNSIGNED	NOT NULL															COMMENT '권한 코드 (20:DEVELOPER, 30:APPROVER, 40:OPERATOR, 10:SUPER_ADMIN은 어떤 프로젝트에 연결되어도 무관함)',
  `status`					TINYINT		UNSIGNED	NOT NULL	DEFAULT 1												COMMENT '상태 (1:사용, 0:중지)',
  `created_at`				DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP								COMMENT '생성일시',
  `updated_at`				DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP	COMMENT '수정일시',
  PRIMARY KEY (`user_id`,`project_id`),
  KEY `ix_user_role_project_id` (`project_id`),
  CONSTRAINT `fk_user_role_project` FOREIGN KEY (`project_id`) REFERENCES `project` (`project_id`),
  CONSTRAINT `fk_user_role_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='사용자 프로젝트 권한 매핑 (10단위 role 레벨 코드)';
INSERT INTO `user_role` (`user_id`, `project_id`, `role_code`, `status`, `created_at`, `updated_at`)
VALUES
(1, 1, 10, 1, '1970-01-01 00:00:00', '1970-01-01 00:00:00'),
(2, 2, 20, 1, '1970-01-01 00:00:00', '1970-01-01 00:00:00'),
(3, 2, 30, 1, '1970-01-01 00:00:00', '1970-01-01 00:00:00'),
(4, 2, 40, 1, '1970-01-01 00:00:00', '1970-01-01 00:00:00');
SET FOREIGN_KEY_CHECKS = 1;

--  ------------------------------------------------------------------------------------------------------------ --
-- 명칭 : user_session
-- 작성 : 2026.06.22 trisakion
-- 내용 : 사용자 인증 세션 관리
--        Access Token / Refresh Token 기반 인증 정보 저장
--        로그인 시 생성되며 로그아웃 또는 만료 시 상태 변경
--        사용자 상태(user.status)와 별도로 관리
--        향후 Redis 기반 세션 저장소로 확장 가능하도록 설계
--        [FK 미적용 의도] user_id 에 대한 FK 를 적용하지 않음
--                        세션 조회는 access_token_jti 기준으로 수행하므로
--                        MySQL → Redis 저장소 전환 시 인증 로직 수정 없이 확장 가능하도록 설계
-- ------------------------------------------------------------------------------------------------------------ --
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `user_session`;
CREATE TABLE `user_session` (
  `session_id`				BIGINT		UNSIGNED    NOT NULL	AUTO_INCREMENT											COMMENT '세션 ID',
  `user_id`					BIGINT		UNSIGNED    NOT NULL															COMMENT '사용자 ID',
  `access_token_jti`		VARCHAR(100)			NOT NULL															COMMENT 'Access Token 식별자(JTI)',
  `refresh_token_hash`		VARCHAR(255)			NOT NULL															COMMENT 'Refresh Token 해시값',
  `expired_at`				DATETIME				NOT NULL															COMMENT '세션 만료일시',
  `last_access_at`			DATETIME							DEFAULT NULL											COMMENT '마지막 접근일시',
  `status`					TINYINT		UNSIGNED	NOT NULL DEFAULT 1													COMMENT '상태 (1:사용, 0:로그아웃, 2:만료)',
  `created_at`				DATETIME				NOT NULL DEFAULT CURRENT_TIMESTAMP									COMMENT '생성일시',
  `updated_at`				DATETIME				NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP		COMMENT '수정일시',
  PRIMARY KEY (`session_id`),
  UNIQUE KEY `uk_access_token_jti` (`access_token_jti`),
  KEY `ix_user_id` (`user_id`),
  KEY `ix_status` (`status`),
  KEY `ix_expired_at` (`expired_at`),
  KEY `ix_last_access_at` (`last_access_at`)
  -- CONSTRAINT `fk_user_session_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='사용자 인증 세션 관리 (Access Token / Refresh Token 기반, 로그인 이력 및 세션 상태 저장)';
SET FOREIGN_KEY_CHECKS = 1;