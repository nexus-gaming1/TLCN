import React from 'react';

/**
 * GameTableSkeleton
 * Khung hiển thị giả lập (Skeleton Loading) giữ nguyên kích thước bảng khi đang tải dữ liệu
 * Ngăn chặn hoàn toàn hiện tượng sụp đổ chiều cao và giật layout (Layout Shift)
 */
export default function GameTableSkeleton({ rows = 6 }) {
  return (
    <div className="w-full bg-white rounded-xl shadow-xs border border-slate-200/90 flex flex-col overflow-hidden min-h-[460px]">
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/90 text-slate-800 text-[11px] uppercase tracking-wider border-b border-slate-200 font-extrabold select-none">
              <th className="py-3.5 px-4 w-12 text-center">
                <div className="w-4 h-4 bg-slate-200 rounded mx-auto animate-pulse" />
              </th>
              <th className="py-3.5 px-4 min-w-[240px]">Trò Chơi &amp; Ảnh Bìa</th>
              <th className="py-3.5 px-4 min-w-[150px]">Thể Loại</th>
              <th className="py-3.5 px-4 min-w-[220px]">Đường Dẫn Thực Thi (.exe)</th>
              <th className="py-3.5 px-4 min-w-[130px] text-center">Remote Play</th>
              <th className="py-3.5 px-4 min-w-[140px] text-center">Trạng Thái</th>
              <th className="py-3.5 px-4 min-w-[120px] text-center">Hành Động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {Array.from({ length: rows }).map((_, idx) => (
              <tr key={idx} className="animate-pulse">
                {/* Checkbox */}
                <td className="py-3.5 px-4 text-center">
                  <div className="w-4 h-4 bg-slate-200 rounded mx-auto" />
                </td>

                {/* Trò chơi & ảnh bìa */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-14 rounded-lg bg-slate-200 shrink-0" />
                    <div className="flex flex-col gap-2 flex-1">
                      <div className="w-32 h-3.5 bg-slate-200 rounded" />
                      <div className="w-20 h-2.5 bg-slate-100 rounded" />
                    </div>
                  </div>
                </td>

                {/* Thể loại */}
                <td className="py-3.5 px-4">
                  <div className="w-24 h-6 bg-slate-200 rounded-md" />
                </td>

                {/* Đường dẫn thực thi */}
                <td className="py-3.5 px-4">
                  <div className="w-48 h-5 bg-slate-100 rounded" />
                </td>

                {/* Remote Play */}
                <td className="py-3.5 px-4 text-center">
                  <div className="w-20 h-6 bg-slate-100 rounded-full mx-auto" />
                </td>

                {/* Trạng thái */}
                <td className="py-3.5 px-4 text-center">
                  <div className="w-24 h-6 bg-slate-200 rounded-full mx-auto" />
                </td>

                {/* Hành động */}
                <td className="py-3.5 px-4 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <div className="w-7 h-7 bg-slate-200 rounded-lg" />
                    <div className="w-7 h-7 bg-slate-200 rounded-lg" />
                    <div className="w-7 h-7 bg-slate-200 rounded-lg" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
