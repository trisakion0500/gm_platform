import log4js from 'log4js';

const isProd = process.env.NODE_ENV === 'production';

const layout = {
  type: 'pattern',
  pattern: '[%d{yyyy-MM-ddThh:mm:ss}] [%p] %c - %m',
};

log4js.configure({
  appenders: {
    console: { type: 'console', layout },
    file: {
      type: 'dateFile',
      filename: 'logs/app.log',
      pattern: 'yyyy-MM-dd',
      keepFileExt: true,
      layout,
    },
    errorFile: {
      type: 'dateFile',
      filename: 'logs/error.log',
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
