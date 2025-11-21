import winston from "winston";

export const createLogger = (level: string = "info") => {
  return winston.createLogger({
    level,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.printf(({ timestamp, level, message }) => {
        return `${timestamp} [${level.toUpperCase()}] ${message}`;
      }),
    ),
    transports: [new winston.transports.Console()],
  });
};

export const logger = createLogger();

export const setLogLevel = (level: string) => {
  logger.level = level;
};
