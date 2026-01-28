import { Router } from 'express'
import CompetitorsMapStorage from '../storage/CompetitorsMapStorage'
import PartnersMapStorage from '../storage/PartnersMapStorage'
import { CompetitorsMapRenderer } from '../utils/competitorsMapRenderer'
import { PartnersMapRenderer } from '../utils/partnersMapRenderer'

const router = Router()

// GET - просмотр карты контрагента
router.get('/competitors/:guid', async (req, res) => {
  const { guid } = req.params

  try {
    const result = await CompetitorsMapStorage.get(guid)

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

    const html = CompetitorsMapRenderer.generateHTML(guid, result.data)
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

// GET - просмотр карты - заявки на передачу клиента
router.get('/partners/:guid', async (req, res) => {
  const { guid } = req.params

  try {
    const result = await PartnersMapStorage.get(guid)

    if (!result.success || !result.data) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Заявка не найдена</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .error { color: #d63031; }
            </style>
        </head>
        <body>
            <h1 class="error">Заявка не найдена</h1>
            <p>Заявка с GUID <strong>${guid}</strong> не существует или была удалена</p>
            <a href="/">Вернуться на главную</a>
        </body>
        </html>
      `)
    }

    const html = PartnersMapRenderer.generateHTML(guid, result.data)
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
