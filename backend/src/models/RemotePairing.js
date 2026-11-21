const { Model, DataTypes } = require('sequelize');
const { RemotePairingStatus } = require('../constants/enums');

class RemotePairing extends Model {}

module.exports = (sequelize) => {
  RemotePairing.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    rental_session_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'rental_session',
        key: 'rental_session_id'
      }
    },
    computer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'computer',
        key: 'computer_id'
      }
    },
    pairing_id: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    device_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    device_address: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM(...Object.values(RemotePairingStatus)),
      allowNull: false,
      defaultValue: RemotePairingStatus.PENDING
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    failure_reason: {
      type: DataTypes.STRING(500),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'RemotePairing',
    tableName: 'remote_pairing',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_remote_pairing_session',
        fields: ['rental_session_id']
      },
      {
        name: 'idx_remote_pairing_computer_status',
        fields: ['computer_id', 'status']
      },
      {
        name: 'idx_remote_pairing_expires_status',
        fields: ['status', 'expires_at']
      }
    ]
  });

  RemotePairing.associate = (models) => {
    RemotePairing.belongsTo(models.RentalSession, { foreignKey: 'rental_session_id', as: 'rentalSession' });
    RemotePairing.belongsTo(models.Computer, { foreignKey: 'computer_id', as: 'computer' });
  };

  RemotePairing.Status = RemotePairingStatus;
  return RemotePairing;
};

