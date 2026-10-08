const { Model, DataTypes } = require('sequelize');

class HardwareComponent extends Model {}

module.exports = (sequelize) => {
  HardwareComponent.init({
    component_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    category: { type: DataTypes.STRING(50), allowNull: false }, // 'cpu', 'gpu', 'ram', 'storage', 'monitor', 'gear'
    name: { type: DataTypes.STRING(255), allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, {
    sequelize,
    modelName: 'HardwareComponent',
    tableName: 'hardware_component',
    timestamps: false
  });

  HardwareComponent.associate = (models) => {
    HardwareComponent.belongsToMany(models.HardwareProfile, {
      through: 'profile_component',
      foreignKey: 'component_id',
      otherKey: 'profile_id',
      timestamps: false
    });
  };

  return HardwareComponent;
};
