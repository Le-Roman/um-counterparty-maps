import { DataTypes, Model, Optional, Sequelize } from 'sequelize'
import { Counterparty } from '../types'

type CounterpartyAttributes = Counterparty

interface CounterpartyCreationAttributes
  extends Optional<CounterpartyAttributes, 'latitude' | 'longitude'> {}

class CounterpartyModel
  extends Model<CounterpartyAttributes, CounterpartyCreationAttributes>
  implements CounterpartyAttributes
{
  public guid!: string
  public manager!: string
  public price!: string
  public latitude!: number
  public longitude!: number
  public address!: string
  public phone!: string
}

export const initCounterpartyModel = (
  sequelize: Sequelize
): typeof CounterpartyModel => {
  CounterpartyModel.init(
    {
      guid: {
        type: DataTypes.STRING(36),
        primaryKey: true,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      manager: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      price: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      latitude: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      longitude: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING(50),
      },
    },
    {
      sequelize,
      tableName: 'counterparties',
      modelName: 'Counterparty',
      timestamps: false,
    }
  )

  return CounterpartyModel
}

export default CounterpartyModel
