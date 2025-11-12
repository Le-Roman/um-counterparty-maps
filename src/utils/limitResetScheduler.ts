import { apiKeyRotationService } from '../services/apiKeyRotation.service'

/**
 * Планировщик для сброса лимитов каждый день в 00:00 по московскому времени
 */
export const initializeLimitResetScheduler = (): void => {
  console.log('🕒 Инициализация планировщика сброса лимитов API ключей...')

  // Функция для расчета времени до следующего сброса (00:00 по Москве)
  const getTimeUntilNextReset = (): number => {
    const now = new Date()

    // Создаем дату для 00:00 следующего дня по Москве
    const nextReset = new Date()

    // Простой способ: устанавливаем на завтра 00:00 по локальному времени сервера
    // Предполагаем, что сервер работает в московском времени
    nextReset.setDate(nextReset.getDate() + 1) // Завтра
    nextReset.setHours(0, 0, 0, 0) // 00:00:00.000

    return nextReset.getTime() - now.getTime()
  }

  // Функция сброса лимитов
  const resetLimits = async (): Promise<void> => {
    try {
      console.log('🔄 Выполняется ежедневный сброс лимитов API ключей...')
      const success = await apiKeyRotationService.resetAllLimits()

      if (success) {
        console.log('✅ Ежедневный сброс лимитов завершен')

        // Логируем статистику после сброса
        const stats = await apiKeyRotationService.getKeysStats()
        const totalKeys = stats.length
        const activeKeys = stats.filter((k) => k.is_active).length
        console.log(`📊 Активных ключей: ${activeKeys}/${totalKeys}`)
      } else {
        console.error('❌ Не удалось выполнить сброс лимитов')
      }

      // Планируем следующий сброс
      scheduleNextReset()
    } catch (error) {
      console.error('❌ Ошибка при сбросе лимитов:', error)
      // Все равно планируем следующий сброс
      scheduleNextReset()
    }
  }

  // Функция планирования следующего сброса
  const scheduleNextReset = (): void => {
    const timeUntilReset = getTimeUntilNextReset()

    const minutesUntilReset = Math.round(timeUntilReset / 1000 / 60)
    const hoursUntilReset = Math.floor(minutesUntilReset / 60)
    const remainingMinutes = minutesUntilReset % 60

    console.log(
      `⏰ Следующий сброс лимитов через: ${hoursUntilReset}ч ${remainingMinutes}м`
    )

    setTimeout(() => {
      resetLimits()
    }, timeUntilReset)

    const nextReset = new Date(Date.now() + timeUntilReset)
    console.log(
      `📅 Следующий сброс лимитов запланирован на: ${nextReset.toLocaleString(
        'ru-RU'
      )}`
    )

    // Также покажем текущее время для отладки
    console.log(`🕐 Текущее время: ${new Date().toLocaleString('ru-RU')}`)
  }

  // Запускаем первый сброс
  scheduleNextReset()
}
