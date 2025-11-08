import { Request, Response, NextFunction } from 'express'

// Белый лист для внутренних сервисов
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS

export interface AuthenticatedRequest extends Request {
  clientInfo?: {
    origin: string
    isInternal: boolean
    ip: string
    userAgent: string
  }
}

// Middleware для логирования и проверки запросов
export const requestLogger = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const origin = req.get('Origin') || 'no-origin'
  const userAgent = req.get('User-Agent') || 'unknown'
  const ip = req.ip || req.socket.remoteAddress || 'unknown'

  console.log(
    `🌐 ${req.method} ${
      req.path
    } | Origin: ${origin} | IP: ${ip} | Agent: ${userAgent.slice(0, 50)}`
  )

  // Сохраняем информацию о клиенте
  req.clientInfo = {
    origin,
    isInternal: isInternalRequest(req),
    ip,
    userAgent,
  }

  next()
}

// Проверка внутренних запросов (от 1С и наших сервисов)
export const isInternalRequest = (req: Request): boolean => {
  const origin = req.get('Origin')

  // Проверка по Origin
  return (
    !ALLOWED_ORIGINS ||
    JSON.parse(ALLOWED_ORIGINS as string).indexOf(origin) !== -1
  )
}

// Middleware для защиты API endpoints
export const protectApiEndpoints = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Response | void => {
  const path = req.path

  // Защищаем только API endpoints
  if (!path.startsWith('/api/')) {
    return next()
  }

  // GET запросы к API менее строгие
  if (req.method === 'GET') {
    return next()
  }

  // Для POST, PUT, PATCH, DELETE - строгая проверка
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.get('Origin')

    // Запросы без Origin (кроме внутренних с API ключом)
    if (!origin && !isInternalRequest(req)) {
      console.warn(
        `🚫 Запрос без Origin: ${req.method} ${req.path} from IP: ${req.ip}`
      )
      return res.status(403).json({
        success: false,
        error: 'Origin header required for modifying operations',
      })
    }
  }

  next()
}

// Rate limiting middleware
const requestCounts = new Map<string, { count: number; resetTime: number }>()

export const rateLimit = (
  windowMs: number = 15 * 60 * 1000,
  max: number = 100
) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Response | void => {
    const key = req.clientInfo?.ip || req.ip || 'unknown'
    const now = Date.now()

    const clientData = requestCounts.get(key)

    if (!clientData) {
      requestCounts.set(key, { count: 1, resetTime: now + windowMs })
      return next()
    }

    // Сброс счетчика если время истекло
    if (now > clientData.resetTime) {
      clientData.count = 1
      clientData.resetTime = now + windowMs
      return next()
    }

    // Проверка лимита
    if (clientData.count >= max) {
      console.warn(`🚫 Rate limit exceeded for IP: ${key}`)
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
      })
    }

    clientData.count++
    next()
  }
}

// Очистка старых записей rate limiting (каждый час)
setInterval(() => {
  const now = Date.now()
  const hourAgo = now - 60 * 60 * 1000

  for (const [key, data] of requestCounts.entries()) {
    if (data.resetTime < hourAgo) {
      requestCounts.delete(key)
    }
  }
}, 60 * 60 * 1000)
