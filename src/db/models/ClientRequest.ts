import { DataTypes, Model, Sequelize } from 'sequelize'
import moment from 'moment'
import { ClientRequest } from '../../types/partners'

type ClientRequestAttributes = ClientRequest

interface ClientRequestCreationAttributes extends ClientRequestAttributes {}

class ClientRequestModel
  extends Model<ClientRequestAttributes, ClientRequestCreationAttributes>
  implements ClientRequestAttributes
{
  public guid!: string
  public date!: string
  public population!: number
  public variant_map!: number
  public partnerGuid!: string | null
  public buyer_name!: string
  public phone!: string
  public address!: string
  public latitude!: number
  public longitude!: number
  public readonly created_at!: Date
  public readonly updated_at!: Date
}

export const initClientRequestModel = (
  sequelize: Sequelize
): typeof ClientRequestModel => {
  ClientRequestModel.init(
    {
      guid: {
        type: DataTypes.STRING(36),
        primaryKey: true,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      date: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      population: {
        type: DataTypes.INTEGER,
      },
      variant_map: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      partnerGuid: {
        type: DataTypes.STRING(36),
      },
      buyer_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING(50),
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      latitude: {
        type: DataTypes.FLOAT,
      },
      longitude: {
        type: DataTypes.FLOAT,
      },
    },
    {
      sequelize,
      tableName: 'client_requests',
      modelName: 'ClientRequest',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  )

  return ClientRequestModel
}

export default ClientRequestModel
