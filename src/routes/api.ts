import { Router } from 'express'
import MapStorage from '../storage/CompetitorsMapStorage'
import { validateMapData } from '../middleware/validation'
import { AuthenticatedRequest } from '../middleware/security'
import { amqpService } from '../services/amqp.service'
import { CompetitorsMapRequestData, Queue } from '../types'
import { geocodeAddress } from '../services/geocoding.service'
import {
  getFixedCoordinatesEntities,
  needsGeocoding,
} from '../utils/coordinates'
import { processWithConcurrency } from '../utils/processWithConcurrency'

const router = Router()

router.post(
  '/maps/competitors',
  validateMapData,
  async (req: AuthenticatedRequest, res) => {
    try {
      const originalData = req.body as CompetitorsMapRequestData
      const mapData = structuredClone(originalData)

      // Собираем все элементы для геокодирования
      const itemsToGeocode: Array<{ item: any; address: string }> = []

      if (needsGeocoding(mapData)) {
        itemsToGeocode.push({ item: mapData, address: mapData.address! })
      }

      if (mapData.competitors) {
        mapData.competitors.forEach((competitor) => {
          if (needsGeocoding(competitor)) {
            itemsToGeocode.push({
              item: competitor,
              address: competitor.address!,
            })
          }
        })
      }

      // Выполняем геокодирование с ограничением параллелизма
      if (itemsToGeocode.length > 0) {
        console.log(
          `Выполняется геокодирование ${itemsToGeocode.length} адресов...`
        )

        await processWithConcurrency(
          itemsToGeocode,
          async ({ item, address }) => {
            try {
              const coords = await geocodeAddress(address)
              if (coords) {
                item.latitude = coords.latitude
                item.longitude = coords.longitude
                console.log(
                  `Геокодирован адрес: ${address} -> ${coords.latitude}, ${coords.longitude}`
                )
              }
            } catch (error) {
              console.error(`Ошибка геокодирования адреса ${address}:`, error)
            }
          },
          3 // Максимум 3 параллельных запроса
        )

        console.log('Геокодирование завершено')
      }

      const result = await MapStorage.createOrUpdate(mapData)

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error,
        })
      }

      const fixedCoordinatesEntities = getFixedCoordinatesEntities(
        [originalData, ...originalData.competitors],
        result.data ? [result.data, ...(result.data.competitors || [])] : []
      )

      const response = {
        success: true,
        action: 'created',
        mapUrl: `http${process.env.NODE_ENV === 'production' ? 's' : ''}://${
          process.env.HOST
        }/maps/competitors/${req.body.guid}`,
        guid: req.body.guid,
        message: 'Данные контрагента успешно сохранены',
        data: {
          counterparty: result.data,
          competitorsCount: result.data?.competitors?.length || 0,
          fixedCoordinates: fixedCoordinatesEntities,
        },
      }

      if (
        fixedCoordinatesEntities.length &&
        process.env.ALLOW_EXTERNAL_API === 'true'
      ) {
        // @ts-ignore
        const channel = await amqpService.connect()

        amqpService.sendMessageToQueue(
          channel,
          Queue.CreateCounterparty,
          JSON.stringify({
            guid: response.guid,
            url: response.mapUrl,
            data: response.data.fixedCoordinates,
          })
        )
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

// GET - получение данных контрагента по GUID
router.get('/maps/competitors/:guid', async (req, res) => {
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
