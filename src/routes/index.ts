import { Router } from 'express'
import apiRoutes from './api'
import mapRoutes from './maps'
import devRoutes from './dev'

const router = Router()

// Основные роуты
router.use('/api', apiRoutes)
router.use('/maps', mapRoutes)

// Development роуты (только в development)
if (process.env.NODE_ENV === 'development') {
  router.use('/dev', devRoutes)
}

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
  })
})

// Home page
router.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Maps Service</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
            .endpoint { background: #e9ecef; padding: 15px; margin: 10px 0; border-radius: 5px; }
            code { background: #f1f3f4; padding: 2px 5px; border-radius: 3px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🗺️ Maps Service</h1>
            <p>Сервис для управления картами контрагентов и конкурентов</p>
        </div>
        
        <h2>API Endpoints</h2>
        
        <div class="endpoint">
            <strong>POST /api/maps</strong> - Создание/обновление контрагента<br>
            <strong>PUT /api/maps</strong> - Обновление контрагента<br>
            <strong>GET /api/maps/:guid</strong> - Получение данных контрагента<br>
            <strong>GET /api/maps</strong> - Список последних контрагентов<br>
            <strong>GET /maps/:guid</strong> - Просмотр карты<br>
            <strong>GET /health</strong> - Проверка статуса сервера
        </div>

        <h2>Пример запроса</h2>
        <pre><code>POST /api/maps
Content-Type: application/json

{
  "guid": "00000000-0000-0000-0000-000000000000",
  "manager": "Иванов Иван Иванович",
  "price": "Спец +15",
  "latitude": 59.7558,
  "longitude": 37.6176,
  "address": "Краснодар, Красных Партизан",
  "phone": "+79286573101",
  "competitors": [...]
}</code></pre>

        <h2>Документация</h2>
        <p>Для интеграции с 1С используйте POST или PUT запросы на <code>/api/maps</code></p>
        
        ${
          process.env.NODE_ENV === 'development'
            ? `
        <h2>Development Tools</h2>
        <p><a href="/dev/maps/test">🧪 Тестовая карта</a> - для разработки и тестирования</p>
        <p><a href="/dev/api/test-data">📊 Тестовые данные</a> - пример структуры запроса</p>
        `
            : ''
        }
    </body>
    </html>
  `)
})

export default router
