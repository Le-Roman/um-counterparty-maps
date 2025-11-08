import { Request, Response, NextFunction } from 'express'
import { MapRequestData } from '../types'

export const validateMapData = (
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  const data: MapRequestData = req.body

  // Проверка обязательных полей контрагента
  if (!data.guid || typeof data.guid !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Поле guid обязательно и должно быть строкой',
    })
  }

  //   if (!data.manager || typeof data.manager !== 'string') {
  //     return res.status(400).json({
  //       success: false,
  //       error: 'Поле manager обязательно и должно быть строкой',
  //     })
  //   }

  //   if (!data.address || typeof data.address !== 'string') {
  //     return res.status(400).json({
  //       success: false,
  //       error: 'Поле address обязательно и должно быть строкой',
  //     })
  //   }

  // Проверка координат
  //   if (data.latitude !== null && data.latitude !== undefined) {
  //     if (
  //       typeof data.latitude !== 'number' ||
  //       data.latitude < -90 ||
  //       data.latitude > 90
  //     ) {
  //       return res.status(400).json({
  //         success: false,
  //         error: 'Поле latitude должно быть числом от -90 до 90',
  //       })
  //     }
  //   }

  if (typeof data.latitude !== 'number') {
    return res.status(400).json({
      success: false,
      error: 'Поле latitude обязательно и должно быть числом',
    })
  }

  //   if (!data.longitude !== null && data.longitude !== undefined) {
  //     if (
  //       typeof data.longitude !== 'number' ||
  //       data.longitude < -180 ||
  //       data.longitude > 180
  //     ) {
  //       return res.status(400).json({
  //         success: false,
  //         error: 'Поле longitude должно быть числом от -180 до 180',
  //       })
  //     }
  //   }

  if (typeof data.longitude !== 'number') {
    return res.status(400).json({
      success: false,
      error: 'Поле longitude обязательно и должно быть числом от',
    })
  }

  // Проверка конкурентов
  if (data.competitors && !Array.isArray(data.competitors)) {
    return res.status(400).json({
      success: false,
      error: 'Поле competitors должно быть массивом',
    })
  }

  // Валидация каждого конкурента
  if (data.competitors) {
    for (let i = 0; i < data.competitors.length; i++) {
      const competitor = data.competitors[i]

      if (!competitor.name || typeof competitor.name !== 'string') {
        return res.status(400).json({
          success: false,
          error: `Competitor[${i}]: поле name обязательно`,
        })
      }

      //   if (
      //     typeof competitor.revenue_last_3_months !== 'number' ||
      //     competitor.revenue_last_3_months < 0
      //   ) {
      //     return res.status(400).json({
      //       success: false,
      //       error: `Competitor[${i}]: поле revenueLast3Months должно быть положительным числом`,
      //     })
      //   }

      if (typeof competitor.last_sale_date === 'string') {
        const saleDate = new Date(competitor.last_sale_date)
        if (isNaN(saleDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: `Competitor[${i}]: поле last_sale_date должно быть валидной датой`,
          })
        }
      }
    }
  }

  next()
}
