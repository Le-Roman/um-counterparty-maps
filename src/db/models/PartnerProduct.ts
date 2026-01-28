import { DataTypes, Model, Optional, Sequelize } from 'sequelize'
import moment from 'moment'
import { PartnerProduct } from '../../types/partners'
import { formatAmount } from '../../utils/formatAmount'

interface PartnerProductAttributes extends PartnerProduct {
  formatted_oborot?: string
}

interface PartnerProductCreationAttributes
  extends Optional<PartnerProductAttributes, 'id' | 'formatted_oborot'> {}

class PartnerProductModel
  extends Model<PartnerProductAttributes, PartnerProductCreationAttributes>
  implements PartnerProductAttributes
{
  public id!: number
  public partner_guid!: string
  public name!: string
  public oborot!: number
  public formatted_oborot?: string
  public last_sale_date_product!: string
  public readonly created_at!: Date
  public readonly updated_at!: Date
}

export const initPartnerProductModel = (
  sequelize: Sequelize
): typeof PartnerProductModel => {
  PartnerProductModel.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      partner_guid: {
        type: DataTypes.STRING(36),
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      oborot: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        set(value: number) {
          if (!value) return 0
          this.setDataValue('oborot', Math.floor(value))
        },
      },
      formatted_oborot: {
        type: DataTypes.VIRTUAL,
        get() {
          const oborot = this.getDataValue('oborot')
          return formatAmount(oborot, { currency: 'RUB' })
        },
      },
      last_sale_date_product: {
        type: DataTypes.STRING(100),
        get() {
          const rawValue = this.getDataValue('last_sale_date_product')
          return rawValue ? moment(rawValue).format('DD.MM.YYYY') : null
        },
      },
    },
    {
      sequelize,
      tableName: 'partner_products',
      modelName: 'PartnerProduct',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  )

  return PartnerProductModel
}

export default PartnerProductModel
