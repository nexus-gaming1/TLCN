/**
 * Domain & Application Custom Exceptions
 * Giúp tầng Service chỉ ném lỗi nghiệp vụ thuần túy, không phụ thuộc vào HTTP status codes (Tuân thủ SRP)
 */

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Dữ liệu đầu vào không hợp lệ') {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Không tìm thấy tài nguyên yêu cầu') {
    super(message, 404, 'NOT_FOUND');
  }
}

class BusinessLogicError extends AppError {
  constructor(message = 'Vi phạm quy tắc nghiệp vụ hệ thống') {
    super(message, 400, 'BUSINESS_LOGIC_ERROR');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Dữ liệu đã tồn tại hoặc xảy ra xung đột') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Không có quyền truy cập hoặc xác thực thất bại') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  BusinessLogicError,
  ConflictError,
  UnauthorizedError
};
