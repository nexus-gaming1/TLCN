const { Model, DataTypes } = require('sequelize');

class RefreshToken extends Model {
  isExpired() {
    return new Date() > new Date(this.expires_at);
  }
}

module.exports = (sequelize) => {
  RefreshToken.init({
    token_id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    user_id: { 
      type: DataTypes.INTEGER, 
      allowNull: false 
    },
    token_hash: { 
      type: DataTypes.STRING(255), 
      allowNull: false,
      unique: true
    },
    expires_at: { 
      type: DataTypes.DATE, 
      allowNull: false 
    },
    is_revoked: { 
      type: DataTypes.BOOLEAN, 
      defaultValue: false 
    }
  }, {
    sequelize,
    modelName: 'RefreshToken',
    tableName: 'refresh_tokens',
    timestamps: true
  });

  RefreshToken.associate = (models) => {
    RefreshToken.belongsTo(models.User, { foreignKey: 'user_id', onDelete: 'CASCADE' });
  };

  return RefreshToken;
};
