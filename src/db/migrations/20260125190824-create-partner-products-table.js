// src/db/migrations/20260126000002-create-partner-products-table.js
'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = await queryInterface
      .showAllTables()
      .then((tables) => tables.includes('partner_products'))
      .catch(() => false)

    if (!tableExists) {
      await queryInterface.createTable('partner_products', {
        id: {
          type: Sequelize.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
          comment: 'Уникальный идентификатор товара',
        },
        partner_guid: {
          type: Sequelize.STRING(36),
          allowNull: false,
          comment: 'Ссылка на партнера',
          references: {
            model: 'partners',
            key: 'guid',
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false,
          comment: 'Наименование товара',
        },
        oborot: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Оборот по товару',
        },
        last_sale_date_product: {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: 'Дата последней продажи товара',
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

      await queryInterface.addIndex('partner_products', ['partner_guid'], {
        name: 'idx_partner_products_partner_guid',
      })

      console.log('✅ Таблица partner_products создана')
    }
  },

  async down(queryInterface) {
    if (process.env.NODE_ENV === 'production') {
      console.error('🚫 Откат миграции в production запрещен!')
      return
    }
    await queryInterface.dropTable('partner_products')
  },
}
