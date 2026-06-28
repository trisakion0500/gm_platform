import log4js from 'log4js';

const isProd = process.env.NODE_ENV === 'production';

log4js.configure({
  appenders: {
    console: {
      type: 'console',
      layout: {
        type: 'pattern',
        pattern: '[%d{yyyy-MM-ddThh:mm:ss}] [%p] %c - %m',
      },
    },
    file: {
      type: 'dateFile',
      filename: 'logs/app.log',
      pattern: 'yyyy-MM-dd',
      keepFileExt: true,
      layout: {
        type: 'pattern',
        pattern: '[%d{yyyy-MM-ddThh:mm:ss}] [%p] %c - %m',
      },
    },
  },
  categories: {
    default: {
      appenders: ['console', 'file'],
      level: isProd ? 'info' : 'debug',
    },
  },
});

const logger = log4js.getLogger('app');

export default logger;
