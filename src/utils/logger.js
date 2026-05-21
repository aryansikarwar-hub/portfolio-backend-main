import winston from 'winston'

const { combine, timestamp, errors, splat, json, colorize, printf } = winston.format

const devFormat = printf(({ level, message, timestamp: ts, stack, ...rest }) => {
    const meta = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : ''
    return `${ts} ${level} ${stack || message}${meta}`
})

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    format: combine(timestamp(), errors({ stack: true }), splat()),
    defaultMeta: { service: 'portfolio-api' },
    transports: [
        new winston.transports.Console({
            format:
                process.env.NODE_ENV === 'production'
                    ? json()
                    : combine(colorize(), timestamp({ format: 'HH:mm:ss' }), devFormat),
        }),
    ],
    exitOnError: false,
})

// Convenience stream for morgan
export const httpStream = {
    write: (line) => logger.http ? logger.http(line.trim()) : logger.info(line.trim()),
}
