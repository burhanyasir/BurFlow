const pino = require("pino");
const IS_PRODUCTION = process.env.NODE_ENV === "production";

const logger = pino({
  name: "BurFlow",
  level: process.env.LOG_LEVEL || (IS_PRODUCTION ? "info" : "debug"),
  transport: IS_PRODUCTION
    ? undefined
    : {
        target: "pino/file",
        options: { destination: 1, colorize: false }
      },
  formatters: {
    level(label) {
      return { level: label };
    }
  },
  timestamp: pino.stdTimeFunctions.isoTime
});

module.exports = logger;
