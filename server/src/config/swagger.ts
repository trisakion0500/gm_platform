import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';

const isTs = __filename.endsWith('.ts');

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'GM Platform API',
      version: '1.0.0',
      description:
        'GM Platform 백엔드 REST API 명세서\n\n' +
        '로그인 후 발급받은 `access_token`을 우측 상단 **Authorize** 버튼에 입력하면\n' +
        '인증이 필요한 API를 직접 테스트할 수 있습니다.',
    },
    servers: [{ url: '/api', description: '기본 서버' }],
    tags: [
      { name: 'Health',       description: '서버 상태' },
      { name: 'Auth',         description: '인증 — 로그인, 토큰, 세션' },
      { name: 'Company',      description: '회사 관리' },
      { name: 'Project',      description: '프로젝트 관리' },
      { name: 'User',         description: '사용자 관리' },
      { name: 'UserRole',     description: '사용자 역할 관리' },
      { name: 'CodeGroup',    description: '공통 코드 그룹' },
      { name: 'CodeItem',     description: '공통 코드 아이템' },
      { name: 'Api',          description: 'API 정의' },
      { name: 'ApiRequest',   description: 'API 요청 파라미터' },
      { name: 'ApiResponse',  description: 'API 응답 파라미터' },
      { name: 'ApiExecution', description: 'API 실행 및 승인 워크플로우' },
      { name: 'LogAudit',     description: '감사 로그' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'POST /auth/login 응답의 access_token 값을 입력하세요.',
        },
      },
      responses: {
        Unauthorized: {
          description: '인증 실패',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: { result: 10004, message: '인증이 필요합니다.' },
            },
          },
        },
        Forbidden: {
          description: '권한 없음',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: { result: 20001, message: '권한이 없습니다.' },
            },
          },
        },
        BadRequest: {
          description: '잘못된 요청',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        NotFound: {
          description: '리소스 없음',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            result:  { type: 'integer', description: '오류 코드', example: 30001 },
            message: { type: 'string',  description: '오류 메시지', example: '필수 입력값이 누락되었습니다.' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total:       { type: 'integer', example: 42 },
            page:        { type: 'integer', example: 1 },
            page_size:   { type: 'integer', example: 20 },
            total_pages: { type: 'integer', example: 3 },
          },
        },
        Company: {
          type: 'object',
          properties: {
            company_id:   { type: 'integer', example: 1 },
            company_code: { type: 'string',  example: 'COMPANY_A' },
            company_name: { type: 'string',  example: '회사A' },
            description:  { type: 'string',  nullable: true, example: '게임 회사' },
            status:       { type: 'integer', description: '1=사용, 0=중지', example: 1 },
            created_at:   { type: 'string',  format: 'date-time', example: '2025-01-01 00:00:00' },
            updated_at:   { type: 'string',  format: 'date-time', example: '2025-01-01 00:00:00' },
          },
        },
        Project: {
          type: 'object',
          properties: {
            project_id:   { type: 'integer', example: 1 },
            company_id:   { type: 'integer', example: 1 },
            company_code: { type: 'string',  example: 'COMPANY_A' },
            company_name: { type: 'string',  example: '회사A' },
            project_code: { type: 'string',  example: 'PROJECT_A' },
            project_name: { type: 'string',  example: '프로젝트A' },
            api_base_url: { type: 'string',  example: 'https://api.project-a.com' },
            description:  { type: 'string',  nullable: true, example: '2D 횡스크롤 MMORPG' },
            status:       { type: 'integer', description: '1=사용, 0=중지', example: 1 },
            created_at:   { type: 'string',  format: 'date-time', example: '2025-01-01 00:00:00' },
            updated_at:   { type: 'string',  format: 'date-time', example: '2025-01-01 00:00:00' },
          },
        },
        User: {
          type: 'object',
          properties: {
            user_id:              { type: 'integer', example: 1 },
            company_id:           { type: 'integer', example: 1 },
            company_code:         { type: 'string',  example: 'COMPANY_A' },
            company_name:         { type: 'string',  example: '회사A' },
            requested_project_id: { type: 'integer', nullable: true, example: null },
            login_id:             { type: 'string',  example: 'john' },
            user_name:            { type: 'string',  example: '홍길동' },
            email:                { type: 'string',  format: 'email', example: 'john@example.com' },
            status:               { type: 'integer', description: '0=가입승인대기, 1=정상, 2=가입반려, 3=사용중지', example: 1 },
            role_code:            { type: 'integer', description: '10=SUPER_ADMIN, 20=DEVELOPER, 30=APPROVER, 40=OPERATOR', example: 20 },
            last_login_at:        { type: 'string',  format: 'date-time', nullable: true, example: '2025-01-01 12:00:00' },
            created_at:           { type: 'string',  format: 'date-time', example: '2025-01-01 00:00:00' },
            updated_at:           { type: 'string',  format: 'date-time', example: '2025-01-01 00:00:00' },
          },
        },
        UserRole: {
          type: 'object',
          properties: {
            user_id:      { type: 'integer', example: 2 },
            login_id:     { type: 'string',  example: 'john' },
            user_name:    { type: 'string',  example: '홍길동' },
            project_id:   { type: 'integer', example: 1 },
            project_code: { type: 'string',  example: 'PROJECT_A' },
            project_name: { type: 'string',  example: '프로젝트A' },
            role_code:    { type: 'integer', description: '20=DEVELOPER, 30=APPROVER, 40=OPERATOR', example: 20 },
            status:       { type: 'integer', description: '1=사용, 0=중지', example: 1 },
            created_at:   { type: 'string',  format: 'date-time', example: '2025-01-01 00:00:00' },
            updated_at:   { type: 'string',  format: 'date-time', example: '2025-01-01 00:00:00' },
          },
        },
        CodeGroup: {
          type: 'object',
          properties: {
            code_group_id:   { type: 'integer', example: 1 },
            project_id:      { type: 'integer', example: 1 },
            code_group_code: { type: 'string',  example: 'GENDER' },
            code_group_name: { type: 'string',  example: '성별' },
            description:     { type: 'string',  nullable: true, example: '성별 코드' },
            status:          { type: 'integer', description: '1=사용, 0=중지', example: 1 },
            created_by:      { type: 'integer', example: 1 },
            updated_by:      { type: 'integer', example: 1 },
            created_at:      { type: 'string',  format: 'date-time', example: '2025-01-01 00:00:00' },
            updated_at:      { type: 'string',  format: 'date-time', example: '2025-01-01 00:00:00' },
          },
        },
        CodeItem: {
          type: 'object',
          properties: {
            code_item_id:  { type: 'integer', example: 1 },
            code_group_id: { type: 'integer', example: 1 },
            code_value:    { type: 'string',  example: 'M' },
            code_name:     { type: 'string',  example: '남성' },
            description:   { type: 'string',  nullable: true, example: null },
            display_order: { type: 'integer', example: 1 },
            status:        { type: 'integer', description: '1=사용, 0=중지', example: 1 },
            created_by:    { type: 'integer', example: 1 },
            updated_by:    { type: 'integer', example: 1 },
            created_at:    { type: 'string',  format: 'date-time', example: '2025-01-01 00:00:00' },
            updated_at:    { type: 'string',  format: 'date-time', example: '2025-01-01 00:00:00' },
          },
        },
        ActiveCodeItem: {
          type: 'object',
          properties: {
            code_value: { type: 'string', example: 'M' },
            code_name:  { type: 'string', example: '남성' },
          },
        },
        Api: {
          type: 'object',
          properties: {
            api_id:                { type: 'integer', example: 1 },
            project_id:            { type: 'integer', example: 1 },
            api_code:              { type: 'string',  example: 'GIVE_ITEM' },
            api_name:              { type: 'string',  example: '아이템 지급' },
            endpoint:              { type: 'string',  example: '/v1/game/give-item' },
            description:           { type: 'string',  nullable: true, example: '캐릭터에 아이템을 직접 지급한다.' },
            api_stage:             { type: 'integer', description: '20=개발, 30=스테이징, 40=운영', example: 20 },
            is_required_approval:  { type: 'integer', description: '0=즉시실행, 1=승인필요', example: 1 },
            response_view_type:    { type: 'integer', description: '1=KEY_VALUE, 2=GRID', example: 1 },
            status:                { type: 'integer', description: '1=사용, 0=중지', example: 1 },
            display_order:         { type: 'integer', example: 1 },
            created_by:            { type: 'integer', example: 1 },
            updated_by:            { type: 'integer', example: 1 },
            created_at:            { type: 'string',  format: 'date-time', example: '2025-01-01 00:00:00' },
            updated_at:            { type: 'string',  format: 'date-time', example: '2025-01-01 00:00:00' },
          },
        },
        ApiDetail: {
          allOf: [
            { $ref: '#/components/schemas/Api' },
            {
              type: 'object',
              properties: {
                requests: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/ApiRequestParam' },
                },
                responses: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/ApiResponseParam' },
                },
              },
            },
          ],
        },
        ApiRequestParam: {
          type: 'object',
          properties: {
            api_request_id:  { type: 'integer', example: 1 },
            api_id:          { type: 'integer', example: 1 },
            parameter_name:  { type: 'string',  example: 'character_id' },
            parameter_label: { type: 'string',  example: '캐릭터 ID' },
            parameter_type:  { type: 'integer', description: '1=STRING, 2=NUMBER, 3=BOOLEAN, 4=DATE, 5=DATETIME, 6=JSON', example: 2 },
            component_type:  { type: 'integer', description: '1=TEXT, 2=NUMBER, 3=DATE, 4=DATETIME, 5=SELECT, 6=RADIO, 7=CHECKBOX', example: 2 },
            code_group_id:   { type: 'integer', description: '0=사용안함', example: 0 },
            is_required:     { type: 'integer', description: '0=선택, 1=필수', example: 1 },
            description:     { type: 'string',  nullable: true, example: null },
            display_order:   { type: 'integer', example: 1 },
            status:          { type: 'integer', description: '1=사용, 0=중지', example: 1 },
            created_by:      { type: 'integer', example: 1 },
            updated_by:      { type: 'integer', example: 1 },
            created_at:      { type: 'string',  format: 'date-time', example: '2025-01-01 00:00:00' },
            updated_at:      { type: 'string',  format: 'date-time', example: '2025-01-01 00:00:00' },
          },
        },
        ApiResponseParam: {
          type: 'object',
          properties: {
            api_response_id: { type: 'integer', example: 1 },
            api_id:          { type: 'integer', example: 1 },
            parameter_name:  { type: 'string',  example: 'result_code' },
            parameter_label: { type: 'string',  example: '결과 코드' },
            parameter_type:  { type: 'integer', description: '1=STRING, 2=NUMBER, 3=BOOLEAN, 4=DATE, 5=DATETIME, 6=JSON', example: 2 },
            code_group_id:   { type: 'integer', description: '0=사용안함', example: 0 },
            description:     { type: 'string',  nullable: true, example: null },
            display_order:   { type: 'integer', example: 1 },
            status:          { type: 'integer', description: '1=사용, 0=중지', example: 1 },
            created_by:      { type: 'integer', example: 1 },
            updated_by:      { type: 'integer', example: 1 },
            created_at:      { type: 'string',  format: 'date-time', example: '2025-01-01 00:00:00' },
            updated_at:      { type: 'string',  format: 'date-time', example: '2025-01-01 00:00:00' },
          },
        },
        ApiExecution: {
          type: 'object',
          properties: {
            api_execution_id: { type: 'integer', example: 1 },
            api_id:           { type: 'integer', example: 1 },
            api_name:         { type: 'string',  example: '아이템 지급' },
            endpoint:         { type: 'string',  example: '/v1/game/give-item' },
            request_user_id:  { type: 'integer', example: 2 },
            approve_user_id:  { type: 'integer', nullable: true, example: null },
            status:           { type: 'integer', description: '10=PENDING, 20=APPROVED, 30=REJECTED, 40=SUCCESS, 50=FAILED, 60=CANCELED', example: 10 },
            reject_reason:    { type: 'string',  nullable: true, example: null },
            error_message:    { type: 'string',  nullable: true, example: null },
            requested_at:     { type: 'string',  format: 'date-time', example: '2025-01-01 12:00:00' },
            approved_at:      { type: 'string',  format: 'date-time', nullable: true, example: null },
            executed_at:      { type: 'string',  format: 'date-time', nullable: true, example: null },
            updated_at:       { type: 'string',  format: 'date-time', example: '2025-01-01 12:00:00' },
          },
        },
        ApiExecutionDetail: {
          allOf: [
            { $ref: '#/components/schemas/ApiExecution' },
            {
              type: 'object',
              properties: {
                request_json:  { type: 'string', description: '요청 파라미터 JSON', example: '{"character_id":12345}' },
                response_data: { type: 'string', nullable: true, description: '응답 데이터 JSON', example: '{"result":0}' },
              },
            },
          ],
        },
        LogAudit: {
          type: 'object',
          properties: {
            log_audit_id: { type: 'integer', example: 1 },
            company_id:   { type: 'integer', example: 1 },
            project_id:   { type: 'integer', nullable: true, example: null },
            table_name:   { type: 'string',  example: 'company' },
            target_id:    { type: 'string',  example: '1' },
            target_name:  { type: 'string',  example: '회사A' },
            action_type:  { type: 'integer', description: '10=CREATE, 20=UPDATE, 30=STATUS_CHANGE', example: 10 },
            created_by:   { type: 'integer', example: 1 },
            created_at:   { type: 'string',  format: 'date-time', example: '2025-01-01 12:00:00' },
          },
        },
        LogAuditDetail: {
          allOf: [
            { $ref: '#/components/schemas/LogAudit' },
            {
              type: 'object',
              properties: {
                before_json: { type: 'string', nullable: true, description: '변경 전 데이터 JSON', example: null },
                after_json:  { type: 'string', description: '변경 후 데이터 JSON', example: '{"company_name":"회사A"}' },
              },
            },
          ],
        },
      },
    },
  },
  apis: [
    path.join(__dirname, '..', 'routes', isTs ? '*.ts' : '*.js'),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
