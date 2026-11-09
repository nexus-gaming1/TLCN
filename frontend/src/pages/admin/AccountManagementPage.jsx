import { useState, useEffect, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import Header from '../../widgets/header/Header';
import Sidebar from '../../widgets/sidebar/Sidebar';
import Footer from '../../widgets/footer/Footer';

// Member Service & FSD UI Components
import memberService from '../../shared/api/member.service';
import MemberKpiCards from '../../features/members/ui/MemberKpiCards';
import MemberFilterBar from '../../features/members/ui/MemberFilterBar';
import MemberBulkActionBar from '../../features/members/ui/MemberBulkActionBar';
import MemberTable from '../../features/members/ui/MemberTable';
import Pagination from '../../shared/ui/Pagination';
import CreateMemberModal from '../../features/members/ui/CreateMemberModal';
import EditMemberModal from '../../features/members/ui/EditMemberModal';
import MemberDetailModal from '../../features/members/ui/MemberDetailModal';
import { useMachines } from '../../shared/hooks/useMachines';
import ExportMemberModal from '../../features/members/ui/ExportMemberModal';
import MemberPrintView from '../../features/members/ui/MemberPrintView';

/**
 * AccountManagementPage (Quản lý Hội viên Cyber)
 * Built with FSD Architecture, Clean Code & DRY Principles
 */
export default function AccountManagementPage({ user, onLogout }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [viewingMember, setViewingMember] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Tính toán KPI thực tế từ danh sách hội viên, không hardcode giá trị giả lập
  const metrics = useMemo(() => {
    const totalMembers = members.length;
    const vipDiamondCount = members.filter((m) => m.tier === 'diamond').length;
    const vipGoldCount = members.filter((m) => m.tier === 'gold').length;
    const vipCount = vipDiamondCount + vipGoldCount;
    const activeMembersCount = members.filter((m) => (m.status || '').toUpperCase() === 'ACTIVE').length;
    const activePlaying = members.filter((m) => Boolean(m.stationCode)).length;
    const totalBalance = members.reduce((sum, m) => sum + (Number(m.totalBalance || m.realBalance || 0)), 0);
    const totalComputers = 36;
    const capacityPercent = totalComputers > 0 ? ((activePlaying / totalComputers) * 100).toFixed(1) : '0.0';
    const vipShare = totalMembers > 0 ? ((vipCount / totalMembers) * 100).toFixed(1) : '0.0';
    const avgBalance = totalMembers > 0 ? Math.round(totalBalance / totalMembers) : 0;

    return {
      totalMembers,
      activeMembersCount,
      activePlaying,
      totalComputers,
      capacityPercent,
      vipCount,
      vipDiamondCount,
      vipGoldCount,
      vipShare,
      shiftRevenue: totalBalance,
      avgBalance
    };
  }, [members]);

  // Auto-fetch members from Backend Service on mount
  const fetchMemberData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await memberService.getMembers();
      if (data) {
        setMembers(data);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách hội viên:', err);
      setError('Không thể kết nối máy chủ hoặc cơ sở dữ liệu để tải danh sách hội viên. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberData();
  }, []);
  const { data: machines = {} } = useMachines();
  // Filtered members calculation
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      // Search match
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        (m.name && m.name.toLowerCase().includes(query)) ||
        (m.uid && m.uid.toLowerCase().includes(query)) ||
        (m.email && m.email.toLowerCase().includes(query)) ||
        (m.phone && m.phone.includes(query)) ||
        (m.username && m.username.toLowerCase().includes(query));

      // Tier match
      const matchTier = tierFilter === 'all' || m.tier === tierFilter;

      // Status match strictly by UserStatus (ACTIVE, INACTIVE, LOCKED, BANNED)
      let matchStatus = true;
      if (statusFilter !== 'all') {
        const mStatus = (m.status || '').toUpperCase();
        matchStatus = mStatus === statusFilter.toUpperCase();
      }

      return matchSearch && matchTier && matchStatus;
    });
  }, [members, searchQuery, tierFilter, statusFilter]);

  // Reset trang khi lọc thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, tierFilter, statusFilter, pageSize]);

  // Phân trang dữ liệu hội viên
  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredMembers.slice(startIndex, startIndex + pageSize);
  }, [filteredMembers, currentPage, pageSize]);

  // Handle Multi-Selection
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredMembers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMembers.map((m) => m.id));
    }
  };

  // Action: Xem chi tiết
  const handleViewDetail = (member) => {
    setViewingMember(member);
  };

  // Action: Mở modal sửa thông tin (Họ tên, SĐT, Email)
  const handleEditInfoClick = (member) => {
    setEditingMember(member);
  };

  // Submit sửa thông tin hồ sơ (Họ tên, SĐT, Email)
  const handleSaveInfo = async (memberId, updatedFields) => {
    try {
      // Optimistic update để UI phản hồi ngay lập tức
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId
            ? {
                ...m,
                name: updatedFields.full_name || m.name,
                full_name: updatedFields.full_name || m.full_name,
                phone: updatedFields.phone_number || updatedFields.phone || m.phone
              }
            : m
        )
      );
      await memberService.updateMemberInfo(memberId, updatedFields);
      // Reload members after update để đồng bộ chuẩn từ MySQL CSDL
      await fetchMemberData();
    } catch (err) {
      console.error('Lỗi khi cập nhật thông tin hội viên:', err);
      alert('Có lỗi xảy ra khi cập nhật thông tin hội viên: ' + (err.message || ''));
      await fetchMemberData();
    }
  };

  // Action: Đổi trạng thái tài khoản (ACTIVE / LOCKED / SUSPENDED)
  const handleChangeStatus = async (memberId, newStatus) => {
    try {
      // Optimistic update để giao diện phản hồi trạng thái mới ngay lập tức
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, status: newStatus } : m))
      );
      await memberService.updateAccountStatus(memberId, newStatus);
      await fetchMemberData();
    } catch (err) {
      console.error('Lỗi khi đổi trạng thái tài khoản:', err);
      alert('Có lỗi xảy ra khi cập nhật trạng thái tài khoản: ' + (err.message || ''));
      await fetchMemberData();
    }
  };

  // Action: Đổi trạng thái tài khoản hàng loạt (ACTIVE / LOCKED)
  const handleBulkChangeStatus = async (newStatus) => {
    if (selectedIds.length === 0) return;
    try {
      setLoading(true);
      await Promise.all(
        selectedIds.map((id) => memberService.updateAccountStatus(id, newStatus))
      );
      setSelectedIds([]);
      await fetchMemberData();
    } catch (err) {
      alert('Có lỗi xảy ra khi cập nhật trạng thái hàng loạt');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMember = async (newMemberData) => {
    try {
      setLoading(true);
      await memberService.createMember(newMemberData);
      await fetchMemberData();
    } catch (err) {
      alert(err.message || 'Lỗi khi tạo tài khoản hội viên mới');
    } finally {
      setLoading(false);
    }
  };

  // Action: In danh sách hội viên bằng hộp thoại in của trình duyệt (A4)
  const handlePrintList = () => {
    window.print();
  };

  return (
    <div className="bg-background font-sans text-on-surface antialiased min-h-screen">
      {/* Header & Sidebar: ẩn hoàn toàn khi in */}
      <div className="print:hidden">
        <Header
          user={user}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onLogout={onLogout}
        />
        <Sidebar activeNav="members" bootromStatus="ONLINE" role="ADMIN" />
      </div>

      {/* Main Content Area: ẩn khi in để nhường chỗ cho bản in A4 */}
      <div className="pl-[240px] print:hidden">
        <main className="relative pt-16 min-h-screen bg-slate-50/50 w-full px-6 py-6 pb-24 flex flex-col justify-between">
          <div className="flex flex-col w-full gap-6">

            {/* Error Banner khi mất kết nối backend / timeout */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={fetchMemberData}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors shrink-0"
                >
                  Thử lại
                </button>
              </div>
            )}

            {/* KPI Summary Cards */}
            <MemberKpiCards {...metrics} />

            {/* Action Bar & Advanced Filters */}
            <MemberFilterBar
              members={members}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              tierFilter={tierFilter}
              onTierChange={setTierFilter}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
              onOpenExportModal={() => setIsExportModalOpen(true)}
              onPrintList={handlePrintList}
            />

            {/* Bulk Action Bar: Khóa tạm thời & Mở khóa tất cả */}
            <MemberBulkActionBar
              selectedCount={selectedIds.length}
              onLock={() => handleBulkChangeStatus('LOCKED')}
              onUnlock={() => handleBulkChangeStatus('ACTIVE')}
            />

            {/* Data Table */}
            {loading ? (
              <div className="w-full py-16 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
                <div className="inline-block w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                <p className="text-xs font-bold">Đang tải dữ liệu hội viên từ cơ sở dữ liệu...</p>
              </div>
            ) : (
              <div className="flex flex-col">
                <MemberTable
                  members={paginatedMembers}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onToggleSelectAll={handleToggleSelectAll}
                  onViewDetail={handleViewDetail}
                  onEditInfo={handleEditInfoClick}
                  onChangeStatus={handleChangeStatus}
                />

                {/* Shared Reusable Pagination */}
                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredMembers.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  itemLabel="hội viên"
                  selectedCount={selectedIds.length}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <Footer />
        </main>
      </div>

      {/* Create Member Modal */}
      <CreateMemberModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateMember}
      />

      {/* Edit Member Profile Modal (Họ tên, SĐT, Email) */}
      <EditMemberModal
        isOpen={!!editingMember}
        onClose={() => setEditingMember(null)}
        member={editingMember}
        onSubmit={handleSaveInfo}
      />

      {/* View Detail Member Profile Modal */}
      <MemberDetailModal
        isOpen={!!viewingMember}
        onClose={() => setViewingMember(null)}
        member={viewingMember}
      />

      {/* Export Member Modal (Excel & PDF) */}
      <ExportMemberModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        members={members}
        filteredMembers={filteredMembers}
        selectedIds={selectedIds}
      />

      {/* Dedicated A4 Print View: Tự động kích hoạt khi bấm In Danh Sách hoặc In Trình duyệt */}
      <MemberPrintView
        members={filteredMembers}
        currentAdmin={user?.name || user?.username || 'Quản trị viên'}
        searchQuery={searchQuery}
        tierFilter={tierFilter}
        statusFilter={statusFilter}
      />
    </div>
  );
}

