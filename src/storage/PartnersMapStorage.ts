import sequelize from '../config/database'
import ClientRequestModel from '../db/models/ClientRequest'
import PartnerModel from '../db/models/Partner'
import PartnerProductModel from '../db/models/PartnerProduct'
import { ClientRequestData, ClientRequestInstance } from '../types'

export class PartnersMapStorage {
  async createOrUpdate(mapData: ClientRequestData): Promise<{
    success: boolean
    data?: ClientRequestInstance
    error?: string
  }> {
    const transaction = await sequelize.transaction()

    try {
      const {
        guid,
        date,
        population,
        variant_map,
        partnerGuid,
        buyer_name,
        phone,
        address,
        latitude,
        longitude,
        partner,
      } = mapData

      // 1. Создаем или обновляем заявку
      const [clientRequest] = await ClientRequestModel.upsert(
        {
          guid,
          date,
          population,
          variant_map,
          partnerGuid,
          buyer_name,
          phone,
          address,
          latitude,
          longitude,
        },
        { transaction }
      )

      // 2. Удаляем старых партнеров (если они есть)
      await PartnerModel.destroy({
        where: { client_request_guid: guid },
        transaction,
      })

      // 3. Создаем новых партнеров
      for (const partnerData of partner) {
        const partner = await PartnerModel.create(
          {
            guid: partnerData.guid,
            name: partnerData.name,
            price: partnerData.price,
            priority: partnerData.priority,
            phone: partnerData.phone,
            email: partnerData.email,
            manager: partnerData.manager,
            relationship_type: partnerData.relationship_type,
            address: partnerData.address,
            latitude: partnerData.latitude,
            longitude: partnerData.longitude,
            revenue_last_n_months: partnerData.revenue_last_n_months,
            last_sale_date: partnerData.last_sale_date,
            clients_transferred: partnerData.clients_transferred,
            clients_in_progress: partnerData.clients_in_progress,
            clients_converted: partnerData.clients_converted,
            client_request_guid: guid,
          },
          { transaction }
        )

        // Создаем товары партнера
        if (partnerData.products && partnerData.products.length > 0) {
          const products = partnerData.products.map((product) => ({
            ...product,
            partner_guid: partner.guid,
          }))
          await PartnerProductModel.bulkCreate(products, { transaction })
        }
      }

      await transaction.commit()

      // 4. Получаем полные данные с конкурентами
      const fullData = await ClientRequestModel.findByPk(guid, {
        include: [
          {
            model: PartnerModel,
            as: 'partners',
            include: [
              {
                model: PartnerProductModel,
                as: 'products',
              },
            ],
          },
        ],
      })

      return {
        success: true,
        data: fullData?.toJSON() as ClientRequestInstance,
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
    data?: ClientRequestInstance
    error?: string
  }> {
    try {
      const clientRequest = await ClientRequestModel.findByPk(guid, {
        include: [
          {
            model: PartnerModel,
            as: 'partners',
            include: [
              {
                model: PartnerProductModel,
                as: 'products',
              },
            ],
          },
        ],
      })

      if (!clientRequest) {
        return {
          success: false,
          error: 'Заявка не найдена',
        }
      }
      return {
        success: true,
        data: clientRequest.toJSON() as ClientRequestInstance,
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  async addPartner({
    partnerGuid,
    clientGuid,
  }: {
    partnerGuid: string
    clientGuid: string
  }): Promise<{
    success: boolean
    message?: string
    error?: string
  }> {
    try {
      const clientRequest = await ClientRequestModel.findByPk(clientGuid)

      if (!clientRequest) {
        return {
          success: false,
          error: 'Заявка не найдена',
        }
      }

      // Проверяем, не передан ли уже клиент
      if (clientRequest.partnerGuid) {
        return {
          success: false,
          error: 'Клиент уже передан. Обновите страницу',
        }
      }

      // Обновляем заявку
      clientRequest.partnerGuid = partnerGuid
      await clientRequest.save()

      return {
        success: true,
        message: 'Клиент успешно передан партнеру',
      }
    } catch (error) {
      console.error('Ошибка передачи клиента:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }
}

export default new PartnersMapStorage()
