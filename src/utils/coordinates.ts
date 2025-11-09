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
