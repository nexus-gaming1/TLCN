import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Utensils,
  FolderPlus,
  Edit,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Package
} from 'lucide-react';

//Component hiển thị badge trạng thái
function ItemStatusBadge({ isAvailable, stockQuantity }) {
  if (stockQuantity <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold whitespace-nowrap">
        <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
        <span>Hết Tồn Kho</span>
      </span>
    );
  }

  if (isAvailable) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-xs font-bold whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>Sẵn Sàng</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold whitespace-nowrap">
      <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      <span>Tạm Ngưng</span>
    </span>
  );
}

//CatalogTable Component
 
export default function CatalogTable({
  categories = [],
  onEditCategory,
  onDeleteCategory,
  onEditItem,
  onDeleteItem,
  onAdjustStock,
  onAddNewItemToCategory
}) {
  // Quản lý trạng thái đóng/mở Accordion của từng danh mục
  const [expandedCategories, setExpandedCategories] = useState(() => {
    // Mặc định mở tất cả các danh mục
    return categories.map((c) => c.category_id);
  });

  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  if (!categories || categories.length === 0) {
    return (
      <div className="w-full bg-white rounded-xl shadow-xs border border-slate-200/90 py-16 text-center text-slate-500">
        <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-700">Chưa có danh mục dịch vụ nào trong hệ thống</p>
        <p className="text-xs text-slate-400 mt-1">Vui lòng bấm nút "+ Thêm Danh Mục" để khởi tạo danh mục F&amp;B đầu tiên</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {categories.map((category) => {
        const isExpanded = expandedCategories.includes(category.category_id);
        const items = category.ServiceItems || [];

        return (
          <div
            key={category.category_id}
            className="w-full bg-white rounded-xl shadow-xs border border-slate-200/90 overflow-hidden transition-all"
          >
            {/* Category Header Row (Accordion Trigger) */}
            <div className="bg-slate-50/90 hover:bg-slate-100/80 px-4 py-3.5 flex items-center justify-between border-b border-slate-200/80 select-none transition-colors">
              <div
                onClick={() => toggleCategory(category.category_id)}
                className="flex items-center gap-3 cursor-pointer flex-1"
              >
                <button
                  type="button"
                  className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center shadow-2xs"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-700" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-700" />
                  )}
                </button>

                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center font-bold">
                    <Utensils className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-900 tracking-tight">
                    {category.name}
                  </h3>
                  <span className="font-mono text-[11px] font-bold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
                    {items.length} món
                  </span>
                </div>
              </div>

              {/* Category action buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onAddNewItemToCategory && onAddNewItemToCategory(category.category_id)}
                  className="px-2.5 py-1.5 bg-white hover:bg-sky-50 text-sky-700 font-bold text-xs rounded-lg border border-sky-200/80 flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Món</span>
                </button>

                <button
                  type="button"
                  onClick={() => onEditCategory && onEditCategory(category)}
                  className="w-8 h-8 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors border border-transparent hover:border-indigo-200"
                  title="Đổi tên danh mục"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteCategory && onDeleteCategory(category.category_id)}
                  className="w-8 h-8 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors border border-transparent hover:border-rose-200"
                  title="Xóa danh mục"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Items nested table */}
            {isExpanded && (
              <div className="w-full overflow-x-auto">
                {items.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs font-medium">
                    Danh mục này chưa có món dịch vụ nào.{' '}
                    <button
                      onClick={() => onAddNewItemToCategory && onAddNewItemToCategory(category.category_id)}
                      className="text-sky-600 font-bold underline hover:text-sky-700"
                    >
                      Thêm món ngay
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse min-w-[750px]">
                    <thead>
                      <tr className="bg-slate-100/50 text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-200 font-bold">
                        <th className="py-2.5 px-4 min-w-[220px]">Tên Món Dịch Vụ</th>
                        <th className="py-2.5 px-4 min-w-[140px]">Đơn Giá</th>
                        <th className="py-2.5 px-4 min-w-[150px]">Tồn Kho</th>
                        <th className="py-2.5 px-4 min-w-[140px]">Trạng Thái</th>
                        <th className="py-2.5 px-4 text-right pr-6 min-w-[140px]">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
                      {items.map((item) => (
                        <tr
                          key={item.service_item_id}
                          className="hover:bg-slate-50/80 transition-colors group"
                        >
                          {/* Tên món dịch vụ */}
                          <td className="py-3 px-4">
                            <span className="font-bold text-sm text-slate-900 group-hover:text-sky-700 transition-colors">
                              {item.name}
                            </span>
                          </td>

                          {/* giá */}
                          <td className="py-3 px-4 font-mono">
                            <span className="font-black text-sm text-sky-800">
                              {Number(item.price).toLocaleString('vi-VN')} đ
                            </span>
                          </td>

                          {/* Tồn Kho + Nút Tăng/Giảm Kho Nhanh */}
                          <td className="py-3 px-4 font-mono">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-bold text-xs px-2 py-0.5 rounded ${
                                  item.stock_quantity <= 0
                                    ? 'bg-rose-100 text-rose-800'
                                    : item.stock_quantity <= 5
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-800'
                                }`}
                              >
                                {item.stock_quantity}
                              </span>

                              {/* Quick stock increment/decrement buttons */}
                              <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => onAdjustStock && onAdjustStock(item.service_item_id, -1)}
                                    disabled={item.stock_quantity <= 0}
                                    className={`w-5 h-5 rounded flex items-center justify-center font-bold text-xs transition-colors
                                        ${item.stock_quantity <= 0 
                                        ? 'bg-slate-50 text-slate-300 cursor-not-allowed' 
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                        }`}
                                    title="Trừ 1 tồn kho"
                                    >
                                  -
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onAdjustStock && onAdjustStock(item.service_item_id, 1)}
                                  className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs"
                                  title="Cộng 1 tồn kho"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Trạng Thái Phục Vụ */}
                          <td className="py-3 px-4">
                            <ItemStatusBadge
                              isAvailable={item.is_available}
                              stockQuantity={item.stock_quantity}
                            />
                          </td>

                          {/* Thao Tác */}
                          <td className="py-3 px-4 text-right pr-6">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => onEditItem && onEditItem(item)}
                                className="w-8 h-8 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors"
                                title="Chỉnh sửa món"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => onDeleteItem && onDeleteItem(item.service_item_id)}
                                className="w-8 h-8 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                                title="Xóa món"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}