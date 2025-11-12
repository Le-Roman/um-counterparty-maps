import { apiKeyRotationService } from './apiKeyRotation.service'

export interface Coordinates {
  latitude: number
  longitude: number
}

const defaultCoordinates: Coordinates = { latitude: 0, longitude: 0 }

/**
 * Геокодирует адрес с использованием системы ротации API ключей
 * Возвращает { latitude: 0, longitude: 0 } если все ключи исчерпали лимит
 */
export const geocodeAddress = async (address: string): Promise<Coordinates> => {
  // Проверяем, что адрес не пустой
  if (!address || address.trim().length === 0) {
    console.warn('⚠️ Пустой адрес для геокодирования')
    return defaultCoordinates
  }

  try {
    // Получаем и сразу резервируем доступный API ключ
    const apiKey = await apiKeyRotationService.reserveAndGetApiKey()

    if (!apiKey) {
      console.warn(
        `⚠️ Все API ключи исчерпали лимит для адреса: ${address}. Возвращаем координаты по умолчанию.`
      )
      return { latitude: 0, longitude: 0 }
    }

    console.log(`🔑 Используем API ключ для геокодирования: "${address}"`)

    const response = await fetch(
      `https://geocode-maps.yandex.ru/v1/?apikey=${apiKey}&format=json&geocode=${encodeURIComponent(
        address
      )}`,
      {
        headers: {
          Referer: `https://${process.env.HOST || 'localhost'}`,
        },
        // Таймаут на случай долгого ответа
        signal: AbortSignal.timeout(10000), // 10 секунд
      }
    )

    if (!response.ok) {
      console.error(
        `❌ HTTP error! status: ${response.status} для адреса: ${address}`
      )
      // Ключ уже был зарезервирован, так что мы его "потратили" даже при ошибке
      return defaultCoordinates
    }

    const data = await response.json()

    // Проверяем структуру ответа
    if (
      data.response &&
      data.response.GeoObjectCollection &&
      data.response.GeoObjectCollection.featureMember &&
      data.response.GeoObjectCollection.featureMember.length > 0
    ) {
      const firstFeature = data.response.GeoObjectCollection.featureMember[0]
      const pos = firstFeature.GeoObject.Point.pos
      const [lng, lat] = pos.split(' ').map(Number)

      console.log(
        `✅ Успешно геокодирован адрес: "${address}" -> ${lat}, ${lng}`
      )
      return { latitude: lat, longitude: lng }
    }

    console.warn(`📍 Адрес не найден: "${address}"`)
    return defaultCoordinates
  } catch (error) {
    // Обрабатываем разные типы ошибок
    if (error instanceof Error) {
      if (error.name === 'TimeoutError') {
        console.error(`⏰ Таймаут геокодирования адреса: ${address}`)
      } else if (error.name === 'AbortError') {
        console.error(`🚫 Запрос прерван для адреса: ${address}`)
      } else {
        console.error(
          `❌ Ошибка геокодирования адреса "${address}":`,
          error.message
        )
      }
    } else {
      console.error(
        `❌ Неизвестная ошибка геокодирования адреса "${address}":`,
        error
      )
    }

    return defaultCoordinates
  }
}

/**
 * Массовое геокодирование с обработкой ограничений API
 */
export const geocodeAddresses = async (
  addresses: string[]
): Promise<Array<{ address: string; coordinates: Coordinates | null }>> => {
  console.log(`🗺️ Начато массовое геокодирование ${addresses.length} адресов`)

  const results = await Promise.all(
    addresses.map(async (address) => {
      const coordinates = await geocodeAddress(address)
      return { address, coordinates }
    })
  )

  // Статистика результатов
  const successful = results.filter((r) => r.coordinates !== null).length
  const failed = results.filter((r) => r.coordinates === null).length
  const zeroCoords = results.filter(
    (r) =>
      r.coordinates &&
      r.coordinates.latitude === 0 &&
      r.coordinates.longitude === 0
  ).length

  console.log(
    `📊 Геокодирование завершено: Успешно: ${successful}, Ошибки: ${failed}, Нет ключей: ${zeroCoords}`
  )

  return results
}
