const { Model, DataTypes } = require('sequelize');

class Member extends Model {
  topUp(amount, isBonus = false) {
    if (isBonus) this.bonus_balance = parseFloat(this.bonus_balance || 0) + amount;
    else this.real_balance = parseFloat(this.real_balance || 0) + amount;
    return this.save();
  }

  withdraw(amount) {
    this.real_balance = parseFloat(this.real_balance || 0) - amount;
    return this.save();
  }

  addPoint(point) {
    this.point = (this.point || 0) + point;
    return this.save();
  }

  deductPoint(point) {
    this.point = (this.point || 0) - point;
    return this.save();
  }

  deductRealBalance(amount) {
    this.real_balance = parseFloat(this.real_balance || 0) - amount;
    return this.save();
  }

  deductBonusBalance(amount) {
    this.bonus_balance = parseFloat(this.bonus_balance || 0) - amount;
    return this.save();
  }

  changeRank(newRank) {
    this.rank_id = typeof newRank === 'object' ? newRank.rank_id : newRank;
    return this.save();
  }

  canPay(amount) {
    return (parseFloat(this.real_balance || 0) + parseFloat(this.bonus_balance || 0)) >= amount;
  }

  updateProfile({ phone }) {
    if (phone !== undefined) this.phone = phone;
    return this.save();
  }
}

module.exports = (sequelize) => {
  Member.init({
    member_id: { type: DataTypes.INTEGER, primaryKey: true },
    phone: { type: DataTypes.STRING(20) },
    real_balance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    bonus_balance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    point: { type: DataTypes.INTEGER, defaultValue: 0 },
    rank_id: { type: DataTypes.INTEGER }
  }, {
    sequelize,
    modelName: 'Member',
    tableName: 'members',
    timestamps: false
  });

  Member.associate = (models) => {
    Member.belongsTo(models.User, { foreignKey: 'member_id', as: 'userInfo' });
    Member.belongsTo(models.MembershipRank, { foreignKey: 'rank_id' });
    Member.hasMany(models.ComputerStatusLog, { foreignKey: 'member_id' });
    Member.hasMany(models.ServiceOrder, { foreignKey: 'used_by' });
    Member.hasMany(models.FinancialTransaction, { foreignKey: 'used_by' });
  };

  return Member;
};
