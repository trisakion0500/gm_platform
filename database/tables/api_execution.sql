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