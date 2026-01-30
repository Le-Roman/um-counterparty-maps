import { DataTypes, Model, Optional, Sequelize } from 'sequelize'
import { Partner } from '../../types/partners'
import { formatAmount } from '../../utils/formatAmount'
import moment from 'moment'

interface PartnerAttributes extends Partner {
  id: number
  formatted_revenue_last_n_months?: string
}

interface PartnerCreationAttributes
  extends Optional<
    PartnerAttributes,
    'id' | 'formatted_revenue_last_n_months'
  > {}

class PartnerModel
  extends Model<PartnerAttributes, PartnerCreationAttributes>
  implements PartnerAttributes
{
  public id!: number
  public guid!: string
  public name!: string
  public price!: string
  public priority!: number
  public phone?: string
  public email?: string
  public manager?: string
  public relationship_type?: string
  public address!: string
  public latitude!: number
  public longitude!: number
  public revenue_last_n_months!: number
  public formatted_revenue_last_n_months?: string
  public last_sale_date?: string
  public clients_transferred!: number
  public clients_in_progress!: number
  public clients_converted!: number
  public client_request_guid?: string
  public readonly created_at!: Date
  public readonly updated_at!: Date
}

export const initPartnerModel = (sequelize: Sequelize): typeof PartnerModel => {
  PartnerModel.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      guid: {
        type: DataTypes.STRING(36),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      price: {
        type: DataTypes.STRING(255),
      },
      priority: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING(50),
      },
      email: {
        type: DataTypes.STRING(255),
      },
      manager: {
        type: DataTypes.STRING(255),
      },
      relationship_type: {
        type: DataTypes.STRING(100),
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
      revenue_last_n_months: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: {
          min: 0,
        },
        set(value: number) {
          if (!value) return 0
          this.setDataValue('revenue_last_n_months', Math.floor(value))
        },
      },
      formatted_revenue_last_n_months: {
        type: DataTypes.VIRTUAL,
        get() {
          const revenue = this.getDataValue('revenue_last_n_months')
          return formatAmount(revenue, { currency: 'RUB' })
        },
      },
      last_sale_date: {
        type: DataTypes.STRING(100),
        get() {
          const rawValue = this.getDataValue('last_sale_date')
          return rawValue ? moment(rawValue).format('DD.MM.YYYY') : null
        },
      },
      clients_transferred: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      clients_in_progress: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      clients_converted: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      client_request_guid: {
        type: DataTypes.STRING(36),
      },
    },
    {
      sequelize,
      tableName: 'partners',
      modelName: 'Partner',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  )

  return PartnerModel
}

export default PartnerModel
