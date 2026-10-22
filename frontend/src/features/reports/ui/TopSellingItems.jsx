import React from 'react';
import { Utensils, Flame, AlertCircle } from 'lucide-react';

export default function TopSellingItems({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col items-center justify-center min-h-[220px] text-center">
        <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-xs font-bold text-slate-600">Chưa có đơn hàng F&amp;B nào</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Dịch vụ ẩm thực chưa phát sinh giao dịch trong kỳ này</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 font-bold">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 leading-tight">Món F&amp;B Bán Chạy</h3>
            <p className="text-[11px] text-slate-400 font-medium">Món ăn &amp; nước uống được ưa chuộng</p>
          </div>
        </div>
        <span className="font-mono text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
          Top 5 Best-Sellers
        </span>
      </div>

      {/* danh sách món */}
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
  );
}