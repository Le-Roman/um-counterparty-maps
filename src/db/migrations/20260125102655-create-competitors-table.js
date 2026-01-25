'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction()

    try {
      // Проверяем, существует ли таблица counterparties
      const counterpartiesExists = await queryInterface
        .showAllTables()
        .then((tables) => tables.includes('counterparties'))
        .catch(() => false)

      if (!counterpartiesExists) {
        throw new Error(
          'Таблица counterparties должна существовать перед созданием competitors'
        )
      }

      const tableExists = await queryInterface
        .showAllTables()
        .then((tables) => tables.includes('competitors'))
        .catch(() => false)

      if (!tableExists) {
        await queryInterface.createTable(
          'competitors',
          {
            id: {
              type: Sequelize.INTEGER.UNSIGNED,
              primaryKey: true,
              autoIncrement: true,
              comment: 'Уникальный идентификатор конкурента',
            },
            counterpartyGuid: {
              type: Sequelize.STRING(36),
              allowNull: false,
              comment: 'Ссылка на контрагента',
              references: {
                model: 'counterparties',
                key: 'guid',
              },
              onDelete: 'CASCADE',
              onUpdate: 'CASCADE',
            },
            name: {
              type: Sequelize.STRING(255),
              allowNull: false,
              comment: 'Наименование конкурента',
            },
            manager: {
              type: Sequelize.STRING(255),
              allowNull: false,
              comment: 'ФИО менеджера конкурента',
            },
            price: {
              type: Sequelize.STRING(255),
              allowNull: true,
              comment: 'Ценовая политика конкурента',
            },
            revenue_last_3_months: {
              type: Sequelize.DECIMAL(15, 2),
              allowNull: true,
              defaultValue: 0,
              comment: 'Оборот за последние 3 месяца',
            },
            relationship_type: {
              type: Sequelize.STRING(100),
              allowNull: true,
              comment: 'Тип отношений',
            },
            last_sale_date: {
              type: Sequelize.STRING(100),
              allowNull: true,
              comment: 'Дата последней продажи (строка)',
            },
            latitude: {
              type: Sequelize.FLOAT,
              allowNull: true,
              comment: 'Широта',
            },
            longitude: {
              type: Sequelize.FLOAT,
              allowNull: true,
              comment: 'Долгота',
            },
            address: {
              type: Sequelize.TEXT,
              allowNull: false,
              comment: 'Адрес',
            },
            phone: {
              type: Sequelize.STRING(50),
              allowNull: true,
              comment: 'Телефон',
            },
          },
          { transaction }
        )

        // Создаем индексы
        await queryInterface.addIndex('competitors', ['counterpartyGuid'], {
          transaction,
          name: 'idx_competitors_counterpartyGuid',
        })

        await queryInterface.addIndex('competitors', ['name'], {
          transaction,
          name: 'idx_competitors_name',
        })

        console.log('✅ Таблица competitors создана с индексами')
      } else {
        console.log(
          '📊 Таблица competitors уже существует, проверяем структуру'
        )

        // Проверяем отсутствующие колонки
        const columns = await queryInterface.describeTable('competitors')

        const requiredColumns = [
          'counterpartyGuid',
          'name',
          'manager',
          'address',
        ]
        for (const column of requiredColumns) {
          if (!columns[column]) {
            console.warn(
              `⚠️  Колонка ${column} отсутствует в таблице competitors`
            )
          }
        }
      }
      await transaction.commit()
    } catch (error) {
      await transaction.rollback()
      console.error('❌ Ошибка при создании таблицы competitors:', error)
      throw error
    }
  },

  async down(queryInterface, Sequelize) {
    if (process.env.NODE_ENV === 'production') {
      console.error('🚫 Откат миграции в production запрещен!')
      return
    }

    await queryInterface.dropTable('competitors')
  },
}
