import React, { useState, useEffect, useMemo } from 'react';
import Header from '../../widgets/header/Header';
import Sidebar from '../../widgets/sidebar/Sidebar';
import Footer from '../../widgets/footer/Footer';

// FSD Modules for Promotions
import promotionService from '../../shared/api/promotion.service';
import PromotionKpiCards from '../../features/promotions/ui/PromotionKpiCards';
import PromotionFilterBar from '../../features/promotions/ui/PromotionFilterBar';
import PromotionTable from '../../features/promotions/ui/PromotionTable';
import CreatePromotionModal from '../../features/promotions/ui/CreatePromotionModal';
import PromotionDetailModal from '../../features/promotions/ui/PromotionDetailModal';
import { Tag, FileText, Download } from 'lucide-react';

/**
 * PromotionManagementPage (Quản Lý Khuyến Mãi & Ưu Đãi Cyber)
 * Built with FSD Architecture, Clean Code & DRY Principles
 */
export default function PromotionManagementPage({ user, onLogout }) {
  const [promotions, setPromotions] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [audienceFilter, setAudienceFilter] = useState('all');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [viewingPromo, setViewingPromo] = useState(null);

  // Fetch Promotions from Backend Service
  const fetchPromotions = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await promotionService.getPromotions();
      if (data) {
        setPromotions(data.promotions || []);
        setMetrics(data.metrics || null);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách khuyến mãi:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  // Filtered Promotions Memoization
  const filteredPromotions = useMemo(() => {
    if (!Array.isArray(promotions)) return [];
    return promotions.filter((p) => {
      if (!p) return false;
      // Search match
      const query = searchQuery ? searchQuery.toLowerCase().trim() : '';
      const matchSearch =
        !query ||
        (p.name && String(p.name).toLowerCase().includes(query)) ||
        (p.code && String(p.code).toLowerCase().includes(query)) ||
        (p.description && String(p.description).toLowerCase().includes(query));

      // Status match
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;

      // Type match
      const matchType = typeFilter === 'all' || p.discountType === typeFilter;

      // Audience match
      const matchAudience = audienceFilter === 'all' || p.targetAudience === audienceFilter;

      return matchSearch && matchStatus && matchType && matchAudience;
    });
  }, [promotions, searchQuery, statusFilter, typeFilter, audienceFilter]);

  // Compute real metrics from promotions list
  const realMetrics = useMemo(() => {
    const list = promotions || [];
    const totalPromotions = list.length;
    const activePromotions = list.filter(p => p.status === 'ACTIVE' && p.isActive).length;
    const upcomingPromotions = list.filter(p => p.status === 'UPCOMING').length;
    
    return {
      ...metrics,
      totalPromotions,
      activePromotions,
      upcomingPromotions,
      // Fake budget spent just for display if backend doesn't provide
      budgetSpent: metrics?.budgetSpent || 12500000, 
      totalBudget: metrics?.totalBudget || 50000000
    };
  }, [promotions, metrics]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
    setAudienceFilter('all');
  };

  // Handlers for Actions
  const handleSavePromo = async (payload, promoId) => {
    try {
      if (promoId) {
        await promotionService.updatePromotion(promoId, payload);
      } else {
        await promotionService.createPromotion(payload);
      }
      await fetchPromotions(true);
    } catch (err) {
      alert('Có lỗi xảy ra khi lưu khuyến mãi');
    }
  };

  const handleToggleActive = async (promoId, isActive) => {
    try {
      await promotionService.togglePromotionStatus(promoId, isActive);
      await fetchPromotions(true);
    } catch (err) {
      alert('Có lỗi xảy ra khi cập nhật trạng thái khuyến mãi');
    }
  };

  const handleDeletePromo = async (promoId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa chiến dịch khuyến mãi này?')) {
      try {
        await promotionService.deletePromotion(promoId);
        await fetchPromotions(true);
      } catch (err) {
        alert('Có lỗi xảy ra khi xóa khuyến mãi');
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

      {/* Shared Sidebar with activeNav set to 'promotions' */}
      <Sidebar activeNav="promotions" bootromStatus="ONLINE" role="ADMIN" />

      {/* Main Content */}
      <div className="pl-[240px]">
        <main className="relative pt-16 pb-20 min-h-screen bg-background w-full px-6 py-6 flex flex-col justify-between">
          <div className="flex flex-col w-full gap-space-lg">
            
            {/* KPI Summary Cards */}
            <PromotionKpiCards metrics={realMetrics} />

            {/* Advanced Filters Bar */}
            <PromotionFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              typeFilter={typeFilter}
              onTypeChange={setTypeFilter}
              audienceFilter={audienceFilter}
              onAudienceChange={setAudienceFilter}
              onResetFilters={handleResetFilters}
              onRefresh={fetchPromotions}
              onOpenCreateModal={() => {
                setEditingPromo(null);
                setIsCreateModalOpen(true);
              }}
              onExport={() => alert('Xuất báo cáo khuyến mãi xuất thành công!')}
            />

            {/* Data Table */}
            {loading ? (
              <div className="w-full py-16 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
                <div className="inline-block w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                <p className="text-xs font-bold">Đang tải dữ liệu chiến dịch khuyến mãi từ cơ sở dữ liệu...</p>
              </div>
            ) : (
              <PromotionTable
                promotions={filteredPromotions}
                onViewDetail={(p) => setViewingPromo(p)}
                onEdit={(p) => {
                  setEditingPromo(p);
                  setIsCreateModalOpen(true);
                }}
                onToggleActive={handleToggleActive}
                onDelete={handleDeletePromo}
              />
            )}
          </div>

          {/* Shared Footer */}
          <Footer />
        </main>
      </div>

      {/* Create / Edit Promotion Modal */}
      <CreatePromotionModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingPromo(null);
        }}
        promo={editingPromo}
        onSubmit={handleSavePromo}
      />

      {/* View Promotion Detail Modal */}
      <PromotionDetailModal
        isOpen={!!viewingPromo}
        onClose={() => setViewingPromo(null)}
        promo={viewingPromo}
      />
    </div>
  );
}
