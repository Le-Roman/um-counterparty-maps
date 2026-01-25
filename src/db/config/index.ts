import { Options } from 'sequelize'

const jsConfig = require('./config.js')

export type DatabaseConfigs = Record<string, Options>

const config: DatabaseConfigs = jsConfig

export default config
