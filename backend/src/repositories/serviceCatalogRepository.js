// Đảm nhận các thao tác truy vấn CSDL cho ServiceCategory và ServiceItem
const db = require('../models');

class ServiceCatalogRepository{
    constructor( models = db ){
        this.models = models;
    }

    // ---------- Service Category methods  ---------
    //Lấy tất cả danh mục kèm theo danh sách món dịch vụ thuộc danh mục đó (Gom nhóm)
    async findAllCategoriesWithItems(){
        return await this.models.ServiceCategory.findAll({
            include:[
                {
                    model: this.models.ServiceItem,
                    as: 'ServiceItems'
                }
            ],
            order: [
                ['category_id', 'ASC'],
                [{model: this.models.ServiceItem}, 'name', 'ASC']
            ]
        });
    }

    //Tìm danh mục theo id ( tuỳ chọn include items )
    async findCategoryById (categoryId, includeItems = false){
        const options = {};
        if (includeItems) {
            options.include = [{model: this.models.ServceItem}];
        }
        return await this.models.ServiceCategory.findByPk(categoryId, options);
    }

    //Tìm danh mục theo tên (phục vụ check trùng tên)
    async findCategoryByName(name) {
        return await this.models.ServiceCategory.findOne({
        where: { name }
        });
    }

     
   //Tạo mới danh mục dịch vụ
    async createCategory(categoryData) {
        return await this.models.ServiceCategory.create(categoryData);
    }

    //Cập nhật danh mục dịch vụ
    async updateCategory(categoryInstance, updateData) {
        return await categoryInstance.update(updateData);
    }
  
   //Xóa danh mục dịch vụ theo ID
    async deleteCategory(categoryId) {
        return await this.models.ServiceCategory.destroy({
        where: { category_id: categoryId }
        });
    }
  
   //Đếm số lượng món dịch vụ thuộc danh mục (dùng kiểm tra trước khi xóa danh mục)
    async countItemsByCategoryId(categoryId) {
        return await this.models.ServiceItem.count({
        where: { category_id: categoryId }
        });
    }


    // ---------- Service Items methods  ---------
    //Lấy danh sách món dịch vụ (có bộ lọc theo danh mục hoặc trạng thái phục vụ)
    async findAllItems(filter = {}) {
        const where = {};
        if (filter.category_id) where.category_id = filter.category_id;
        if (filter.is_available !== undefined) where.is_available = filter.is_available;
        return await this.models.ServiceItem.findAll({
        where,
        include: [
            {
            model: this.models.ServiceCategory,
            attributes: ['category_id', 'name']
            },
            {
            model: this.models.MembershipRank,
            attributes: ['rank_id', 'name', 'discount_percent']
            }
        ],
        order: [['service_item_id', 'ASC']]
        });
    }
  
   //Tìm món dịch vụ theo ID kèm thông tin Danh mục và Hạng thẻ áp dụng giảm giá
    async findItemById(itemId) {
        return await this.models.ServiceItem.findByPk(itemId, {
        include: [
            {
            model: this.models.ServiceCategory,
            attributes: ['category_id', 'name']
            },
            {
            model: this.models.MembershipRank,
            attributes: ['rank_id', 'name', 'discount_percent']
            }
        ]
        });
    }
  
   //Tìm món dịch vụ theo tên (phục vụ check trùng tên)
    async findItemByName(name) {
        return await this.models.ServiceItem.findOne({
        where: { name }
        });
    }
  
   //Tạo mới món dịch vụ
    async createItem(itemData) {
        return await this.models.ServiceItem.create(itemData);
    }
  
   //Cập nhật thông tin món dịch vụ
    async updateItem(itemInstance, updateData) {
        return await itemInstance.update(updateData);
    }
  
   //Xóa món dịch vụ
    async deleteItem(itemId) {
        return await this.models.ServiceItem.destroy({
        where: { service_item_id: itemId }
        });
    }
}
module.exports = new ServiceCatalogRepository();



