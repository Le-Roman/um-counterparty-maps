import Sequelize from 'sequelize'
import YandexApiKeyModel from '../db/models/YandexApiKey'
import sequelize from '../config/database'

export class ApiKeyRotationService {
  /**
   * Получает доступный API ключ с гарантией не превышения лимита
   */
  async getAvailableApiKey(): Promise<{
    apiKey: string | null
    id: number | null
  }> {
    const transaction = await sequelize.transaction()

    try {
      // 1. Находим подходящий ключ и БЛОКИРУЕМ его для обновления
      const availableKey = await YandexApiKeyModel.findOne({
        where: {
          is_active: true,
          requests_used: {
            [Sequelize.Op.lt]: Sequelize.col('requests_limit'),
          },
        },
        order: [
          ['requests_used', 'ASC'], // Берем наименее использованный
          ['last_used', 'ASC'], // И самый старый по использованию
        ],
        lock: true, // 🔒 КРИТИЧЕСКИ ВАЖНО: блокировка строки
        transaction,
      })

      if (!availableKey) {
        await transaction.rollback()
        console.warn('❌ Все API ключи исчерпали лимит запросов')
        return { apiKey: null, id: null }
      }

      // 2. Проверяем лимит ЕЩЕ РАЗ после блокировки
      if (availableKey.requests_used >= availableKey.requests_limit) {
        await transaction.rollback()
        console.warn(`⚠️ Ключ ID:${availableKey.id} исчерпан после блокировки`)
        return { apiKey: null, id: null }
      }

      // 3. Атомарно увеличиваем счетчик в ЭТОЙ ЖЕ транзакции
      availableKey.requests_used += 1
      availableKey.last_used = new Date()
      await availableKey.save({ transaction })

      // 4. Фиксируем транзакцию
      await transaction.commit()

      console.log(
        `✅ Забронирован ключ ID: ${availableKey.id}, использовано: ${availableKey.requests_used}/${availableKey.requests_limit}`
      )

      return {
        apiKey: availableKey.api_key,
        id: availableKey.id,
      }
    } catch (error) {
      await transaction.rollback()

      // 🔴 ВАЖНО: обрабатываем только таймауты блокировок
      if ((error as { name: string }).name === 'SequelizeTimeoutError') {
        console.error('⏰ Таймаут блокировки БД. Возможно, высокая нагрузка.')
        // В ЭТОМ случае можно сделать одну повторную попытку
        return await this.retryGetAvailableApiKey()
      }

      console.error('❌ Критическая ошибка при получении API ключа:', error)
      return { apiKey: null, id: null }
    }
  }

  /**
   * ОДНА повторная попытка при таймауте блокировки
   */
  private async retryGetAvailableApiKey(): Promise<{
    apiKey: string | null
    id: number | null
  }> {
    console.log('🔄 Повторная попытка получения ключа...')

    await new Promise((resolve) => setTimeout(resolve, 100)) // Короткая пауза

    try {
      // Простая попытка без блокировки (менее надежная, но быстрая)
      const availableKey = await YandexApiKeyModel.findOne({
        where: {
          is_active: true,
          requests_used: {
            [Sequelize.Op.lt]: Sequelize.col('requests_limit'),
          },
        },
        order: [
          ['requests_used', 'ASC'],
          ['last_used', 'ASC'],
        ],
      })

      if (!availableKey) {
        return { apiKey: null, id: null }
      }

      // Оптимистичное обновление
      const [affectedCount] = await YandexApiKeyModel.update(
        {
          requests_used: availableKey.requests_used + 1,
          last_used: new Date(),
        },
        {
          where: {
            id: availableKey.id,
            requests_used: availableKey.requests_used, // Оптимистичная блокировка
          },
        }
      )

      if (affectedCount === 0) {
        console.warn('⚠️ Конфликт при повторной попытке')
        return { apiKey: null, id: null }
      }

      console.log(
        `✅ Ключ получен при повторной попытке ID: ${availableKey.id}`
      )
      return {
        apiKey: availableKey.api_key,
        id: availableKey.id,
      }
    } catch (error) {
      console.error('❌ Ошибка при повторной попытке:', error)
      return { apiKey: null, id: null }
    }
  }

  /**
   * Сбрасывает лимиты для всех ключей
   */
  async resetAllLimits(): Promise<boolean> {
    try {
      const [affectedCount] = await YandexApiKeyModel.update(
        {
          requests_used: 0,
        },
        {
          where: {
            is_active: true,
          },
        }
      )

      console.log(`✅ Сброшены лимиты для ${affectedCount} API ключей`)
      return true
    } catch (error) {
      console.error('Ошибка при сбросе лимитов:', error)
      return false
    }
  }

  /**
   * Добавляет новый API ключ
   */
  async addApiKey(apiKey: string, limit: number = 999): Promise<boolean> {
    try {
      await YandexApiKeyModel.create({
        api_key: apiKey,
        requests_limit: limit,
        requests_used: 0,
        is_active: true,
      })

      console.log(`✅ Добавлен новый API ключ с лимитом ${limit}`)
      return true
    } catch (error) {
      console.error('Ошибка при добавлении API ключа:', error)
      return false
    }
  }

  /**
   * Получает статистику по ключам
   */
  async getKeysStats(): Promise<
    Array<{
      id: number
      api_key: string
      requests_used: number
      requests_limit: number
      is_active: boolean
      last_used: Date | null
    }>
  > {
    try {
      const keys = await YandexApiKeyModel.findAll({
        attributes: [
          'id',
          'api_key',
          'requests_used',
          'requests_limit',
          'is_active',
          'last_used',
        ],
        order: [['id', 'ASC']],
      })

      return keys.map((key) => key.toJSON())
    } catch (error) {
      console.error('Ошибка при получении статистики ключей:', error)
      return []
    }
  }

  /**
   * Основной метод для использования
   */
  async reserveAndGetApiKey(): Promise<string | null> {
    const result = await this.getAvailableApiKey()
    return result.apiKey
  }
}

export const apiKeyRotationService = new ApiKeyRotationService()
