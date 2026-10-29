import React, { useState } from 'react';
import {
  X,
  Gamepad2,
  FolderOpen,
  Wifi,
  Monitor,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Tag,
  ShieldCheck,
  Play
} from 'lucide-react';

export default function GameDetailModal({
  isOpen,
  game,
  onClose,
  onToggleStatus,
  onEdit
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !game) return null;

  const handleCopyPath = () => {
    if (game.executable_path) {
      navigator.clipboard.writeText(game.executable_path);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isAvailable = Boolean(game.is_available);
  const computers = game.Computers || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Banner with cover art */}
        <div className="relative h-44 bg-slate-900 overflow-hidden">
          {game.cover_image_url ? (
            <>
              <img
                src={game.cover_image_url}
                alt={game.name}
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-slate-600">
              <Gamepad2 className="w-16 h-16" />
            </div>
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Title on cover */}
          <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
            <div>
              <span className="font-mono text-[11px] font-bold text-sky-400 uppercase tracking-wider">
                #GM-{String(game.game_id).padStart(3, '0')} • {game.GameCategory?.name || 'Game'}
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-sm mt-0.5">
                {game.name}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black backdrop-blur-md border ${
                  isAvailable
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-400/30'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                {isAvailable ? 'ĐANG PHỤC VỤ' : 'TẠM NGƯNG'}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4.5 overflow-y-auto flex-1 text-xs">
          {/* Grid thông tin nhanh */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-sky-600" />
                Thể Loại &amp; Phân Nhóm
              </span>
              <span className="text-sm font-extrabold text-slate-900">
                {game.GameCategory?.name || 'Chưa phân nhóm'}
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1 flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-indigo-600" />
                Remote Play WebRTC
              </span>
              <span className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                {game.is_remote_supported ? (
                  <span className="text-indigo-700">Hỗ trợ stream 60 FPS</span>
                ) : (
                  <span className="text-slate-500">Chỉ chơi tại trạm</span>
                )}
              </span>
            </div>
          </div>

          {/* Đường dẫn thực thi */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Đường Dẫn Thực Thi BootROM
            </label>
            <div className="flex items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 break-all">
              <div className="flex items-center gap-2 min-w-0">
                <FolderOpen className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{game.executable_path || 'Chưa cài đặt đường dẫn'}</span>
              </div>
              {game.executable_path && (
                <button
                  type="button"
                  onClick={handleCopyPath}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 shrink-0 cursor-pointer transition-all"
                  title="Sao chép đường dẫn"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>



          {/* Danh sách trạm đã triển khai */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
              <span>Trạm Máy Tính Đã Phân Phối ({computers.length} Máy)</span>
              <span className="text-sky-600 font-semibold cursor-pointer">Cụm BootROM iSCSI</span>
            </label>
            {computers.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                {computers.map((c) => (
                  <span
                    key={c.computer_id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono text-[11px] font-bold shadow-2xs"
                  >
                    <Monitor className="w-3 h-3 text-sky-600" />
                    {c.computer_name}
                  </span>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-center font-medium">
                Triển khai tự động đồng bộ trên toàn bộ dàn máy (All 36 Stations).
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <button
            type="button"
            onClick={() => {
              onToggleStatus(game);
              onClose();
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              isAvailable
                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            {isAvailable ? 'Tạm Ngưng Trò Chơi' : 'Kích Hoạt Phục Vụ'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(game);
              }}
              className="px-4.5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-xl text-xs shadow-xs transition-all cursor-pointer"
            >
              Chỉnh Sửa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
