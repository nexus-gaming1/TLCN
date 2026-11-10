import { useState, useEffect, useMemo, useCallback } from 'react';
import Header from '../../widgets/header/Header';
import Sidebar from '../../widgets/sidebar/Sidebar';
import Footer from '../../widgets/footer/Footer';

// Hardware Config Service, Components & Models
import hardwareService from '../../shared/api/hardwareService';
import { Loader2, AlertCircle, WifiOff, RefreshCw } from 'lucide-react';
import FloatingToast from '../../shared/ui/FloatingToast';
import HardwareKpiBento from '../../features/hardware-config/ui/HardwareKpiBento';
import HardwareFilterBar from '../../features/hardware-config/ui/HardwareFilterBar';
import HardwareSpecsTable from '../../features/hardware-config/ui/HardwareSpecsTable';
import HardwareTelemetryModal from '../../features/hardware-config/ui/HardwareTelemetryModal';
import HardwareProfileFormModal from '../../features/hardware-config/ui/HardwareProfileFormModal';

/**
 * ManageConfigPage (Quản Lý Cấu Hình Máy & BootROM SAN Telemetry)
 * Built with FSD Architecture, Clean Code & Real Database Synchronization
 */
export default function ManageConfigPage({ user, onLogout }) {
  const [specs, setSpecs] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [zones, setZones] = useState([]);
  const [computers, setComputers] = useState([]);
  const [hardwarePresets, setHardwarePresets] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [togglingId, setTogglingId] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedTelemetry, setSelectedTelemetry] = useState(null);
  const [selectedHardwareForEdit, setSelectedHardwareForEdit] = useState(null);
  const [isTelemetryModalOpen, setIsTelemetryModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Thông báo toast nổi đa năng (Success, Warning, Error)
  const showToast = useCallback((payload, type = 'success') => {
    if (typeof payload === 'string') {
      setToast({
        type,
        title: type === 'warning' ? 'Đã tạm ngưng' : type === 'error' ? 'Lỗi' : 'Thành công',
        message: payload
      });
    } else {
      setToast(payload);
    }
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Fetch real specs & zone & computer & presets data from Backend API on mount
  const fetchHardwareData = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOffline(true);
      setIsLoading(false);
      setError('Mất kết nối mạng Internet. Vui lòng kiểm tra đường truyền và thử lại.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const result = await hardwareService.getHardwareSpecs();
      if (result) {
        setSpecs(result.specs || []);
        if (result.metrics) setMetrics(result.metrics);
        if (result.zones) setZones(result.zones || []);
        if (result.computers) setComputers(result.computers || []);
        if (result.hardwarePresets) setHardwarePresets(result.hardwarePresets);
      }
    } catch (err) {
      console.error('Lỗi khi tải thông số cấu hình từ CSDL API:', err);
      setError(err.message || 'Không thể kết nối CSDL máy chủ backend (Port 3001).');
      showToast(err.message || 'Không thể tải dữ liệu cấu hình máy từ máy chủ.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchHardwareData();
  }, [fetchHardwareData]);

  // Theo dõi trạng thái mạng (Online / Offline)
  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      showToast({
        type: 'error',
        title: 'Mất kết nối mạng',
        message: 'Thiết bị đang ngoại tuyến. Một số thao tác đồng bộ có thể bị gián đoạn.'
      });
    };
    const handleOnline = () => {
      setIsOffline(false);
      showToast({
        type: 'success',
        title: 'Đã khôi phục kết nối',
        message: 'Đang đồng bộ lại dữ liệu cấu hình máy...'
      });
      fetchHardwareData();
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [fetchHardwareData, showToast]);

  // Global keyboard listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="⌘K"]');
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered Specs Calculation
  // Filtered Specs Calculation
  const filteredSpecs = useMemo(() => {
    return specs.filter((item) => {
      const query = searchQuery.toLowerCase().trim();
      const itemIdStr = String(item.id || '').toLowerCase();
      const profileNameStr = String(item.profileName || '').toLowerCase();

      const matchSearch =
        !query ||
        itemIdStr.includes(query) ||
        profileNameStr.includes(query) ||
        (item.assignedComputers && item.assignedComputers.some((c) => String(c).toLowerCase().includes(query))) ||
        (item.cpu?.model && item.cpu.model.toLowerCase().includes(query)) ||
        (item.gpu?.model && item.gpu.model.toLowerCase().includes(query)) ||
        (item.ram?.capacity && item.ram.capacity.toLowerCase().includes(query)) ||
        (item.storage?.type && item.storage.type.toLowerCase().includes(query));

      const matchZone = zoneFilter === 'all' || String(item.zoneId) === String(zoneFilter);

      let matchStatus = true;
      if (statusFilter === 'active') {
        matchStatus = item.is_active !== false;
      } else if (statusFilter === 'inactive') {
        matchStatus = item.is_active === false;
      } else if (statusFilter !== 'all') {
        const itemStatusNorm = String(item.status || '').toLowerCase();
        matchStatus =
          itemStatusNorm === statusFilter.toLowerCase() ||
          (statusFilter === 'ready' && (itemStatusNorm === 'available' || itemStatusNorm === 'ready')) ||
          (statusFilter === 'online' && (itemStatusNorm === 'occupied' || itemStatusNorm === 'online')) ||
          (statusFilter === 'maintenance' && itemStatusNorm === 'maintenance');
      }

      return matchSearch && matchZone && matchStatus;
    });
  }, [specs, searchQuery, zoneFilter, statusFilter]);

  // Handlers
  const handleOpenTelemetry = (hardwareItem) => {
    setSelectedTelemetry(hardwareItem);
    setIsTelemetryModalOpen(true);
  };

  const handleEdit = (hardwareItem) => {
    setSelectedHardwareForEdit(hardwareItem);
    setIsEditModalOpen(true);
  };

  const handleSaveEditHardware = async (updatedItem) => {
    try {
      await hardwareService.updateHardwareSpec(updatedItem.id, updatedItem);
      showToast('Cập nhật mẫu cấu hình phần cứng thành công!', 'success');
      await fetchHardwareData();
    } catch (err) {
      console.error('Lỗi khi cập nhật mẫu cấu hình máy:', err);
      const msg = err.response?.data?.message || err.message || 'Không thể cập nhật cấu hình máy. Vui lòng thử lại!';
      showToast(msg, 'error');
      throw new Error(msg);
    }
  };

  const handleToggleActive = async (item) => {
    if (togglingId) return;
    const prevActiveState = item.is_active !== false;
    const newActiveState = !prevActiveState;
    const profileName = item.profileName || item.id;
    const targetId = item.profile_id || item.id;

    setTogglingId(item.id);
    try {
      // Optimistic update
      setSpecs((prev) =>
        prev.map((s) => (s.id === item.id ? { ...s, is_active: newActiveState } : s))
      );
      await hardwareService.toggleHardwareSpec(targetId, newActiveState);
      if (newActiveState) {
        showToast({
          type: 'success',
          title: 'Đã kích hoạt cấu hình máy',
          message: `Mẫu cấu hình "${profileName}" đã được kích hoạt thành công.`
        });
      } else {
        showToast({
          type: 'warning',
          title: 'Đã ngưng kích hoạt cấu hình máy',
          message: `Mẫu cấu hình "${profileName}" đã tạm ngưng kích hoạt.`
        });
      }
      await fetchHardwareData();
    } catch (err) {
      console.error('Lỗi khi chuyển đổi trạng thái cấu hình:', err);
      // Rollback state without triggering a second failing network request
      setSpecs((prev) =>
        prev.map((s) => (s.id === item.id ? { ...s, is_active: prevActiveState } : s))
      );
      showToast({
        type: 'error',
        title: 'Lỗi cập nhật trạng thái',
        message: err.message || 'Không thể thay đổi trạng thái cấu hình máy'
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteSpec = async (item) => {
    const profileName = item.profileName || item.id;
    const targetId = item.profile_id || item.id;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa mẫu cấu hình "${profileName}"? Các máy trạm đang gán sẽ được gỡ liên kết an toàn.`)) {
      return;
    }
    try {
      await hardwareService.deleteHardwareSpec(targetId);
      showToast({
        type: 'success',
        title: 'Đã xóa mẫu cấu hình',
        message: `Mẫu cấu hình "${profileName}" đã được chuyển vào thùng rác.`
      });
      await fetchHardwareData();
    } catch (err) {
      console.error('Lỗi khi xóa mẫu cấu hình máy:', err);
      showToast({
        type: 'error',
        title: 'Lỗi khi xóa cấu hình',
        message: err.message || 'Không thể xóa mẫu cấu hình máy.'
      });
    }
  };

  const handleCreateHardware = async (newHardware) => {
    try {
      await hardwareService.createHardwareSpec(newHardware);
      showToast('Thêm mẫu cấu hình phần cứng mới thành công!', 'success');
      await fetchHardwareData();
    } catch (err) {
      console.error('Lỗi khi tạo mẫu cấu hình máy:', err);
      const msg = err.response?.data?.message || err.message || 'Không thể tạo cấu hình máy. Vui lòng thử lại!';
      showToast(msg, 'error');
      throw new Error(msg);
    }
  };

  const handleExportReport = () => {
    if (!filteredSpecs || filteredSpecs.length === 0) {
      showToast({
        type: 'warning',
        title: 'Không có dữ liệu',
        message: 'Danh sách cấu hình đang trống, không thể xuất báo cáo CSV.'
      });
      return;
    }

    const sanitizeCsvCell = (val) => {
      if (val === null || val === undefined) return '""';
      let str = String(val).trim();
      if (/^[=@+\-\t\r]/.test(str)) {
        str = `'${str}`;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = ['Tên Cấu Hình / Mã Máy', 'Phân Khu', 'Status', 'CPU Model', 'RAM', 'GPU', 'Storage', 'Màn hình', 'Peripherals'];
    const csvRows = [
      headers.map(sanitizeCsvCell).join(','),
      ...filteredSpecs.map((item) =>
        [
          sanitizeCsvCell(item.profileName || item.id),
          sanitizeCsvCell(item.zoneName),
          sanitizeCsvCell(item.statusLabel || item.status),
          sanitizeCsvCell(item.cpu?.model || ''),
          sanitizeCsvCell(item.ram?.capacity || ''),
          sanitizeCsvCell(item.gpu?.model || ''),
          sanitizeCsvCell(item.storage?.type || ''),
          sanitizeCsvCell(item.monitor || ''),
          sanitizeCsvCell(item.gear || '')
        ].join(',')
      )
    ];

    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `hardware_fleet_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-50 font-sans text-slate-900 antialiased min-h-screen overflow-x-hidden">
      {/* Shared Header Widget */}
      <Header
        user={user}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onLogout={onLogout}
      />

      {/* Shared Sidebar Widget with activeNav='config' */}
      <Sidebar activeNav="config" bootromStatus="ONLINE" role="ADMIN" />

      {/* Floating Toast Notification (0ms Layout Shift) */}
      <FloatingToast toast={toast} onClose={() => setToast(null)} />

      {/* Main Content Area */}
      <div className="lg:pl-[240px] w-full min-h-screen overflow-x-hidden">
        <main className="relative pt-16 min-h-screen bg-slate-50 w-full px-4 sm:px-6 py-4 sm:py-6 pb-20 flex flex-col justify-between">
          <div className="flex flex-col w-full max-w-7xl mx-auto gap-5 sm:gap-6">
            {isOffline && (
              <div className="flex items-center justify-between gap-3 p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold shadow-xs">
                <div className="flex items-center gap-2">
                  <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Thiết bị đang mất kết nối mạng. Vui lòng kiểm tra Wi-Fi / LAN của bạn.</span>
                </div>
              </div>
            )}

            {isLoading && specs.length > 0 && (
              <div className="flex items-center gap-2 text-xs font-semibold text-sky-600 bg-sky-50 px-3 py-1.5 rounded-md w-fit border border-sky-200 shadow-sm">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-500" />
                <span>Đang đồng bộ dữ liệu cấu hình máy &amp; BootROM SAN...</span>
              </div>
            )}

            {error && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold shadow-xs">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    {error} — Vui lòng kiểm tra máy chủ backend hoặc đăng nhập tài khoản Quản trị.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={fetchHardwareData}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer whitespace-nowrap flex items-center gap-1.5 self-end sm:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Thử Lại</span>
                </button>
              </div>
            )}

            {/* Telemetry Summary Bento Grid */}
            <HardwareKpiBento metrics={metrics} isLoading={isLoading} />

            {/* Filter Matrix & CTA Toolbar */}
            <HardwareFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              zoneFilter={zoneFilter}
              onZoneChange={setZoneFilter}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              onExportReport={handleExportReport}
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
              zones={zones}
            />

            {/* High-Density Hardware Inventory Table (with Initial Loading Skeleton) */}
            {isLoading && specs.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200/90 p-12 text-center shadow-xs">
                <Loader2 className="w-8 h-8 animate-spin text-sky-600 mx-auto mb-3" />
                <p className="text-xs font-bold text-slate-600">
                  Đang tải danh sách cấu hình phần cứng &amp; BootROM SAN...
                </p>
              </div>
            ) : (
              <HardwareSpecsTable
                specs={filteredSpecs}
                totalSpecsCount={specs.length}
                togglingId={togglingId}
                onResetFilters={() => {
                  setSearchQuery('');
                  setZoneFilter('all');
                  setStatusFilter('all');
                }}
                onOpenTelemetry={handleOpenTelemetry}
                onEdit={handleEdit}
                onToggleActive={handleToggleActive}
                onDelete={handleDeleteSpec}
              />
            )}
          </div>

          {/* Shared Footer Widget */}
          <Footer />
        </main>
      </div>

      {/* Modals */}
      <HardwareTelemetryModal
        isOpen={isTelemetryModalOpen}
        onClose={() => setIsTelemetryModalOpen(false)}
        hardware={selectedTelemetry}
      />

      <HardwareProfileFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateHardware}
        mode="create"
        zones={zones}
        computers={computers}
        hardwarePresets={hardwarePresets}
      />

      <HardwareProfileFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleSaveEditHardware}
        mode="edit"
        hardware={selectedHardwareForEdit}
        zones={zones}
        computers={computers}
        hardwarePresets={hardwarePresets}
      />
    </div>
  );
}
