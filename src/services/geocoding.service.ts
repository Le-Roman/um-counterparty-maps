export interface Coordinates {
  latitude: number
  longitude: number
}

export const geocodeAddress = async (
  address: string
): Promise<Coordinates | null> => {
  try {
    if (!process.env.YANDEX_API_KEY) {
      throw new Error('YANDEX_API_KEY не настроен')
    }

    const response = await fetch(
      `https://geocode-maps.yandex.ru/v1/?apikey=${
        process.env.YANDEX_API_KEY
      }&format=json&geocode=${encodeURIComponent(address)}`,
      {
        headers: {
          Referer: `https://${process.env.HOST}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
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

      return { latitude: lat, longitude: lng }
    }

    console.warn('Адрес не найден:', address)
    return null
  } catch (error) {
    console.error('Ошибка геокодирования адреса:', address, error)
    return null
  }
}
