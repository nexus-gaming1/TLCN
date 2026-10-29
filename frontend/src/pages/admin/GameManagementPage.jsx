import { useState, useEffect, useMemo } from 'react';
import Header from '../../widgets/header/Header';
import Sidebar from '../../widgets/sidebar/Sidebar';
import Footer from '../../widgets/footer/Footer';
import gameService from '../../shared/api/game.service';
import GameKpiCards from '../../features/games/ui/GameKpiCards';
import GameFilterBar from '../../features/games/ui/GameFilterBar';
import GameTable from '../../features/games/ui/GameTable';
import GameTableSkeleton from '../../features/games/ui/GameTableSkeleton';
import GameFormModal from '../../features/games/ui/GameFormModal';
import Pagination from '../../shared/ui/Pagination';

import { AlertCircle, CheckCircle2, PauseCircle, X } from 'lucide-react';

export default function GameManagementPage({ user, onLogout }) {
  const [allGames, setAllGames] = useState([]);
  const [categories, setCategories] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Filters State
  const [filters, setFilters] = useState({
    search: '',
    category_id: 'all',
    is_remote_supported: 'all',
    is_available: 'all'
  });

  // Selection & Modals State
  const [selectedIds, setSelectedIds] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Thông báo toast nổi đa năng (Success, Warning/Tạm ngưng, Error)
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

  // Tải danh sách categories
  const fetchCategories = async () => {
    try {
      const data = await gameService.getCategories();
      if (Array.isArray(data)) {
        setCategories(data);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh mục game:', err);
    }
  };

  // Đồng bộ thể loại mới vừa tạo từ Form Modal
  const handleCategoryCreated = (newCat) => {
    if (!newCat) return;
    setCategories((prev) => {
      if (prev.some((c) => c.category_id === newCat.category_id)) return prev;
      return [...prev, newCat];
    });
    showToast({
      type: 'success',
      title: 'Thêm thể loại mới',
      message: `Đã tạo thể loại "${newCat.name}" vào danh mục.`
    });
  };

  // Tải toàn bộ kho game và metrics một lần duy nhất từ MySQL Backend (High Performance Architecture)
  const fetchGamesData = async (isInitial = false) => {
    if (isInitial) setInitialLoading(true);
    setError(null);
    try {
      const result = await gameService.getGames({});
      setAllGames(result.games || []);
      setMetrics(result.metrics || null);
    } catch (err) {
      console.error('Lỗi khi tải danh sách game:', err);
      setError('Không thể kết nối CSDL MySQL backend hoặc máy chủ. Vui lòng kiểm tra lại dịch vụ.');
    } finally {
      if (isInitial) setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchGamesData(true);
  }, []);

  // Bộ lọc thay đổi
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      category_id: 'all',
      is_remote_supported: 'all',
      is_available: 'all'
    });
    setCurrentPage(1);
  };

  // Tối ưu lọc dữ liệu tức thì tại Client (0ms In-Memory Filter) - Triệt tiêu 100% độ trễ backend & giật layout
  const filteredGames = useMemo(() => {
    return allGames.filter((game) => {
      // 1. Lọc theo từ khóa tìm kiếm (Tên, đường dẫn, tham số, thể loại)
      if (filters.search && filters.search.trim()) {
        const term = filters.search.trim().toLowerCase();
        const matchName = (game.name || '').toLowerCase().includes(term);
        const matchPath = (game.executable_path || '').toLowerCase().includes(term);
        const matchCategory = (game.GameCategory?.name || '').toLowerCase().includes(term);
        if (!matchName && !matchPath && !matchCategory) {
          return false;
        }
      }

      // 2. Lọc theo thể loại
      if (filters.category_id && filters.category_id !== 'all') {
        if (String(game.category_id) !== String(filters.category_id)) {
          return false;
        }
      }

      // 3. Lọc theo Remote Play
      if (filters.is_remote_supported !== undefined && filters.is_remote_supported !== 'all') {
        const isRemote = filters.is_remote_supported === true || filters.is_remote_supported === 'true';
        if (Boolean(game.is_remote_supported) !== isRemote) {
          return false;
        }
      }

      // 4. Lọc theo Trạng thái phục vụ
      if (filters.is_available !== undefined && filters.is_available !== 'all') {
        const isAvail = filters.is_available === true || filters.is_available === 'true';
        if (Boolean(game.is_available) !== isAvail) {
          return false;
        }
      }

      return true;
    });
  }, [allGames, filters]);

  // Phân trang dữ liệu
  const paginatedGames = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredGames.slice(startIndex, startIndex + pageSize);
  }, [filteredGames, currentPage, pageSize]);

  // Selection
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredGames.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredGames.map((g) => g.game_id));
    }
  };

  // Thao tác Tạo Game Mới
  const handleCreateGame = async (gameData) => {
    await gameService.createGame(gameData);
    showToast({
      type: 'success',
      title: 'Thêm trò chơi thành công',
      message: `Đã thêm "${gameData.name}" vào kho game.`
    });
    fetchGamesData();
  };

  // Thao tác Chỉnh Sửa Game
  const handleUpdateGame = async (gameId, updateData) => {
    const updated = await gameService.updateGame(gameId, updateData);
    showToast({
      type: 'success',
      title: 'Cập nhật thành công',
      message: 'Thông tin trò chơi đã được cập nhật thành công!'
    });
    setAllGames((prev) =>
      prev.map((g) => (g.game_id === gameId ? { ...g, ...updateData } : g))
    );
    if (editingGame && editingGame.game_id === gameId) {
      setEditingGame((prev) => (prev ? { ...prev, ...updateData } : null));
    }
    fetchGamesData();
    return updated;
  };

  // Thao tác Bật/Tắt Trạng Thái Phục Vụ (Optimistic Update 0ms)
  const handleToggleAvailability = async (game) => {
    try {
      // Cập nhật giao diện lập tức (0ms)
      setAllGames((prev) =>
        prev.map((g) => (g.game_id === game.game_id ? { ...g, is_available: !g.is_available } : g))
      );
      if (editingGame && editingGame.game_id === game.game_id) {
        setEditingGame((prev) => (prev ? { ...prev, is_available: !prev.is_available } : null));
      }

      const updated = await gameService.toggleAvailability(game.game_id);
      if (updated.is_available) {
        showToast({
          type: 'success',
          title: 'Đã kích hoạt trò chơi',
          message: `Trò chơi "${game.name}" đã sẵn sàng phục vụ trên các máy trạm.`
        });
      } else {
        showToast({
          type: 'warning',
          title: 'Đã ngưng kích hoạt trò chơi',
          message: `Trò chơi "${game.name}" đã tạm ngưng hiển thị trên máy trạm hội viên.`
        });
      }
      // Đồng bộ lại metrics tổng thể
      fetchGamesData();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Lỗi cập nhật trạng thái',
        message: err?.message || 'Không thể thay đổi trạng thái trò chơi'
      });
      fetchGamesData();
    }
  };

  // Thao tác Xóa Game
  const handleDeleteGame = async (game) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa trò chơi "${game.name}" khỏi kho game?`)) {
      return;
    }
    try {
      await gameService.deleteGame(game.game_id);
      showToast({
        type: 'success',
        title: 'Đã xóa trò chơi',
        message: `Đã chuyển trò chơi "${game.name}" vào thùng rác thành công!`
      });
      fetchGamesData();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Lỗi khi xóa trò chơi',
        message: err?.message || 'Không thể xóa trò chơi'
      });
    }
  };

  // Xuất danh sách game (dựa trên danh sách đang được lọc)
  const handleExport = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['ID,Tên Game,Thể Loại,Đường Dẫn,Remote Play,Trạng Thái']
        .concat(
          filteredGames.map(
            (g) =>
              `${g.game_id},"${g.name}","${g.GameCategory?.name || ''}","${g.executable_path || ''}",${
                g.is_remote_supported ? 'Có' : 'Không'
              },${g.is_available ? 'Hoạt động' : 'Tạm ngưng'}`
          )
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `danh_sach_game_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 font-sans text-slate-800 antialiased overflow-x-hidden">
      {/* Top Header */}
      <Header user={user} onLogout={onLogout} />

      {/* Floating Toast Notification (0ms Layout Shift) */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 right-6 z-[100] max-w-sm w-full animate-in fade-in slide-in-from-top-3 duration-200 pointer-events-auto"
        >
          <div
            className={`p-4 rounded-2xl border shadow-xl flex items-start gap-3 backdrop-blur-md ${
              toast.type === 'warning'
                ? 'bg-amber-50/95 border-amber-200 text-amber-900 shadow-amber-500/10'
                : toast.type === 'error'
                ? 'bg-rose-50/95 border-rose-200 text-rose-900 shadow-rose-500/10'
                : 'bg-emerald-50/95 border-emerald-200 text-emerald-900 shadow-emerald-500/10'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'warning' ? (
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                  <PauseCircle className="w-5 h-5" />
                </div>
              ) : toast.type === 'error' ? (
                <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                  <AlertCircle className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <h4 className="text-xs font-black tracking-tight">{toast.title}</h4>
              <p className="text-xs font-medium text-slate-600 mt-0.5 leading-snug break-words">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 rounded-lg hover:bg-black/5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer shrink-0"
              aria-label="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Left Sidebar Menu */}
      <Sidebar activeNav="games" role="ADMIN" />

      {/* Main Content Area - Thêm pl-[240px] để tránh hoàn toàn bị Sidebar che khuất & triệt tiêu thanh cuộn ngang */}
      <div className="pl-[240px] w-full min-h-screen overflow-x-hidden">
        <main className="relative pt-16 pb-20 min-h-screen w-full px-6 py-6 flex flex-col justify-between overflow-x-hidden">
          <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">

            {/* Error Banner */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 4 Cards KPI Metrics */}
            <GameKpiCards metrics={metrics} games={allGames} />

            {/* Thanh Bộ Lọc & Tìm Kiếm Tức Thì */}
            <GameFilterBar
              filters={filters}
              categories={categories}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
              onExport={handleExport}
            />

            {/* Bảng Danh Sách Trò Chơi Phản Hồi Tức Thì (0ms) với Skeleton Initial Loading */}
            {initialLoading ? (
              <GameTableSkeleton rows={pageSize} />
            ) : (
              <div className="flex flex-col min-h-[460px]">
                <GameTable
                  games={paginatedGames}
                  onEditGame={(game) => setEditingGame(game)}
                  onToggleAvailability={handleToggleAvailability}
                  onDeleteGame={handleDeleteGame}
                />

                {/* Phân trang */}
                {filteredGames.length > 0 && (
                  <Pagination
                    currentPage={currentPage}
                    totalItems={filteredGames.length}
                    pageSize={pageSize}
                    pageSizeOptions={[5, 10, 20, 50]}
                    onPageChange={(p) => setCurrentPage(p)}
                    onPageSizeChange={(s) => {
                      setPageSize(s);
                      setCurrentPage(1);
                    }}
                    itemLabel="trò chơi"
                  />
                )}
              </div>
            )}
          </div>

          {/* Footer Widget */}
          <Footer />
        </main>
      </div>

      {/* MODAL TẠO TRÒ CHƠI MỚI */}
      <GameFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateGame}
        categories={categories}
        onCategoryCreated={handleCategoryCreated}
      />

      {/* MODAL CHỈNH SỬA TRÒ CHƠI */}
      <GameFormModal
        isOpen={Boolean(editingGame)}
        mode="edit"
        game={editingGame}
        onClose={() => setEditingGame(null)}
        onSubmit={(formData) => handleUpdateGame(editingGame?.game_id, formData)}
        categories={categories}
        onCategoryCreated={handleCategoryCreated}
      />
    </div>
  );
}
