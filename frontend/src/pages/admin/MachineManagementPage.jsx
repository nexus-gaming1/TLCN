import React, { useState, useEffect, useMemo } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Header from '../../widgets/header/Header';
import Sidebar from '../../widgets/sidebar/Sidebar';
import Footer from '../../widgets/footer/Footer';
import machineService from '../../shared/api/machine.service';
import MachineKpiCards from '../../features/machines/ui/MachineKpiCards';
import MachineFilterBar from '../../features/machines/ui/MachineFilterBar';
import MachineBulkActionBar from '../../features/machines/ui/MachineBulkActionBar';
import MachineTable from '../../features/machines/ui/MachineTable';
import Pagination from '../../shared/ui/Pagination';
import CreateMachineModal from '../../features/machines/ui/CreateMachineModal';
import EditMachineModal from '../../features/machines/ui/EditMachineModal';
import { ComputerStatus } from '../../shared/constants/stationConstants';
import StationCard from '../../entities/station/ui/StationCard';

// Single Source of Truth for Status Grouping (DRY Resolver)
const getStatusGroup = (status) => {
  const s = String(status || '').toUpperCase();
  if (s === ComputerStatus.ONLINE) return ComputerStatus.ONLINE;
  if (s === ComputerStatus.IN_USE || s === ComputerStatus.REMOTE) return ComputerStatus.IN_USE;
  if (s === ComputerStatus.LOCKED || s === ComputerStatus.PAUSE) return ComputerStatus.LOCKED;
  if (s === ComputerStatus.MAINTENANCE) return ComputerStatus.MAINTENANCE;
  return ComputerStatus.OFFLINE;
};

/**
 * MachineManagementPage (Quản lý Danh Sách Máy Trạm - Fleet Management)
 * Built with FSD Architecture, Clean Code, SOLID & DRY Principles.
 * Persists 100% of Fleet CRUD operations to MySQL CSDL.
 */
export default function MachineManagementPage({ user, onLogout }) {
  const [machines, setMachines] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [hardwareFilter, setHardwareFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [selectedIds, setSelectedIds] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [errorMessage, setErrorMessage] = useState(null);

  // Helper with safe try/catch/finally to re-fetch live machine fleet list & zones from MySQL CSDL
  const refreshMachineList = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setErrorMessage(null);
    try {
      const [machinesData, zonesData] = await Promise.all([
        machineService.getMachines(),
        machineService.getZones()
      ]);
      if (Array.isArray(machinesData)) {
        setMachines(machinesData);
      }
      if (Array.isArray(zonesData)) {
        setZones(zonesData);
      }
    } catch (error) {
      console.error('Lỗi khi nạp lại danh sách máy trạm:', error.message);
      setErrorMessage(error.message || 'Mất kết nối hoặc quá thời gian chờ phản hồi từ máy chủ.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Compute unique GPU hardware list dynamically from CSDL machines
  const hardwareList = useMemo(() => {
    const gpuMap = new Map();
    machines.forEach((m) => {
      if (m.gpu) {
        const val = m.gpu.toLowerCase().replace(/\s+/g, '-');
        if (!gpuMap.has(val)) {
          gpuMap.set(val, m.gpu);
        }
      }
    });
    return Array.from(gpuMap.entries()).map(([val, label]) => ({
      value: val,
      label
    }));
  }, [machines]);

  // Auto-fetch machines from Backend API CSDL on mount
  useEffect(() => {
    refreshMachineList();
  }, []);

  // Compute live KPI metrics dynamically in a single clean pass using getStatusGroup helper
  const metrics = useMemo(() => {
    const totalMachines = machines.length;

    let onlineCount = 0;
    let inUseCount = 0;
    let reservedCount = 0;
    let maintenanceCount = 0;
    let offlineCount = 0;

    for (const m of machines) {
      const group = getStatusGroup(m.status);
      if (group === ComputerStatus.ONLINE) onlineCount++;
      else if (group === ComputerStatus.IN_USE) inUseCount++;
      else if (group === ComputerStatus.LOCKED) reservedCount++;
      else if (group === ComputerStatus.MAINTENANCE) maintenanceCount++;
      else offlineCount++;
    }

    const calcPercent = (count) =>
      totalMachines > 0 ? `${((count / totalMachines) * 100).toFixed(1)}%` : '0.0%';

    return {
      totalMachines,
      onlineCount,
      onlinePercent: calcPercent(onlineCount),
      inUseCount,
      inUsePercent: calcPercent(inUseCount),
      reservedCount,
      reservedPercent: calcPercent(reservedCount),
      maintenanceCount,
      maintenancePercent: calcPercent(maintenanceCount),
      offlineCount,
      offlinePercent: calcPercent(offlineCount),
      occupancyRate: totalMachines > 0 ? ((inUseCount / totalMachines) * 100).toFixed(1) : '0.0'
    };
  }, [machines]);

  // Filtered Machines Calculation using single getStatusGroup helper
  const filteredMachines = useMemo(() => {
    return machines.filter((m) => {
      // Search across Code, IP, MAC, User, Game, Hardware, Zone Name
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        (m.id && m.id.toLowerCase().includes(query)) ||
        (m.ip && m.ip.toLowerCase().includes(query)) ||
        (m.mac_address && m.mac_address.toLowerCase().includes(query)) ||
        (m.userName && m.userName.toLowerCase().includes(query)) ||
        (m.currentGame && m.currentGame.toLowerCase().includes(query)) ||
        (m.cpu && m.cpu.toLowerCase().includes(query)) ||
        (m.gpu && m.gpu.toLowerCase().includes(query)) ||
        (m.zoneName && m.zoneName.toLowerCase().includes(query));

      // Zone filter
      const matchZone = zoneFilter === 'all' || m.zoneId === zoneFilter;

      // Status filter matching via single helper call
      let matchStatus = true;
      if (statusFilter !== 'all') {
        const machineGroup = getStatusGroup(m.status);
        const filterGroup = getStatusGroup(statusFilter);
        matchStatus = machineGroup === filterGroup;
      }

      // Hardware GPU filter
      let matchHardware = true;
      if (hardwareFilter !== 'all') {
        const gpuQuery = hardwareFilter.replace('rtx-', 'rtx ').toLowerCase();
        matchHardware = m.gpu.toLowerCase().includes(gpuQuery);
      }

      return matchSearch && matchZone && matchStatus && matchHardware;
    });
  }, [machines, searchQuery, zoneFilter, statusFilter, hardwareFilter]);

  // Reset to Page 1 whenever filter or search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, zoneFilter, statusFilter, hardwareFilter, pageSize]);

  // Real Dynamic Pagination Logic
  const totalPages = useMemo(() => {
    return Math.ceil(filteredMachines.length / pageSize) || 1;
  }, [filteredMachines.length, pageSize]);

  const paginatedMachines = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredMachines.slice(startIndex, startIndex + pageSize);
  }, [filteredMachines, currentPage, pageSize]);

  // Handle Multi-Selection
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredMachines.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMachines.map((m) => m.id));
    }
  };

  // Reusable Bulk Action Wrapper (DRY: handles selection check, Promise.all concurrency, refresh, and error handling)
  const executeBulkAction = async (actionFn, errorMessage) => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(
        selectedIds.map((id) => {
          const comp = machines.find((m) => m.id === id);
          const computerId = comp?.computer_id || id;
          return actionFn(computerId);
        })
      );
      setSelectedIds([]);
      await refreshMachineList(false);
    } catch (error) {
      alert(error.message || errorMessage);
    }
  };

  const handleRebootSelected = () => {
    alert(`Đã gửi lệnh Reboot khởi động lại cho ${selectedIds.length} máy trạm!`);
    setSelectedIds([]);
  };

  const handleMaintenanceSelected = () =>
    executeBulkAction(
      (computerId) => machineService.changeStatus(computerId, ComputerStatus.MAINTENANCE),
      'Lỗi khi chuyển trạng thái bảo trì trạm máy'
    );

  const handleAssignZoneSelected = async () => {
    if (selectedIds.length === 0) return;
    const newZoneInput = window.prompt('Nhập mã ID Phân khu mới (1: Esports, 2: VIP, 3: Tiêu chuẩn, 4: Studio, 5: Cloud):', '2');
    if (newZoneInput) {
      const zoneId = Number(newZoneInput.replace('zone-', '')) || 1;
      await executeBulkAction(
        (computerId) => machineService.updateMachine(computerId, { zone_id: zoneId }),
        'Lỗi khi chuyển phân khu máy'
      );
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Xóa ${selectedIds.length} máy trạm đã chọn?`)) {
      await executeBulkAction(
        (computerId) => machineService.deleteMachine(computerId),
        'Lỗi khi xóa máy trạm'
      );
    }
  };

  const handleDeleteSingle = async (machineId) => {
    const comp = machines.find((m) => m.id === machineId);
    const computerId = comp?.computer_id || machineId;
    if (window.confirm(`Xóa máy trạm ${machineId}?`)) {
      try {
        await machineService.deleteMachine(computerId);
        setSelectedIds((prev) => prev.filter((id) => id !== machineId));
        await refreshMachineList(false);
      } catch (error) {
        alert(error.message || 'Lỗi khi xóa máy trạm');
      }
    }
  };

  // CSDL Machine Creation Handler
  const handleCreateMachine = async (newMachineData) => {
    try {
      await machineService.createMachine(newMachineData);
      setIsModalOpen(false);
      await refreshMachineList();
    } catch (error) {
      alert(error.message || 'Lỗi khi khai báo máy trạm mới');
    }
  };

  // CSDL Machine Update Handler
  const handleUpdateMachine = async (computerId, updateData) => {
    try {
      await machineService.updateMachine(computerId, updateData);
      setEditingMachine(null);
      await refreshMachineList();
    } catch (error) {
      alert(error.message || 'Lỗi khi cập nhật thông tin máy trạm');
    }
  };

  // CSV Report Exporter with UTF-8 BOM
  const handleExportReport = () => {
    if (!filteredMachines || filteredMachines.length === 0) {
      alert('Không có dữ liệu máy trạm để xuất báo cáo.');
      return;
    }

    const headers = [
      'Mã Máy',
      'Tên Máy Trạm',
      'Phân Khu',
      'Địa Chỉ IP',
      'Địa Chỉ MAC',
      'Cấu Hình Phần Cứng',
      'Giá Tiền (đ/h)',
      'Người Dùng Hiện Tại',
      'Trạng Thái'
    ];

    const rows = filteredMachines.map((m) => [
      `"${m.id || ''}"`,
      `"${m.computer_name || m.id || ''}"`,
      `"${m.zoneName || ''}"`,
      `"${m.ip || ''}"`,
      `"${m.mac_address || ''}"`,
      `"${(m.specDescription || `${m.cpu} | ${m.gpu} | ${m.ram}`).replace(/"/g, '""')}"`,
      `"${m.price_per_hour || 0}"`,
      `"${(m.userName || 'Chưa có').replace(/"/g, '""')}"`,
      `"${m.statusLabel || m.cleanStatus || m.status || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bao_Cao_Danh_Sach_May_Tram_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-background font-sans text-slate-900 antialiased min-h-screen">
      {/* Header */}
      <Header
        user={user}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onLogout={onLogout}
      />

      {/* Sidebar with activeNav set to 'hardware' */}
      <Sidebar activeNav="hardware" bootromStatus="ONLINE" role="ADMIN" />

      {/* Main Content */}
      <div className="pl-[240px]">
        <main className="relative pt-16 min-h-screen bg-slate-100 w-full px-6 py-6 pb-24 flex flex-col justify-between">
          <div className="flex flex-col w-full gap-6">
            {/* Network / Server Disconnection Banner */}
            {errorMessage && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span className="font-medium">{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => refreshMachineList(true)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Thử lại</span>
                </button>
              </div>
            )}

            {/* KPI Summary Cards */}
            <MachineKpiCards
              metrics={metrics}
              selectedStatus={statusFilter}
              onSelectStatus={setStatusFilter}
            />

            {/* Filter & Control Toolbar */}
            <MachineFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              zones={zones}
              zoneFilter={zoneFilter}
              onZoneChange={setZoneFilter}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              hardwareList={hardwareList}
              hardwareFilter={hardwareFilter}
              onHardwareChange={setHardwareFilter}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onOpenCreateModal={() => setIsModalOpen(true)}
              onExportReport={handleExportReport}
            />

            {/* Bulk Action Bar */}
            <MachineBulkActionBar
              selectedCount={selectedIds.length}
              onReboot={handleRebootSelected}
              onMaintenance={handleMaintenanceSelected}
              onAssignZone={handleAssignZoneSelected}
              onDelete={handleDeleteSelected}
              onClearSelection={() => setSelectedIds([])}
            />

            {/* Content: Table View or Grid View with Loading Skeleton */}
            {loading ? (
              <div className="p-12 text-center text-slate-500 font-mono text-xs bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-center gap-2">
                <span className="animate-spin text-slate-700">⏳</span> Đang tải danh sách máy trạm...
              </div>
            ) : viewMode === 'table' ? (
              <div className="w-full bg-white rounded-xl shadow-xs border border-slate-200/90 overflow-hidden flex flex-col">
                <MachineTable
                  machines={paginatedMachines}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onToggleSelectAll={handleToggleSelectAll}
                  onLiveMirror={(id) => alert(`Đang kết nối Live Mirror xem màn hình máy ${id}...`)}
                  onEdit={(machineObj) => setEditingMachine(machineObj)}
                  onDelete={handleDeleteSingle}
                />
                {/* Dynamic Pagination liền mạch ở đáy bảng */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filteredMachines.length}
                  selectedCount={selectedIds.length}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  itemLabel="máy trạm"
                  className="rounded-t-none border-t border-slate-200"
                />
              </div>
            ) : (
              <>
                {paginatedMachines.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col items-center justify-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">Không có máy trạm nào khớp với bộ lọc</span>
                    <span className="text-xs text-slate-400">Vui lòng thử chọn lại phân khu hoặc trạng thái</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3.5 bg-white p-4 rounded-xl border border-slate-200">
                    {paginatedMachines.map((m) => {
                      const statusGroup = getStatusGroup(m.status);
                      const stationType = m.type || (
                        statusGroup === ComputerStatus.ONLINE
                          ? 'ready'
                          : statusGroup === ComputerStatus.MAINTENANCE
                          ? 'maint'
                          : statusGroup === ComputerStatus.IN_USE
                          ? (m.is_remote_enabled ? 'cloud' : 'local')
                          : statusGroup === ComputerStatus.LOCKED
                          ? 'locked'
                          : 'off'
                      );

                      return (
                        <StationCard
                          key={m.id}
                          station={{
                            id: m.id,
                            user: m.userName,
                            game: m.currentGame || m.cleanStatus,
                            type: stationType,
                            time: m.sessionTime ? m.sessionTime.split('/')[0].trim() : '00:00',
                            latency: m.ip
                          }}
                          onClick={() => alert(`Chi tiết máy ${m.id}`)}
                        />
                      );
                    })}
                  </div>
                )}
                {/* Dynamic Pagination cho Grid view */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filteredMachines.length}
                  selectedCount={selectedIds.length}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  itemLabel="máy trạm"
                />
              </>
            )}
          </div>

          {/* Footer */}
          <Footer />
        </main>
      </div>

      {/* Create Machine Modal */}
      <CreateMachineModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateMachine}
      />

      {/* Edit Machine Modal */}
      <EditMachineModal
        isOpen={Boolean(editingMachine)}
        machine={editingMachine}
        onClose={() => setEditingMachine(null)}
        onSubmit={handleUpdateMachine}
      />
    </div>
  );
}

