// src/config/database.js
const path = require('path');
// Chỉ định đường dẫn tuyệt đối đến .env ở thư mục gốc của backend
// để tránh lỗi "not found" khi cwd thay đổi
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const isCloudDB = process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production';

module.exports = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'game',
    dialect: 'mysql',
     dialectOptions: isCloudDB ? {
        ssl: {
            require: true,
            rejectUnauthorized: false // Bỏ qua xác thực CA khắt khe đối với chứng chỉ tự cấp của Cloud DB
        }
    } : {}
};
