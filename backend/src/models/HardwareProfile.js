const { Model, DataTypes } = require('sequelize');

class HardwareProfile extends Model {
  softDelete(options = {}) {
    this.is_deleted = true;
    this.deleted_at = new Date();
    this.is_active = false;
    return this.save(options);
  }

  restore(options = {}) {
    this.is_deleted = false;
    this.deleted_at = null;
    this.is_active = true;
    return this.save(options);
  }
}

module.exports = (sequelize) => {
  HardwareProfile.init({
    profile_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    profile_name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT },
    cpu_model: { type: DataTypes.STRING(255), allowNull: true },
    gpu_model: { type: DataTypes.STRING(255), allowNull: true },
    ram_capacity: { type: DataTypes.STRING(100), allowNull: true },
    storage_type: { type: DataTypes.STRING(255), allowNull: true },
    monitor: { type: DataTypes.STRING(255), allowNull: true },
    gear: { type: DataTypes.STRING(255), allowNull: true },
    zone_id: { type: DataTypes.INTEGER, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true, allowNull: false },
    is_deleted: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
    deleted_at: { type: DataTypes.DATE, allowNull: true, defaultValue: null }
  }, {
    sequelize,
    modelName: 'HardwareProfile',
    tableName: 'hardware_profile',
    timestamps: false
  });

    HardwareProfile.associate = (models) => {
      HardwareProfile.belongsTo(models.ComputerZone, { foreignKey: 'zone_id' });
      HardwareProfile.hasMany(models.Computer, { foreignKey: 'hardware_profile_id' });
      if (models.HardwareComponent) {
        HardwareProfile.belongsToMany(models.HardwareComponent, {
          through: 'profile_component',
          foreignKey: 'profile_id',
          otherKey: 'component_id',
          timestamps: false
        });
      }
    };

  return HardwareProfile;
};
