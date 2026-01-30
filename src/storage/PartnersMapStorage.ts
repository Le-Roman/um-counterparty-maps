import * as soap from 'soap'
import { Op } from 'sequelize'
import sequelize from '../config/database'
import ClientRequestModel from '../db/models/ClientRequest'
import PartnerModel from '../db/models/Partner'
import PartnerProductModel from '../db/models/PartnerProduct'
import { ClientRequestData, ClientRequestInstance } from '../types'
import { stringToBase64 } from '../utils/stringToBase64'

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
          partnerGuid: partnerGuid || null,
          buyer_name,
          phone,
          address,
          latitude,
          longitude,
        },
        { transaction }
      )

      // 2. Создаем/обновляем партнеров с учетом адреса
      for (const partnerData of partner) {
        // Поиск по всем трем полям: guid + client_request_guid + address
        const existingPartner = await PartnerModel.findOne({
          where: {
            guid: partnerData.guid,
            client_request_guid: guid,
            address: partnerData.address,
          },
          transaction,
        })

        if (existingPartner) {
          // Обновляем существующего партнера с тем же адресом
          await existingPartner.update(
            {
              name: partnerData.name,
              price: partnerData.price,
              priority: partnerData.priority,
              phone: partnerData.phone,
              email: partnerData.email,
              manager: partnerData.manager,
              relationship_type: partnerData.relationship_type,
              latitude: partnerData.latitude,
              longitude: partnerData.longitude,
              revenue_last_n_months: partnerData.revenue_last_n_months,
              last_sale_date: partnerData.last_sale_date,
              clients_transferred: partnerData.clients_transferred,
              clients_in_progress: partnerData.clients_in_progress,
              clients_converted: partnerData.clients_converted,
            },
            { transaction }
          )
        } else {
          // Создаем нового партнера (возможно с тем же guid, но другим адресом)
          await PartnerModel.create(
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
        }
      }

      // 3. Удаляем партнеров, которых больше нет в данных
      // Нужно сравнивать по guid + address
      const incomingPartnerKeys = partner.map(
        (p) => `${p.guid}|${p.address}` // Создаем ключ из guid и адреса
      )

      // Находим всех текущих партнеров заявки
      const currentPartners = await PartnerModel.findAll({
        where: { client_request_guid: guid },
        transaction,
      })

      // Удаляем тех, чей ключ (guid+address) отсутствует в новых данных
      for (const currentPartner of currentPartners) {
        const currentKey = `${currentPartner.guid}|${currentPartner.address}`
        if (!incomingPartnerKeys.includes(currentKey)) {
          await currentPartner.destroy({ transaction })
        }
      }

      // 4. Обновляем товары партнеров
      for (const partnerData of partner) {
        // Находим партнера по всем трем критериям
        const partnerRecord = await PartnerModel.findOne({
          where: {
            guid: partnerData.guid,
            client_request_guid: guid,
            address: partnerData.address,
          },
          transaction,
        })

        if (
          partnerRecord &&
          partnerData.products &&
          partnerData.products.length > 0
        ) {
          // Удаляем старые товары партнера
          await PartnerProductModel.destroy({
            where: {
              partner_guid: partnerRecord.guid,
            },
            transaction,
          })

          // Создаем новые товары
          const products = partnerData.products.map((product) => ({
            ...product,
            partner_guid: partnerRecord.guid,
          }))
          await PartnerProductModel.bulkCreate(products, { transaction })
        }
      }

      await transaction.commit()

      // 5. Получаем обновленные данные
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
      console.error('Ошибка при создании/обновлении заявки:', error)
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
    requestGuid,
  }: {
    partnerGuid: string
    requestGuid: string
  }): Promise<{
    success: boolean
    message?: string
    error?: string
  }> {
    try {
      const clientRequest = await ClientRequestModel.findByPk(requestGuid)
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

      if (process.env.ALLOW_EXTERNAL_API !== 'true') {
        // const client = await soap.createClientAsync(
        //   process.env.TRANSFER_CLIENTS_SOAP_URL as string,
        //   {
        //     wsdl_headers: {
        //       Authorization: `Basic ${stringToBase64(
        //         `${process.env.USERNAME_1C}:${process.env.PASSWORD_1C}`
        //       )}`,
        //     },
        //   }
        // )

        // client.setSecurity(
        //   new soap.BasicAuthSecurity(
        //     process.env.USERNAME_1C as string,
        //     process.env.PASSWORD_1C as string
        //   )
        // )

        // const [result] = await client.AssignClientAsync({
        //   data: JSON.stringify({
        //     requestGuid,
        //     partnerGuid,
        //   }),
        // })

        // console.log({ result })

        // Обновляем заявку
        clientRequest.partnerGuid = partnerGuid
        await clientRequest.save()

        return {
          success: true,
          message: 'Клиент успешно передан партнеру',
        }
      }

      return {
        success: false,
        error: 'Отключен доступ к API',
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
