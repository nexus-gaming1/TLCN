const { Model, DataTypes } = require('sequelize');
const { OrderStatus, PaymentStatus } = require('../constants/enums');

class ServiceOrder extends Model {
  async addOrderItem(serviceItem, quantity = 1, isComboItem = false, transaction = null) {
    const ServiceOrderItem = this.sequelize.models.ServiceOrderItem;
    const price = isComboItem ? 0.00 : parseFloat(serviceItem.price || 0);
    return await ServiceOrderItem.create({
      order_id: this.order_id,
      service_item_id: serviceItem.service_item_id,
      quantity,
      item_name: serviceItem.name,
      price,
      is_combo_item: isComboItem
    }, { transaction });
  }

  async attachComboTime(comboTime, transaction = null) {
    if (!comboTime) throw new Error('ComboTime không hợp lệ');
    if (comboTime.order_id && comboTime.order_id !== this.order_id) {
      throw new Error(`ComboTime đã được liên kết với đơn hàng khác (#${comboTime.order_id})`);
    }
    comboTime.order_id = this.order_id;
    if (this.combo_id && !comboTime.combo_id) {
      comboTime.combo_id = this.combo_id;
    }
    if (comboTime.save) {
      await comboTime.save({ transaction });
    }
    this.comboTime = comboTime;
    return comboTime;
  }

  calculateTotal() {
    let total = 0;
    const pkg = this.comboPackage || this.ComboPackage;
    if (pkg && pkg.price !== undefined) {
      total += parseFloat(pkg.price || 0);
    } else if (this.total_amount && parseFloat(this.total_amount) > 0 && !this.orderItems && !this.ServiceOrderItems) {
      return parseFloat(this.total_amount);
    }

    const items = this.orderItems || this.ServiceOrderItems || [];
    if (Array.isArray(items)) {
      for (const item of items) {
        // Services included in combo (is_combo_item = true) are not billed extra
        if (!item.is_combo_item && parseFloat(item.price || 0) > 0) {
          total += parseFloat(item.price || 0) * (item.quantity || 1);
        }
      }
    }

    return Math.round(total * 100) / 100;
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
    processed_by: { type: DataTypes.INTEGER },
    combo_id: { type: DataTypes.INTEGER, allowNull: true },
    total_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 }
  }, {
    sequelize,
    modelName: 'ServiceOrder',
    tableName: 'service_order',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  ServiceOrder.associate = (models) => {
    ServiceOrder.belongsTo(models.Member, { foreignKey: 'used_by', as: 'member' });
    ServiceOrder.belongsTo(models.User, { foreignKey: 'processed_by', as: 'processedBy' });
    ServiceOrder.belongsTo(models.ComboPackage, { foreignKey: 'combo_id', as: 'comboPackage' });
    ServiceOrder.hasMany(models.ServiceOrderItem, { foreignKey: 'order_id', as: 'orderItems', onDelete: 'CASCADE' });
    ServiceOrder.belongsToMany(models.ServiceItem, { through: models.ServiceOrderItem, foreignKey: 'order_id' });
    ServiceOrder.hasOne(models.ComboTime, { foreignKey: 'order_id', as: 'comboTime', onDelete: 'CASCADE' });
    ServiceOrder.hasMany(models.FinancialTransaction, { foreignKey: 'order_id', as: 'transactions' });
  };

  return ServiceOrder;
};