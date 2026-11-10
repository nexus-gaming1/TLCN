import React, { useState, useEffect } from 'react';
import { Monitor, X, Check, Network, ShieldAlert } from 'lucide-react';
import machineService from '../../../shared/api/machine.service';
import { ComputerStatus, COMPUTER_STATUS_OPTIONS } from '../../../shared/constants/stationConstants';
import MachineZoneSelect from './MachineZoneSelect';

// Strict Format Validation Regexes
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const MAC_REGEX = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

/**
 * EditMachineModal Component
 * Allows editing machine specifications (Name, Zone, IP, MAC, Status, Remote status)
 * Reuses centralized ComputerStatus enums & COMPUTER_STATUS_OPTIONS.
 */
export default function EditMachineModal({ isOpen = false, machine = null, onClose, onSubmit }) {
  const [zones, setZones] = useState([]);
  const [loadingZones, setLoadingZones] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [errorNotice, setErrorNotice] = useState(null);

  const [formData, setFormData] = useState({
    computer_name: '',
    zone_id: '1',
    ip_address: '',
    mac_address: '',
    status: ComputerStatus.ONLINE,
    is_remote_enabled: false
  });

  // Extract primitive identifiers for optimized useEffect dependency array
  const machineId = machine?.computer_id || machine?.id;
  const machineIp = machine?.ip || machine?.ip_address;
  const machineMac = machine?.mac_address;
  const machineStatus = machine?.status;
  const machineZoneId = machine?.zoneId || machine?.zone_id;
  const machineRemote = machine?.is_remote_enabled;

  // Optimized useEffect: Depend on primitive identifiers instead of whole object reference
  useEffect(() => {
    if (isOpen && machine) {
      const rawZoneId = machineZoneId
        ? String(machineZoneId).replace('zone-', '')
        : '1';

      setFormData({
        computer_name: machine.id || machine.computer_name || '',
        zone_id: rawZoneId,
        ip_address: machineIp || '',
        mac_address: machineMac || '',
        status: String(machineStatus || ComputerStatus.ONLINE).toUpperCase(),
        is_remote_enabled: Boolean(machineRemote)
      });
      setErrors({});
      setErrorNotice(null);
    }
  }, [isOpen, machineId, machineIp, machineMac, machineStatus, machineZoneId, machineRemote]);

  // Load active computer zones from backend API
  useEffect(() => {
    if (isOpen) {
      const fetchZones = async () => {
        setLoadingZones(true);
        try {
          const zonesData = await machineService.getZones();
          if (Array.isArray(zonesData) && zonesData.length > 0) {
            setZones(zonesData);
          }
        } catch (err) {
          console.warn('Lỗi khi nạp danh sách phân khu:', err.message);
        } finally {
          setLoadingZones(false);
        }
      };
      fetchZones();
    }
  }, [isOpen]);

  if (!isOpen || !machine) return null;

  const selectedZone = zones.find(
    (z) => String(z.zone_id) === String(formData.zone_id)
  ) || zones[0];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear specific field validation error upon typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.computer_name.trim()) {
      newErrors.computer_name = 'Tên máy trạm không được để trống.';
    }

    if (!formData.ip_address.trim()) {
      newErrors.ip_address = 'Địa chỉ IP không được để trống.';
    } else if (!IPV4_REGEX.test(formData.ip_address.trim())) {
      newErrors.ip_address = 'IP không đúng định dạng IPv4 (VD: 192.168.1.101).';
    }

    if (!formData.mac_address.trim()) {
      newErrors.mac_address = 'Địa chỉ MAC không được để trống.';
    } else if (!MAC_REGEX.test(formData.mac_address.trim())) {
      newErrors.mac_address = 'MAC không đúng định dạng PXE (VD: F4:D4:88:5A:01:01).';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorNotice(null);

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const computerId = machine.computer_id || machine.id;
      const targetZoneId = Number(formData.zone_id) || 1;

      const payload = {
        computer_name: formData.computer_name.trim(),
        zone_id: targetZoneId,
        ip_address: formData.ip_address.trim(),
        mac_address: formData.mac_address.trim(),
        status: formData.status,
        is_remote_enabled: formData.is_remote_enabled
      };

      if (onSubmit) {
        await onSubmit(computerId, payload);
      }
      if (onClose) onClose();
    } catch (err) {
      setErrorNotice(err.message || 'Lỗi khi cập nhật máy trạm. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-400 flex items-center justify-center shadow-xs">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight text-white leading-tight">
                Chỉnh Sửa Thông Tin Máy Trạm ({machine.id})
              </h3>
              <p className="text-xs text-slate-400">
                Cập nhật phân khu, thông số IP/MAC &amp; trạng thái máy
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-5 flex flex-col gap-4 text-xs font-semibold text-slate-700">
            {/* Inline Error Notice Banner (Non-blocking UI error display) */}
            {errorNotice && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorNotice}</span>
              </div>
            )}

            {/* Row 1: Machine Name & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Machine Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase font-mono font-bold text-slate-600">
                  Tên Máy Trạm *
                </label>
                <input
                  type="text"
                  name="computer_name"
                  value={formData.computer_name}
                  onChange={handleChange}
                  required
                  placeholder="VD: PC-001"
                  className={`px-3 py-2 bg-white border rounded-xl font-mono text-xs text-slate-900 font-extrabold focus:outline-none focus:ring-2 ${
                    errors.computer_name
                      ? 'border-rose-500 ring-rose-500/30'
                      : 'border-slate-300 focus:ring-indigo-500/30'
                  }`}
                />
                {errors.computer_name && (
                  <span className="text-[10px] text-rose-600 font-semibold">{errors.computer_name}</span>
                )}
              </div>

              {/* Status */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase font-mono font-bold text-slate-600">
                  Trạng Thái Hoạt Động *
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500/30 focus:outline-none cursor-pointer"
                >
                  {COMPUTER_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Dynamic Zone Selection & Hardware Preview */}
            <MachineZoneSelect
              zones={zones}
              selectedZoneId={formData.zone_id}
              loadingZones={loadingZones}
              onChange={handleChange}
              name="zone_id"
              accentColor="indigo"
            />

            {/* Row 3: IP & MAC Configuration */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl flex flex-col gap-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Network className="w-4 h-4 text-indigo-600" />
                  Thông Số Mạng LAN &amp; MAC PXE
                </span>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-700 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_remote_enabled"
                    checked={formData.is_remote_enabled}
                    onChange={handleChange}
                    className="rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                  />
                  <span>Bật Cloud Remote</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* IP Field */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-mono font-bold text-slate-600">Địa Chỉ IP *</label>
                  <input
                    type="text"
                    name="ip_address"
                    value={formData.ip_address}
                    onChange={handleChange}
                    required
                    pattern="^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
                    placeholder="192.168.1.101"
                    className={`px-3 py-1.5 bg-white border rounded-lg font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 ${
                      errors.ip_address
                        ? 'border-rose-500 ring-rose-500/30 text-rose-900'
                        : 'border-slate-300 focus:ring-indigo-500/30'
                    }`}
                  />
                  {errors.ip_address && (
                    <span className="text-[10px] text-rose-600 font-semibold mt-0.5">{errors.ip_address}</span>
                  )}
                </div>

                {/* MAC Field */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-mono font-bold text-slate-600">Địa Chỉ MAC *</label>
                  <input
                    type="text"
                    name="mac_address"
                    value={formData.mac_address}
                    onChange={handleChange}
                    required
                    pattern="^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$"
                    placeholder="F4:D4:88:5A:01:01"
                    className={`px-3 py-1.5 bg-white border rounded-lg font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 ${
                      errors.mac_address
                        ? 'border-rose-500 ring-rose-500/30 text-rose-900'
                        : 'border-slate-300 focus:ring-indigo-500/30'
                    }`}
                  />
                  {errors.mac_address && (
                    <span className="text-[10px] text-rose-600 font-semibold mt-0.5">{errors.mac_address}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300/80 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs shadow-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{submitting ? 'Đang Lưu...' : 'Lưu Thay Đổi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

