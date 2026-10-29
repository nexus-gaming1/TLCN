import React from 'react';
import {
  Gamepad2,
  Wifi,
  Edit,
  Power,
  FolderOpen,
  CheckCircle,
  XCircle,
  Sparkles
} from 'lucide-react';

export default function GameTable({
  games = [],
  onEditGame,
  onToggleAvailability,
  onDeleteGame
}) {
  if (games.length === 0) {
    return (
      <div className="w-full bg-white rounded-xl shadow-xs border border-slate-200/90 p-12 flex flex-col items-center justify-center text-center min-h-[460px]">
        <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-4">
          <Gamepad2 className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Không tìm thấy trò chơi phù hợp</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Vui lòng thử thay đổi từ khóa tìm kiếm hoặc làm mới bộ lọc thể loại, trạng thái.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-xl shadow-xs border border-slate-200/90 flex flex-col overflow-hidden min-h-[460px]">
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse" id="gameFleetTable">
          <thead>
            <tr className="bg-slate-100/90 text-slate-800 text-[11px] uppercase tracking-wider border-b border-slate-200 font-extrabold select-none">
              <th className="py-3.5 px-4 min-w-[240px]">Trò Chơi &amp; Ảnh Bìa</th>
              <th className="py-3.5 px-4 min-w-[150px]">Thể Loại</th>
              <th className="py-3.5 px-4 min-w-[220px]">Đường Dẫn Thực Thi (.exe)</th>
              <th className="py-3.5 px-4 min-w-[130px] text-center">Remote Play</th>
              <th className="py-3.5 px-4 min-w-[150px]">Trạng Thái</th>
              <th className="py-3.5 px-4 text-right pr-6 min-w-[140px]">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
            {games.map((game) => {
              const isAvailable = Boolean(game.is_available);

              return (
                <tr
                  key={game.game_id}
                  className="hover:bg-sky-50/50 transition-colors"
                >

                  {/* Trò chơi & Ảnh bìa */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center relative group">
                        {game.cover_image_url ? (
                          <img
                            src={game.cover_image_url}
                            alt={game.name}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-full h-full items-center justify-center text-slate-400 bg-slate-100 ${
                            game.cover_image_url ? 'hidden' : 'flex'
                          }`}
                        >
                          <Gamepad2 className="w-6 h-6" />
                        </div>
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className="font-extrabold text-slate-900 text-sm truncate hover:text-sky-600 cursor-pointer" onClick={() => onEditGame(game)}>
                          {game.name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1 rounded">
                            #GM-{String(game.game_id).padStart(3, '0')}
                          </span>
                          {game.is_remote_supported && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1 rounded">
                              <Sparkles className="w-2.5 h-2.5" /> Cloud
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Thể loại */}
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                      {game.GameCategory?.name || 'Chưa phân loại'}
                    </span>
                  </td>

                  {/* Đường dẫn thực thi & Tham số khởi chạy */}
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1 max-w-xs">
                      <div
                        className="font-mono text-[11px] text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/80 truncate flex items-center gap-1.5"
                        title={game.executable_path || 'Chưa thiết lập'}
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{game.executable_path || 'Chưa thiết lập'}</span>
                      </div>


                    </div>
                  </td>

                  {/* Remote Play */}
                  <td className="py-3 px-4 text-center">
                    {game.is_remote_supported ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200">
                        <Wifi className="w-3 h-3 text-indigo-600" />
                        WebRTC
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold text-slate-500 bg-slate-100 border border-slate-200">
                        Chỉ Local
                      </span>
                    )}
                  </td>

                  {/* Trạng thái (với direct Toggle Switch 1-click) */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onToggleAvailability(game)}
                        role="switch"
                        aria-checked={isAvailable}
                        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${
                          isAvailable ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                        title={isAvailable ? 'Đang phục vụ - Click để tạm ngưng' : 'Tạm ngưng - Click để mở phục vụ'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                            isAvailable ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <span
                        className={`text-[11px] font-bold select-none ${
                          isAvailable ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {isAvailable ? 'Đang mở' : 'Tạm tắt'}
                      </span>
                    </div>
                  </td>

                  {/* Thao tác */}
                  <td className="py-3 px-4 text-right pr-6">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Sửa thông tin */}
                      <button
                        type="button"
                        onClick={() => onEditGame(game)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-all cursor-pointer"
                        title="Chỉnh sửa thông tin"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
