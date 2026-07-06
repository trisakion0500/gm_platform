// login_id/company_code/project_code/api_code 공통 문자셋 검증 정규식

export const CODE_PATTERN = /^[a-zA-Z0-9_.-]+$/;
export const CODE_PATTERN_MESSAGE = '영문, 숫자, _, ., - 만 사용할 수 있습니다.';

// api_code는 길이(최대 50자)를 정규식에 직접 포함해 별도 max 규칙 없이 검증
export const API_CODE_PATTERN = /^[a-zA-Z0-9_.-]{1,50}$/;
export const API_CODE_PATTERN_MESSAGE = '영문, 숫자, _, ., - 만 사용할 수 있습니다(최대 50자).';
