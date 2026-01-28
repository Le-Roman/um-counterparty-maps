import { Router } from 'express'
import CompetitorsMapStorage from '../storage/CompetitorsMapStorage'
import PartnersMapStorage from '../storage/PartnersMapStorage'
import { validateMapData } from '../middleware/validation'
import { validatePartnerData } from '../middleware/validation'
import { AuthenticatedRequest } from '../middleware/security'
import { amqpService } from '../services/amqp.service'
import { CompetitorsMapRequestData, ClientRequestData, Queue } from '../types'
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

      const result = await CompetitorsMapStorage.createOrUpdate(mapData)

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
    const result = await CompetitorsMapStorage.get(guid)

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

router.post(
  '/maps/partners',
  validatePartnerData,
  async (req: AuthenticatedRequest, res) => {
    try {
      const originalData = req.body as ClientRequestData
      const mapData = structuredClone(originalData)

      // Собираем все элементы для геокодирования
      const itemsToGeocode: Array<{ item: any; address: string }> = []

      if (needsGeocoding(mapData)) {
        itemsToGeocode.push({ item: mapData, address: mapData.address! })
      }

      if (mapData.partner) {
        mapData.partner.forEach((currentPartner) => {
          if (needsGeocoding(currentPartner)) {
            itemsToGeocode.push({
              item: currentPartner,
              address: currentPartner.address!,
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

      const result = await PartnersMapStorage.createOrUpdate(mapData)

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error,
        })
      }

      const fixedCoordinatesEntities = getFixedCoordinatesEntities(
        [originalData, ...originalData.partner],
        result.data ? [result.data, ...(result.data.partners || [])] : []
      )

      const response = {
        success: true,
        action: 'created',
        mapUrl: `http${process.env.NODE_ENV === 'production' ? 's' : ''}://${
          process.env.HOST
        }/maps/partners/${req.body.guid}`,
        guid: req.body.guid,
        message: 'Данные заявки успешно сохранены',
        data: {
          clientRequest: result.data,
          partnersCount: result.data?.partners?.length || 0,
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

      res.status(200).json(response)
    } catch (error) {
      console.error('Ошибка сохранения данных:', error)
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера',
      })
    }
  }
)

// PUT /api/maps/partners/add_client - передача клиента партнеру
router.put('/maps/partners/add_client', async (req, res) => {
  try {
    const { partnerGuid, clientGuid } = req.body

    if (!partnerGuid || !clientGuid) {
      return res.status(400).json({
        success: false,
        error: 'Отсутствуют обязательные поля',
      })
    }

    const result = await PartnersMapStorage.addPartner({
      partnerGuid,
      clientGuid,
    })

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
      })
    }

    res.status(200).json(result)
  } catch (error) {
    console.error('Ошибка передачи клиента:', error)
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера',
    })
  }
})

// GET /api/maps/partners/:guid - получение данных заявки
router.get('/maps/partners/:guid', async (req, res) => {
  const { guid } = req.params

  try {
    const result = await PartnersMapStorage.get(guid)

    if (!result.success || !result.data) {
      return res.status(404).json({
        success: false,
        error: 'Заявка не найдена',
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

export default router
