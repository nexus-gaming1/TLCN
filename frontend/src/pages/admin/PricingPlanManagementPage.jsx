import { useState, useEffect, useMemo } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
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
import FloatingToast from '../../shared/ui/FloatingToast';

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
  const [errorMessage, setErrorMessage] = useState(null);
  const [toast, setToast] = useState(null);

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

  // Floating Toast Notification
  const showToast = (payload, type = 'success') => {
    if (typeof payload === 'string') {
      setToast({
        type,
        title: type === 'warning' ? 'Đã tạm ngưng' : type === 'error' ? 'Lỗi' : 'Thành công',
        message: payload
      });
    } else {
      setToast(payload);
    }
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Fetch Pricing Plans from Backend API
  const fetchPlans = async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMessage(null);
    try {
      const data = await pricingPlanService.getPricingPlans();
      if (data) {
        setPlans(data.plans || []);
        setZones(data.zones || []);
        setMetrics(data.metrics || null);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách bảng giá:', err);
      setErrorMessage(err.message || 'Mất kết nối hoặc quá thời gian chờ phản hồi từ máy chủ.');
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
        showToast('Cập nhật bảng giá thành công!');
      } else {
        await pricingPlanService.createPricingPlan(payload);
        showToast('Tạo bảng giá mới thành công!');
      }
      setIsCreateModalOpen(false);
      setEditingPlan(null);
      await fetchPlans(false);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Lỗi',
        message: err.message || 'Có lỗi xảy ra khi lưu bảng giá'
      });
    }
  };

  const handleToggleActive = async (plan) => {
    const nextActive = !plan.isActive;
    // Cập nhật giao diện tức thì (Optimistic Update 0ms giống Kho Game)
    setPlans((prev) =>
      prev.map((p) => (p.id === plan.id ? { ...p, isActive: nextActive } : p))
    );
    try {
      await pricingPlanService.togglePricingPlanStatus(plan.id, nextActive);
      showToast({
        type: nextActive ? 'success' : 'warning',
        title: nextActive ? 'Đã kích hoạt bảng giá' : 'Đã tạm ngưng bảng giá',
        message: nextActive
          ? `Bảng giá "${plan.name}" đã được kích hoạt thành công.`
          : `Bảng giá "${plan.name}" đã chuyển sang trạng thái tạm ngưng.`
      });
      await fetchPlans(true);
    } catch (err) {
      // Rollback nếu có lỗi
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, isActive: plan.isActive } : p))
      );
      showToast({
        type: 'error',
        title: 'Lỗi cập nhật trạng thái',
        message: err.message || 'Có lỗi xảy ra khi cập nhật trạng thái kích hoạt bảng giá'
      });
      await fetchPlans(true);
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

      {/* Floating Toast Notification (Giống module kho game) */}
      <FloatingToast toast={toast} onClose={() => setToast(null)} />

      {/* Shared Sidebar */}
      <Sidebar activeNav="promotions" bootromStatus="ONLINE" role="ADMIN" />

      {/* Main Content */}
      <div className="pl-[240px]">
        <main className="relative pt-16 pb-20 min-h-screen bg-background w-full px-6 py-6 flex flex-col justify-between">
          <div className="flex flex-col w-full gap-space-lg">
            {/* Network / Server Disconnection Banner */}
            {errorMessage && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span className="font-medium">{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => fetchPlans(false)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Thử lại</span>
                </button>
              </div>
            )}

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
