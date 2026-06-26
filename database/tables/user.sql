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
SET FOREIGN_KEY_CHECKS = 1;