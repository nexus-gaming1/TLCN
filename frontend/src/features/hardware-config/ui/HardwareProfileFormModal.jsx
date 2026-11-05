import { useState, useEffect } from 'react';
import {
  X,
  Cpu,
  MemoryStick,
  Gamepad2,
  HardDrive,
  PlusCircle,
  Edit3,
  AlertCircle,
  Monitor,
  Headphones,
  Layers,
  CheckSquare,
  Square
} from 'lucide-react';

const HARDWARE_FIELDS = [
  {
    key: 'cpu',
    label: 'Bộ xử lý (CPU)',
    icon: Cpu,
    iconColor: 'text-sky-600',
    listKey: 'cpus',
    placeholder: 'Nhập tên CPU tùy chỉnh...',
    extractValue: (hw) => hw?.cpu?.model || ''
  },
  {
    key: 'gpu',
    label: 'Card đồ họa (GPU)',
    icon: Gamepad2,
    iconColor: 'text-indigo-600',
    listKey: 'gpus',
    placeholder: 'Nhập tên GPU tùy chỉnh...',
    extractValue: (hw) => hw?.gpu?.model || ''
  },
  {
    key: 'ram',
    label: 'Bộ nhớ (RAM)',
    icon: MemoryStick,
    iconColor: 'text-purple-600',
    listKey: 'rams',
    placeholder: 'Nhập dung lượng/bus RAM tùy chỉnh...',
    extractValue: (hw) => hw?.ram?.capacity || ''
  },
  {
    key: 'storage',
    label: 'Loại Lưu Trữ / SAN Boot',
    icon: HardDrive,
    iconColor: 'text-emerald-600',
    listKey: 'storages',
    placeholder: 'Nhập chuẩn SAN Boot/SSD...',
    extractValue: (hw) => hw?.storage?.type || ''
  },
  {
    key: 'monitor',
    label: 'Màn hình (Monitor)',
    icon: Monitor,
    iconColor: 'text-amber-600',
    listKey: 'monitors',
    placeholder: 'Nhập kích thước & tần số quét...',
    extractValue: (hw) => hw?.monitor || ''
  },
  {
    key: 'gear',
    label: 'Gear / Peripherals (Tùy chọn)',
    icon: Headphones,
    iconColor: 'text-rose-600',
    listKey: 'gears',
    placeholder: 'Nhập bàn phím, chuột, tai nghe...',
    extractValue: (hw) => hw?.gear || ''
  }
];

/**
 * Unified HardwareProfileFormModal component (DRY principle compliant)
 * Handles both "create" and "edit" workflows cleanly with shared UI and validation logic
 */
export default function HardwareProfileFormModal({
  isOpen,
  onClose,
  onSubmit,
  mode = 'create',
  hardware = null,
  zones = [],
  computers = [],
  hardwarePresets = {}
}) {
  const isEditMode = mode === 'edit';
  const presets = hardwarePresets || {};

  const [formData, setFormData] = useState({
    profileName: '',
    zoneId: '1',
    description: ''
  });

  const [specsState, setSpecsState] = useState({
    cpu: { select: '', custom: '' },
    gpu: { select: '', custom: '' },
    ram: { select: '', custom: '' },
    storage: { select: '', custom: '' },
    monitor: { select: '', custom: '' },
    gear: { select: '', custom: '' }
  });

  const [selectedComputers, setSelectedComputers] = useState([]);
  const [errorNotice, setErrorNotice] = useState('');

  // Sync state when modal opens or target hardware/CSDL presets change
  useEffect(() => {
    if (isOpen) {
      const activePresets = hardwarePresets || {};
      const newSpecs = {};

      HARDWARE_FIELDS.forEach((field) => {
        const rawVal = isEditMode ? field.extractValue(hardware) : '';
        const list = activePresets[field.listKey] || [];
        const isInList = list.includes(rawVal);

        if (isEditMode) {
          newSpecs[field.key] = {
            select: isInList ? rawVal : (rawVal ? 'custom' : (list[0] || 'custom')),
            custom: isInList ? '' : rawVal
          };
        } else {
          newSpecs[field.key] = {
            select: list.length > 0 ? list[0] : 'custom',
            custom: ''
          };
        }
      });

      setSpecsState(newSpecs);

      if (isEditMode && hardware) {
        setFormData({
          profileName: hardware.profileName || hardware.id || '',
          zoneId: hardware.zoneId ? String(hardware.zoneId) : (zones[0]?.zone_id ? String(zones[0].zone_id) : '1'),
          description: hardware.description || ''
        });
        setSelectedComputers(hardware.assignedComputers || (hardware.id ? [hardware.id] : []));
      } else {
        setFormData({
          profileName: '',
          zoneId: zones[0]?.zone_id ? String(zones[0].zone_id) : '1',
          description: ''
        });
        setSelectedComputers([]);
      }
      setErrorNotice('');
    }
  }, [isOpen, mode, hardware, hardwarePresets, zones, isEditMode]);

  if (!isOpen) return null;
  if (isEditMode && !hardware) return null;

  const handleSpecSelectChange = (key, val) => {
    setSpecsState((prev) => ({
      ...prev,
      [key]: { ...prev[key], select: val }
    }));
  };

  const handleSpecCustomChange = (key, val) => {
    setSpecsState((prev) => ({
      ...prev,
      [key]: { ...prev[key], custom: val }
    }));
  };

  const toggleSelectComputer = (compName) => {
    setSelectedComputers((prev) =>
      prev.includes(compName) ? prev.filter((c) => c !== compName) : [...prev, compName]
    );
  };

  const handleSelectAllComputers = () => {
    if (selectedComputers.length === computers.length) {
      setSelectedComputers([]);
    } else {
      setSelectedComputers(computers.map((c) => c.computer_name || c.id));
    }
  };

  const getFinalSpec = (fieldKey, listKey) => {
    const field = specsState[fieldKey];
    const presetList = presets[listKey] || [];
    if (field?.select === 'custom') {
      return field.custom?.trim() || presetList[0] || 'Chưa thiết lập';
    }
    return field?.select || presetList[0] || 'Chưa thiết lập';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.profileName.trim()) {
      setErrorNotice('Vui lòng nhập Tên mẫu cấu hình (Profile Name)!');
      return;
    }

    const finalSpecs = HARDWARE_FIELDS.reduce((acc, field) => {
      acc[field.key] = getFinalSpec(field.key, field.listKey);
      return acc;
    }, {});

    const selectedZone = zones.find((z) => String(z.zone_id) === String(formData.zoneId)) || {};

    if (isEditMode) {
      const updatedProfile = {
        ...hardware,
        id: hardware?.id || formData.profileName.trim(),
        profileName: formData.profileName.trim(),
        zoneId: formData.zoneId,
        zoneName: selectedZone.zone_name || hardware?.zoneName || 'Phân Khu',
        description: formData.description.trim(),
        cpu: {
          model: finalSpecs.cpu,
          specs: hardware?.cpu?.specs || 'Hiệu năng cao'
        },
        ram: {
          capacity: finalSpecs.ram,
          specs: hardware?.ram?.specs || 'Low-latency'
        },
        gpu: {
          model: finalSpecs.gpu,
          edition: hardware?.gpu?.edition || 'Gaming Edition'
        },
        storage: {
          type: finalSpecs.storage,
          specs: hardware?.storage?.specs || 'BootROM High-Speed'
        },
        monitor: finalSpecs.monitor,
        gear: finalSpecs.gear,
        assignedComputers: selectedComputers
      };

      if (onSubmit) onSubmit(updatedProfile);
    } else {
      const newProfile = {
        id: formData.profileName.toUpperCase().replace(/\s+/g, '-'),
        profileName: formData.profileName.trim(),
        zoneId: formData.zoneId,
        zoneName: selectedZone.zone_name || 'Phân Khu Mặc Định',
        description: formData.description.trim(),
        status: 'online',
        statusLabel: 'Online',
        cpu: { model: finalSpecs.cpu, specs: 'Hiệu năng cao' },
        ram: { capacity: finalSpecs.ram, specs: 'Low-latency' },
        gpu: { model: finalSpecs.gpu, edition: 'Gaming Edition' },
        storage: { type: finalSpecs.storage, specs: 'BootROM High-Speed' },
        monitor: finalSpecs.monitor,
        gear: finalSpecs.gear,
        assignedComputers: selectedComputers,
        telemetry: { cpuTemp: 48, gpuTemp: 45, fanSpeed: '55%', sanPing: '0.20ms' }
      };

      if (onSubmit) onSubmit(newProfile);
    }

    setErrorNotice('');
    onClose();
  };

  const ModalIcon = isEditMode ? Edit3 : PlusCircle;
  const headerTheme = isEditMode
    ? {
        bgIcon: 'bg-indigo-600',
        title: `Chỉnh Sửa Mẫu Cấu Hình: ${hardware?.profileName || hardware?.id}`,
        subTitle: 'Cập nhật thông số linh kiện & Gán máy trạm áp dụng hàng loạt',
        btnText: 'Lưu Thay Đổi Cấu Hình',
        btnBg: 'bg-indigo-600 hover:bg-indigo-700'
      }
    : {
        bgIcon: 'bg-sky-600',
        title: 'Tạo Mẫu Cấu Hình Phần Cứng (Hardware Profile)',
        subTitle: 'Thiết lập gói cấu hình chuẩn (CPU, GPU, RAM, SAN Boot, Peripherals) & Áp dụng hàng loạt',
        btnText: '+ Lưu Mẫu Cấu Hình',
        btnBg: 'bg-sky-600 hover:bg-sky-700'
      };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 overflow-hidden text-xs">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${headerTheme.bgIcon} text-white flex items-center justify-center font-bold shadow-xs shrink-0`}>
              <ModalIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                {headerTheme.title}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {headerTheme.subTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Notice */}
        {errorNotice && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorNotice}</span>
          </div>
        )}

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* SECTION 1: Thông tin chung gói cấu hình */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
              <Layers className="w-4 h-4 text-sky-600" />
              <span>1. Thông tin chung về mẫu cấu hình</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                  Tên mẫu cấu hình (Profile Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Dàn Thi Đấu Esports Pro, Dàn VIP Gaming..."
                  value={formData.profileName}
                  onChange={(e) => setFormData({ ...formData, profileName: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500/30 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">Phân khu mặc định (Zone)</label>
                <select
                  value={formData.zoneId}
                  onChange={(e) => setFormData({ ...formData, zoneId: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500/30 outline-none cursor-pointer"
                >
                  {zones.map((z) => (
                    <option key={z.zone_id} value={z.zone_id} className="text-xs">
                      {z.zone_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-[11px]">Mô tả / Ghi chú kỹ thuật</label>
              <input
                type="text"
                placeholder="VD: Dàn máy chuyên phục vụ giải đấu FPS, màn hình 240Hz..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500/30 outline-none"
              />
            </div>
          </div>

          {/* SECTION 2: Chi tiết linh kiện phần cứng (Data-Driven Render) */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
              <Cpu className="w-4 h-4 text-sky-600" />
              <span>2. Chi tiết linh kiện phần cứng (Spec Details - Đọc từ CSDL API)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {HARDWARE_FIELDS.map((field) => {
                const list = presets[field.listKey] || [];
                const fieldState = specsState[field.key] || { select: list[0] || 'custom', custom: '' };
                const IconComponent = field.icon;

                return (
                  <div key={field.key}>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px] flex items-center gap-1.5">
                      <IconComponent className={`w-3.5 h-3.5 ${field.iconColor}`} /> {field.label}
                    </label>
                    <select
                      value={fieldState.select}
                      onChange={(e) => handleSpecSelectChange(field.key, e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500/30 outline-none cursor-pointer"
                    >
                      {list.map((item, idx) => (
                        <option key={idx} value={item} className="text-xs font-medium text-slate-800">
                          {item}
                        </option>
                      ))}
                      <option value="custom" className="text-xs font-semibold text-sky-700">
                        -- Nhập tùy chỉnh thủ công --
                      </option>
                    </select>
                    {fieldState.select === 'custom' && (
                      <input
                        type="text"
                        placeholder={field.placeholder}
                        value={fieldState.custom}
                        onChange={(e) => handleSpecCustomChange(field.key, e.target.value)}
                        className="w-full mt-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-sky-500/30 outline-none"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: Áp dụng cho danh sách máy trạm (Batch Assignment) */}
          <div className="space-y-3 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-xs uppercase tracking-wider">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                <span>3. Áp dụng ngay cấu hình này cho các máy trạm (Batch Assignment)</span>
              </div>
              {computers.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllComputers}
                  className="text-xs font-bold text-sky-600 hover:text-sky-800 transition"
                >
                  {selectedComputers.length === computers.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-500 font-medium">
              Hoặc để trống mục này, việc gán máy sẽ do màn hình &quot;Quản Lý Máy Trạm&quot; thực hiện sau.
            </p>

            {computers.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1 max-h-36 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                {computers.map((comp) => {
                  const compName = comp.computer_name || comp.id;
                  const isChecked = selectedComputers.includes(compName);
                  return (
                    <button
                      type="button"
                      key={compName}
                      onClick={() => toggleSelectComputer(compName)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all text-left ${
                        isChecked
                          ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {isChecked ? <CheckSquare className="w-3.5 h-3.5 shrink-0 text-white" /> : <Square className="w-3.5 h-3.5 shrink-0 text-slate-400" />}
                      <span className="truncate">{compName}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-xl text-slate-500 font-medium text-xs text-center border border-slate-200">
                Chưa có dữ liệu danh sách máy trạm để gán trực tiếp. Bạn có thể lưu mẫu cấu hình này để gán sau.
              </div>
            )}
          </div>

          {/* Footer CTAs */}
          <div className="border-t border-slate-100 pt-3.5 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              className={`px-6 py-2 ${headerTheme.btnBg} text-white text-xs font-extrabold rounded-xl shadow-xs transition`}
            >
              {headerTheme.btnText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
