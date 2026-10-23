const { Model, DataTypes } = require('sequelize');

class ServiceOrderItem extends Model {
  calculateSubtotal() {
    return (this.quantity || 0) * parseFloat(this.price || 0);
  }

  async getOriginalItem() {
    const ServiceItem = this.sequelize.models.ServiceItem;
    return await ServiceItem.findByPk(this.service_item_id);
  }
}

module.exports = (sequelize) => {
  ServiceOrderItem.init({
    order_id: { type: DataTypes.INTEGER, primaryKey: true },
    service_item_id: { type: DataTypes.INTEGER, primaryKey: true },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    item_name: { type: DataTypes.STRING(100), allowNull: false },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    is_combo_item: { type: DataTypes.BOOLEAN, defaultValue: false }
  }, {
    sequelize,
    modelName: 'ServiceOrderItem',
    tableName: 'service_order_item',
    timestamps: false
  });

  ServiceOrderItem.associate = (models) => {
    ServiceOrderItem.belongsTo(models.ServiceOrder, { foreignKey: 'order_id', as: 'order' });
    ServiceOrderItem.belongsTo(models.ServiceItem, { foreignKey: 'service_item_id', as: 'serviceItem' });
  };

  return ServiceOrderItem;
};