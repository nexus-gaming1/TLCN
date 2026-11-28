import { useState, useEffect, useRef } from 'react';
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
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Cpu,
  Gamepad2,
  MemoryStick,
  HardDrive,
  Headphones,
  Tag
} from 'lucide-react';

import MachineService from '../../../shared/api/machine.service';
import { socket, connectSocket } from '../../../shared/socket/socket';
import { findPricingPlan, formatCurrency } from '../../../shared/utils/pricing';

export default function RentalModal({
  station,
  isOpen,
  onClose,
  onConfirm,
}) {
  const [step, setStep] = useState('INITIALIZING'); // INITIALIZING, WAITING_MOONLIGHT, PIN_INPUT, CONFIRMING, PAIRED, FAILED
  const [intentId, setIntentId] = useState(null);
  const [deviceName, setDeviceName] = useState('');
  const [pin, setPin] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSpecs, setShowSpecs] = useState(false);

  const [ipv6, setIpv6] = useState(
    station?.ipv6 || station?.ipv6_address || ''
  );

  const activeIntentRef = useRef(null);
  activeIntentRef.current = intentId;

  const isCancelledRef = useRef(false);
  const pendingIntentPromiseRef = useRef(null);

  const isCloud = station?.type === 'cloud';
  const stationName =
    station?.name || station?.code || station?.computer_name || 'Máy tính';

  // Lấy gói giá đang áp dụng theo logic findPricingPlan
  const activePlan = findPricingPlan(station, new Date(), 'REMOTE');
  const hw = station?.HardwareProfile || {};

  // Khởi tạo pairing intent khi mở modal
  useEffect(() => {
    if (!isOpen || !station) {
      isCancelledRef.current = true;
      setStep('INITIALIZING');
      setIntentId(null);
      setPin('');
      setError('');
      setDeviceName('');
      return;
    }

    isCancelledRef.current = false;
    setIpv6(station?.ipv6 || station?.ipv6_address || '');

    let isMounted = true;
    connectSocket();

    const startIntent = async () => {
      setIsLoading(true);
      setError('');
      setStep('INITIALIZING');

      try {
        const promise = MachineService.startPairingIntent(station.computer_id, 300);
        pendingIntentPromiseRef.current = promise;
        const data = await promise;

        if (!isMounted || isCancelledRef.current) {
          // Người dùng đã đóng modal trong khi intent đang khởi tạo -> tự động hủy ngay lập tức
          if (data?.intent?.id) {
            MachineService.cancelPairingIntent(data.intent.id).catch(() => {});
          }
          return;
        }

        if (data?.intent?.ipv6 || data?.computer?.ipv6) {
          setIpv6(data.intent?.ipv6 || data.computer?.ipv6);
        }

        if (data?.intent?.id) {
          setIntentId(data.intent.id);
          setStep('WAITING_MOONLIGHT');
        } else {
          setStep('FAILED');
          setError('Không nhận được mã yêu cầu ghép nối từ hệ thống.');
        }
      } catch (err) {
        if (!isMounted || isCancelledRef.current) return;
        setStep('FAILED');
        setError(
          err.response?.data?.message ||
          err.message ||
          'Không thể khởi tạo phiên ghép nối với máy trạm.'
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    startIntent();

    // Lắng nghe sự kiện socket đồng bộ pairing
    const onDetected = (data) => {
      if (!data) return;
      if (
        (data.intentId && data.intentId === activeIntentRef.current) ||
        (data.computerId && Number(data.computerId) === Number(station.computer_id))
      ) {
        setDeviceName(data.deviceName || 'Thiết bị Moonlight');
        setStep('PIN_INPUT');
      }
    };

    const onConfirming = (data) => {
      if (!data) return;
      if (data.intentId && data.intentId === activeIntentRef.current) {
        setStep('CONFIRMING');
      }
    };

    const onCompleted = (data) => {
      if (!data) return;
      if (data.intentId && data.intentId === activeIntentRef.current) {
        setStep('PAIRED');
        onConfirm?.({
          station,
          intentId: data.intentId,
          status: 'PAIRED'
        });
      }
    };

    const onFailed = (data) => {
      if (!data) return;
      if (data.intentId && data.intentId === activeIntentRef.current) {
        setStep('FAILED');
        setError(data.reason || 'Ghép nối thất bại.');
      }
    };

    const onMachineUpdated = (m) => {
      if (!m || !isMounted) return;
      if (
        String(m.computerId) === String(station.computer_id) ||
        String(m.machineId) === String(station.computer_id) ||
        m.machineId === station.computer_name
      ) {
        if (m.ipv6) setIpv6(m.ipv6);
      }
    };

    socket.on('remote:pairing:detected', onDetected);
    socket.on('remote:pairing:confirming', onConfirming);
    socket.on('remote:pairing:completed', onCompleted);
    socket.on('remote:pairing:failed', onFailed);
    socket.on('machine:updated', onMachineUpdated);
    socket.on('machine:heartbeat', onMachineUpdated);

    return () => {
      isMounted = false;
      isCancelledRef.current = true;
      socket.off('remote:pairing:detected', onDetected);
      socket.off('remote:pairing:confirming', onConfirming);
      socket.off('remote:pairing:completed', onCompleted);
      socket.off('remote:pairing:failed', onFailed);
      socket.off('machine:updated', onMachineUpdated);
      socket.off('machine:heartbeat', onMachineUpdated);
    };
  }, [isOpen, station]);

  const handleCopyIpv6 = async () => {
    if (!ipv6) return;
    try {
      await navigator.clipboard.writeText(ipv6);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Không thể sao chép IPv6:', err);
    }
  };

  const handleConfirmPin = async () => {
    if (pin.length !== 4 || !intentId || step === 'CONFIRMING') return;

    try {
      setStep('CONFIRMING');
      setError('');

      const result = await MachineService.confirmPairingPin(intentId, pin);

      if (result?.status === 'success') {
        setStep('PAIRED');
        onConfirm?.({
          station,
          intentId,
          result
        });
      }
    } catch (err) {
      setStep('PIN_INPUT');
      setError(
        err.response?.data?.message ||
        err.message ||
        'Xác nhận mã PIN thất bại. Vui lòng kiểm tra lại.'
      );
    }
  };

  const handleCancelOrClose = async () => {
    isCancelledRef.current = true;
    const currentIntent = activeIntentRef.current || intentId;
    if (currentIntent && step !== 'PAIRED') {
      try {
        await MachineService.cancelPairingIntent(currentIntent);
      } catch {
        // Ignore cancellation error on close
      }
    } else if (pendingIntentPromiseRef.current && step !== 'PAIRED') {
      // Trường hợp người dùng đóng modal khi intent đang trong quá trình tạo
      pendingIntentPromiseRef.current
        .then((data) => {
          if (data?.intent?.id) {
            MachineService.cancelPairingIntent(data.intent.id).catch(() => {});
          }
        })
        .catch(() => {});
    }
    onClose?.();
  };

  const handleRetry = async () => {
    setPin('');
    setError('');
    setStep('INITIALIZING');
    setIsLoading(true);
    isCancelledRef.current = false;

    try {
      const promise = MachineService.startPairingIntent(station.computer_id, 300);
      pendingIntentPromiseRef.current = promise;
      const data = await promise;

      if (isCancelledRef.current) {
        if (data?.intent?.id) {
          MachineService.cancelPairingIntent(data.intent.id).catch(() => {});
        }
        return;
      }

      if (data?.intent?.id) {
        setIntentId(data.intent.id);
        setStep('WAITING_MOONLIGHT');
      } else {
        setStep('FAILED');
        setError('Không nhận được mã yêu cầu ghép nối từ hệ thống.');
      }
    } catch (err) {
      if (isCancelledRef.current) return;
      setStep('FAILED');
      setError(
        err.response?.data?.message ||
        'Không thể khởi tạo lại yêu cầu ghép nối.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !station) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={handleCancelOrClose}
    >
      <div
        className={`w-full max-h-[92vh] overflow-hidden flex flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl transition-all duration-300 ${showSpecs ? 'max-w-4xl' : 'max-w-md'
          }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              {isCloud ? <Cloud size={21} /> : <Monitor size={21} />}
            </div>

            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Ghép nối Moonlight Remote
              </h2>
              <p className="text-xs text-gray-500">
                Máy {stationName} • {station?.ComputerZone?.zone_name || 'Khu vực máy'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSpecs((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${showSpecs
                  ? 'bg-purple-100 text-purple-700 shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              title={showSpecs ? 'Đóng chi tiết cấu hình' : 'Xem chi tiết cấu hình máy'}
            >
              <Cpu size={14} className={showSpecs ? 'text-purple-600' : 'text-gray-500'} />
              <span>{showSpecs ? 'Thu gọn' : 'Cấu hình máy'}</span>
            </button>

            <button
              onClick={handleCancelOrClose}
              className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5">
          <div
            className={`grid gap-5 ${showSpecs ? 'grid-cols-1 md:grid-cols-2 items-start' : 'grid-cols-1'
              }`}
          >
            {/* Column 1: Connection & Status */}
            <div className="space-y-4">
              {/* Machine Info & Status Badge */}
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3.5">
                <div>
                  <p className="text-xs text-gray-500">Máy đang chọn</p>
                  <p className="font-semibold text-gray-900">{stationName}</p>
                </div>

                {step === 'PAIRED' ? (
                  <span className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                    <CheckCircle2 size={13} /> Đã ghép nối
                  </span>
                ) : step === 'WAITING_MOONLIGHT' ? (
                  <span className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600">
                    <span className="h-2 w-2 animate-ping rounded-full bg-amber-400"></span>
                    Chờ Moonlight
                  </span>
                ) : step === 'PIN_INPUT' ? (
                  <span className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">
                    <Check size={13} /> Đã thấy thiết bị
                  </span>
                ) : step === 'CONFIRMING' ? (
                  <span className="flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-600">
                    <Loader2 size={13} className="animate-spin" /> Đang xác thực
                  </span>
                ) : step === 'FAILED' ? (
                  <span className="flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600">
                    <AlertCircle size={13} /> Thất bại
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                    <Loader2 size={13} className="animate-spin" /> Đang khởi tạo
                  </span>
                )}
              </div>

              {/* Pricing Badge calculated by findPricingPlan */}
              <div className="flex items-center justify-between rounded-xl border border-purple-100 bg-purple-50/40 px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <Tag size={15} className="text-purple-600" />
                  <div>
                    <p className="text-[11px] font-medium text-gray-500">Gói cước áp dụng</p>
                    <p className="text-xs font-semibold text-gray-900">
                      {activePlan?.name || activePlan?.plan_name || 'Gói cước Remote'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-purple-700">
                    {activePlan?.price_per_hour != null
                      ? `${formatCurrency(activePlan.price_per_hour)} / giờ`
                      : (activePlan?.hourly_rate != null ? `${formatCurrency(activePlan.hourly_rate)} / giờ` : 'Đang cập nhật')}
                  </p>
                </div>
              </div>

              {/* Step 1: IPv6 Address */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                    <Wifi size={14} className="text-purple-600" />
                    Bước 1: Địa chỉ IPv6 máy tính
                  </span>
                  <span className="text-[11px] text-gray-400">Nhập vào Moonlight để kết nối</span>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-purple-200/80 bg-purple-50/50 p-2.5">
                  <code className="min-w-0 flex-1 break-all text-xs font-semibold text-purple-900">
                    {ipv6 || (isLoading ? 'Đang lấy địa chỉ IPv6...' : 'Máy chưa có địa chỉ IPv6')}
                  </code>

                  {ipv6 ? (
                    <button
                      type="button"
                      onClick={handleCopyIpv6}
                      className="flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-purple-700 shadow-sm ring-1 ring-purple-200 transition hover:bg-purple-100"
                    >
                      {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      {copied ? 'Đã chép' : 'Sao chép'}
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Step 2: Waiting or PIN input */}
              {step === 'INITIALIZING' && (
                <div className="flex flex-col items-center justify-center py-6 text-gray-500">
                  <Loader2 size={24} className="animate-spin text-blue-600" />
                  <p className="mt-2 text-xs">Đang khởi tạo phiên ghép nối an toàn...</p>
                </div>
              )}

              {step === 'WAITING_MOONLIGHT' && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 text-center">
                  <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <Loader2 size={16} className="animate-spin" />
                  </div>
                  <p className="text-xs font-semibold text-blue-900">
                    Đang chờ kết nối từ Moonlight...
                  </p>
                  <p className="mt-1 text-[11px] text-blue-700">
                    Mở Moonlight trên điện thoại/laptop &gt; Bấm dấu (+) &gt; Nhập IP trên.
                    Hệ thống sẽ tự nhận diện khi thiết bị ping đến máy trạm.
                  </p>
                </div>
              )}

              {(step === 'PIN_INPUT' || step === 'CONFIRMING') && (
                <div className="space-y-3">
                  {deviceName && (
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                      <CheckCircle2 size={15} className="text-emerald-600" />
                      <span>Phát hiện: <strong>{deviceName}</strong></span>
                    </div>
                  )}

                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                      <KeyRound size={14} className="text-amber-500" />
                      Bước 2: Nhập mã PIN hiển thị trên màn hình Moonlight
                    </label>

                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={pin}
                      disabled={step === 'CONFIRMING'}
                      onChange={(e) => {
                        setPin(e.target.value.replace(/\D/g, ''));
                        setError('');
                      }}
                      placeholder="••••"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {step === 'PAIRED' && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 size={24} />
                  </div>
                  <h3 className="font-bold text-emerald-900">Ghép nối thành công!</h3>
                  <p className="mt-1 text-xs text-emerald-700">
                    Máy tính đã được kết nối với thiết bị Moonlight của bạn. Bạn có thể bấm vào máy trong Moonlight để bắt đầu chơi.
                  </p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs text-rose-700">
                  <AlertCircle size={15} className="mt-0.5 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Column 2: Hardware Specs (Split Panel) */}
            {showSpecs && (
              <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/70 p-4">
                <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
                  <div className="flex items-center gap-1.5 font-semibold text-gray-800 text-xs">
                    <Cpu size={15} className="text-purple-600" />
                    <span>Cấu hình phần cứng máy</span>
                  </div>
                  <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                    {hw.profile_name || 'Standard Profile'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5 text-xs">
                  {/* CPU */}
                  <div className="flex items-start gap-2.5 rounded-lg bg-white p-2.5 shadow-2xs">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                      <Cpu size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium text-gray-400">Bộ vi xử lý (CPU)</p>
                      <p className="font-semibold text-gray-800 truncate" title={hw.cpu_model || 'Đang cập nhật'}>
                        {hw.cpu_model || 'Đang cập nhật'}
                      </p>
                    </div>
                  </div>

                  {/* GPU */}
                  <div className="flex items-start gap-2.5 rounded-lg bg-white p-2.5 shadow-2xs">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-purple-50 text-purple-600">
                      <Gamepad2 size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium text-gray-400">Card đồ họa (GPU)</p>
                      <p className="font-semibold text-gray-800 truncate" title={hw.gpu_model || 'Đang cập nhật'}>
                        {hw.gpu_model || 'Đang cập nhật'}
                      </p>
                    </div>
                  </div>

                  {/* RAM & Storage */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-start gap-2 rounded-lg bg-white p-2.5 shadow-2xs">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
                        <MemoryStick size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-medium text-gray-400">Bộ nhớ (RAM)</p>
                        <p className="font-semibold text-gray-800 truncate" title={hw.ram_capacity || '16 GB'}>
                          {hw.ram_capacity || '16 GB'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 rounded-lg bg-white p-2.5 shadow-2xs">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-600">
                        <HardDrive size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-medium text-gray-400">Lưu trữ</p>
                        <p className="font-semibold text-gray-800 truncate" title={hw.storage_type || 'SSD NVMe'}>
                          {hw.storage_type || 'SSD NVMe'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Monitor */}
                  <div className="flex items-start gap-2.5 rounded-lg bg-white p-2.5 shadow-2xs">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                      <Monitor size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium text-gray-400">Màn hình hiển thị</p>
                      <p className="font-semibold text-gray-800 truncate" title={hw.monitor || 'Tiêu chuẩn phòng máy'}>
                        {hw.monitor || 'Tiêu chuẩn phòng máy'}
                      </p>
                    </div>
                  </div>

                  {/* Gear */}
                  <div className="flex items-start gap-2.5 rounded-lg bg-white p-2.5 shadow-2xs">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-rose-50 text-rose-600">
                      <Headphones size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium text-gray-400">Gaming Gear</p>
                      <p className="font-semibold text-gray-800 truncate" title={hw.gear || 'Chuột, Bàn phím cơ & Tai nghe'}>
                        {hw.gear || 'Chuột, Bàn phím cơ & Tai nghe'}
                      </p>
                    </div>
                  </div>

                  {/* Profile Description */}
                  {hw.description && (
                    <div className="rounded-lg bg-white p-2.5 text-gray-600 shadow-2xs">
                      <p className="text-[10px] font-medium text-gray-400">Mô tả thêm</p>
                      <p className="text-[11px] leading-relaxed text-gray-700">{hw.description}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 border-t border-gray-100 px-5 py-3.5">
          {step === 'PAIRED' ? (
            <button
              onClick={onClose}
              className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Hoàn tất
            </button>
          ) : step === 'FAILED' ? (
            <>
              <button
                onClick={handleCancelOrClose}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Đóng
              </button>
              <button
                onClick={handleRetry}
                disabled={isLoading}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                Thử lại
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCancelOrClose}
                disabled={step === 'CONFIRMING'}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Hủy bỏ
              </button>

              <button
                onClick={handleConfirmPin}
                disabled={pin.length !== 4 || step === 'CONFIRMING' || !intentId}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {step === 'CONFIRMING' ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Đang xác thực...
                  </>
                ) : (
                  <>
                    Xác nhận PIN
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
