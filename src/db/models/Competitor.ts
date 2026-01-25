import moment from 'moment'
import { DataTypes, Model, Optional, Sequelize } from 'sequelize'
import { Competitor } from '../../types'
import { formatAmount } from '../../utils/formatAmount'

interface CompetitorAttributes extends Competitor {
  formatted_revenue_last_3_months?: string
}

interface CompetitorCreationAttributes
  extends Optional<
    CompetitorAttributes,
    'id' | 'latitude' | 'longitude' | 'formatted_revenue_last_3_months'
  > {}

class CompetitorModel
  extends Model<CompetitorAttributes, CompetitorCreationAttributes>
  implements CompetitorAttributes
{
  public id!: number
  public counterpartyGuid!: string
  public name!: string
  public manager!: string
  public price!: string
  public revenue_last_3_months!: number
  public formatted_revenue_last_3_months?: string
  public relationship_type!: string
  public last_sale_date!: string
  public latitude!: number
  public longitude!: number
  public address!: string
  public phone!: string
}

export const initCompetitorModel = (
  sequelize: Sequelize
): typeof CompetitorModel => {
  CompetitorModel.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      counterpartyGuid: {
        type: DataTypes.STRING(36),
        allowNull: false,
        references: {
          model: 'counterparties',
          key: 'guid',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      name: {
        type: DataTypes.STRING(255),
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
      },
      revenue_last_3_months: {
        type: DataTypes.DECIMAL(15, 2),
        validate: {
          min: 0,
        },
        get() {
          const rawValue = this.getDataValue('revenue_last_3_months')
          if (!rawValue) return 0
          return Math.floor(rawValue)
        },
      },
      formatted_revenue_last_3_months: {
        type: DataTypes.VIRTUAL,
        get() {
          const revenue = this.getDataValue('revenue_last_3_months')
          let revenueRounded = 0
          if (revenue) revenueRounded = Math.floor(revenue)
          return formatAmount(revenueRounded, {
            currency: 'RUB',
          })
        },
      },
      relationship_type: {
        type: DataTypes.STRING(100),
      },
      last_sale_date: {
        type: DataTypes.STRING(100),
        get() {
          const rawValue = this.getDataValue('last_sale_date')
          return rawValue ? moment(rawValue).format('DD.MM.YYYY') : null
        },
      },
      latitude: {
        type: DataTypes.FLOAT,
      },
      longitude: {
        type: DataTypes.FLOAT,
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      phone: {
        type: DataTypes.STRING(50),
      },
    },
    {
      sequelize,
      tableName: 'competitors',
      modelName: 'Competitor',
      timestamps: false,
      indexes: [
        {
          fields: ['counterpartyGuid'],
        },
        {
          fields: ['name'],
        },
      ],
    }
  )

  return CompetitorModel
}

export default CompetitorModel
