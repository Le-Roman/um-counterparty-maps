'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = await queryInterface
      .showAllTables()
      .then((tables) => tables.includes('partners'))
      .catch(() => false)

    if (!tableExists) {
      await queryInterface.createTable('partners', {
        id: {
          type: Sequelize.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
          comment: 'Уникальный идентификатор записи',
        },
        guid: {
          type: Sequelize.STRING(36),
          allowNull: false,
          comment: 'Уникальный идентификатор партнера',
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false,
          comment: 'Наименование партнера',
        },
        price: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'Ценовая политика',
        },
        priority: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Приоритет (1 - приоритетный)',
        },
        phone: {
          type: Sequelize.STRING(50),
          allowNull: true,
          comment: 'Телефон',
        },
        email: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'Email',
        },
        manager: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'ФИО менеджера',
        },
        relationship_type: {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: 'Тип отношений',
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
        revenue_last_n_months: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 0,
          comment: 'Общий оборот за n месяцев',
        },
        last_sale_date: {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: 'Дата последнего заказа',
        },
        clients_transferred: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Передано клиентов',
        },
        clients_in_progress: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'В работе клиентов',
        },
        clients_converted: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Сработано клиентов',
        },
        client_request_guid: {
          type: Sequelize.STRING(36),
          allowNull: true,
          comment: 'Ссылка на заявку клиента',
          references: {
            model: 'client_requests',
            key: 'guid',
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
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

      await queryInterface.addIndex(
        'partners',
        ['guid', 'client_request_guid'],
        {
          name: 'idx_partners_guid_client_request',
          unique: true,
        }
      )

      await queryInterface.addIndex('partners', ['priority'], {
        name: 'idx_partners_priority',
      })

      console.log('✅ Таблица partners создана')
    }
  },

  async down(queryInterface) {
    if (process.env.NODE_ENV === 'production') {
      console.error('🚫 Откат миграции в production запрещен!')
      return
    }
    await queryInterface.dropTable('partners')
  },
}
