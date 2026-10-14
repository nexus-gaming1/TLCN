import React, { useState, useEffect, useMemo } from 'react';
import Header from '../../widgets/header/Header';
import Sidebar from '../../widgets/sidebar/Sidebar';
import Footer from '../../widgets/footer/Footer';
import pricingPlanService from '../../shared/api/pricingPlan.service';
import {
  PricingPlanKpiCards,
  PricingPlanFilterBar,
  PricingPlanTable,
  CreatePricingPlanModal,
  PricingPlanDetailModal
} from '../../features/pricing-plans';
import Pagination from '../../shared/ui/Pagination';

/**
 * PricingPlanManagementPage
 * Quản lý Bảng Giá Máy & Khung Giờ Vàng (Happy Hour / Giảm giá theo giờ)
 * Built with FSD Architecture, Clean Code & DRY Principles
 */
export default function PricingPlanManagementPage({ user, onLogout }) {
  const [plans, setPlans] = useState([]);
  const [zones, setZones] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planTypeFilter, setPlanTypeFilter] = useState('all');
  const [hourTypeFilter, setHourTypeFilter] = useState('all');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [viewingPlan, setViewingPlan] = useState(null);

  // Fetch Pricing Plans from Backend API
  const fetchPlans = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await pricingPlanService.getPricingPlans();
      if (data) {
        setPlans(data.plans || []);
        setZones(data.zones || []);
        setMetrics(data.metrics || null);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách bảng giá:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // Filtered Plans Memoization
  const filteredPlans = useMemo(() => {
    if (!Array.isArray(plans)) return [];
    return plans.filter((p) => {
      if (!p) return false;

      // Search match (tên bảng giá hoặc mức giá)
      const query = searchQuery ? searchQuery.toLowerCase().trim() : '';
      const matchSearch =
        !query ||
        (p.name && String(p.name).toLowerCase().includes(query)) ||
        (p.pricePerHour && String(p.pricePerHour).includes(query));

      // Status match
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'ACTIVE' && p.isActive) ||
        (statusFilter === 'INACTIVE' && !p.isActive);

      // Plan Type match
      const matchPlanType = planTypeFilter === 'all' || p.planType === planTypeFilter;

      // Hour Type match
      const isHappyHour = !!(p.startTime && p.endTime);
      const matchHourType =
        hourTypeFilter === 'all' ||
        (hourTypeFilter === 'HAPPY_HOUR' && isHappyHour) ||
        (hourTypeFilter === 'ALL_DAY' && !isHappyHour);

      return matchSearch && matchStatus && matchPlanType && matchHourType;
    });
  }, [plans, searchQuery, statusFilter, planTypeFilter, hourTypeFilter]);

  // Reset về trang 1 khi lọc thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, planTypeFilter, hourTypeFilter, pageSize]);

  // Dữ liệu bảng giá theo từng trang
  const paginatedPlans = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredPlans.slice(startIndex, startIndex + pageSize);
  }, [filteredPlans, currentPage, pageSize]);

  // Handlers for Actions
  const handleSavePlan = async (payload) => {
    try {
      if (editingPlan) {
        await pricingPlanService.updatePricingPlan(editingPlan.id, payload);
      } else {
        await pricingPlanService.createPricingPlan(payload);
      }
      setIsCreateModalOpen(false);
      setEditingPlan(null);
      await fetchPlans(false);
    } catch (err) {
      alert(err.message || 'Có lỗi xảy ra khi lưu bảng giá');
    }
  };

  const handleToggleActive = async (plan) => {
    try {
      await pricingPlanService.togglePricingPlanStatus(plan.id, !plan.isActive);
      await fetchPlans(true);
    } catch (err) {
      alert(err.message || 'Có lỗi xảy ra khi cập nhật trạng thái kích hoạt bảng giá');
    }
  };

  const handleDeletePlan = async (plan) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa bảng giá "${plan.name}"?`)) {
      try {
        await pricingPlanService.deletePricingPlan(plan.id);
        await fetchPlans(true);
      } catch (err) {
        alert(err.message || 'Có lỗi xảy ra khi xóa bảng giá');
      }
    }
  };

  return (
    <div className="bg-background font-sans text-on-surface antialiased min-h-screen">
      {/* Shared Header */}
      <Header
        user={user}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onLogout={onLogout}
      />

      {/* Shared Sidebar */}
      <Sidebar activeNav="promotions" bootromStatus="ONLINE" role="ADMIN" />

      {/* Main Content */}
      <div className="pl-[240px]">
        <main className="relative pt-16 pb-20 min-h-screen bg-background w-full px-6 py-6 flex flex-col justify-between">
          <div className="flex flex-col w-full gap-space-lg">
            {/* KPI Summary Cards */}
            <PricingPlanKpiCards metrics={metrics} />

            {/* Advanced Filters Bar */}
            <PricingPlanFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              planTypeFilter={planTypeFilter}
              onPlanTypeChange={setPlanTypeFilter}
              hourTypeFilter={hourTypeFilter}
              onHourTypeChange={setHourTypeFilter}
              onOpenCreateModal={() => {
                setEditingPlan(null);
                setIsCreateModalOpen(true);
              }}
              onExport={() => alert('Xuất danh sách bảng giá máy thành công!')}
            />

            {/* Pricing Plans Table */}
            {loading ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
                <div className="animate-spin w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                <p className="text-xs font-bold text-slate-600">Đang tải danh sách bảng giá...</p>
              </div>
            ) : (
              <PricingPlanTable
                plans={paginatedPlans}
                onViewDetail={(plan) => setViewingPlan(plan)}
                onEdit={(plan) => {
                  setEditingPlan(plan);
                  setIsCreateModalOpen(true);
                }}
                onToggleActive={handleToggleActive}
                onDelete={handleDeletePlan}
              />
            )}

            {/* Pagination Controls */}
            {!loading && filteredPlans.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={filteredPlans.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </div>

          <Footer />
        </main>
      </div>

      {/* Modal Tạo / Sửa Bảng Giá */}
      {isCreateModalOpen && (
        <CreatePricingPlanModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingPlan(null);
          }}
          plan={editingPlan}
          availableZones={zones}
          onSubmit={handleSavePlan}
        />
      )}

      {/* Modal Xem Chi Tiết Bảng Giá */}
      {viewingPlan && (
        <PricingPlanDetailModal
          isOpen={!!viewingPlan}
          onClose={() => setViewingPlan(null)}
          plan={viewingPlan}
        />
      )}
    </div>
  );
}
