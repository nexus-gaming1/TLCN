const { Model, DataTypes } = require('sequelize');
const { SupportRequestType, SupportRequestStatus } = require('../constants/enums');

class SupportRequest extends Model {}

module.exports = (sequelize) => {
  SupportRequest.init({
    request_id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    member_id: { 
      type: DataTypes.INTEGER, 
      allowNull: false // phải là hội viên của quán
    },
    computer_id: { 
      type: DataTypes.INTEGER, 
      allowNull: true // Cho phép null khi khách gửi FEEDBACK ngoài quán
    },
    order_id: { 
      type: DataTypes.INTEGER, 
      allowNull: true // Chỉ liên kết khi type = 'ORDER_DISPUTE'
    },
    type: { 
      type: DataTypes.ENUM(...Object.values(SupportRequestType)), 
      defaultValue: SupportRequestType.MACHINE_SUPPORT,
      allowNull: false
    },
    title: { 
      type: DataTypes.STRING(255), 
      allowNull: false 
    },
    description: { 
      type: DataTypes.TEXT, 
      allowNull: true 
    },
    rating: { 
      type: DataTypes.INTEGER, 
      allowNull: true,
      validate: { min: 1, max: 5 } // Nhận giá trị từ 1 đến 5 sao
    },
    status: { 
      type: DataTypes.ENUM(...Object.values(SupportRequestStatus)), 
      defaultValue: SupportRequestStatus.PENDING,
      allowNull: false
    },
    resolved_by: { 
      type: DataTypes.INTEGER, 
      allowNull: true // ID nhân viên xử lý
    },
    resolution_note: { 
      type: DataTypes.TEXT, 
      allowNull: true // Ghi chú của nhân viên sau khi xử lý xong
    }
  }, {
    sequelize,
    modelName: 'SupportRequest',
    tableName: 'support_request', // Tên bảng số ít theo đúng chuẩn nhóm
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  SupportRequest.associate = (models) => {
    // Khóa ngoại bắt buộc: Hội viên
    SupportRequest.belongsTo(models.Member, { foreignKey: 'member_id', as: 'member', onDelete: 'CASCADE' });

    // Các khóa ngoại tùy chọn (cho phép null):
    SupportRequest.belongsTo(models.Computer, { foreignKey: 'computer_id', as: 'computer', onDelete: 'SET NULL' });
    SupportRequest.belongsTo(models.ServiceOrder, { foreignKey: 'order_id', as: 'order', onDelete: 'SET NULL' });
    SupportRequest.belongsTo(models.User, { foreignKey: 'resolved_by', as: 'resolver', onDelete: 'SET NULL' });
  };

  return SupportRequest;
};