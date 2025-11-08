import { CorsOptions } from 'cors'

// Разрешенные домены
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS

// Базовые настройки CORS
export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Разрешаем запросы без Origin (мобильные приложения, curl и т.д.)
    if (!origin) {
      console.warn('⚠️  Запрос без Origin заголовка')
      return callback(null, true)
    }

    // Проверяем, есть ли origin в разрешенных доменах

    const allowedOrigins = JSON.parse(ALLOWED_ORIGINS as string) as string[]
    const isAllowed = allowedOrigins.some((allowedOrigin) => {
      // Простое сравнение
      if (allowedOrigin === origin) return true

      // Поддержка wildcard для ngrok и других поддоменов
      if (allowedOrigin.includes('*')) {
        const domainPattern = allowedOrigin.replace('*', '.*')
        const regex = new RegExp(`^${domainPattern}$`)
        return !!origin && regex.test(origin)
      }

      return false
    })

    if (isAllowed) {
      callback(null, true)
    } else {
      console.error(`🚫 Заблокирован CORS запрос с origin: ${origin}`)
      callback(new Error('CORS: Origin не разрешен'))
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-API-Key',
    'Origin',
    'Accept',
  ],
  credentials: true,
  maxAge: 86400, // 24 часа
  preflightContinue: false,
  optionsSuccessStatus: 204,
}

// Специальные настройки для API endpoints
export const apiCorsOptions: CorsOptions = {
  ...corsOptions,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}

// Настройки для статических страниц (менее строгие)
export const staticCorsOptions: CorsOptions = {
  ...corsOptions,
  methods: ['GET', 'OPTIONS'],
}

// Функция для получения разрешенных доменов (для логирования)
// export const getAllowedOrigins = (): string[] => {
//   return [...allowedOrigins]
// }
