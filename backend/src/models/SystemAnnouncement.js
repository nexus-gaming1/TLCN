const { Model, DataTypes } = require('sequelize');
const { AnnouncementType } = require('../constants/enums');

class SystemAnnouncement extends Model {}

module.exports = (sequelize) => {
  SystemAnnouncement.init({
    announcement_id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    title: { 
      type: DataTypes.STRING(255), 
      allowNull: false 
    },
    content: { 
      type: DataTypes.TEXT, 
      allowNull: false 
    },
    type: { 
      type: DataTypes.ENUM(...Object.values(AnnouncementType)), 
      defaultValue: AnnouncementType.INFO,
      allowNull: false
    },
    is_active: { 
      type: DataTypes.BOOLEAN, 
      defaultValue: true,
      allowNull: false
    },
    created_by: { 
      type: DataTypes.INTEGER, 
      allowNull: false // Admin/Staff tạo thông báo
    }
  }, {
    sequelize,
    modelName: 'SystemAnnouncement',
    tableName: 'system_announcement', 
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  SystemAnnouncement.associate = (models) => {
    SystemAnnouncement.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator', onDelete: 'CASCADE' });
  };

  return SystemAnnouncement;
};