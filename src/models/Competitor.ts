import moment from 'moment'
import { DataTypes, Model, Optional, Sequelize } from 'sequelize'
import { Competitor } from '../types'

interface CompetitorAttributes extends Competitor {}

interface CompetitorCreationAttributes
  extends Optional<CompetitorAttributes, 'id' | 'latitude' | 'longitude'> {}

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
        allowNull: false,
      },
      revenue_last_3_months: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      relationship_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      last_sale_date: {
        type: DataTypes.STRING(100),
        allowNull: false,
        get() {
          const rawValue = this.getDataValue('last_sale_date')
          return rawValue ? moment(rawValue).format('DD.MM.YYYY') : null
        },
        validate: {
          isDate: true,
        },
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
