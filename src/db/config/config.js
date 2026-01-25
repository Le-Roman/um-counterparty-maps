require('dotenv').config()

/**
 * @type {import('sequelize').Options}
 */
const development = {
  username: process.env.DEV_DB_USERNAME || '',
  password: process.env.DEV_DB_PASSWORD || '',
  database: process.env.DEV_DB || '',
  host: process.env.DEV_DB_HOST || 'localhost',
  dialect: 'mysql',
  logging: console.log,
  timezone: '+03:00',
}

/**
 * @type {import('sequelize').Options}
 */
const test = {
  username: 'root',
  password: null,
  database: 'database_test',
  host: '127.0.0.1',
  dialect: 'mysql',
  logging: false,
  timezone: '+03:00',
}

/**
 * @type {import('sequelize').Options}
 */
const production = {
  username: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || '',
  host: process.env.DB_HOST || 'localhost',
  dialect: 'mysql',
  logging: false,
  timezone: '+03:00',
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
}

module.exports = {
  development,
  test,
  production,
}
