import mongoose from 'mongoose'
import { env, isProd } from './env.js'
import { logger } from '../utils/logger.js'

mongoose.set('strictQuery', true)

let isConnected = false

export async function connectDB() {
    if (isConnected) return mongoose.connection

    try {
        await mongoose.connect(env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10_000,
            maxPoolSize: 10,
            // Only auto-build indexes outside production; in production we
            // create them up front during deploys or via syncIndexes().
            autoIndex: !isProd,
        })
        isConnected = true
        logger.info(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`)
    } catch (err) {
        logger.error('MongoDB connection failed:', err)
        // Don't swallow — let the caller decide (server.js will exit).
        throw err
    }

    mongoose.connection.on('disconnected', () => {
        isConnected = false
        logger.warn('MongoDB disconnected')
    })

    mongoose.connection.on('reconnected', () => {
        isConnected = true
        logger.info('MongoDB reconnected')
    })

    return mongoose.connection
}

export async function disconnectDB() {
    if (!isConnected) return
    await mongoose.disconnect()
    isConnected = false
    logger.info('MongoDB disconnected cleanly')
}
