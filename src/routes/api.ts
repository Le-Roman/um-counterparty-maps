import { Router } from 'express'
import MapStorage from '../storage/MapStorage'
import { validateMapData } from '../middleware/validation'
import { AuthenticatedRequest } from '../middleware/security'

const router = Router()

// POST - создание/обновление карты
router.post(
  '/maps',
  validateMapData,
  async (req: AuthenticatedRequest, res) => {
    try {
      console.log(
        `📍 Создание/обновление карты ${req.body.guid} от ${
          req.clientInfo?.origin || 'unknown source'
        }`
      )

      const result = await MapStorage.createOrUpdate(req.body)

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error,
        })
      }

      const response = {
        success: true,
        action: 'created',
        mapUrl: `http${
          process.env.NODE_ENV === 'production' ? 's' : ''
        }://${req.get('host')}/maps/${req.body.guid}`,
        guid: req.body.guid,
        message: 'Данные контрагента успешно сохранены',
        data: {
          counterparty: result.data,
          competitorsCount: result.data?.competitors?.length || 0,
        },
      }

      res.status(201).json(response)
    } catch (error) {
      console.error('Ошибка сохранения данных:', error)
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера',
      })
    }
  }
)

// PUT - обновление карты
router.put('/maps', validateMapData, async (req: AuthenticatedRequest, res) => {
  try {
    console.log(
      `✏️  Обновление карты ${req.body.guid} от ${
        req.clientInfo?.origin || 'unknown source'
      }`
    )

    const result = await MapStorage.createOrUpdate(req.body)

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
      })
    }

    const response = {
      success: true,
      action: 'updated',
      mapUrl: `http${
        process.env.NODE_ENV === 'production' ? 's' : ''
      }://${req.get('host')}/maps/${req.body.guid}`,
      guid: req.body.guid,
      message: 'Данные контрагента успешно обновлены',
      data: {
        counterparty: result.data,
        competitorsCount: result.data?.competitors?.length || 0,
      },
    }

    res.json(response)
  } catch (error) {
    console.error('Ошибка обновления данных:', error)
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера',
    })
  }
})

// GET - получение данных контрагента по GUID
router.get('/maps/:guid', async (req, res) => {
  const { guid } = req.params

  try {
    const result = await MapStorage.get(guid)

    if (!result.success || !result.data) {
      return res.status(404).json({
        success: false,
        error: 'Контрагент не найден',
      })
    }

    res.json({
      success: true,
      data: result.data,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Ошибка загрузки данных',
    })
  }
})

// GET - список последних контрагентов
// router.get('/maps', async (req, res) => {
//   try {
//     const limit = parseInt(req.query.limit as string) || 10
//     const result = await MapStorage.getRecent(limit)

//     if (!result.success) {
//       return res.status(500).json({
//         success: false,
//         error: result.error,
//       })
//     }

//     res.json({
//       success: true,
//       data: result.data,
//     })
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       error: 'Ошибка загрузки данных',
//     })
//   }
// })

export default router
