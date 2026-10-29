const { Model, DataTypes } = require('sequelize');
const { UserRole, UserStatus } = require('../constants/enums');

class User extends Model {
  login(_password) {
    return true;
  }

  logout() {
    return true;
  }

  changePassword(_oldPass, _newPass) {
    return true;
  }

  isActive() {
    return this.status === UserStatus.ACTIVE;
  }
}

module.exports = (sequelize) => {
  User.init({
    user_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    avatar_url: { type: DataTypes.TEXT, allowNull: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    full_name: { type: DataTypes.STRING(100), allowNull: false },
    role: { type: DataTypes.ENUM(...Object.values(UserRole)), allowNull: false },
    status: { type: DataTypes.ENUM(...Object.values(UserStatus)), defaultValue: UserStatus.ACTIVE }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: false
  });

  User.associate = (models) => {
    User.hasOne(models.Member, { foreignKey: 'member_id', onDelete: 'CASCADE', as: 'memberProfile' });
    User.hasMany(models.ServiceOrder, { foreignKey: 'processed_by' });
    User.hasMany(models.FinancialTransaction, { foreignKey: 'processed_by' });
    if (models.RefreshToken) {
      User.hasMany(models.RefreshToken, { foreignKey: 'user_id', onDelete: 'CASCADE' });
    }
  };

  return User;
};
