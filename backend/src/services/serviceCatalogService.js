/*Logic nghiệp vụ : 
   - Validations: Tên không rỗng; không trùng tên danh mục/món; price >= 0, stock_quantity >= 0
   - stock_quantity === 0 => is_available = false
   - dùng method adjustStock(quantity) trên instance của model ServiceItem.
   - Không cho phép xóa danh mục nếu đang chứa các món dịch vụ.
*/
const serviceCatalogRepository = require('../repositories/serviceCatalogRepository');

//helper ép kiểu boolean
const toBoolean = (value, defaultValue = true) => {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized !== 'false' && normalized !== '0' && normalized !== '';
  }
  return Boolean(value);
};


class ServiceCatalogService {
  constructor(repository = serviceCatalogRepository) {
    this.repository = repository;
  }

  //--------------------- Service Category logic  ------------------

  //Lấy tất cả danh mục kèm sản phẩm (Gom nhóm)
  async getAllCategoriesWithItems() {
    try {
      return await this.repository.findAllCategoriesWithItems();
    } catch (error) {
      console.error('Lỗi khi lấy danh sách danh mục dịch vụ:', error);
      throw error;
    }
  }

  //Lấy chi tiết danh mục theo ID
  async getCategoryById(categoryId) {
    try {
      const category = await this.repository.findCategoryById(categoryId, true);
      if (!category) {
        const err = new Error('Không tìm thấy danh mục dịch vụ');
        err.statusCode = 404;
        throw err;
      }
      return category;
    } catch (error) {
      console.error('Lỗi khi lấy thông tin danh mục:', error);
      throw error;
    }
  }


  //Tạo danh mục mới và kiểm tra trùng tên
  async createCategory({ name }) {
    try {
      if (!name || !name.trim()) {
        const err = new Error('Tên danh mục không được để trống');
        err.statusCode = 400;
        throw err;
      }

      const existing = await this.repository.findCategoryByName(name.trim());
      if (existing) {
        const err = new Error('Tên danh mục đã tồn tại trong hệ thống');
        err.statusCode = 409;
        throw err;
      }

      return await this.repository.createCategory({ name: name.trim() });
    } catch (error) {
      console.error('Lỗi khi tạo danh mục mới:', error);
      throw error;
    }
  }


  //Cập nhật danh mục
  async updateCategory(categoryId, { name }) {
    try {
      if (!name || !name.trim()) {
        const err = new Error('Tên danh mục không được để trống');
        err.statusCode = 400;
        throw err;
      }

      const category = await this.repository.findCategoryById(categoryId);
      if (!category) {
        const err = new Error('Không tìm thấy danh mục để cập nhật');
        err.statusCode = 404;
        throw err;
      }

      const existing = await this.repository.findCategoryByName(name.trim());
      if (existing && existing.category_id !== parseInt(categoryId, 10)) {
        const err = new Error('Tên danh mục đã trùng với một danh mục khác');
        err.statusCode = 409;
        throw err;
      }

      return await this.repository.updateCategory(category, { name: name.trim() });
    } catch (error) {
      console.error('Lỗi khi cập nhật danh mục:', error);
      throw error;
    }
  }

  
  //Xóa danh mục 
  async deleteCategory(categoryId) {
    try {
      const category = await this.repository.findCategoryById(categoryId);
      if (!category) {
        const err = new Error('Không tìm thấy danh mục để xóa');
        err.statusCode = 404;
        throw err;
      }

      const itemCount = await this.repository.countItemsByCategoryId(categoryId);
      if (itemCount > 0) {
        const err = new Error(`Không thể xóa danh mục đang chứa ${itemCount} món dịch vụ. Vui lòng chuyển hoặc xóa các món dịch vụ trước.`);
        err.statusCode = 400;
        throw err;
      }

      await this.repository.deleteCategory(categoryId);
      return true;
    } catch (error) {
      console.error('Lỗi khi xóa danh mục:', error);
      throw error;
    }
  }

  //--------------------- Service Item logic  ------------------
  //Lấy danh sách tất cả món dịch vụ (hỗ trợ filter)
  async getAllItems(filter = {}) {
    try {
      return await this.repository.findAllItems(filter);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách món dịch vụ:', error);
      throw error;
    }
  }

  
  //Lấy chi tiết món dịch vụ theo ID
  async getItemById(itemId) {
    try {
      const item = await this.repository.findItemById(itemId);
      if (!item) {
        const err = new Error('Không tìm thấy món dịch vụ');
        err.statusCode = 404;
        throw err;
      }
      return item;
    } catch (error) {
      console.error('Lỗi khi lấy chi tiết món dịch vụ:', error);
      throw error;
    }
  }

  //Tạo món dịch vụ mới (Validation giá, tồn kho, kiểm tra trùng tên và kiểm tra tồn tại của danh mục)
  async createItem({ name, price, stock_quantity = 0, is_available = true,track_inventory = true, min_discount_rank = null, category_id }) {
    try {
      if (!name || !name.trim()) {
        const err = new Error('Tên món dịch vụ không được để trống');
        err.statusCode = 400;
        throw err;
      }

      if (price === undefined || price === null || parseFloat(price) < 0) {
        const err = new Error('Giá bán phải lớn hơn hoặc bằng 0');
        err.statusCode = 400;
        throw err;
      }

      const trackInventory = toBoolean(track_inventory, true);
      const stock = trackInventory ? parseInt(stock_quantity, 10) : 0;
      if (trackInventory && (isNaN(stock) || stock < 0)) {
        const err = new Error('Số lượng tồn kho không hợp lệ (phải >= 0)');
        err.statusCode = 400;
        throw err;
      }

      if (!category_id) {
        const err = new Error('Vui lòng chọn danh mục cho món dịch vụ');
        err.statusCode = 400;
        throw err;
      }

      const category = await this.repository.findCategoryById(category_id);
      if (!category) {
        const err = new Error('Danh mục dịch vụ được chọn không tồn tại');
        err.statusCode = 404;
        throw err;
      }

      const existing = await this.repository.findItemByName(name.trim());
      if (existing) {
        const err = new Error('Tên món dịch vụ đã tồn tại trong hệ thống');
        err.statusCode = 409;
        throw err;
      }

      const requestedAvailable = toBoolean(is_available, true);
      // Chỉ ép is_available = false khi món có quản lý tồn kho và tồn kho bằng 0
      const availableStatus = trackInventory
        ? (stock > 0 ? requestedAvailable : false)
        : requestedAvailable;
      return await this.repository.createItem({
        name: name.trim(),
        price: parseFloat(price),
        stock_quantity: stock,
        is_available: availableStatus,
        track_inventory: trackInventory,
        min_discount_rank: min_discount_rank || null,
        category_id: parseInt(category_id, 10)
      });
    } catch (error) {
      console.error('Lỗi khi tạo món dịch vụ:', error);
      throw error;
    }
  }

  
  //Cập nhật thông tin món dịch vụ
  async updateItem(itemId, updateData) {
    try {
      const item = await this.repository.findItemById(itemId);
      if (!item) {
        const err = new Error('Không tìm thấy món dịch vụ để cập nhật');
        err.statusCode = 404;
        throw err;
      }

      const { name, price, stock_quantity, is_available, track_inventory, min_discount_rank, category_id } = updateData;

      if (name !== undefined) {
        if (!name.trim()) {
          const err = new Error('Tên món dịch vụ không được để trống');
          err.statusCode = 400;
          throw err;
        }
        const existing = await this.repository.findItemByName(name.trim());
        if (existing && existing.service_item_id !== parseInt(itemId, 10)) {
          const err = new Error('Tên món dịch vụ đã trùng với một món khác');
          err.statusCode = 409;
          throw err;
        }
        item.name = name.trim();
      }

      if (price !== undefined) {
        if (parseFloat(price) < 0) {
          const err = new Error('Giá bán phải lớn hơn hoặc bằng 0');
          err.statusCode = 400;
          throw err;
        }
        item.price = parseFloat(price);
      }

      if (stock_quantity !== undefined) {
        const stock = parseInt(stock_quantity, 10);
        if (isNaN(stock) || stock < 0) {
          const err = new Error('Số lượng tồn kho không được âm');
          err.statusCode = 400;
          throw err;
        }
        item.stock_quantity = stock;
      }

      if (category_id !== undefined) {
        const category = await this.repository.findCategoryById(category_id);
        if (!category) {
          const err = new Error('Danh mục được chọn không tồn tại');
          err.statusCode = 404;
          throw err;
        }
        item.category_id = parseInt(category_id, 10);
      }

      if (min_discount_rank !== undefined) {
        item.min_discount_rank = min_discount_rank || null;
      }

      if (track_inventory !== undefined) {
        item.track_inventory = toBoolean(track_inventory, true);
        if (!item.track_inventory) {
          item.stock_quantity = 0;
        }
      }
      if (is_available !== undefined) {
        item.is_available = toBoolean(is_available, true);
      }
      // Chỉ tự động ép hết hàng nếu món CÓ quản lý tồn kho và số lượng tồn <= 0
      if (item.track_inventory && item.stock_quantity <= 0) {
        item.is_available = false;
      }
      return await this.repository.updateItem(item, item.dataValues);
    } catch (error) {
      console.error('Lỗi khi cập nhật món dịch vụ:', error);
      throw error;
    }
  }

  
  //Hàm tăng giảm số lượng kho (dành cho nhập hàng hoặc xuất bán)
  async adjustStock(itemId, { quantity }) {
    try {
      const item = await this.repository.findItemById(itemId);
      if (!item) {
        const err = new Error('Không tìm thấy món dịch vụ');
        err.statusCode = 404;
        throw err;
      }
      if (!item.track_inventory) {
        const err = new Error('Món chế biến không quản lý số lượng tồn kho. Vui lòng bật/tắt trạng thái phục vụ thay thế.');
        err.statusCode = 400;
        throw err;
      }

      const adjQty = parseInt(quantity, 10);
      if (isNaN(adjQty)) {
        const err = new Error('Số lượng thay đổi tồn kho không hợp lệ');
        err.statusCode = 400;
        throw err;
      }

      const newStock = item.stock_quantity + adjQty;
      if (newStock < 0) {
        const err = new Error(`Tồn kho không đủ để xuất (Hiện có: ${item.stock_quantity}, Cần xuất: ${Math.abs(adjQty)})`);
        err.statusCode = 400;
        throw err;
      }

      // Gọi instance method adjustStock của model ServiceItem
      await item.adjustStock(adjQty);

      // Nếu tồn kho về 0, chuyển is_available thành false
      if (item.stock_quantity === 0) {
        item.is_available = false;
        await item.save();
      }

      return item;
    } catch (error) {
      console.error('Lỗi khi điều chỉnh tồn kho:', error);
      throw error;
    }
  }

  
  //Xóa món dịch vụ
  async deleteItem(itemId) {
    try {
      const item = await this.repository.findItemById(itemId);
      if (!item) {
        const err = new Error('Không tìm thấy món dịch vụ để xóa');
        err.statusCode = 404;
        throw err;
      }

      await this.repository.deleteItem(itemId);
      return true;
    } catch (error) {
      console.error('Lỗi khi xóa món dịch vụ:', error);
      throw error;
    }
  }
}

module.exports = new ServiceCatalogService();