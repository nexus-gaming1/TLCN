const serviceCatalogService = require('../services/serviceCatalogService');

class ServiceCatalogController {
  // ------------------- Category handlers  -----------------

  async getCategories(req, res, next) {
    try {
      const categories = await serviceCatalogService.getAllCategoriesWithItems();
      return res.json({
        status: 'success',
        data: categories,
        message: 'Lấy danh sách danh mục dịch vụ thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async getCategoryById(req, res, next) {
    try {
      const { id } = req.params;
      const category = await serviceCatalogService.getCategoryById(id);
      return res.json({
        status: 'success',
        data: category
      });
    } catch (error) {
      next(error);
    }
  }

  async createCategory(req, res, next) {
    try {
      const category = await serviceCatalogService.createCategory(req.body);
      return res.status(201).json({
        status: 'success',
        data: category,
        message: 'Tạo mới danh mục dịch vụ thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCategory(req, res, next) {
    try {
      const { id } = req.params;
      const updatedCategory = await serviceCatalogService.updateCategory(id, req.body);
      return res.json({
        status: 'success',
        data: updatedCategory,
        message: 'Cập nhật danh mục dịch vụ thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req, res, next) {
    try {
      const { id } = req.params;
      await serviceCatalogService.deleteCategory(id);
      return res.json({
        status: 'success',
        message: 'Đã xóa danh mục dịch vụ thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  // ------------------- Service Items handlers  -----------------

  async getItems(req, res, next) {
    try {
      const { category_id, is_available } = req.query;
      const filter = {};
      if (category_id) filter.category_id = category_id;
      if (is_available !== undefined) filter.is_available = is_available === 'true';

      const items = await serviceCatalogService.getAllItems(filter);
      return res.json({
        status: 'success',
        data: items,
        message: 'Lấy danh sách món dịch vụ thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async getItemById(req, res, next) {
    try {
      const { id } = req.params;
      const item = await serviceCatalogService.getItemById(id);
      return res.json({
        status: 'success',
        data: item
      });
    } catch (error) {
      next(error);
    }
  }

  async createItem(req, res, next) {
    try {
      const item = await serviceCatalogService.createItem(req.body);
      return res.status(201).json({
        status: 'success',
        data: item,
        message: 'Tạo mới món dịch vụ thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async updateItem(req, res, next) {
    try {
      const { id } = req.params;
      const updatedItem = await serviceCatalogService.updateItem(id, req.body);
      return res.json({
        status: 'success',
        data: updatedItem,
        message: 'Cập nhật món dịch vụ thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async adjustStock(req, res, next) {
    try {
      const { id } = req.params;
      const updatedItem = await serviceCatalogService.adjustStock(id, req.body);
      return res.json({
        status: 'success',
        data: updatedItem,
        message: 'Điều chỉnh tồn kho món dịch vụ thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteItem(req, res, next) {
    try {
      const { id } = req.params;
      await serviceCatalogService.deleteItem(id);
      return res.json({
        status: 'success',
        message: 'Đã xóa món dịch vụ thành công'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ServiceCatalogController();