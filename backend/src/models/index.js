// src/models/index.js
const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/database');
const Enums = require('../constants/enums');

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  port: config.port || 3306,
  dialect: 'mysql',
  logging: false,
  dialectOptions: config.dialectOptions || {} // <-- để nhận SSL từ config nếu có
});

const db = {};

// Tự động đọc tất cả các file model trong thư mục này
fs.readdirSync(__dirname)
  .filter((file) => file.indexOf('.') !== 0 && file !== path.basename(__filename) && file !== 'model.js' && file.slice(-3) === '.js')
  .forEach((file) => {
    const modelFunc = require(path.join(__dirname, file));
    const model = modelFunc(sequelize, DataTypes);
    db[model.name] = model;
  });

// Thiết lập các mối quan hệ (Associations)
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;
db.Enums = Enums;

module.exports = db;