'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Проверяем, существует ли уже таблица
    const tableExists = await queryInterface
      .showAllTables()
      .then((tables) => tables.includes('counterparties'))
      .catch(() => false)

    if (!tableExists) {
      await queryInterface.createTable('counterparties', {
        guid: {
          type: Sequelize.STRING(36),
          primaryKey: true,
          allowNull: false,
          comment: 'Уникальный идентификатор контрагента',
        },
        manager: {
          type: Sequelize.STRING(255),
          allowNull: false,
          comment: 'ФИО менеджера',
        },
        price: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'Ценовая политика',
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
      })
      console.log('✅ Таблица counterparties создана')
    } else {
      console.log(
        '📊 Таблица counterparties уже существует, пропускаем создание'
      )
    }
  },

  async down(queryInterface, Sequelize) {
    // ВНИМАНИЕ: В production эта миграция не должна откатываться!
    // Для безопасности в production можно вывести предупреждение
    if (process.env.NODE_ENV === 'production') {
      console.error('🚫 Откат миграции в production запрещен!')
      return
    }

    // Только для development можно удалить таблицу
    await queryInterface.dropTable('counterparties')
  },
}
