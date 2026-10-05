// src/models/Promotion.js
module.exports = (sequelize, DataTypes) => {
    const Promotion = sequelize.define('Promotion', {
        promotion_id: { 
            type: DataTypes.INTEGER, 
            autoIncrement: true, 
            primaryKey: true 
        },
        code: { 
            type: DataTypes.STRING(50), 
            allowNull: false, 
            unique: true 
        },
        name: { 
            type: DataTypes.STRING(150), 
            allowNull: false 
        },
        description: { 
            type: DataTypes.TEXT, 
            allowNull: true 
        },
        discount_type: { 
            type: DataTypes.STRING(50), 
            allowNull: false, 
            defaultValue: 'PERCENTAGE' 
        },
        discount_value: { 
            type: DataTypes.DECIMAL(10, 2), 
            allowNull: false, 
            defaultValue: 0.00 
        },
        max_discount_amount: { 
            type: DataTypes.DECIMAL(10, 2), 
            allowNull: true 
        },
        min_deposit_amount: { 
            type: DataTypes.DECIMAL(10, 2), 
            allowNull: true 
        },
        start_date: { 
            type: DataTypes.DATEONLY, 
            allowNull: true 
        },
        end_date: { 
            type: DataTypes.DATEONLY, 
            allowNull: true 
        },
        schedule_note: { 
            type: DataTypes.STRING(100), 
            allowNull: true 
        },
        target_audience: { 
            type: DataTypes.STRING(50), 
            allowNull: false, 
            defaultValue: 'ALL' 
        },
        status: { 
            type: DataTypes.STRING(30), 
            allowNull: false, 
            defaultValue: 'ACTIVE' 
        },
        budget_spent: { 
            type: DataTypes.DECIMAL(12, 2), 
            allowNull: false, 
            defaultValue: 0.00 
        },
        total_budget: { 
            type: DataTypes.DECIMAL(12, 2), 
            allowNull: false, 
            defaultValue: 60000000.00 
        },
        is_active: { 
            type: DataTypes.BOOLEAN, 
            allowNull: false, 
            defaultValue: true 
        }
    }, { 
        tableName: 'promotions', 
        timestamps: false 
    });

    Promotion.associate = (models) => {
        Promotion.belongsToMany(models.Member, {
            through: 'member_promotion',
            foreignKey: 'promotion_id',
            otherKey: 'member_id',
            timestamps: false
        });
        if (models.ServiceOrder) {
            Promotion.hasMany(models.ServiceOrder, { foreignKey: 'promotion_id' });
        }
        if (models.FinancialTransaction) {
            Promotion.hasMany(models.FinancialTransaction, { foreignKey: 'promotion_id' });
        }
    };

    return Promotion;
};
