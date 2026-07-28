import log4js from 'log4js';

const isProd = process.env.NODE_ENV === 'production';

// 같은 VM/컨테이너에서 여러 인스턴스를 띄우면 cwd가 같아 상대경로 'logs/app.log'가 물리적으로
// 겹친다(다른 VM/컨테이너는 파일시스템 자체가 분리돼 원래도 안 겹침). Node의 cluster 모듈(및 이를
// 내부적으로 쓰는 PM2 cluster mode)로 띄운 워커는 이 문제를 log4js가 이미 자체 처리한다 —
// log4js는 cluster 워커에서 실행되면 file 계열 appender를 아예 비활성화(no-op)하고 로그를
// IPC(process.send)로 primary에만 전달, primary만 실제 파일을 쓴다(node_modules/log4js/lib/
// clustering.js — appenders/index.js의 clustering.onlyOnMaster 참고, 직접 소스 확인 및
// cluster.fork()로 재현 테스트해 검증함). 그래서 워커별 파일명을 따로 줄 필요도, 효과도 없다.
// 반대로 PM2 fork mode에서 인스턴스를 여러 개(-i N) 띄우면 각 인스턴스가 전부 독립된 프로세스라
// (Node cluster 워커가 아님) 위 IPC 병합이 적용되지 않아 그대로 파일이 겹친다 — 이 경우만
// PM2가 인스턴스마다 심어주는 NODE_APP_INSTANCE 환경변수로 접미사를 붙여 분리한다. 둘 다 없으면
// (일반 단일 프로세스 — 개발 환경, 단일 인스턴스 배포) 접미사 없이 기존과 동일한 파일명을 쓴다.
const instanceId = process.env.NODE_APP_INSTANCE;
const instanceSuffix = instanceId !== undefined ? `-${instanceId}` : '';

const layout = {
  type: 'pattern',
  pattern: '[%d{yyyy-MM-ddThh:mm:ss}] [%p] %c - %m',
};

log4js.configure({
  appenders: {
    console: { type: 'console', layout },
    file: {
      type: 'dateFile',
      filename: `logs/app${instanceSuffix}.log`,
      pattern: 'yyyy-MM-dd',
      keepFileExt: true,
      layout,
    },
    errorFile: {
      type: 'dateFile',
      filename: `logs/error${instanceSuffix}.log`,
      pattern: 'yyyy-MM-dd',
      keepFileExt: true,
      layout,
    },
    errorOnly: {
      type: 'logLevelFilter',
      appender: 'errorFile',
      level: 'error',
    },
  },
  categories: {
    default: {
      appenders: ['console', 'file', 'errorOnly'],
      level: isProd ? 'info' : 'debug',
    },
  },
});
