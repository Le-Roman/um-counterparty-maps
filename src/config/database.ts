import { Sequelize } from 'sequelize'
import { initCounterpartyModel } from '../db/models/Counterparty'
import { initCompetitorModel } from '../db/models/Competitor'
import { initClientRequestModel } from '../db/models/ClientRequest'
import { initPartnerModel } from '../db/models/Partner'
import { initPartnerProductModel } from '../db/models/PartnerProduct'
import { initYandexApiKeyModel } from '../db/models/YandexApiKey'
import { initializeLimitResetScheduler } from '../utils/limitResetScheduler'
import dbConfig from '../db/config'

// Определяем конфигурацию подключения на основе NODE_ENV
const getSequelizeConfig = () => {
  const env = process.env.NODE_ENV || 'development'

  // Используем конфиг из файла конфигурации
  const config = dbConfig[env]

  if (!config) {
    throw new Error(
      `Конфигурация для среды ${env} не найдена в src/db/config/config.js`
    )
  }

  return config
}

const config = getSequelizeConfig()
const { database, username, password, host, ...options } = config

const sequelize = new Sequelize(
  database as string,
  username as string,
  password as string,
  {
    host: host as string,
    // Дополнительные опции из конфига
    ...options,
  }
)

// Инициализация моделей и связей
export const initializeDatabase = async (): Promise<void> => {
  try {
    initYandexApiKeyModel(sequelize)

    // Инициализация моделей для конкурентов
    const Counterparty = initCounterpartyModel(sequelize)
    const Competitor = initCompetitorModel(sequelize)

    // Настройка связей
    Counterparty.hasMany(Competitor, {
      foreignKey: 'counterpartyGuid',
      as: 'competitors',
    })

    Competitor.belongsTo(Counterparty, {
      foreignKey: 'counterpartyGuid',
      as: 'counterparty',
    })

    // Инициализация моделей для партнеров
    const ClientRequest = initClientRequestModel(sequelize)
    const Partner = initPartnerModel(sequelize)
    const PartnerProduct = initPartnerProductModel(sequelize)

    // Настройка связей
    ClientRequest.hasMany(Partner, {
      foreignKey: 'client_request_guid',
      as: 'partners',
    })

    Partner.belongsTo(ClientRequest, {
      foreignKey: 'client_request_guid',
      as: 'clientRequest',
    })

    Partner.hasMany(PartnerProduct, {
      foreignKey: 'partner_guid',
      as: 'products',
    })

    PartnerProduct.belongsTo(Partner, {
      foreignKey: 'partner_guid',
      as: 'partner',
    })

    await sequelize.authenticate()
    console.log('✅ База данных подключена')
  } catch (error) {
    console.error('❌ Ошибка подключения к БД:', error)
    throw error
  }
}

export const initializeSchedulers = (): void => {
  initializeLimitResetScheduler()
}

export default sequelize
