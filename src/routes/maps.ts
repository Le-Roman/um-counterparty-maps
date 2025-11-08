import { Router } from 'express'
import MapStorage from '../storage/MapStorage'
import { MapRenderer } from '../utils/mapRenderer'

const router = Router()

// GET - просмотр карты контрагента
router.get('/competitors/:guid', async (req, res) => {
  const { guid } = req.params

  try {
    const result = await MapStorage.get(guid)

    if (!result.success || !result.data) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Контрагент не найден</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .error { color: #d63031; }
            </style>
        </head>
        <body>
            <h1 class="error">Контрагент не найден</h1>
            <p>Контрагент с GUID <strong>${guid}</strong> не существует или был удален</p>
            <a href="/">Вернуться на главную</a>
        </body>
        </html>
      `)
    }

    const useYandex =
      process.env.NODE_ENV === 'production' || req.query.engine === 'yandex'
    const html = MapRenderer.generateHTML(guid, result.data, useYandex)
    res.send(html)
  } catch (error) {
    console.error('Ошибка загрузки карты:', error)
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>Ошибка сервера</title>
      </head>
      <body>
          <h1>Ошибка загрузки карты</h1>
          <p>Попробуйте обновить страницу позже</p>
      </body>
      </html>
    `)
  }
})

export default router
