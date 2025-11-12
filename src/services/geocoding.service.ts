import { apiKeyRotationService } from './apiKeyRotation.service'

export interface Coordinates {
  latitude: number
  longitude: number
}

export const geocodeAddress = async (
  address: string
): Promise<Coordinates | null> => {
  try {
    // Получаем доступный API ключ
    const apiKey = await apiKeyRotationService.getAvailableApiKey()

    if (!apiKey) {
      console.warn(
        '⚠️ Все API ключи исчерпали лимит. Возвращаем координаты по умолчанию.'
      )
      return { latitude: 0, longitude: 0 }
    }

    const response = await fetch(
      `https://geocode-maps.yandex.ru/v1/?apikey=${apiKey}&format=json&geocode=${encodeURIComponent(
        address
      )}`,
      {
        headers: {
          Referer: `https://${process.env.HOST}`,
        },
      }
    )

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status} for key: ${apiKey}`)
      return null
    }

    const data = await response.json()

    if (
      data.response &&
      data.response.GeoObjectCollection &&
      data.response.GeoObjectCollection.featureMember.length > 0
    ) {
      const pos =
        data.response.GeoObjectCollection.featureMember[0].GeoObject.Point.pos
      const [lng, lat] = pos.split(' ').map(Number)

      // Увеличиваем счетчик использований только при успешном запросе
      await apiKeyRotationService.incrementKeyUsage(apiKey)

      return { latitude: lat, longitude: lng }
    }

    console.warn('Адрес не найден:', address)
    // Даже если адрес не найден, считаем запрос использованным
    await apiKeyRotationService.incrementKeyUsage(apiKey)
    return null
  } catch (error) {
    console.error('Ошибка геокодирования адреса:', address, error)
    return null
  }
}
