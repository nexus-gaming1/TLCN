const { Model, DataTypes } = require('sequelize');

class ComboPackage extends Model {
  isTimeValid(currentTime) {
    if (!this.start_time_limit && !this.end_time_limit) return true;
    const timeStr = typeof currentTime === 'string'
      ? currentTime
      : (currentTime instanceof Date ? currentTime.toTimeString().slice(0, 8) : String(currentTime));
    const start = this.start_time_limit;
    const end = this.end_time_limit;
    if (start && end) {
      if (start <= end) {
        return timeStr >= start && timeStr <= end;
      } else {
        // Overnight window e.g. 23:00 to 06:00
        return timeStr >= start || timeStr <= end;
      }
    }
    if (start && timeStr < start) return false;
    if (end && timeStr > end) return false;
    return true;
  }

  canApplyToZone(zoneTier) {
    if (!this.allowed_tier) return true;
    return Number(zoneTier) <= Number(this.allowed_tier);
  }

  async getComboItems() {
    const ComboItem = this.sequelize.models.ComboItem;
    return await ComboItem.findAll({
      where: { combo_id: this.combo_id },
      include: [{ model: this.sequelize.models.ServiceItem, as: 'serviceItem' }]
    });
  }

  updateInfo(price, duration, isActive, description = undefined) {
    this.price = price;
    this.duration_minutes = duration;
    this.is_active = isActive;
    if (description !== undefined) this.description = description;
    return this.save();
  }
}

module.exports = (sequelize) => {
  ComboPackage.init({
    combo_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    duration_minutes: { type: DataTypes.INTEGER, allowNull: false },
    start_time_limit: { type: DataTypes.TIME },
    end_time_limit: { type: DataTypes.TIME },
    allowed_tier: { type: DataTypes.INTEGER },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, {
    sequelize,
    modelName: 'ComboPackage',
    tableName: 'combo_package',
    timestamps: false
  });

  ComboPackage.associate = (models) => {
    ComboPackage.hasMany(models.ComboItem, { foreignKey: 'combo_id', as: 'comboItems', onDelete: 'CASCADE' });
    ComboPackage.belongsToMany(models.ServiceItem, { through: models.ComboItem, foreignKey: 'combo_id', as: 'serviceItems' });
    ComboPackage.hasMany(models.ServiceOrder, { foreignKey: 'combo_id', as: 'serviceOrders' });
  };

  return ComboPackage;
};