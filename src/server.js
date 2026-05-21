import http from 'node:http'
import app from './app.js'
import { env } from './config/env.js'
import { connectDB, disconnectDB } from './config/db.js'
import { logger } from './utils/logger.js'

let server

async function start() {
    try {
        await connectDB()
    } catch (err) {
        logger.error('Failed to connect to MongoDB on boot — exiting')
        console.error(err)
        process.exit(1)
    }

    server = http.createServer(app)
    server.listen(env.PORT, () => {
        logger.info(`API listening on http://localhost:${env.PORT} [${env.NODE_ENV}]`)
    })

    server.on('error', (err) => {
        logger.error('HTTP server error', { message: err.message })
    })
}

// --- Graceful shutdown ---------------------------------------------------
// PaaS platforms (Render, Railway, Fly, K8s) send SIGTERM on deploy/scale
// down. We stop accepting connections, drain in-flight requests, then close
// the DB. With a 10s safety net so a stuck request can't hang the deploy.

let shuttingDown = false

async function shutdown(signal) {
    if (shuttingDown) return
    shuttingDown = true
    logger.info(`Received ${signal} — shutting down`)

    const force = setTimeout(() => {
        logger.error('Forcing exit after 10s shutdown timeout')
        process.exit(1)
    }, 10_000).unref()

    try {
        if (server) await new Promise(r => server.close(r))
        await disconnectDB()
        clearTimeout(force)
        logger.info('Shutdown complete')
        process.exit(0)
    } catch (err) {
        logger.error('Error during shutdown', { message: err.message })
        process.exit(1)
    }
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason: String(reason) })
})
process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { message: err.message, stack: err.stack })
    // Let the platform restart us; running on after an uncaught is unsafe.
    shutdown('uncaughtException')
})

start()
