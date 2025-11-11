export const hasValidCoordinates = (item: {
  latitude?: number
  longitude?: number
}): boolean => {
  return !!(
    item.latitude &&
    item.longitude &&
    Math.abs(item.latitude) > 0.001 &&
    Math.abs(item.longitude) > 0.001
  )
}

export const needsGeocoding = (item: {
  latitude?: number
  longitude?: number
  address?: string
}): boolean => {
  return !hasValidCoordinates(item) && !!item.address
}

interface CoordinatesEntity {
  latitude: number
  longitude: number
  address: string
}

export const getFixedCoordinatesEntities = (
  externalData: CoordinatesEntity[],
  geocodedData: CoordinatesEntity[]
): CoordinatesEntity[] => {
  const result: CoordinatesEntity[] = []

  // Функция для нормализации адреса
  const normalizeAddress = (address: string): string => {
    return address.toLowerCase().trim().replace(/\s+/g, ' ') // Заменяем множественные пробелы на один
  }

  // Создаем Map для быстрого поиска геокодированных сущностей по нормализованному адресу
  const geocodedDataMap = new Map()
  geocodedData.forEach((entity) => {
    if (entity.address) {
      const normalizedAddress = normalizeAddress(entity.address)
      geocodedDataMap.set(normalizedAddress, entity)
    }
  })

  // Проверяем каждую сущность из внешних данных
  externalData.forEach((externalEntity) => {
    if (!externalEntity.address) return

    const normalizedExternalAddress = normalizeAddress(externalEntity.address)
    const geocodedEntity = geocodedDataMap.get(normalizedExternalAddress)

    if (
      geocodedEntity &&
      !hasValidCoordinates(externalEntity) &&
      hasValidCoordinates(geocodedEntity) &&
      geocodedEntity.address
    ) {
      result.push(geocodedEntity)
    }
  })

  return result
}
