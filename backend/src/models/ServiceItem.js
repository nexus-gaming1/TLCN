const { Model, DataTypes } = require('sequelize');

class ServiceItem extends Model {
  updateInfo(newName) {
    this.name = newName;
    return this.save();
  }

  updatePrice(newPrice) {
    this.price = newPrice;
    return this.save();
  }

  adjustStock(quantity) {
    this.stock_quantity = (this.stock_quantity || 0) + quantity;
    return this.save();
  }

  isAvailable() {
    return this.is_available && (!this.track_inventory || this.stock_quantity > 0);
  }

  calculateFinalPrice(customerRank) {
    const basePrice = parseFloat(this.price || 0);
    if (customerRank && customerRank.rank_level >= this.min_discount_rank) {
      return basePrice - customerRank.calculateDiscount(basePrice);
    }
    return basePrice;
  }
}

module.exports = (sequelize) => {
  ServiceItem.init({
    service_item_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    stock_quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
    is_available: { type: DataTypes.BOOLEAN, defaultValue: true },
    track_inventory: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    min_discount_rank: { type: DataTypes.INTEGER },
    category_id: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    sequelize,
    modelName: 'ServiceItem',
    tableName: 'service_item',
    timestamps: false
  });

  ServiceItem.associate = (models) => {
    ServiceItem.belongsTo(models.ServiceCategory, { foreignKey: 'category_id' });
    ServiceItem.belongsTo(models.MembershipRank, { foreignKey: 'min_discount_rank' });
    ServiceItem.hasMany(models.ComboItem, { foreignKey: 'service_item_id' });
    ServiceItem.hasMany(models.ServiceOrderItem, { foreignKey: 'service_item_id' });
    ServiceItem.belongsToMany(models.ComboPackage, { through: models.ComboItem, foreignKey: 'service_item_id' });
    ServiceItem.belongsToMany(models.ServiceOrder, { through: models.ServiceOrderItem, foreignKey: 'service_item_id' });
  };

  return ServiceItem;
};