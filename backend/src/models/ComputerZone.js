const { Model, DataTypes } = require('sequelize');
const { ComputerStatus } = require('../constants/enums');

class ComputerZone extends Model {
  async getAvailableComputers() {
    const Computer = this.sequelize.models.Computer;
    return await Computer.findAll({
      where: {
        zone_id: this.zone_id,
        status: ComputerStatus.OFFLINE,
        is_deleted: false
      }
    });
  }

  softDelete() {
    this.is_deleted = true;
    this.deleted_at = new Date();
    return this.save();
  }

  restore() {
    this.is_deleted = false;
    this.deleted_at = null;
    return this.save();
  }
}

module.exports = (sequelize) => {
  ComputerZone.init({
    zone_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    zone_name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT },
    tier_level: { type: DataTypes.INTEGER, defaultValue: 1 },
    max_capacity: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
    code_prefix: { type: DataTypes.STRING(20), allowNull: true, defaultValue: 'PC-' },
    is_deleted: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
    deleted_at: { type: DataTypes.DATE, allowNull: true, defaultValue: null }
  }, {
    sequelize,
    modelName: 'ComputerZone',
    tableName: 'computer_zone',
    timestamps: false
  });

  ComputerZone.associate = (models) => {
    ComputerZone.belongsToMany(models.PricingPlan, { through: models.ZonePricingPlan, foreignKey: 'zone_id' });
    ComputerZone.hasMany(models.Computer, { foreignKey: 'zone_id' });
    if (models.HardwareProfile) {
      ComputerZone.hasMany(models.HardwareProfile, { foreignKey: 'zone_id' });
    }
  };

  return ComputerZone;
};