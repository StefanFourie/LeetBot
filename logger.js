const winston = require('winston');
const { format, transports, createLogger } = winston;
const { combine, colorize, timestamp, printf } = format;

// Log levels, from highest to lowest prio
// { 
//   error: 0, 
//   warn: 1, 
//   info: 2, 
//   http: 3,
//   verbose: 4, 
//   debug: 5, 
//   silly: 6 
// }

const myFormatConsole = combine(
    format(info => {
        info.level = info.level.toUpperCase();
        return info;
    })(),
    colorize(),
    timestamp(),
    // align(),
    printf(info => `${info.timestamp} | ${info.level} | ${info.message}`)
);

const logger = createLogger({
    // level: 'info',
    // format: myFormatConsole,
    transports: [
        new transports.Console({
            level: process.env.LEVEL || 'info',
            format: myFormatConsole
        }),
        new winston.transports.File({
            filename: './log/error.log',
            level: 'error'
        })
    ]
});

module.exports = logger;