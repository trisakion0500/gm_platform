import { Router, Request, Response } from 'express';

// API 실행 테스트용 mock 엔드포인트 모음.
// 실제 외부 API들은 모두 { result, message, data: [...] } 봉투를 쓰기로 했으므로 이 형태를 그대로 흉내낸다.
// data는 항상 배열 — response_view_type=KEY_VALUE(1)는 data[0]을 단일 객체로, GRID(2)는 data 전체를 행 목록으로 사용한다.
// 테스트 API가 늘어날 때마다 이 파일에 엔드포인트를 추가한다.

const router = Router();

// api_id 185/186(테스트 API) 전용 — 고정 100행, 필드명(re01~re07)은 두 API의 api_response 정의에 맞춘 것.
router.post('/mock-external', (_req: Request, res: Response) => {
  const data = Array.from({ length: 100 }, (_, i) => {
    const n = i + 1;
    const date = `2026-07-${String((i % 28) + 1).padStart(2, '0')}`;
    return {
      re01: `row-${n}`,
      re07: n % 2 === 0 ? 'M' : 'F',
      re02: n * 10,
      re03: n % 2 === 0,
      re04: date,
      re05: `${date} 09:00:00`,
      re06: `${date} 09:00:00`,
    };
  });
  res.json({ result: 0, message: 'OK', data });
});

// api_id 1(유저검색) 전용 — 응답 필드(uid/name/status/create_at)에 맞춰 8~12건 랜덤 반환.
// status는 code_group_id=1(사용자 상태) 코드값(1:정상, 2:일시중지, 3:탈퇴) 중 랜덤.
const USER_STATUS_CODES = ['1', '2', '3'];
const NAME_SAMPLES = ['용감한전사', '슬픈마법사', '빠른궁수', '조용한도적', '거대한거인', '푸른드래곤', '작은요정', '늙은현자'];

function randomDateTime(): string {
  const year = 2025 + Math.floor(Math.random() * 2);
  const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
  const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
  const hour = String(Math.floor(Math.random() * 24)).padStart(2, '0');
  const minute = String(Math.floor(Math.random() * 60)).padStart(2, '0');
  const second = String(Math.floor(Math.random() * 60)).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

router.post('/mock-user-search', (req: Request, res: Response) => {
  // status 요청 파라미터가 오면 랜덤 대신 그 값으로 고정 — 필터링 동작을 흉내낸다.
  // 단, 0(전체)은 특정 상태로 고정할 대상이 아니므로 미지정과 동일하게 취급해 랜덤(1~3)을 반환한다.
  const requestedStatus = req.body?.status;
  const requestedStatusStr = requestedStatus !== undefined && requestedStatus !== null && requestedStatus !== ''
    ? String(requestedStatus)
    : null;
  const fixedStatus = requestedStatusStr && requestedStatusStr !== '0' ? requestedStatusStr : null;

  const rowCount = 8 + Math.floor(Math.random() * 5); // 8~12건
  const data = Array.from({ length: rowCount }, () => ({
    uid: 10000 + Math.floor(Math.random() * 90000),
    name: NAME_SAMPLES[Math.floor(Math.random() * NAME_SAMPLES.length)],
    status: fixedStatus ?? USER_STATUS_CODES[Math.floor(Math.random() * USER_STATUS_CODES.length)],
    create_at: randomDateTime(),
  }));
  res.json({ result: 0, message: 'OK', data });
});

export default router;
