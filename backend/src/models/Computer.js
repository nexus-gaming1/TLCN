const { Model, DataTypes } = require('sequelize');
const { ComputerStatus } = require('../constants/enums');

class Computer extends Model {
  async updateStatus(newStatus) {
    this.status = newStatus;
    await this.save();
  }

  lock() {
    this.status = ComputerStatus.LOCKED;
    return this.save();
  }

  unlock() {
    this.status = ComputerStatus.OFFLINE;
    return this.save();
  }

  restart() {
    /* Logic gửi tín hiệu restart */
    return true;
  }

  shutdown() {
    /* Logic gửi tín hiệu shutdown */
    return true;
  }

  pause() {
    this.status = ComputerStatus.PAUSE;
    return this.save();
  }

  resume() {
    this.status = ComputerStatus.IN_USE;
    return this.save();
  }

  sendNotification(_message) {
    /* Logic gửi thông báo tới máy trạm */
    return true;
  }

  setMaintenance() {
    this.status = ComputerStatus.MAINTENANCE;
    return this.save();
  }

  removeMaintenance() {
    this.status = ComputerStatus.OFFLINE;
    return this.save();
  }

  isAvailable() {
    return this.status === ComputerStatus.OFFLINE;
  }
}

module.exports = (sequelize) => {
  Computer.init({
    computer_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    computer_name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    ip_address: { type: DataTypes.STRING(50) },
    mac_address: { type: DataTypes.STRING(50) },
    status: { type: DataTypes.ENUM(...Object.values(ComputerStatus)), defaultValue: ComputerStatus.OFFLINE },

    is_remote_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    zone_id: { type: DataTypes.INTEGER, allowNull: false },
    hardware_profile_id: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    sequelize,
    modelName: 'Computer',
    tableName: 'computer',
    timestamps: false
  });

  Computer.associate = (models) => {
    Computer.belongsTo(models.ComputerZone, { foreignKey: 'zone_id' });
    Computer.belongsTo(models.HardwareProfile, { foreignKey: 'hardware_profile_id' });
    Computer.belongsToMany(models.Game, { through: models.ComputerGame, foreignKey: 'computer_id' });
    Computer.hasMany(models.ComputerStatusLog, { foreignKey: 'computer_id' });
  };

  return Computer;
};