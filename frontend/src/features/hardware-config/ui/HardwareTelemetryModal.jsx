import React from 'react';
import { X, Cpu, MemoryStick, Gamepad2, HardDrive, Thermometer, Activity } from 'lucide-react';

export default function HardwareTelemetryModal({ isOpen, onClose, hardware }) {
  if (!isOpen || !hardware) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 font-bold">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                Chi Tiết Telemetry {hardware.id}
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                  Live Sync
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {hardware.zoneName} • {hardware.statusLabel}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-5 space-y-4">
          {/* Temperatures Bento */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono font-bold text-slate-500 block uppercase">Nhiệt Độ CPU</span>
                <span className="text-xl font-mono font-extrabold text-slate-900">{hardware.telemetry?.cpuTemp || 52}°C</span>
              </div>
              <Thermometer className="w-6 h-6 text-sky-600" />
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono font-bold text-slate-500 block uppercase">Nhiệt Độ GPU</span>
                <span className="text-xl font-mono font-extrabold text-slate-900">{hardware.telemetry?.gpuTemp || 49}°C</span>
              </div>
              <Thermometer className="w-6 h-6 text-indigo-600" />
            </div>
          </div>

          {/* Specs Details */}
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200/60">
              <span className="text-slate-600 font-medium flex items-center gap-2">
                <Cpu className="w-4 h-4 text-sky-600" /> CPU Model
              </span>
              <span className="font-bold text-slate-900">{hardware.cpu?.model}</span>
            </div>

            <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200/60">
              <span className="text-slate-600 font-medium flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-indigo-600" /> Card Đồ Họa
              </span>
              <span className="font-bold text-slate-900">{hardware.gpu?.model}</span>
            </div>

            <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200/60">
              <span className="text-slate-600 font-medium flex items-center gap-2">
                <MemoryStick className="w-4 h-4 text-purple-600" /> RAM Dung Lượng
              </span>
              <span className="font-bold text-slate-900">{hardware.ram?.capacity}</span>
            </div>

            <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200/60">
              <span className="text-slate-600 font-medium flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-600" /> SAN BootROM Latency
              </span>
              <span className="font-mono font-bold text-emerald-700">{hardware.telemetry?.sanPing || '0.22ms'}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-100 pt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs transition"
          >
            Đóng Đửa Sổ
          </button>
        </div>
      </div>
    </div>
  );
}
