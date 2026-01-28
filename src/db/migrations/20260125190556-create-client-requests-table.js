'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = await queryInterface
      .showAllTables()
      .then((tables) => tables.includes('client_requests'))
      .catch(() => false)

    if (!tableExists) {
      await queryInterface.createTable('client_requests', {
        guid: {
          type: Sequelize.STRING(36),
          primaryKey: true,
          allowNull: false,
          comment: 'Уникальный идентификатор заявки',
        },
        date: {
          type: Sequelize.STRING(100),
          allowNull: false,
          comment: 'Дата создания заявки',
        },
        population: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'Население',
        },
        variant_map: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
          comment: 'Вариант отображения (1 - по типам, 2 - по номенклатуре)',
        },
        partnerGuid: {
          type: Sequelize.STRING(36),
          allowNull: true,
          comment: 'Выбранный партнер',
        },
        buyer_name: {
          type: Sequelize.STRING(255),
          allowNull: false,
          comment: 'ФИО покупателя',
        },
        phone: {
          type: Sequelize.STRING(50),
          allowNull: false,
          comment: 'Телефон',
        },
        address: {
          type: Sequelize.TEXT,
          allowNull: false,
          comment: 'Адрес',
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
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      })

      await queryInterface.addIndex('client_requests', ['partnerGuid'], {
        name: 'idx_client_requests_partnerGuid',
      })

      console.log('✅ Таблица client_requests создана')
    }
  },

  async down(queryInterface) {
    if (process.env.NODE_ENV === 'production') {
      console.error('🚫 Откат миграции в production запрещен!')
      return
    }
    await queryInterface.dropTable('client_requests')
  },
}