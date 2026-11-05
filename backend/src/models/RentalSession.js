const { Model, DataTypes } = require('sequelize');

const RentalSessionStatus = Object.freeze({
  ACTIVE: 'ACTIVE',
  ENDED: 'ENDED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  LOGGED_OUT: 'LOGGED_OUT'
});

const BillingMode = Object.freeze({
  COMBO: 'COMBO',
  PAY_AS_YOU_GO: 'PAY_AS_YOU_GO'
});

class RentalSession extends Model {}

module.exports = (sequelize) => {
  RentalSession.init({
    rental_session_id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    computer_id: { type: DataTypes.INTEGER, allowNull: false },
    member_id: { type: DataTypes.INTEGER, allowNull: false },
    combo_time_id: { type: DataTypes.INTEGER, allowNull: true },
    billing_mode: {
      type: DataTypes.ENUM(...Object.values(BillingMode)),
      allowNull: false,
      defaultValue: BillingMode.PAY_AS_YOU_GO
    },
    status: {
      type: DataTypes.ENUM(...Object.values(RentalSessionStatus)),
      allowNull: false,
      defaultValue: RentalSessionStatus.ACTIVE
    },
    started_at: { type: DataTypes.DATE, allowNull: false },
    last_billed_at: { type: DataTypes.DATE, allowNull: false },
    ended_at: { type: DataTypes.DATE, allowNull: true },
    total_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 }
  }, {
    sequelize,
    modelName: 'RentalSession',
    tableName: 'rental_session',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  RentalSession.associate = (models) => {
    RentalSession.belongsTo(models.Computer, { foreignKey: 'computer_id', as: 'computer' });
    RentalSession.belongsTo(models.Member, { foreignKey: 'member_id', as: 'member' });
    RentalSession.belongsTo(models.ComboTime, { foreignKey: 'combo_time_id', as: 'comboTime' });
  };

  RentalSession.Status = RentalSessionStatus;
  RentalSession.BillingMode = BillingMode;
  return RentalSession;
};
