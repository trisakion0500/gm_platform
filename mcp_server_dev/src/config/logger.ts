import log4js from "log4js";

const isProd = process.env.NODE_ENV === "production";

const layout = {
  type: "pattern",
  pattern: "[%d{yyyy-MM-ddThh:mm:ss}] [%p] %c - %m",
};

// stdio transport에서는 stdout이 MCP JSON-RPC 메시지 전용 채널이라, console 어펜더를 두면
// 로그 출력이 프로토콜 스트림에 섞여 클라이언트(Host)의 파싱이 깨진다 — 파일로만 기록한다.
log4js.configure({
  appenders: {
    file: {
      type: "dateFile",
      filename: "logs/app.log",
      pattern: "yyyy-MM-dd",
      keepFileExt: true,
      layout,
    },
    errorFile: {
      type: "dateFile",
      filename: "logs/error.log",
      pattern: "yyyy-MM-dd",
      keepFileExt: true,
      layout,
    },
    errorOnly: {
      type: "logLevelFilter",
      appender: "errorFile",
      level: "error",
    },
  },
  categories: {
    default: {
      appenders: ["file", "errorOnly"],
      level: isProd ? "info" : "debug",
    },
  },
});
