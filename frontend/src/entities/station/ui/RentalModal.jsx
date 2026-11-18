
import { useState } from 'react';
import {
  X,
  Monitor,
  Cloud,
  Copy,
  Check,
  Wifi,
  KeyRound,
  ArrowRight,
  Loader2,
} from 'lucide-react';

import MachineService from '../../../shared/api/machine.service';

export default function RentalModal({
  station,
  isOpen,
  onClose,
  onConfirm,
}) {
  const [pin, setPin] = useState('');
  const [copied, setCopied] = useState(false);
  const [isPairing, setIsPairing] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !station) return null;

  const ipAddress =
    station.ip_address ||
    station.ipv6_address ||
    station.ip ||
    'Chưa có địa chỉ IP';

  const isCloud = station.type === 'cloud';
  const stationName =
    station.name || station.code || station.computer_name || 'Máy tính';

  const handleCopyIp = async () => {
    try {
      await navigator.clipboard.writeText(ipAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Không thể sao chép IP:', err);
    }
  };

  const handleConfirm = async () => {
    if (pin.length !== 4 || isPairing) return;

    try {
      setIsPairing(true);
      setError('');

      const result = await MachineService.pairMachine(
        station.computer_id,
        pin
      );

      onConfirm?.({
        station,
        pin,
        result,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Không thể gửi yêu cầu Pairing.'
      );
    } finally {
      setIsPairing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              {isCloud ? <Cloud size={21} /> : <Monitor size={21} />}
            </div>

            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Kết nối máy tính
              </h2>
              <p className="text-xs text-gray-500">
                Máy {stationName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <X size={19} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-5 p-5">
          {/* Station info */}
          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div>
              <p className="text-xs text-gray-500">Máy đang chọn</p>
              <p className="mt-1 font-semibold text-gray-900">
                {stationName}
              </p>
            </div>

            <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600">
              Sẵn sàng
            </span>
          </div>

          {/* IP Address */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Wifi size={15} className="text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                Địa chỉ kết nối
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <code className="min-w-0 flex-1 break-all text-sm text-blue-700">
                {ipAddress}
              </code>

              <button
                onClick={handleCopyIp}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs text-gray-600 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-100 hover:text-gray-900"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Đã copy' : 'Sao chép'}
              </button>
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Sử dụng địa chỉ này để thêm máy tính vào Moonlight.
            </p>
          </div>

          {/* PIN Input */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <KeyRound size={15} className="text-amber-500" />
              <span className="text-sm font-medium text-gray-700">
                Mã PIN Moonlight
              </span>
            </div>

            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ''));
                setError('');
              }}
              placeholder="Nhập mã PIN gồm 4 chữ số"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center text-xl font-semibold tracking-[0.5em] text-gray-900 outline-none transition placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />

            <p className="mt-2 text-xs text-gray-500">
              Mở Moonlight, thêm máy tính và nhập mã PIN hiển thị tại đây.
            </p>

            {error && (
              <p className="mt-2 text-sm text-red-600">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-gray-100 px-5 py-4">
          <button
            onClick={onClose}
            disabled={isPairing}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50"
          >
            Đóng
          </button>

          <button
            onClick={handleConfirm}
            disabled={pin.length !== 4 || isPairing}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPairing ? (
              <>
                Đang xử lý...
                <Loader2 size={16} className="animate-spin" />
              </>
            ) : (
              <>
                Xác nhận PIN
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
