const { Model, DataTypes } = require('sequelize');
const { OrderStatus, PaymentStatus } = require('../constants/enums');

class ServiceOrder extends Model {
  addOrderItem(item, quantity) {
    /* Logic tạo item trong đơn hàng */
  }

  attachComboTime(comboTime) {
    /* Liên kết comboTime với order */
  }

  calculateTotal() {
    /* Logic tính tổng tiền */
    return 0;
  }

  submit() {
    this.status = OrderStatus.PREPARING;
    return this.save();
  }

  updateStatus(newStatus) {
    this.status = newStatus;
    return this.save();
  }

  cancel() {
    this.status = OrderStatus.CANCELLED;
    return this.save();
  }
}

module.exports = (sequelize) => {
  ServiceOrder.init({
    order_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    status: { type: DataTypes.ENUM(...Object.values(OrderStatus)), defaultValue: OrderStatus.PENDING },
    payment_status: { type: DataTypes.ENUM(...Object.values(PaymentStatus)), defaultValue: PaymentStatus.UNPAID },
    used_by: { type: DataTypes.INTEGER, allowNull: false },
    processed_by: { type: DataTypes.INTEGER }
  }, {
    sequelize,
    modelName: 'ServiceOrder',
    tableName: 'service_order',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  ServiceOrder.associate = (models) => {
    ServiceOrder.belongsTo(models.Member, { foreignKey: 'used_by' });
    ServiceOrder.belongsTo(models.User, { foreignKey: 'processed_by' });
    ServiceOrder.hasMany(models.ServiceOrderItem, { foreignKey: 'order_id', onDelete: 'CASCADE' });
    ServiceOrder.belongsToMany(models.ServiceItem, { through: models.ServiceOrderItem, foreignKey: 'order_id' });
    ServiceOrder.hasOne(models.ComboTime, { foreignKey: 'order_id', onDelete: 'CASCADE' });
  };

  return ServiceOrder;
};