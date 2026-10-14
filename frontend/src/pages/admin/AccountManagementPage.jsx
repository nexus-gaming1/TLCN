import React, { useState, useEffect, useMemo } from 'react';
import Header from '../../widgets/header/Header';
import Sidebar from '../../widgets/sidebar/Sidebar';
import Footer from '../../widgets/footer/Footer';

// Member Service & FSD UI Components
import memberService from '../../shared/api/member.service';
import { MOCK_MEMBER_METRICS } from '../../features/members/model/mockMembersData';
import MemberKpiCards from '../../features/members/ui/MemberKpiCards';
import MemberFilterBar from '../../features/members/ui/MemberFilterBar';
import MemberBulkActionBar from '../../features/members/ui/MemberBulkActionBar';
import MemberTable from '../../features/members/ui/MemberTable';
import Pagination from '../../shared/ui/Pagination';
import CreateMemberModal from '../../features/members/ui/CreateMemberModal';
import EditMemberModal from '../../features/members/ui/EditMemberModal';
import MemberDetailModal from '../../features/members/ui/MemberDetailModal';

/**
 * AccountManagementPage (Quản lý Hội viên Cyber)
 * Built with FSD Architecture, Clean Code & DRY Principles
 */
export default function AccountManagementPage({ user, onLogout }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(MOCK_MEMBER_METRICS);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [viewingMember, setViewingMember] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Auto-fetch members from Backend Service on mount
  const fetchMemberData = async () => {
    setLoading(true);
    try {
      const data = await memberService.getMembers();
      if (data) {
        setMembers(data);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách hội viên:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberData();
  }, []);

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

      // Status match
      let matchStatus = true;
      const statusLower = (m.status || '').toLowerCase();
      if (statusFilter === 'playing-local') {
        matchStatus = statusLower === 'active' && m.stationCode;
      } else if (statusFilter === 'idle') {
        matchStatus = statusLower === 'active' && !m.stationCode;
      } else if (statusFilter === 'offline') {
        matchStatus = statusLower === 'active' && !m.stationCode;
      } else if (statusFilter === 'locked') {
        matchStatus = statusLower === 'locked';
      } else if (statusFilter === 'suspended') {
        matchStatus = statusLower === 'suspended';
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

  // Submit sửa thông tin hồ sơ
  const handleSaveInfo = async (memberId, updatedFields) => {
    try {
      await memberService.updateMemberInfo(memberId, updatedFields);
      // Reload members after update
      await fetchMemberData();
    } catch (err) {
      alert('Có lỗi xảy ra khi cập nhật thông tin hội viên');
    }
  };

  // Action: Đổi trạng thái tài khoản (ACTIVE / LOCKED / SUSPENDED)
  const handleChangeStatus = async (memberId, newStatus) => {
    try {
      await memberService.updateAccountStatus(memberId, newStatus);
      await fetchMemberData();
    } catch (err) {
      alert('Có lỗi xảy ra khi cập nhật trạng thái tài khoản');
    }
  };

  const handleCreateMember = (newMemberData) => {
    const newMember = {
      id: Date.now(),
      uid: `UID-${Math.floor(10000 + Math.random() * 90000)}`,
      name: newMemberData.fullName,
      username: newMemberData.username,
      phone: newMemberData.phone || 'Chưa cập nhật',
      email: newMemberData.email || 'Chưa cập nhật',
      tier: newMemberData.tier || 'normal',
      rankName: 'Đồng',
      realBalance: Number(newMemberData.deposit) || 0,
      bonusBalance: 0,
      totalBalance: Number(newMemberData.deposit) || 0,
      pts: Math.floor((Number(newMemberData.deposit) || 0) / 1000),
      status: 'ACTIVE',
      station: 'Chưa vào máy',
      stationCode: null,
      lastLoginTime: 'Vừa đăng ký'
    };

    setMembers((prev) => [newMember, ...prev]);
  };

  return (
    <div className="bg-background font-sans text-on-surface antialiased min-h-screen">
      {/* Header */}
      <Header
        user={user}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onLogout={onLogout}
      />

      {/* Sidebar with activeNav set to 'members' */}
      <Sidebar activeNav="members" bootromStatus="ONLINE" role="ADMIN" />

      {/* Main Content */}
      <div className="pl-[240px]">
        <main className="relative pt-16 min-h-screen bg-slate-50/50 w-full px-6 py-6 pb-24 flex flex-col justify-between">
          <div className="flex flex-col w-full gap-6">

            {/* KPI Summary Cards */}
            <MemberKpiCards metrics={metrics} />

            {/* Action Bar & Advanced Filters */}
            <MemberFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              tierFilter={tierFilter}
              onTierChange={setTierFilter}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
            />

            {/* Bulk Action Bar */}
            <MemberBulkActionBar
              selectedCount={selectedIds.length}
              onAddHours={() => alert(`Cộng giờ cho ${selectedIds.length} hội viên`)}
              onLock={() => {
                selectedIds.forEach((id) => handleChangeStatus(id, 'LOCKED'));
                setSelectedIds([]);
              }}
              onDelete={() => {
                setMembers((prev) => prev.filter((m) => !selectedIds.includes(m.id)));
                setSelectedIds([]);
              }}
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
    </div>
  );
}

