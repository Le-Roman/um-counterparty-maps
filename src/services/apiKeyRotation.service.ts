import { Op, Sequelize } from 'sequelize'
import YandexApiKeyModel from '../models/YandexApiKey'

export class ApiKeyRotationService {
  /**
   * Получает доступный API ключ с ненарушенным лимитом
   */
  async getAvailableApiKey(): Promise<string | null> {
    try {
      const availableKey = await YandexApiKeyModel.findOne({
        where: {
          is_active: true,
          requests_used: {
            [Op.lt]: Sequelize.col('requests_limit'),
          },
        },
        order: [
          ['requests_used', 'ASC'], // Берем ключ с наименьшим использованием
          ['last_used', 'ASC'], // И самый старый по использованию
        ],
      })

      if (!availableKey) {
        console.warn('❌ Все API ключи исчерпали лимит запросов')
        return null
      }

      return availableKey.api_key
    } catch (error) {
      console.error('Ошибка при получении API ключа:', error)
      return null
    }
  }

  /**
   * Увеличивает счетчик использований для ключа
   */
  async incrementKeyUsage(apiKey: string): Promise<boolean> {
    try {
      const [affectedCount] = await YandexApiKeyModel.update(
        {
          requests_used: Sequelize.literal('requests_used + 1'),
          last_used: new Date(),
        },
        {
          where: {
            api_key: apiKey,
            requests_used: {
              [Op.lt]: Sequelize.col('requests_limit'),
            },
          },
        }
      )

      if (affectedCount === 0) {
        console.warn(`⚠️ Не удалось обновить счетчик для ключа: ${apiKey}`)
        return false
      }

      console.log(`✅ Увеличен счетчик для ключа: ${apiKey}`)
      return true
    } catch (error) {
      console.error('Ошибка при обновлении счетчика ключа:', error)
      return false
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
}

export const apiKeyRotationService = new ApiKeyRotationService()
