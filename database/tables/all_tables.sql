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
INSERT INTO `api` (`api_id`, `project_id`, `api_code`, `api_name`, `endpoint`, `description`, `api_stage`, `is_required_approval`, `response_view_type`, `status`, `display_order`, `created_by`, `updated_by`, `created_at`, `updated_at`)
VALUES
(1, 2, 'GET_USER', '유저 조회', '/api/get-user', 'user_id로 유저 상세 조회', 40, 0, 1, 1, 1, 1, 1, '2026-07-13 21:51:57', '2026-07-13 22:01:57'),
(2, 2, 'GET_USER_LIST', '유저 목록 조회', '/api/get-user-list', '닉네임/생성일시/수정일시 조건으로 유저 목록 조회', 40, 0, 2, 1, 2, 1, 1, '2026-07-13 21:51:57', '2026-07-13 22:01:57'),
(3, 2, 'UPDATE_USER_STATUS', '유저 상태 변경', '/api/update-user-status', '유저 상태를 정상/일시정지/영구정지로 변경', 40, 1, 1, 1, 3, 1, 1, '2026-07-13 21:51:58', '2026-07-13 22:01:57'),
(4, 2, 'GET_CURRENCY_LIST', '재화 잔액 조회', '/api/get-currency-list', 'user_id로 재화 잔액 목록 조회', 40, 0, 2, 1, 4, 1, 1, '2026-07-13 21:51:58', '2026-07-13 22:01:57'),
(5, 2, 'GRANT_CURRENCY', '재화 지급/차감', '/api/grant-currency', '유저 재화를 amount만큼 증감 (음수=차감)', 40, 1, 1, 1, 5, 1, 1, '2026-07-13 21:51:58', '2026-07-13 22:01:57'),
(6, 2, 'GET_CARD_LIST', '보유 카드 조회', '/api/get-card-list', '유저 보유 카드 목록 조회 (카드코드/기간 필터)', 40, 0, 2, 1, 6, 1, 1, '2026-07-13 21:51:58', '2026-07-13 22:01:57'),
(7, 2, 'GRANT_CARD', '카드 지급', '/api/grant-card', '유저에게 카드를 지급 (기존 보유 시 수량 누적)', 40, 1, 1, 1, 7, 1, 1, '2026-07-13 21:51:58', '2026-07-13 22:01:57');
SET FOREIGN_KEY_CHECKS = 1;
-- ------------------------------------------------------------------------------------------------------------ --
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
  `is_required_approval`	TINYINT		UNSIGNED	NOT NULL															COMMENT '실행 시점 승인 필요 여부 스냅샷 (0:즉시실행, 1:승인필요) - api.is_required_approval이 이후 바뀌어도 과거 이력 판정에 영향받지 않도록 저장',
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
-- ------------------------------------------------------------------------------------------------------------ --
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
INSERT INTO `api_request` (`api_request_id`, `api_id`, `parameter_name`, `parameter_label`, `parameter_type`, `component_type`, `code_group_id`, `is_required`, `description`, `display_order`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`)
VALUES
(1, 1, 'user_id', '유저 ID', 2, 2, 0, 1, NULL, 1, 1, 1, 1, '2026-07-13 21:51:57', '2026-07-13 21:51:57'),
(2, 2, 'nickname', '닉네임(포함검색)', 1, 1, 0, 0, NULL, 1, 1, 1, 1, '2026-07-13 21:51:57', '2026-07-13 21:51:57'),
(3, 2, 'from_created_at', '생성일시(시작)', 5, 4, 0, 0, NULL, 2, 1, 1, 1, '2026-07-13 21:51:57', '2026-07-13 21:51:57'),
(4, 2, 'to_created_at', '생성일시(종료)', 5, 4, 0, 0, NULL, 3, 1, 1, 1, '2026-07-13 21:51:57', '2026-07-13 21:51:57'),
(5, 2, 'from_updated_at', '수정일시(시작)', 5, 4, 0, 0, NULL, 4, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(6, 2, 'to_updated_at', '수정일시(종료)', 5, 4, 0, 0, NULL, 5, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(7, 3, 'user_id', '유저 ID', 2, 2, 0, 1, NULL, 1, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(8, 3, 'status', '변경할 상태', 2, 5, 1, 1, NULL, 2, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(9, 4, 'user_id', '유저 ID', 2, 2, 0, 1, NULL, 1, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(10, 5, 'user_id', '유저 ID', 2, 2, 0, 1, NULL, 1, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(11, 5, 'currency_type', '재화 종류', 2, 5, 2, 1, NULL, 2, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(12, 5, 'amount', '증감량(음수=차감)', 2, 2, 0, 1, NULL, 3, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(13, 6, 'user_id', '유저 ID', 2, 2, 0, 1, NULL, 1, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(14, 6, 'card_type', '카드 종류(1:캐릭터,2:아이템)', 2, 2, 0, 0, NULL, 2, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(15, 6, 'card_code', '카드 코드', 1, 5, 3, 0, NULL, 3, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(16, 6, 'from_acquired_at', '획득일시(시작)', 5, 4, 0, 0, NULL, 4, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(17, 6, 'to_acquired_at', '획득일시(종료)', 5, 4, 0, 0, NULL, 5, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(18, 6, 'from_updated_at', '수정일시(시작)', 5, 4, 0, 0, NULL, 6, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(19, 6, 'to_updated_at', '수정일시(종료)', 5, 4, 0, 0, NULL, 7, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(20, 7, 'user_id', '유저 ID', 2, 2, 0, 1, NULL, 1, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(21, 7, 'card_type', '카드 종류(1:캐릭터,2:아이템)', 2, 2, 0, 1, NULL, 2, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(22, 7, 'card_code', '카드 코드', 1, 5, 3, 1, NULL, 3, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(23, 7, 'quantity', '지급 수량', 2, 2, 0, 1, NULL, 4, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58');
SET FOREIGN_KEY_CHECKS = 1;
-- ------------------------------------------------------------------------------------------------------------ --
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
INSERT INTO `api_response` (`api_response_id`, `api_id`, `parameter_name`, `parameter_label`, `parameter_type`, `code_group_id`, `description`, `display_order`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`)
VALUES
(1, 1, 'user_id', '유저 ID', 2, 0, NULL, 1, 1, 1, 1, '2026-07-13 21:51:57', '2026-07-13 21:51:57'),
(2, 1, 'nickname', '닉네임', 1, 0, NULL, 2, 1, 1, 1, '2026-07-13 21:51:57', '2026-07-13 21:51:57'),
(3, 1, 'status', '상태', 2, 1, NULL, 3, 1, 1, 1, '2026-07-13 21:51:57', '2026-07-13 21:51:57'),
(4, 1, 'created_at', '생성일시', 5, 0, NULL, 4, 1, 1, 1, '2026-07-13 21:51:57', '2026-07-13 21:51:57'),
(5, 1, 'updated_at', '수정일시', 5, 0, NULL, 5, 1, 1, 1, '2026-07-13 21:51:57', '2026-07-13 21:51:57'),
(6, 2, 'user_id', '유저 ID', 2, 0, NULL, 1, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(7, 2, 'nickname', '닉네임', 1, 0, NULL, 2, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(8, 2, 'status', '상태', 2, 1, NULL, 3, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(9, 2, 'created_at', '생성일시', 5, 0, NULL, 4, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(10, 2, 'updated_at', '수정일시', 5, 0, NULL, 5, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(11, 3, 'user_id', '유저 ID', 2, 0, NULL, 1, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(12, 3, 'nickname', '닉네임', 1, 0, NULL, 2, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(13, 3, 'status', '상태', 2, 1, NULL, 3, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(14, 3, 'created_at', '생성일시', 5, 0, NULL, 4, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(15, 3, 'updated_at', '수정일시', 5, 0, NULL, 5, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(16, 4, 'currency_id', '재화 ID', 2, 0, NULL, 1, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(17, 4, 'user_id', '유저 ID', 2, 0, NULL, 2, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(18, 4, 'currency_type', '재화 종류', 2, 2, NULL, 3, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(19, 4, 'amount', '보유 수량', 2, 0, NULL, 4, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(20, 4, 'updated_at', '수정일시', 5, 0, NULL, 5, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(21, 5, 'currency_id', '재화 ID', 2, 0, NULL, 1, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(22, 5, 'user_id', '유저 ID', 2, 0, NULL, 2, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(23, 5, 'currency_type', '재화 종류', 2, 2, NULL, 3, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(24, 5, 'amount', '보유 수량', 2, 0, NULL, 4, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(25, 5, 'updated_at', '수정일시', 5, 0, NULL, 5, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(26, 6, 'card_id', '카드 ID', 2, 0, NULL, 1, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(27, 6, 'user_id', '유저 ID', 2, 0, NULL, 2, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(28, 6, 'card_type', '카드 종류', 2, 0, NULL, 3, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(29, 6, 'card_code', '카드', 1, 3, NULL, 4, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(30, 6, 'quantity', '보유 수량', 2, 0, NULL, 5, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(31, 6, 'acquired_at', '획득일시', 5, 0, NULL, 6, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(32, 6, 'updated_at', '수정일시', 5, 0, NULL, 7, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(33, 7, 'card_id', '카드 ID', 2, 0, NULL, 1, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(34, 7, 'user_id', '유저 ID', 2, 0, NULL, 2, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(35, 7, 'card_type', '카드 종류', 2, 0, NULL, 3, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(36, 7, 'card_code', '카드', 1, 3, NULL, 4, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(37, 7, 'quantity', '보유 수량', 2, 0, NULL, 5, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(38, 7, 'acquired_at', '획득일시', 5, 0, NULL, 6, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(39, 7, 'updated_at', '수정일시', 5, 0, NULL, 7, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58');
SET FOREIGN_KEY_CHECKS = 1;
-- ------------------------------------------------------------------------------------------------------------ --
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
INSERT INTO `code_group` (`code_group_id`, `project_id`, `code_group_code`, `code_group_name`, `description`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`)
VALUES
(1, 2, 'USER_STATUS', '유저상태', NULL, 1, 1, 1, '2026-07-13 21:41:31', '2026-07-13 21:41:31'),
(2, 2, 'CURRENCY_TYPE', '재화종류', NULL, 1, 1, 1, '2026-07-13 21:42:14', '2026-07-13 21:42:14'),
(3, 2, 'CARD', '카드종류', NULL, 1, 1, 1, '2026-07-13 21:42:55', '2026-07-13 21:42:55');
SET FOREIGN_KEY_CHECKS = 1;
-- ------------------------------------------------------------------------------------------------------------ --
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
INSERT INTO `code_item` (`code_item_id`, `code_group_id`, `code_value`, `code_name`, `description`, `display_order`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`)
VALUES
(1, 1, '1', '정상', NULL, 0, 1, 1, 1, '2026-07-13 21:41:51', '2026-07-13 21:41:51'),
(2, 1, '2', '일시정지', NULL, 0, 1, 1, 1, '2026-07-13 21:41:51', '2026-07-13 21:41:51'),
(3, 1, '3', '영구정지', NULL, 0, 1, 1, 1, '2026-07-13 21:41:51', '2026-07-13 21:41:51'),
(4, 2, '1', '유료다이아', NULL, 0, 1, 1, 1, '2026-07-13 21:42:33', '2026-07-13 21:42:33'),
(5, 2, '2', '무료다이아', NULL, 0, 1, 1, 1, '2026-07-13 21:42:33', '2026-07-13 21:42:33'),
(6, 2, '3', '골드', NULL, 0, 1, 1, 1, '2026-07-13 21:42:33', '2026-07-13 21:42:33'),
(8, 3, 'CHAR_001', '불꽃검사', NULL, 1, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(9, 3, 'CHAR_002', '불꽃궁수', NULL, 2, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(10, 3, 'CHAR_003', '불꽃마법사', NULL, 3, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(11, 3, 'CHAR_004', '불꽃기사', NULL, 4, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(12, 3, 'CHAR_005', '불꽃도적', NULL, 5, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(13, 3, 'CHAR_006', '불꽃사제', NULL, 6, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(14, 3, 'CHAR_007', '불꽃정령사', NULL, 7, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(15, 3, 'CHAR_008', '불꽃창술사', NULL, 8, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(16, 3, 'CHAR_009', '불꽃격투가', NULL, 9, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(17, 3, 'CHAR_010', '불꽃소환사', NULL, 10, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(18, 3, 'CHAR_011', '얼음검사', NULL, 11, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(19, 3, 'CHAR_012', '얼음궁수', NULL, 12, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(20, 3, 'CHAR_013', '얼음마법사', NULL, 13, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(21, 3, 'CHAR_014', '얼음기사', NULL, 14, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(22, 3, 'CHAR_015', '얼음도적', NULL, 15, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(23, 3, 'CHAR_016', '얼음사제', NULL, 16, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(24, 3, 'CHAR_017', '얼음정령사', NULL, 17, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(25, 3, 'CHAR_018', '얼음창술사', NULL, 18, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(26, 3, 'CHAR_019', '얼음격투가', NULL, 19, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(27, 3, 'CHAR_020', '얼음소환사', NULL, 20, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(28, 3, 'CHAR_021', '바람검사', NULL, 21, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(29, 3, 'CHAR_022', '바람궁수', NULL, 22, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(30, 3, 'CHAR_023', '바람마법사', NULL, 23, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(31, 3, 'CHAR_024', '바람기사', NULL, 24, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(32, 3, 'CHAR_025', '바람도적', NULL, 25, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(33, 3, 'CHAR_026', '바람사제', NULL, 26, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(34, 3, 'CHAR_027', '바람정령사', NULL, 27, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(35, 3, 'CHAR_028', '바람창술사', NULL, 28, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(36, 3, 'CHAR_029', '바람격투가', NULL, 29, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(37, 3, 'CHAR_030', '바람소환사', NULL, 30, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(38, 3, 'CHAR_031', '대지검사', NULL, 31, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(39, 3, 'CHAR_032', '대지궁수', NULL, 32, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(40, 3, 'CHAR_033', '대지마법사', NULL, 33, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(41, 3, 'CHAR_034', '대지기사', NULL, 34, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(42, 3, 'CHAR_035', '대지도적', NULL, 35, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(43, 3, 'CHAR_036', '대지사제', NULL, 36, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(44, 3, 'CHAR_037', '대지정령사', NULL, 37, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(45, 3, 'CHAR_038', '대지창술사', NULL, 38, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(46, 3, 'CHAR_039', '대지격투가', NULL, 39, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(47, 3, 'CHAR_040', '대지소환사', NULL, 40, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(48, 3, 'CHAR_041', '빛의검사', NULL, 41, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(49, 3, 'CHAR_042', '빛의궁수', NULL, 42, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(50, 3, 'CHAR_043', '빛의마법사', NULL, 43, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(51, 3, 'CHAR_044', '빛의기사', NULL, 44, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(52, 3, 'CHAR_045', '빛의도적', NULL, 45, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(53, 3, 'CHAR_046', '빛의사제', NULL, 46, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(54, 3, 'CHAR_047', '빛의정령사', NULL, 47, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(55, 3, 'CHAR_048', '빛의창술사', NULL, 48, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(56, 3, 'CHAR_049', '빛의격투가', NULL, 49, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(57, 3, 'CHAR_050', '빛의소환사', NULL, 50, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(58, 3, 'CHAR_051', '어둠의검사', NULL, 51, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(59, 3, 'CHAR_052', '어둠의궁수', NULL, 52, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(60, 3, 'CHAR_053', '어둠의마법사', NULL, 53, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(61, 3, 'CHAR_054', '어둠의기사', NULL, 54, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(62, 3, 'CHAR_055', '어둠의도적', NULL, 55, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(63, 3, 'CHAR_056', '어둠의사제', NULL, 56, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(64, 3, 'CHAR_057', '어둠의정령사', NULL, 57, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(65, 3, 'CHAR_058', '어둠의창술사', NULL, 58, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(66, 3, 'CHAR_059', '어둠의격투가', NULL, 59, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(67, 3, 'CHAR_060', '어둠의소환사', NULL, 60, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(68, 3, 'CHAR_061', '강철검사', NULL, 61, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(69, 3, 'CHAR_062', '강철궁수', NULL, 62, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(70, 3, 'CHAR_063', '강철마법사', NULL, 63, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(71, 3, 'CHAR_064', '강철기사', NULL, 64, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(72, 3, 'CHAR_065', '강철도적', NULL, 65, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(73, 3, 'CHAR_066', '강철사제', NULL, 66, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(74, 3, 'CHAR_067', '강철정령사', NULL, 67, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(75, 3, 'CHAR_068', '강철창술사', NULL, 68, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(76, 3, 'CHAR_069', '강철격투가', NULL, 69, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(77, 3, 'CHAR_070', '강철소환사', NULL, 70, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(78, 3, 'CHAR_071', '황금검사', NULL, 71, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(79, 3, 'CHAR_072', '황금궁수', NULL, 72, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(80, 3, 'CHAR_073', '황금마법사', NULL, 73, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(81, 3, 'CHAR_074', '황금기사', NULL, 74, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(82, 3, 'CHAR_075', '황금도적', NULL, 75, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(83, 3, 'CHAR_076', '황금사제', NULL, 76, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(84, 3, 'CHAR_077', '황금정령사', NULL, 77, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(85, 3, 'CHAR_078', '황금창술사', NULL, 78, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(86, 3, 'CHAR_079', '황금격투가', NULL, 79, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(87, 3, 'CHAR_080', '황금소환사', NULL, 80, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(88, 3, 'CHAR_081', '폭풍검사', NULL, 81, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(89, 3, 'CHAR_082', '폭풍궁수', NULL, 82, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(90, 3, 'CHAR_083', '폭풍마법사', NULL, 83, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(91, 3, 'CHAR_084', '폭풍기사', NULL, 84, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(92, 3, 'CHAR_085', '폭풍도적', NULL, 85, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(93, 3, 'CHAR_086', '폭풍사제', NULL, 86, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(94, 3, 'CHAR_087', '폭풍정령사', NULL, 87, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(95, 3, 'CHAR_088', '폭풍창술사', NULL, 88, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(96, 3, 'CHAR_089', '폭풍격투가', NULL, 89, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(97, 3, 'CHAR_090', '폭풍소환사', NULL, 90, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(98, 3, 'CHAR_091', '서리검사', NULL, 91, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(99, 3, 'CHAR_092', '서리궁수', NULL, 92, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(100, 3, 'CHAR_093', '서리마법사', NULL, 93, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(101, 3, 'CHAR_094', '서리기사', NULL, 94, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(102, 3, 'CHAR_095', '서리도적', NULL, 95, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(103, 3, 'CHAR_096', '서리사제', NULL, 96, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(104, 3, 'CHAR_097', '서리정령사', NULL, 97, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(105, 3, 'CHAR_098', '서리창술사', NULL, 98, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(106, 3, 'CHAR_099', '서리격투가', NULL, 99, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(107, 3, 'CHAR_100', '서리소환사', NULL, 100, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(108, 3, 'ITEM_001', '낡은 검', NULL, 101, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(109, 3, 'ITEM_002', '낡은 방패', NULL, 102, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(110, 3, 'ITEM_003', '낡은 활', NULL, 103, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(111, 3, 'ITEM_004', '낡은 지팡이', NULL, 104, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(112, 3, 'ITEM_005', '낡은 갑옷', NULL, 105, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(113, 3, 'ITEM_006', '낡은 투구', NULL, 106, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(114, 3, 'ITEM_007', '낡은 장갑', NULL, 107, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(115, 3, 'ITEM_008', '낡은 부츠', NULL, 108, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(116, 3, 'ITEM_009', '낡은 반지', NULL, 109, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(117, 3, 'ITEM_010', '낡은 목걸이', NULL, 110, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(118, 3, 'ITEM_011', '초급 검', NULL, 111, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(119, 3, 'ITEM_012', '초급 방패', NULL, 112, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(120, 3, 'ITEM_013', '초급 활', NULL, 113, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(121, 3, 'ITEM_014', '초급 지팡이', NULL, 114, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(122, 3, 'ITEM_015', '초급 갑옷', NULL, 115, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(123, 3, 'ITEM_016', '초급 투구', NULL, 116, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(124, 3, 'ITEM_017', '초급 장갑', NULL, 117, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(125, 3, 'ITEM_018', '초급 부츠', NULL, 118, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(126, 3, 'ITEM_019', '초급 반지', NULL, 119, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(127, 3, 'ITEM_020', '초급 목걸이', NULL, 120, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(128, 3, 'ITEM_021', '중급 검', NULL, 121, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(129, 3, 'ITEM_022', '중급 방패', NULL, 122, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(130, 3, 'ITEM_023', '중급 활', NULL, 123, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(131, 3, 'ITEM_024', '중급 지팡이', NULL, 124, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(132, 3, 'ITEM_025', '중급 갑옷', NULL, 125, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(133, 3, 'ITEM_026', '중급 투구', NULL, 126, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(134, 3, 'ITEM_027', '중급 장갑', NULL, 127, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(135, 3, 'ITEM_028', '중급 부츠', NULL, 128, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(136, 3, 'ITEM_029', '중급 반지', NULL, 129, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(137, 3, 'ITEM_030', '중급 목걸이', NULL, 130, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(138, 3, 'ITEM_031', '고급 검', NULL, 131, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(139, 3, 'ITEM_032', '고급 방패', NULL, 132, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(140, 3, 'ITEM_033', '고급 활', NULL, 133, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(141, 3, 'ITEM_034', '고급 지팡이', NULL, 134, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(142, 3, 'ITEM_035', '고급 갑옷', NULL, 135, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(143, 3, 'ITEM_036', '고급 투구', NULL, 136, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(144, 3, 'ITEM_037', '고급 장갑', NULL, 137, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(145, 3, 'ITEM_038', '고급 부츠', NULL, 138, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(146, 3, 'ITEM_039', '고급 반지', NULL, 139, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(147, 3, 'ITEM_040', '고급 목걸이', NULL, 140, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(148, 3, 'ITEM_041', '희귀 검', NULL, 141, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(149, 3, 'ITEM_042', '희귀 방패', NULL, 142, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(150, 3, 'ITEM_043', '희귀 활', NULL, 143, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(151, 3, 'ITEM_044', '희귀 지팡이', NULL, 144, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(152, 3, 'ITEM_045', '희귀 갑옷', NULL, 145, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(153, 3, 'ITEM_046', '희귀 투구', NULL, 146, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(154, 3, 'ITEM_047', '희귀 장갑', NULL, 147, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(155, 3, 'ITEM_048', '희귀 부츠', NULL, 148, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(156, 3, 'ITEM_049', '희귀 반지', NULL, 149, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(157, 3, 'ITEM_050', '희귀 목걸이', NULL, 150, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(158, 3, 'ITEM_051', '영웅 검', NULL, 151, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(159, 3, 'ITEM_052', '영웅 방패', NULL, 152, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(160, 3, 'ITEM_053', '영웅 활', NULL, 153, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(161, 3, 'ITEM_054', '영웅 지팡이', NULL, 154, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(162, 3, 'ITEM_055', '영웅 갑옷', NULL, 155, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(163, 3, 'ITEM_056', '영웅 투구', NULL, 156, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(164, 3, 'ITEM_057', '영웅 장갑', NULL, 157, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(165, 3, 'ITEM_058', '영웅 부츠', NULL, 158, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(166, 3, 'ITEM_059', '영웅 반지', NULL, 159, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(167, 3, 'ITEM_060', '영웅 목걸이', NULL, 160, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(168, 3, 'ITEM_061', '전설의 검', NULL, 161, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(169, 3, 'ITEM_062', '전설의 방패', NULL, 162, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(170, 3, 'ITEM_063', '전설의 활', NULL, 163, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(171, 3, 'ITEM_064', '전설의 지팡이', NULL, 164, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(172, 3, 'ITEM_065', '전설의 갑옷', NULL, 165, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(173, 3, 'ITEM_066', '전설의 투구', NULL, 166, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(174, 3, 'ITEM_067', '전설의 장갑', NULL, 167, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(175, 3, 'ITEM_068', '전설의 부츠', NULL, 168, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(176, 3, 'ITEM_069', '전설의 반지', NULL, 169, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(177, 3, 'ITEM_070', '전설의 목걸이', NULL, 170, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(178, 3, 'ITEM_071', '신화의 검', NULL, 171, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(179, 3, 'ITEM_072', '신화의 방패', NULL, 172, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(180, 3, 'ITEM_073', '신화의 활', NULL, 173, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(181, 3, 'ITEM_074', '신화의 지팡이', NULL, 174, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(182, 3, 'ITEM_075', '신화의 갑옷', NULL, 175, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(183, 3, 'ITEM_076', '신화의 투구', NULL, 176, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(184, 3, 'ITEM_077', '신화의 장갑', NULL, 177, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(185, 3, 'ITEM_078', '신화의 부츠', NULL, 178, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(186, 3, 'ITEM_079', '신화의 반지', NULL, 179, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(187, 3, 'ITEM_080', '신화의 목걸이', NULL, 180, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(188, 3, 'ITEM_081', '축복받은 검', NULL, 181, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(189, 3, 'ITEM_082', '축복받은 방패', NULL, 182, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(190, 3, 'ITEM_083', '축복받은 활', NULL, 183, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(191, 3, 'ITEM_084', '축복받은 지팡이', NULL, 184, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(192, 3, 'ITEM_085', '축복받은 갑옷', NULL, 185, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(193, 3, 'ITEM_086', '축복받은 투구', NULL, 186, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(194, 3, 'ITEM_087', '축복받은 장갑', NULL, 187, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(195, 3, 'ITEM_088', '축복받은 부츠', NULL, 188, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(196, 3, 'ITEM_089', '축복받은 반지', NULL, 189, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(197, 3, 'ITEM_090', '축복받은 목걸이', NULL, 190, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(198, 3, 'ITEM_091', '저주받은 검', NULL, 191, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(199, 3, 'ITEM_092', '저주받은 방패', NULL, 192, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(200, 3, 'ITEM_093', '저주받은 활', NULL, 193, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(201, 3, 'ITEM_094', '저주받은 지팡이', NULL, 194, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(202, 3, 'ITEM_095', '저주받은 갑옷', NULL, 195, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(203, 3, 'ITEM_096', '저주받은 투구', NULL, 196, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(204, 3, 'ITEM_097', '저주받은 장갑', NULL, 197, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(205, 3, 'ITEM_098', '저주받은 부츠', NULL, 198, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(206, 3, 'ITEM_099', '저주받은 반지', NULL, 199, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58'),
(207, 3, 'ITEM_100', '저주받은 목걸이', NULL, 200, 1, 1, NULL, '2026-07-13 21:48:58', '2026-07-13 21:48:58');
SET FOREIGN_KEY_CHECKS = 1;
-- ------------------------------------------------------------------------------------------------------------ --
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
-- ------------------------------------------------------------------------------------------------------------ --
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
(1, 1, 'ADMIN_PROJECT', 'Administrator Company Default Project', 'http://127.0.0.1:3000', NULL, 1, '1970-01-01 00:00:00', '1970-01-01 00:00:00'),
(2, 2, 'DEV_PROJECT',   'Developer Company Default Project',     'http://127.0.0.1:3100', NULL, 1, '1970-01-01 00:00:00', '1970-01-01 00:00:00');
SET FOREIGN_KEY_CHECKS = 1;
-- ------------------------------------------------------------------------------------------------------------ --
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
  `phone_number`			VARCHAR(255)			NOT NULL															COMMENT '휴대폰 번호(AES-256 암호화(Base64))',
  `department`				VARCHAR(100)																				COMMENT '부서',
  `position`				VARCHAR(100)																				COMMENT '직급',
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
INSERT INTO `user` (`user_id`, `company_id`, `requested_project_id`, `login_id`, `password_hash`, `user_name`, `email`, `phone_number`, `department`, `position`, `status`, `created_at`, `updated_at`)
VALUES
(1, 1, 1, 'sa',  '$2b$12$P9T8Tsrnvqw7RX4e/UxQHuqjD6qEe7SJ7cYSBBf2HY1bTt5iV0BoG', 'Super Admin', 'sa@example.com',  'eRg8JBUWcUQIS1shLxDl0FWbTHse5r89UAQNuHaOvlM=', NULL, NULL, 1, '1970-01-01 00:00:00', '1970-01-01 00:00:00'),
(2, 2, 2, 'dev', '$2b$12$F6tSaPz673OpLoLtGwJuceez38jfCV79KGRv/vk3FSkiDKVngM.zK',  'Developer',   'dev@example.com', 'hGDCE5Mm4Jz8hFmeSRr3NV3ufhBV2WNlrNkWL47Ducs=', NULL, NULL, 1, '1970-01-01 00:00:00', '1970-01-01 00:00:00'),
(3, 2, 2, 'apv', '$2b$12$kIHtGsC1nrUxKcooDXyHhe9LREZPM4Q6v5N4VSwrYrfF7qCD61WaC',  'Approver',    'apv@example.com', 'GtLBEsDzxdysfzYqeirPGQ7l5425Ci5AungiZiY/rJk=', NULL, NULL, 1, '1970-01-01 00:00:00', '1970-01-01 00:00:00'),
(4, 2, 2, 'op',  '$2b$12$uEM0RqK8zY/r4S2EmmPCEu7PNfMAdWKA3fwFWUMCc4.Ydcx2q926.',  'Operator',    'op@example.com',  '/NyNJa60h1OdDaScrSwbgL2/B0BcqqZMtmN9g8EX6gQ=', NULL, NULL, 1, '1970-01-01 00:00:00', '1970-01-01 00:00:00');
SET FOREIGN_KEY_CHECKS = 1;
-- ------------------------------------------------------------------------------------------------------------ --
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
-- ------------------------------------------------------------------------------------------------------------ --
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