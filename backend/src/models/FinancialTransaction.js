const { Model, DataTypes } = require('sequelize');
const { TransactionType, TransactionCategory } = require('../constants/enums');

class FinancialTransaction extends Model {
  record() {
    return this.save();
  }

  cancel() {
    this.category = TransactionCategory.REFUND;
    return this.save();
  }

  getSignedAmount() {
    const amt = parseFloat(this.amount || 0);
    return this.type === TransactionType.EXPENSE ? -amt : amt;
  }
}

module.exports = (sequelize) => {
  FinancialTransaction.init({
    transaction_id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    type: { type: DataTypes.ENUM(...Object.values(TransactionType)), allowNull: false },
    category: { type: DataTypes.ENUM(...Object.values(TransactionCategory)), allowNull: false },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    description: { type: DataTypes.TEXT },
    used_by: { type: DataTypes.INTEGER, allowNull: false },
    processed_by: { type: DataTypes.INTEGER }
  }, {
    sequelize,
    modelName: 'FinancialTransaction',
    tableName: 'financial_transaction',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  FinancialTransaction.associate = (models) => {
    FinancialTransaction.belongsTo(models.Member, { foreignKey: 'used_by', as: 'memberInfo' });
    FinancialTransaction.belongsTo(models.User, { foreignKey: 'processed_by', as: 'processedBy' });
  };

  return FinancialTransaction;
};