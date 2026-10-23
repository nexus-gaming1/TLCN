const { Model, DataTypes } = require('sequelize');
const { ComboTimeStatus } = require('../constants/enums');

class ComboTime extends Model {
  isActive() {
    return this.status === ComboTimeStatus.ACTIVE && this.start_time !== null && this.calculateRemainingMinutes() > 0;
  }

  isPending() {
    return this.status === ComboTimeStatus.PENDING;
  }

  isExpired() {
    return this.status === ComboTimeStatus.EXPIRED;
  }

  isCancelled() {
    return this.status === ComboTimeStatus.CANCELLED;
  }

  markExpired() {
    this.status = ComboTimeStatus.EXPIRED;
    return this.save();
  }

  cancel() {
    this.status = ComboTimeStatus.CANCELLED;
    return this.save();
  }

  calculateRemainingMinutes() {
    if (this.status === ComboTimeStatus.PENDING) {
      return this.duration_minutes || 0;
    }
    if (!this.end_time) return 0;
    const now = new Date();
    const end = new Date(this.end_time);
    const diffMs = end - now;
    return Math.max(0, Math.floor(diffMs / (1000 * 60)));
  }

  isValidForZone(zoneTier) {
    if (!this.allowed_tier) return true;
    return Number(zoneTier) <= Number(this.allowed_tier);
  }

  extendEndTime(minutes) {
    const currentEnd = this.end_time ? new Date(this.end_time) : new Date();
    currentEnd.setTime(currentEnd.getTime() + minutes * 60 * 1000);
    this.end_time = currentEnd;
    if (this.duration_minutes !== undefined && this.duration_minutes !== null) {
      this.duration_minutes = (this.duration_minutes || 0) + minutes;
    }
    return this.save();
  }

  activate(computerId = null) {
    if (this.status !== ComboTimeStatus.PENDING && this.status !== ComboTimeStatus.ACTIVE) {
      throw new Error('ComboTime đã kết thúc hoặc không ở trạng thái hợp lệ');
    }
    if (this.status === ComboTimeStatus.PENDING) {
      const now = new Date();
      this.start_time = now;
      const duration = this.duration_minutes || 60;
      this.end_time = new Date(now.getTime() + duration * 60 * 1000);
      this.status = ComboTimeStatus.ACTIVE;
    }
    if (computerId) {
      this.computer_id = computerId;
    }
    return this.save();
  }
}

module.exports = (sequelize) => {
  ComboTime.init({
    combo_time_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    start_time: { type: DataTypes.DATE },
    end_time: { type: DataTypes.DATE },
    status: {
      type: DataTypes.ENUM(...Object.values(ComboTimeStatus)),
      defaultValue: ComboTimeStatus.PENDING
    },
    allowed_tier: { type: DataTypes.INTEGER },
    order_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    combo_id: { type: DataTypes.INTEGER, allowNull: true },
    computer_id: { type: DataTypes.INTEGER, allowNull: true },
    duration_minutes: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    sequelize,
    modelName: 'ComboTime',
    tableName: 'combo_time',
    timestamps: false
  });

  ComboTime.associate = (models) => {
    ComboTime.belongsTo(models.ServiceOrder, { foreignKey: 'order_id', as: 'serviceOrder' });
    ComboTime.belongsTo(models.ComboPackage, { foreignKey: 'combo_id', as: 'comboPackage' });
    ComboTime.belongsTo(models.Computer, { foreignKey: 'computer_id', as: 'computer' });
  };

  return ComboTime;
};
