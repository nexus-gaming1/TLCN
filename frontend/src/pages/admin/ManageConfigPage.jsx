import { useState, useEffect, useMemo, useCallback } from 'react';
import Header from '../../widgets/header/Header';
import Sidebar from '../../widgets/sidebar/Sidebar';
import Footer from '../../widgets/footer/Footer';

// Hardware Config Service, Components & Models
import hardwareService from '../../shared/api/hardwareService';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import HardwareKpiBento from '../../features/hardware-config/ui/HardwareKpiBento';
import HardwareFilterBar from '../../features/hardware-config/ui/HardwareFilterBar';
import HardwareSpecsTable from '../../features/hardware-config/ui/HardwareSpecsTable';
import HardwareDiagnostics from '../../features/hardware-config/ui/HardwareDiagnostics';
import HardwareTelemetryModal from '../../features/hardware-config/ui/HardwareTelemetryModal';
import HardwareProfileFormModal from '../../features/hardware-config/ui/HardwareProfileFormModal';

/**
 * ManageConfigPage (Quản Lý Cấu Hình Máy & BootROM SAN Telemetry)
 * Built with FSD Architecture, Clean Code & Real Database Synchronization
 */
export default function ManageConfigPage({ user, onLogout }) {
  const [specs, setSpecs] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [zones, setZones] = useState([]);
  const [computers, setComputers] = useState([]);
  const [hardwarePresets, setHardwarePresets] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedTelemetry, setSelectedTelemetry] = useState(null);
  const [selectedHardwareForEdit, setSelectedHardwareForEdit] = useState(null);
  const [isTelemetryModalOpen, setIsTelemetryModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch real specs & zone & computer & presets data from Backend API on mount
  const fetchHardwareData = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await hardwareService.getHardwareSpecs();
      if (result) {
        setSpecs(result.specs || []);
        if (result.metrics) setMetrics(result.metrics);
        if (result.diagnostics) setDiagnostics(result.diagnostics);
        if (result.zones) setZones(result.zones || []);
        if (result.computers) setComputers(result.computers || []);
        if (result.hardwarePresets) setHardwarePresets(result.hardwarePresets);
      }
    } catch (err) {
      console.error('Lỗi khi tải thông số cấu hình từ CSDL API:', err);
      toast.error('Không thể tải dữ liệu cấu hình máy từ máy chủ.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHardwareData();
  }, [fetchHardwareData]);

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
      const matchStatus = statusFilter === 'all' || item.status === statusFilter;

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
      toast.success('Cập nhật mẫu cấu hình phần cứng thành công!');
      await fetchHardwareData();
    } catch (err) {
      console.error('Lỗi khi cập nhật mẫu cấu hình máy:', err);
      const msg = err.response?.data?.message || err.message || 'Không thể cập nhật cấu hình máy. Vui lòng thử lại!';
      toast.error(msg);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa mẫu cấu hình phần cứng ${id}?`)) {
      try {
        await hardwareService.deleteHardwareSpec(id);
        toast.success(`Đã xóa cấu hình phần cứng ${id} thành công!`);
        await fetchHardwareData();
      } catch (err) {
        console.error('Lỗi khi xóa mẫu cấu hình máy:', err);
        const msg = err.response?.data?.message || err.message || 'Không thể xóa cấu hình phần cứng.';
        toast.error(msg);
      }
    }
  };

  const handleCreateHardware = async (newHardware) => {
    try {
      await hardwareService.createHardwareSpec(newHardware);
      toast.success('Thêm mẫu cấu hình phần cứng mới thành công!');
      await fetchHardwareData();
    } catch (err) {
      console.error('Lỗi khi tạo mẫu cấu hình máy:', err);
      const msg = err.response?.data?.message || err.message || 'Không thể tạo cấu hình máy. Vui lòng thử lại!';
      toast.error(msg);
    }
  };

  const handleExportReport = () => {

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
  };

  return (
    <div className="bg-slate-100 font-sans text-slate-900 antialiased min-h-screen">
      {/* Shared Header Widget */}
      <Header
        user={user}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onLogout={onLogout}
      />

      {/* Shared Sidebar Widget with activeNav='config' */}
      <Sidebar activeNav="config" bootromStatus="ONLINE" role="ADMIN" />

      {/* Main Content Area */}
      <div className="pl-[240px]">
        <main className="relative pt-16 min-h-screen bg-slate-100 w-full px-6 py-6 pb-24 flex flex-col justify-between">
          <div className="flex flex-col w-full gap-6">
            {isLoading && (
              <div className="flex items-center gap-2 text-xs font-semibold text-sky-600 bg-sky-50 px-3 py-1.5 rounded-md w-fit border border-sky-200 shadow-sm">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-500" />
                <span>Đang đồng bộ dữ liệu cấu hình máy & BootROM SAN...</span>
              </div>
            )}

            {/* Telemetry Summary Bento Grid */}
            <HardwareKpiBento metrics={metrics} />

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

            {/* High-Density Hardware Inventory Table */}
            <HardwareSpecsTable
              specs={filteredSpecs}
              onOpenTelemetry={handleOpenTelemetry}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />

            {/* Telemetry Diagnostics Peek Section */}
            <HardwareDiagnostics diagnostics={diagnostics} />
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
