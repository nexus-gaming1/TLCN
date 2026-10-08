const express = require('express');
const router = express.Router();
const serviceCatalogController = require('../controllers/serviceCatalogController');

// ------------ Service Category Endpoints  -------------
router.get('/categories', serviceCatalogController.getCategories);
router.get('/categories/:id', serviceCatalogController.getCategoryById);
router.post('/categories', serviceCatalogController.createCategory);
router.put('/categories/:id', serviceCatalogController.updateCategory);
router.delete('/categories/:id', serviceCatalogController.deleteCategory);

// ----------- Service Item Endpoints -----------
router.get('/items', serviceCatalogController.getItems);
router.get('/items/:id', serviceCatalogController.getItemById);
router.post('/items', serviceCatalogController.createItem);
router.put('/items/:id', serviceCatalogController.updateItem);
router.patch('/items/:id/stock', serviceCatalogController.adjustStock);
router.delete('/items/:id', serviceCatalogController.deleteItem);

module.exports = router;