import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

// Config
dotenv.config()
import { initializeDatabase, initializeSchedulers } from './config/database'
import { corsOptions, apiCorsOptions } from './config/cors'

// Middleware
import { requestLogger, protectApiEndpoints } from './middleware/security'

// Routes
import routes from './routes'
import { queueService } from './services/queueService'
import { ApiKeyManager } from './utils/apiKeyManager'

const app = express()
const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || 'localhost'

// Initialize database and schedulers
initializeDatabase()
  .then(() => {
    console.log('✅ База данных инициализирована')

    // Инициализация планировщиков после успешного подключения к БД
    initializeSchedulers()

    // Initialize API keys from environment

    ApiKeyManager.initializeFromEnv().then(() => {
      ApiKeyManager.showStats()
    })
  })
  .catch(console.error)

// Initialize queue
if (process.env.ALLOW_EXTERNAL_API === 'true') {
  queueService.init()
}

// Middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(requestLogger)

// CORS configuration
app.use('/maps', cors(corsOptions))
app.use('/api', cors(apiCorsOptions))

// Rate limiting
// app.use('/api', rateLimit(15 * 60 * 1000, 1000))

// Security
app.use(protectApiEndpoints)

// Routes
app.use('/', routes)

// Error handling
app.use(
  (
    error: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (error.message === 'CORS: Origin не разрешен') {
      console.warn(
        `🚫 CORS ошибка: ${req.method} ${req.path} from ${req.get('Origin')}`
      )
      return res.status(403).json({
        success: false,
        error: 'Origin not allowed',
        message: 'Ваш домен не имеет доступа к этому API',
      })
    }

    console.error('Необработанная ошибка:', error)
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера',
    })
  }
)

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `Route ${req.method} ${req.path} not found`,
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://${HOST}:${PORT}`)
  console.log(`📍 Режим: ${process.env.NODE_ENV}`)
  console.log(`🗺️  Карты: http://${HOST}:${PORT}/maps/competitors/{guid}`)
  console.log(`🔧 API: http://${HOST}:${PORT}/api/maps/competitors`)
  console.log(`❤️  Health: http://${HOST}:${PORT}/health`)

  if (process.env.NODE_ENV === 'development') {
    console.log(`🧪 Dev: http://${HOST}:${PORT}/dev/maps/test`)
    console.log(`📊 Test Data: http://${HOST}:${PORT}/dev/api/test-data`)
  }
})

export default app
