const { Model, DataTypes } = require('sequelize');
const { SessionType } = require('../constants/enums');

class PricingPlan extends Model {
  calculatePrice(minutes) {
    const validMinutes = Math.max(0, Number(minutes) || 0);
    const hourlyRate = Math.max(0, parseFloat(this.price_per_hour || 0));
    return Math.round((hourlyRate / 60) * validMinutes);
  }

  activate() {
    this.is_active = true;
    return this.save();
  }

  deactivate() {
    this.is_active = false;
    return this.save();
  }

  updatePrice(newPrice) {
    this.price_per_hour = newPrice;
    return this.save();
  }

  isApplicable(type, time, zoneId) {
    if (!this.is_active) return false;
    if (this.plan_type && this.plan_type !== type) return false;
    return true;
  }
}

module.exports = (sequelize) => {
  PricingPlan.init({
    pricing_plan_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    price_per_hour: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    plan_type: { type: DataTypes.ENUM(...Object.values(SessionType)), allowNull: false },
    priority: { type: DataTypes.INTEGER, defaultValue: 0 },
    start_time: { type: DataTypes.TIME },
    end_time: { type: DataTypes.TIME },
    apply_date: { type: DataTypes.DATEONLY },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, {
    sequelize,
    modelName: 'PricingPlan',
    tableName: 'pricing_plan',
    timestamps: false
  });

  PricingPlan.associate = (models) => {
    PricingPlan.belongsToMany(models.ComputerZone, { through: models.ZonePricingPlan, foreignKey: 'pricing_plan_id' });
  };

  return PricingPlan;
};