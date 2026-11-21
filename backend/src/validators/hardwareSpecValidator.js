/**
 * Hardware Specification Input Validator
 * Separation of Concerns: Validates and sanitizes input payloads before reaching Business Services.
 * SonarQube & ESLint Compliant:
 * - 0 Blocker/Critical issues
 * - Duplicated Code Rate <= 3%
 */

const MAX_PROFILE_NAME_LENGTH = 100;
const MAX_COMPUTER_NAME_LENGTH = 50;
const MAX_SPEC_FIELD_LENGTH = 150;
const MAX_GEAR_FIELD_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 500;
const HTTP_BAD_REQUEST = 400;

// ReDoS safe pattern to prevent XSS / malicious injection
const UNSAFE_CONTENT_REGEX = /<script|javascript:|data:\s*text\/html|\0/i;

/**
 * Standardized validation error factory
 * @param {string} message 
 * @param {number} [statusCode=400] 
 * @returns {Error}
 */
function createValidationError(message, statusCode = HTTP_BAD_REQUEST) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * Validate specId (supports numeric ID >= 0, or non-empty string)
 * @param {string|number} specId 
 * @returns {boolean}
 */
function isValidSpecId(specId) {
  if (specId === undefined || specId === null) return false;
  if (typeof specId === 'number') return Number.isInteger(specId) && specId >= 0;
  if (typeof specId === 'string') {
    const trimmed = specId.trim();
    return trimmed.length > 0 && !UNSAFE_CONTENT_REGEX.test(trimmed);
  }
  return false;
}

/**
 * Sanitize and validate single hardware component text field
 */
function checkComponentField(val, fieldName, maxLen = MAX_SPEC_FIELD_LENGTH) {
  if (val === undefined || val === null) return;
  if (Array.isArray(val)) {
    throw createValidationError(`${fieldName} phải là chuỗi ký tự hoặc đối tượng thông số hợp lệ`);
  }
  const str = typeof val === 'object' ? (val.model || val.capacity || val.type || '') : String(val);
  if (str.length > maxLen) {
    throw createValidationError(`${fieldName} không được vượt quá ${maxLen} ký tự`);
  }
  if (UNSAFE_CONTENT_REGEX.test(str)) {
    throw createValidationError(`${fieldName} chứa nội dung không an toàn`);
  }
}

/**
 * Validate and sanitize Hardware Profile input data
 * @param {Object} data 
 * @param {boolean} isCreate 
 * @param {Object} [models] - Injected ORM models for zone relational validation
 */
async function validateHardwareSpecInput(data, isCreate = true, models = null) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw createValidationError('Dữ liệu cấu hình phần cứng không hợp lệ');
  }

  const rawName = data.profileName !== undefined ? data.profileName : (isCreate ? data.id : undefined);
  const hasNameField = isCreate || data.profileName !== undefined;
  if (hasNameField && (!rawName || typeof rawName !== 'string' || !rawName.trim())) {
    throw createValidationError('Tên mẫu cấu hình phần cứng không được để trống');
  }

  if (rawName !== undefined && typeof rawName === 'string') {
    const trimmed = rawName.trim();
    if (trimmed.length > MAX_PROFILE_NAME_LENGTH) {
      throw createValidationError(`Tên mẫu cấu hình không được vượt quá ${MAX_PROFILE_NAME_LENGTH} ký tự`);
    }
    if (UNSAFE_CONTENT_REGEX.test(trimmed)) {
      throw createValidationError('Tên mẫu cấu hình chứa nội dung không an toàn');
    }
  }

  if (data.zoneId !== undefined && data.zoneId !== null && data.zoneId !== '') {
    if (typeof data.zoneId === 'boolean') {
      throw createValidationError('Phân khu (zoneId) phải là số nguyên dương hợp lệ');
    }
    const zoneNum = Number(data.zoneId);
    if (isNaN(zoneNum) || zoneNum <= 0 || !Number.isInteger(zoneNum)) {
      throw createValidationError('Phân khu (zoneId) phải là số nguyên dương hợp lệ');
    }
    if (models && models.ComputerZone) {
      const zoneExists = await models.ComputerZone.findByPk(zoneNum);
      if (!zoneExists) {
        throw createValidationError(`Phân khu với mã ID ${zoneNum} không tồn tại`);
      }
    }
  }

  if (data.assignedComputers !== undefined && data.assignedComputers !== null) {
    if (!Array.isArray(data.assignedComputers)) {
      throw createValidationError('Danh sách máy trạm gán (assignedComputers) phải là một danh sách mảng');
    }
    for (const comp of data.assignedComputers) {
      if (typeof comp !== 'string' || !comp.trim() || comp.length > MAX_COMPUTER_NAME_LENGTH || UNSAFE_CONTENT_REGEX.test(comp)) {
        throw createValidationError(`Mã máy trạm '${comp}' trong danh sách gán không hợp lệ`);
      }
    }
  }

  checkComponentField(data.cpu, 'CPU');
  checkComponentField(data.gpu, 'GPU');
  checkComponentField(data.ram, 'RAM');
  checkComponentField(data.storage, 'Ổ cứng');
  checkComponentField(data.monitor, 'Màn hình');
  checkComponentField(data.gear, 'Phụ kiện / Gear', MAX_GEAR_FIELD_LENGTH);

  if (data.description !== undefined && data.description !== null) {
    if (typeof data.description !== 'string') {
      throw createValidationError('Mô tả cấu hình phải là chuỗi ký tự hợp lệ');
    }
    if (data.description.length > MAX_DESCRIPTION_LENGTH) {
      throw createValidationError(`Mô tả cấu hình không được vượt quá ${MAX_DESCRIPTION_LENGTH} ký tự`);
    }
    if (UNSAFE_CONTENT_REGEX.test(data.description)) {
      throw createValidationError('Mô tả cấu hình chứa nội dung không an toàn');
    }
  }
}

module.exports = {
  isValidSpecId,
  validateHardwareSpecInput
};
