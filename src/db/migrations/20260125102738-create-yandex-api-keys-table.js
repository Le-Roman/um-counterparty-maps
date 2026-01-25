'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = await queryInterface
      .showAllTables()
      .then((tables) => tables.includes('yandex_api_keys'))
      .catch(() => false)

    if (!tableExists) {
      await queryInterface.createTable('yandex_api_keys', {
        id: {
          type: Sequelize.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
          comment: 'Уникальный идентификатор ключа',
        },
        api_key: {
          type: Sequelize.STRING(255),
          allowNull: false,
          unique: true,
          comment: 'API ключ Яндекс.Карт',
        },
        requests_limit: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 999,
          comment: 'Лимит запросов в день',
        },
        requests_used: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Использовано запросов',
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          comment: 'Активен ли ключ',
        },
        last_used: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Дата последнего использования',
        },
      })

      console.log('✅ Таблица yandex_api_keys создана')
    } else {
      console.log('📊 Таблица yandex_api_keys уже существует')
    }
  },

  async down(queryInterface, Sequelize) {
    if (process.env.NODE_ENV === 'production') {
      console.error('🚫 Откат миграции в production запрещен!')
      return
    }

    await queryInterface.dropTable('yandex_api_keys')
  },
}
