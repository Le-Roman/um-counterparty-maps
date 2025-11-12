import { apiKeyRotationService } from '../services/apiKeyRotation.service'

export const ApiKeyManager = {
  /**
   * Добавить ключи через переменные окружения при инициализации
   */
  async initializeFromEnv(): Promise<void> {
    const apiKeys = process.env.YANDEX_GEOCODER_API_KEYS

    if (!apiKeys) {
      console.warn('⚠️ YANDEX_GEOCODER_API_KEYS не настроены в переменных окружения')
      return
    }

    try {
      const keys = JSON.parse(apiKeys) as string[]

      for (const key of keys) {
        await apiKeyRotationService.addApiKey(key.trim())
      }

      console.log(
        `✅ Загружено ${keys.length} API ключей из переменных окружения`
      )
    } catch (error) {
      console.error('❌ Ошибка при загрузке API ключей из окружения:', error)
    }
  },

  /**
   * Показать статистику по ключам
   */
  async showStats(): Promise<void> {
    const stats = await apiKeyRotationService.getKeysStats()

    console.log('\n📊 Статистика API ключей:')
    console.log(
      '┌─────┬────────────┬────────────┬─────────┬─────────────────────┐'
    )
    console.log(
      '│ ID  │ Использовано │ Лимит     │ Активен │ Последнее использование │'
    )
    console.log(
      '├─────┼────────────┼────────────┼─────────┼─────────────────────┤'
    )

    stats.forEach((key) => {
      const used = key.requests_used.toString().padStart(10)
      const limit = key.requests_limit.toString().padStart(10)
      const active = key.is_active ? '✅' : '❌'
      const lastUsed = key.last_used
        ? new Date(key.last_used).toLocaleString('ru-RU')
        : 'никогда'

      console.log(
        `│ ${key.id
          .toString()
          .padStart(3)} │ ${used} │ ${limit} │ ${active}   │ ${lastUsed.padEnd(
          19
        )} │`
      )
    })

    console.log(
      '└─────┴────────────┴────────────┴─────────┴─────────────────────┘'
    )
  },
}
