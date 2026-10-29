const { Model, DataTypes } = require('sequelize');

class Game extends Model {
  updateInfo(name, image) {
    this.name = name;
    this.cover_image_url = image;
    return this.save();
  }

  updatePath(newPath) {
    this.executable_path = newPath;
    return this.save();
  }

  toggleAvailability() {
    this.is_available = !this.is_available;
    return this.save();
  }

  softDelete() {
    this.is_deleted = true;
    this.deleted_at = new Date();
    this.is_available = false;
    return this.save();
  }

  restore() {
    this.is_deleted = false;
    this.deleted_at = null;
    this.is_available = true;
    return this.save();
  }

  async getCategory() {
    const GameCategory = this.sequelize.models.GameCategory;
    return await GameCategory.findByPk(this.category_id);
  }
}

module.exports = (sequelize) => {
  Game.init({
    game_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    cover_image_url: { type: DataTypes.TEXT('long') },
    executable_path: { type: DataTypes.STRING(255) },
    is_remote_supported: { type: DataTypes.BOOLEAN, defaultValue: false },
    is_available: { type: DataTypes.BOOLEAN, defaultValue: true },
    category_id: { type: DataTypes.INTEGER, allowNull: false },
    is_deleted: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
    deleted_at: { type: DataTypes.DATE, allowNull: true, defaultValue: null }
  }, {
    sequelize,
    modelName: 'Game',
    tableName: 'game',
    timestamps: false
  });

  Game.associate = (models) => {
    Game.belongsTo(models.GameCategory, { foreignKey: 'category_id' });
    Game.belongsToMany(models.Computer, { through: models.ComputerGame, foreignKey: 'game_id' });
  };

  return Game;
};