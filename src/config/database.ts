import { Sequelize } from 'sequelize'
import { initCounterpartyModel } from '../models/Counterparty'
import { initCompetitorModel } from '../models/Competitor'

const sequelize = new Sequelize(
  process.env.DB_NAME || 'maps_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
)

// Инициализация моделей и связей
export const initializeDatabase = async (): Promise<void> => {
  try {
    // Инициализация моделей
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

    await sequelize.authenticate()
    console.log('✅ База данных подключена')

    await sequelize.sync({ force: process.env.NODE_ENV === 'development' })
    console.log('✅ Модели синхронизированы')
  } catch (error) {
    console.error('❌ Ошибка подключения к БД:', error)
    throw error
  }
}

export default sequelize
