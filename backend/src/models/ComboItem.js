const { Model, DataTypes } = require('sequelize');

class ComboItem extends Model {
  async getServiceItem() {
    const ServiceItem = this.sequelize.models.ServiceItem;
    return await ServiceItem.findByPk(this.service_item_id);
  }

  getQuantity() {
    return this.quantity;
  }
}

module.exports = (sequelize) => {
  ComboItem.init({
    combo_id: { type: DataTypes.INTEGER, primaryKey: true },
    service_item_id: { type: DataTypes.INTEGER, primaryKey: true },
    quantity: { type: DataTypes.INTEGER, defaultValue: 1 }
  }, {
    sequelize,
    modelName: 'ComboItem',
    tableName: 'combo_item',
    timestamps: false
  });

  ComboItem.associate = (models) => {
    ComboItem.belongsTo(models.ComboPackage, { foreignKey: 'combo_id', as: 'comboPackage' });
    ComboItem.belongsTo(models.ServiceItem, { foreignKey: 'service_item_id', as: 'serviceItem' });
  };

  return ComboItem;
};
