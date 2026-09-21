const winston = require('winston');

const isProduction = process.env.NODE_ENV === 'production';

const formats = [
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
];

if (isProduction) {
  formats.push(winston.format.json());
} else {
  formats.push(
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
      const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
      return `[${timestamp}] ${level}: ${stack || message}${metaStr}`;
    })
  );
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  format: winston.format.combine(...formats),
  transports: [new winston.transports.Console()],
});

module.exports = logger;
