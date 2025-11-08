import sequelize from '../config/database'
import CounterpartyModel from '../models/Counterparty'
import CompetitorModel from '../models/Competitor'
import {
  MapRequestData,
  CounterpartyInstance,
} from '../types'

export class MapStorage {
  async createOrUpdate(mapData: MapRequestData): Promise<{
    success: boolean
    data?: CounterpartyInstance
    error?: string
  }> {
    const transaction = await sequelize.transaction()

    try {
      const {
        guid,
        manager,
        price,
        latitude,
        longitude,
        address,
        phone,
        competitors,
      } = mapData

      // 1. Создаем или обновляем контрагента
      const [counterparty] = await CounterpartyModel.upsert(
        {
          guid,
          manager,
          price,
          latitude,
          longitude,
          address,
          phone,
        },
        { transaction }
      )

      // 2. Удаляем старых конкурентов
      await CompetitorModel.destroy({
        where: { counterpartyGuid: guid },
        transaction,
      })

      // 3. Создаем новых конкурентов
      if (competitors && competitors.length > 0) {
        const competitorsToCreate = competitors.map((competitor) => ({
          counterpartyGuid: guid,
          name: competitor.name,
          manager: competitor.manager,
          price: competitor.price,
          revenue_last_3_months: competitor.revenue_last_3_months,
          relationship_type: competitor.relationship_type,
          last_sale_date: competitor.last_sale_date,
          latitude: competitor.latitude,
          longitude: competitor.longitude,
          address: competitor.address,
          phone: competitor.phone,
        }))

        await CompetitorModel.bulkCreate(competitorsToCreate, { transaction })
      }

      await transaction.commit()

      // 4. Получаем полные данные с конкурентами
      const fullData = await CounterpartyModel.findByPk(guid, {
        include: [
          {
            model: CompetitorModel,
            as: 'competitors',
          },
        ],
      })

      return {
        success: true,
        data: fullData?.toJSON() as CounterpartyInstance,
      }
    } catch (error) {
      await transaction.rollback()
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  async get(guid: string): Promise<{
    success: boolean
    data?: CounterpartyInstance
    error?: string
  }> {
    try {
      const counterparty = await CounterpartyModel.findByPk(guid, {
        include: [
          {
            model: CompetitorModel,
            as: 'competitors',
          },
        ],
      })

      if (!counterparty) {
        return {
          success: false,
          error: 'Контрагент не найден',
        }
      }

      return {
        success: true,
        data: counterparty.toJSON() as CounterpartyInstance,
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  async delete(guid: string): Promise<{ success: boolean; error?: string }> {
    const transaction = await sequelize.transaction()

    try {
      // Каскадное удаление благодаря foreign key constraint
      const deletedCount = await CounterpartyModel.destroy({
        where: { guid },
        transaction,
      })

      await transaction.commit()

      return {
        success: deletedCount > 0,
      }
    } catch (error) {
      await transaction.rollback()
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  async getRecent(limit: number = 10): Promise<{
    success: boolean
    data?: CounterpartyInstance[]
    error?: string
  }> {
    try {
      const counterparties = await CounterpartyModel.findAll({
        include: [
          {
            model: CompetitorModel,
            as: 'competitors',
          },
        ],
        order: [['createdAt', 'DESC']],
        limit,
      })

      return {
        success: true,
        data: counterparties.map((cp) => cp.toJSON() as CounterpartyInstance),
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }
}

export default new MapStorage()
