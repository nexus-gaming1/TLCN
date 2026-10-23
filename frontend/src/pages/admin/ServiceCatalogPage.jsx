import React, { useState, useEffect } from 'react';
import Header from '../../widgets/header/Header';
import Sidebar from '../../widgets/sidebar/Sidebar';
import Footer from '../../widgets/footer/Footer';

import catalogService from '../../shared/api/catalog.service';
import CatalogTable from '../../features/catalog/ui/CatalogTable';
import CreateItemModal from '../../features/catalog/ui/CreateItemModal';
import ComboManagementSection from '../../features/catalog/ui/ComboManagementSection';
import { Utensils, Plus, FolderPlus, Search, RefreshCw, Clock } from 'lucide-react';

export default function ServiceCatalogPage({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('fnb'); // 'fnb' | 'combo'
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State cho Item
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  // Tải danh sách Danh mục & Món ăn từ CSDL
  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const data = await catalogService.getCategories();
      setCategories(data || []);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu menu dịch vụ:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  //Hàm chuẩn hoá chuỗi đầu vào
  const formatCategoryName = (str) => {
    if (!str) return '';
    const trimmed = str.replace(/\s+/g, ' ').trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  };

  const handleCreateCategory = async () => {
    const rawName = window.prompt('Nhập tên danh mục F&B mới (VD: Đồ Uống, Thẻ Game):');
    if (!rawName) return; // Khách bấm Cancel

    const name = formatCategoryName(rawName);
    if (name.length < 2) {
      alert('Tên danh mục quá ngắn, vui lòng nhập ít nhất 2 ký tự!');
      return;
    }

    try {
      await catalogService.createCategory({ name });
      await fetchCatalog();
    } catch (err) {
      alert(err.message || 'Lỗi khi tạo danh mục mới');
    }
  };

  const handleEditCategory = async (category) => {
    const rawName = window.prompt(`Cập nhật tên danh mục [${category.name}]:`, category.name);
    if (!rawName) return;

    const name = formatCategoryName(rawName);
    if (name && name !== category.name) {
      try {
        await catalogService.updateCategory(category.category_id, { name });
        await fetchCatalog();
      } catch (err) {
        alert(err.message || 'Lỗi khi cập nhật danh mục');
      }
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa danh mục dịch vụ này?')) {
      try {
        await catalogService.deleteCategory(categoryId);
        await fetchCatalog();
      } catch (err) {
        alert(err.message || 'Lỗi khi xóa danh mục');
      }
    }
  };

  // Handler cho Món Dịch Vụ
  const handleSaveItem = async (payload, itemId) => {
    try {
      if (itemId) {
        await catalogService.updateItem(itemId, payload);
      } else {
        await catalogService.createItem(payload);
      }
      await fetchCatalog();
    } catch (err) {
      alert(err.message || 'Lỗi khi lưu món dịch vụ');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa món dịch vụ này?')) {
      try {
        await catalogService.deleteItem(itemId);
        await fetchCatalog();
      } catch (err) {
        alert(err.message || 'Lỗi khi xóa món dịch vụ');
      }
    }
  };

  const handleAdjustStock = async (itemId, delta) => {
    try {
      await catalogService.adjustItemStock(itemId, delta);
      await fetchCatalog();
    } catch (err) {
      alert(err.message || 'Lỗi khi điều chỉnh tồn kho');
    }
  };

  // Filter tìm kiếm món theo tên
  const filteredCategories = categories.map((cat) => {
    if (!searchQuery.trim()) return cat;
    const items = (cat.ServiceItems || []).filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
    return { ...cat, ServiceItems: items };
  });

  return (
    <div className="bg-background font-sans text-on-surface antialiased min-h-screen">
      {/* Shared Header */}
      <Header
        user={user}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onLogout={onLogout}
      />

      {/* Shared sidebar */}
      <Sidebar activeNav="catalog" bootromStatus="ONLINE" role="ADMIN" />

      {/* Vùng nội dung chính */}
      <div className="pl-[240px]">
        <main className="relative pt-16 pb-20 min-h-screen bg-background w-full px-6 py-6 flex flex-col justify-between">
          <div className="flex flex-col w-full gap-6">
            {/* Page Header Strip */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-[11px] uppercase text-sky-700 font-extrabold tracking-wider bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    F&amp;B Engine v3.0
                  </span>
                  <span className="text-slate-400 font-bold">•</span>
                  <span className="text-slate-500 font-semibold">Service &amp; Combo Catalog</span>
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                  Quản Lý Dịch Vụ &amp; Gói Combo Time
                </h1>
                <p className="text-xs text-slate-500 font-medium max-w-2xl mt-0.5">
                  Thiết lập danh mục đồ ăn, nước uống, gói combo thời gian chơi kèm dịch vụ phục vụ tại phòng máy.
                </p>
              </div>

              {/* Action Buttons for F&B Tab */}
              {activeTab === 'fnb' && (
                <div className="flex items-center gap-2.5 self-start lg:self-center">
                  <button
                    onClick={fetchCatalog}
                    className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs p-2.5 rounded-lg border border-slate-200 shadow-2xs transition-colors"
                    title="Tải lại dữ liệu"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-500" />
                  </button>

                  <button
                    onClick={handleCreateCategory}
                    className="bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <FolderPlus className="w-4 h-4 text-sky-600" />
                    <span>+ Thêm Danh Mục</span>
                  </button>

                  <button
                    onClick={() => {
                      setEditingItem(null);
                      setSelectedCategoryId('');
                      setIsItemModalOpen(true);
                    }}
                    className="bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-lg shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Thêm Món Mới</span>
                  </button>
                </div>
              )}
            </div>

            {/* TAB SELECTOR */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('fnb')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  activeTab === 'fnb'
                    ? 'bg-sky-50 text-sky-700 border border-sky-200 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Utensils className="w-4 h-4" />
                <span>Món Ăn &amp; Đồ Uống (F&amp;B)</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
                  {categories.reduce((acc, cat) => acc + (cat.ServiceItems?.length || 0), 0)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('combo')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  activeTab === 'combo'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Gói Combo Time &amp; Giờ Chơi</span>
              </button>
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'fnb' ? (
              loading ? (
                <div className="w-full py-16 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
                  <div className="inline-block w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <p className="text-xs font-bold">Đang tải danh mục dịch vụ từ cơ sở dữ liệu...</p>
                </div>
              ) : (
                <CatalogTable
                  categories={filteredCategories}
                  onEditCategory={handleEditCategory}
                  onDeleteCategory={handleDeleteCategory}
                  onEditItem={(item) => {
                    setEditingItem(item);
                    setIsItemModalOpen(true);
                  }}
                  onDeleteItem={handleDeleteItem}
                  onAdjustStock={handleAdjustStock}
                  onAddNewItemToCategory={(catId) => {
                    setEditingItem(null);
                    setSelectedCategoryId(catId);
                    setIsItemModalOpen(true);
                  }}
                />
              )
            ) : (
              <ComboManagementSection />
            )}
          </div>

          {/* Footer */}
          <Footer />
        </main>
      </div>

      {/* Modal tạo/edit  */}
      <CreateItemModal
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setEditingItem(null);
        }}
        item={editingItem}
        categories={categories}
        defaultCategoryId={selectedCategoryId}
        onSubmit={handleSaveItem}
      />
    </div>
  );
}