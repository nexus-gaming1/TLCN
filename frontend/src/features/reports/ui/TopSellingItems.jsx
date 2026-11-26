import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Flame, AlertCircle, X, Search } from 'lucide-react';

export default function TopSellingItems({ data = [], allItems = [] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');

  const fullList = useMemo(() => {
    if (Array.isArray(allItems) && allItems.length > 0) return allItems;
    return Array.isArray(data) ? data : [];
  }, [allItems, data]);

  const filteredItems = useMemo(() => {
    const q = searchKeyword.trim().toLowerCase();
    if (!q) return fullList;
    return fullList.filter((item) =>
      String(item.name || '').toLowerCase().includes(q)
    );
  }, [fullList, searchKeyword]);

  const totals = useMemo(() => {
    return fullList.reduce(
      (acc, item) => ({
        sold: acc.sold + Number(item.totalSold || 0),
        revenue: acc.revenue + Number(item.revenue || 0),
      }),
      { sold: 0, revenue: 0 }
    );
  }, [fullList]);

  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col items-center justify-center min-h-[280px] h-full text-center">
        <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-xs font-bold text-slate-600">Chưa có đơn hàng F&amp;B nào</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Dịch vụ ẩm thực chưa phát sinh giao dịch trong kỳ này</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 font-bold">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 leading-tight">Món F&amp;B Bán Chạy</h3>
              <p className="text-[11px] text-slate-400 font-medium">Món ăn &amp; nước uống được ưa chuộng</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchKeyword('');
              setIsModalOpen(true);
            }}
            className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 font-extrabold text-xs border border-orange-200 transition-all cursor-pointer shrink-0 shadow-2xs"
            title="Xem danh sách toàn bộ món F&B bán ra trong kỳ"
          >
            Xem tất cả ({fullList.length}) ➔
          </button>
        </div>

        {/* danh sách món Top 5 */}
        <div className="space-y-2.5">
          {data.map((item, index) => {
            const rank = index + 1;
            const revenue = Number(item.revenue || 0);

            return (
              <div
                key={item.itemId || index}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 hover:bg-slate-100/80 transition-colors border border-slate-200/60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      rank === 1
                        ? 'bg-amber-100 text-amber-800 font-black'
                        : rank === 2
                        ? 'bg-slate-200 text-slate-700'
                        : rank === 3
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-white text-slate-400 border border-slate-200'
                    }`}
                  >
                    {rank}
                  </span>

                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-extrabold text-slate-900 truncate">
                      {item.name || 'Món không tên'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      Đã bán: <strong className="text-slate-800 font-bold">{item.totalSold}</strong> phần
                    </span>
                  </div>
                </div>

                {/* Doanh thu món */}
                <div className="flex flex-col items-end shrink-0 pl-3">
                  <span className="font-mono font-black text-xs text-amber-700">
                    {revenue.toLocaleString('vi-VN')} đ
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Doanh số</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Xem Toàn Bộ Món Bán Chạy (Portal z-[9999], Light Theme) */}
      {isModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 leading-tight">
                      Toàn Bộ Món F&amp;B Đã Bán Trong Kỳ
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {fullList.length} món • Tổng {totals.sold.toLocaleString('vi-VN')} phần •{' '}
                      <span className="font-mono font-bold text-amber-700">
                        {totals.revenue.toLocaleString('vi-VN')} ₫
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition cursor-pointer"
                  aria-label="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Thanh tìm kiếm trong Modal */}
              <div className="px-6 py-3 border-b border-slate-100 bg-white">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder="Tìm nhanh theo tên món..."
                    className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-hidden transition"
                  />
                  {searchKeyword && (
                    <button
                      type="button"
                      onClick={() => setSearchKeyword('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Danh sách đầy đủ */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
                {filteredItems.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 font-medium">
                    Không tìm thấy món nào phù hợp với "{searchKeyword.trim()}".
                  </div>
                ) : (
                  filteredItems.map((item, idx) => {
                    const originalRank = fullList.findIndex(
                      (x) => (x.itemId ?? x.name) === (item.itemId ?? item.name)
                    ) + 1;
                    const rank = originalRank > 0 ? originalRank : idx + 1;
                    const revenue = Number(item.revenue || 0);

                    return (
                      <div
                        key={item.itemId || `${item.name}-${idx}`}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 transition-colors border border-slate-200/70"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              rank === 1
                                ? 'bg-amber-100 text-amber-800 font-black'
                                : rank === 2
                                ? 'bg-slate-200 text-slate-700'
                                : rank === 3
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-white text-slate-500 border border-slate-200'
                            }`}
                          >
                            {rank}
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-extrabold text-slate-900 truncate">
                              {item.name || 'Món không tên'}
                            </span>
                            <span className="text-[11px] text-slate-500 font-semibold">
                              Đã bán: <strong className="text-slate-800">{item.totalSold}</strong> phần
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0 pl-3">
                          <span className="font-mono font-black text-xs text-amber-700">
                            {revenue.toLocaleString('vi-VN')} ₫
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">Doanh số</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-500">
                  Hiển thị {filteredItems.length} / {fullList.length} món
                </span>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}