const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';

const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '2d';

/**
 * Kiểm tra tính đầy đủ của các biến môi trường bảo mật
 */
const ensureSecretsLoaded = () => {
    if (!ACCESS_TOKEN_SECRET) {
        throw new Error('Cấu hình thiếu: Biến JWT_SECRET chưa được khai báo trong tệp .env');
    }
    if (!REFRESH_TOKEN_SECRET) {
        throw new Error('Cấu hình thiếu: Biến REFRESH_TOKEN_SECRET chưa được khai báo trong tệp .env');
    }
};

/**
 * Tạo SHA-256 Hash từ token chuỗi để lưu trữ an toàn trong Database
 * @param {string} token 
 * @returns {string} hashed hex
 */
const hashToken = (token) => {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
};

/**
 * Tạo ngắn hạn Access Token (15 phút)
 * @param {Object} payload 
 * @returns {string} token
 */
const generateAccessToken = (payload) => {
    ensureSecretsLoaded();
    return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
};

/**
 * Xác thực chuỗi Access Token
 * @param {string} token 
 * @returns {Object} decoded payload
 */
const verifyAccessToken = (token) => {
    ensureSecretsLoaded();
    return jwt.verify(token, ACCESS_TOKEN_SECRET);
};

/**
 * Tạo dài hạn Refresh Token (2 ngày) kèm jti duy nhất chống va chạm hash
 * @param {Object} payload 
 * @returns {string} token
 */
const generateRefreshToken = (payload) => {
    ensureSecretsLoaded();
    const tokenPayload = {
        ...payload,
        jti: crypto.randomUUID()
    };
    return jwt.sign(tokenPayload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
};

/**
 * Xác thực chuỗi Refresh Token
 * @param {string} token 
 * @returns {Object} decoded payload
 */
const verifyRefreshToken = (token) => {
    ensureSecretsLoaded();
    return jwt.verify(token, REFRESH_TOKEN_SECRET);
};

module.exports = {
    ACCESS_TOKEN_SECRET,
    ACCESS_TOKEN_EXPIRES_IN,
    REFRESH_TOKEN_SECRET,
    REFRESH_TOKEN_EXPIRES_IN,
    hashToken,
    generateAccessToken,
    verifyAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    // Alias tương thích ngược cho các module hiện tại
    generateToken: generateAccessToken,
    verifyToken: verifyAccessToken,
};
