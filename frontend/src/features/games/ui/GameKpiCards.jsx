import React from 'react';
import { Gamepad2, CheckCircle2, Wifi, Layers, TrendingUp, AlertTriangle } from 'lucide-react';

export default function GameKpiCards({ metrics, games = [] }) {
  const totalGames = metrics?.totalGames ?? games.length;
  const availableGames = metrics?.availableGames ?? games.filter((g) => g.is_available).length;
  const maintenanceGames = metrics?.maintenanceGames ?? (totalGames - availableGames);
  const remoteSupportedGames = metrics?.remoteSupportedGames ?? games.filter((g) => g.is_remote_supported).length;
  const availabilityRate = metrics?.availabilityRate ?? (totalGames > 0 ? ((availableGames / totalGames) * 100).toFixed(1) : '100.0');
  const remoteRate = metrics?.remoteRate ?? (totalGames > 0 ? ((remoteSupportedGames / totalGames) * 100).toFixed(1) : '0.0');
  
  const categoryDistribution = metrics?.categoryDistribution || {};
  const totalCategories = metrics?.totalCategories ?? Object.keys(categoryDistribution).length;
  const totalInstallations = metrics?.totalInstallations ?? 0;
  const topCategory = metrics?.topCategory;
  const categoriesSummary = metrics?.categoriesSummary || Object.keys(categoryDistribution).join(', ');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* KPI 1: Tổng Trò Chơi */}
      <div className="bg-white p-4.5 rounded-xl shadow-xs border border-slate-200/90 flex flex-col justify-between group hover:shadow-md transition-all">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
              TỔNG GAME TRONG KHO
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-slate-900 tracking-tight font-mono">
                {totalGames}
              </span>
              <span className="text-[11px] font-extrabold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200">
                {totalInstallations > 0 ? `${totalInstallations} máy cài đặt` : 'Kho CSDL'}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-200/80 flex items-center justify-center shrink-0">
            <Gamepad2 className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 font-bold text-slate-600 truncate max-w-[210px]" title={topCategory ? `Chủ đạo: ${topCategory.name} (${topCategory.count} game)` : 'Thư viện trò chơi hệ thống'}>
            <span>{topCategory ? `Chủ đạo: ${topCategory.name} (${topCategory.count})` : 'Thư viện hệ thống'}</span>
          </div>
          <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
            Sẵn sàng
          </span>
        </div>
      </div>

      {/* KPI 2: Game Sẵn Sàng Phục Vụ */}
      <div className="bg-white p-4.5 rounded-xl shadow-xs border border-slate-200/90 flex flex-col justify-between group hover:shadow-md transition-all">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
              SẴN SÀNG PHỤC VỤ
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-emerald-700 tracking-tight font-mono">
                {availableGames}
              </span>
              <span className="text-xs font-bold text-slate-500">
                / {totalGames} Game
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 font-extrabold text-emerald-700">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>{availabilityRate}%</span>
            <span className="text-slate-500 font-normal ml-0.5">tỷ lệ khả dụng</span>
          </div>
          {maintenanceGames > 0 ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              {maintenanceGames} bảo trì
            </span>
          ) : (
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
              100% Khả dụng
            </span>
          )}
        </div>
      </div>

      {/* KPI 3: Hỗ Trợ Remote Play */}
      <div className="bg-white p-4.5 rounded-xl shadow-xs border border-slate-200/90 flex flex-col justify-between group hover:shadow-md transition-all">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
              HỖ TRỢ REMOTE PLAY
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-indigo-700 tracking-tight font-mono">
                {remoteSupportedGames}
              </span>
              <span className="text-[11px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                {remoteRate}% kho game
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/80 flex items-center justify-center shrink-0">
            <Wifi className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 font-bold text-indigo-700 truncate max-w-[170px]">
            <span>
              {totalGames - remoteSupportedGames > 0
                ? `${totalGames - remoteSupportedGames} game chỉ chơi tại máy`
                : '100% hỗ trợ Cloud Play'}
            </span>
          </div>
          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(Number(remoteRate), 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* KPI 4: Phân Loại & Thể Loại */}
      <div className="bg-white p-4.5 rounded-xl shadow-xs border border-slate-200/90 flex flex-col justify-between group hover:shadow-md transition-all">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
              PHÂN LOẠI & THỂ LOẠI
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-amber-700 tracking-tight font-mono">
                {totalCategories}
              </span>
              <span className="text-xs font-bold text-slate-600">
                Nhóm thể loại
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span
            className="text-slate-600 font-medium truncate max-w-[180px]"
            title={categoriesSummary}
          >
            {categoriesSummary || 'Đang cập nhật'}
          </span>
          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded shrink-0">
            {topCategory ? `Top: ${topCategory.count} game` : `${totalCategories} nhóm`}
          </span>
        </div>
      </div>
    </div>
  );
}
