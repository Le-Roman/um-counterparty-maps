import { DataTypes, Model, Optional, Sequelize } from 'sequelize'

export interface YandexApiKeyAttributes {
  id: number
  api_key: string
  requests_limit: number
  requests_used: number
  is_active: boolean
  last_used: Date | null
}

interface YandexApiKeyCreationAttributes
  extends Optional<YandexApiKeyAttributes, 'id' | 'requests_used' | 'last_used'> {}

class YandexApiKeyModel
  extends Model<YandexApiKeyAttributes, YandexApiKeyCreationAttributes>
  implements YandexApiKeyAttributes
{
  public id!: number
  public api_key!: string
  public requests_limit!: number
  public requests_used!: number
  public is_active!: boolean
  public last_used!: Date | null
}

export const initYandexApiKeyModel = (sequelize: Sequelize): typeof YandexApiKeyModel => {
  YandexApiKeyModel.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      api_key: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
        },
      },
      requests_limit: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 999,
        validate: {
          min: 1,
        },
      },
      requests_used: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      last_used: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'yandex_api_keys',
      modelName: 'YandexApiKey',
      timestamps: false,
    }
  )

  return YandexApiKeyModel
}

export default YandexApiKeyModel