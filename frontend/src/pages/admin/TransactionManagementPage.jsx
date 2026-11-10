import { useState, useEffect, useCallback } from 'react';
import Header from '../../widgets/header/Header';
import Sidebar from '../../widgets/sidebar/Sidebar';
import Footer from '../../widgets/footer/Footer';
import FloatingToast from '../../shared/ui/FloatingToast';
import TransactionKpiCards from '../../features/transactions/ui/TransactionKpiCards';
import TransactionFilterBar from '../../features/transactions/ui/TransactionFilterBar';
import TransactionTable from '../../features/transactions/ui/TransactionTable';
import CreateTopUpModal from '../../features/transactions/ui/CreateTopUpModal';
import RefundConfirmModal from '../../features/transactions/ui/RefundConfirmModal';
import TransactionDetailDrawer from '../../features/transactions/ui/TransactionDetailDrawer';
import TransactionService from '../../shared/api/transaction.service';
import { AlertCircle, WifiOff, RefreshCw } from 'lucide-react';

const INITIAL_FILTERS = {
  search: '',
  dateRange: 'all',
  category: 'all',
  paymentMethod: 'all',
  status: 'all'
};

export default function TransactionManagementPage({ user, onLogout }) {
  const [transactions, setTransactions] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [toast, setToast] = useState(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [refundTxn, setRefundTxn] = useState(null);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const showToast = useCallback((payload, type = 'success') => {
    if (typeof payload === 'string') {
      setToast({
        type,
        title: type === 'warning' ? 'Cảnh báo' : type === 'error' ? 'Lỗi' : 'Thành công',
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

  // Debounce search query 300ms to prevent redundant API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  // Global Cmd+K / Ctrl+K focus shortcut
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

  const fetchTransactionsData = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOffline(true);
      setLoading(false);
      setError('Thiết bị đang mất kết nối mạng. Vui lòng kiểm tra Wi-Fi / LAN và thử lại.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const queryParams = {
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch || undefined,
        dateRange: filters.dateRange !== 'all' ? filters.dateRange : undefined,
        category: filters.category !== 'all' ? filters.category : undefined,
        paymentMethod: filters.paymentMethod !== 'all' ? filters.paymentMethod : undefined,
        status: filters.status !== 'all' ? filters.status : undefined
      };
      const data = await TransactionService.getTransactions(queryParams);
      setTransactions(data.transactions || []);
      setTotalItems(data.total || 0);
      setMetrics(data.metrics || null);
    } catch (err) {
      console.error('Lỗi khi tải giao dịch:', err);
      const errMsg = err?.message || 'Không thể kết nối máy chủ backend. Vui lòng kiểm tra lại dịch vụ.';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, filters.dateRange, filters.category, filters.paymentMethod, filters.status, showToast]);

  useEffect(() => {
    fetchTransactionsData();
  }, [fetchTransactionsData]);

  // Online/Offline listener
  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      showToast({ type: 'error', title: 'Mất kết nối mạng', message: 'Không thể đồng bộ dữ liệu sổ cái khi ngoại tuyến.' });
    };
    const handleOnline = () => {
      setIsOffline(false);
      showToast({ type: 'success', title: 'Đã khôi phục kết nối', message: 'Đang tải lại sổ cái giao dịch...' });
      fetchTransactionsData();
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [fetchTransactionsData, showToast]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setDebouncedSearch('');
    setCurrentPage(1);
  };

  const handleCreateTopUpSubmit = async (formData) => {
    await TransactionService.createTopUp(formData);
    showToast('Ghi nhận nạp tiền tại quầy thành công!', 'success');
    await fetchTransactionsData();
  };

  const handleConfirmRefund = async (transaction, reason) => {
    const txnId = transaction.transaction_id || transaction.id;
    await TransactionService.refundTransaction(txnId, reason);
    showToast({
      type: 'success',
      title: 'Hoàn tiền thành công',
      message: `Giao dịch ${transaction.txnCode || `#${txnId}`} đã được hoàn tiền.`
    });
    if (selectedReceipt && (selectedReceipt.transaction_id || selectedReceipt.id) === txnId) {
      setSelectedReceipt(null);
    }
    await fetchTransactionsData();
  };

  const handleExportCsv = () => {
    if (!transactions || transactions.length === 0) {
      showToast('Danh sách giao dịch đang trống, không thể xuất báo cáo.', 'warning');
      return;
    }

    const sanitizeCsvCell = (val) => {
      if (val === null || val === undefined) return '""';
      let str = String(val).trim();
      if (/^[=@+\-\t\r]/.test(str)) str = `'${str}`;
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = ['Mã GD', 'Thời Gian', 'Khách Hàng', 'SĐT', 'Khoản Mục', 'Số Tiền (VNĐ)', 'Phương Thức', 'Trạng Thái', 'Ghi Chú'];
    const csvRows = [
      headers.map(sanitizeCsvCell).join(','),
      ...transactions.map((t) =>
        [
          sanitizeCsvCell(t.txnCode || t.txn_code || `TXN-${t.id}`),
          sanitizeCsvCell(t.createdAt || t.created_at || ''),
          sanitizeCsvCell(t.memberName || t.member_name || 'Khách Vãng Lai'),
          sanitizeCsvCell(t.phone || t.member_phone || ''),
          sanitizeCsvCell(t.category || ''),
          sanitizeCsvCell(t.amount || 0),
          sanitizeCsvCell(t.paymentMethod || t.payment_method || ''),
          sanitizeCsvCell(t.status || ''),
          sanitizeCsvCell(t.notes || '')
        ].join(',')
      )
    ];

    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Đã xuất báo cáo ${transactions.length} giao dịch thành công!`, 'success');
  };

  return (
    <div className="bg-slate-50 font-sans text-slate-900 antialiased min-h-screen overflow-x-hidden">
      <Header user={user} onLogout={onLogout} />
      <Sidebar activeNav="transactions" />
      <FloatingToast toast={toast} onClose={() => setToast(null)} />

      <div className="lg:pl-[240px] w-full min-h-screen overflow-x-hidden">
        <main className="relative pt-20 sm:pt-[88px] min-h-screen bg-slate-50 w-full px-4 sm:px-6 pb-20 flex flex-col justify-between">
          <div className="flex flex-col w-full max-w-7xl mx-auto gap-5 sm:gap-6">
            {isOffline && (
              <div className="flex items-center gap-2 p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold shadow-xs">
                <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Thiết bị đang ngoại tuyến. Vui lòng kiểm tra kết nối mạng.</span>
              </div>
            )}

            {error && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold shadow-xs">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={fetchTransactionsData}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 self-end sm:self-auto shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Thử Lại</span>
                </button>
              </div>
            )}

            <TransactionKpiCards metrics={metrics} loading={loading} dateRange={filters.dateRange} />

            <TransactionFilterBar
              filters={filters}
              onFilterChange={handleFilterChange}
              onExport={handleExportCsv}
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
            />

            <TransactionTable
              transactions={transactions}
              totalItems={totalItems}
              currentPage={currentPage}
              pageSize={pageSize}
              loading={loading}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              onResetFilters={handleResetFilters}
              onSelectReceipt={(txn) => setSelectedReceipt(txn)}
              onRefundTransaction={(txn) => setRefundTxn(txn)}
            />
          </div>

          <Footer />
        </main>
      </div>

      <CreateTopUpModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTopUpSubmit}
      />

      {refundTxn && (
        <RefundConfirmModal
          isOpen={Boolean(refundTxn)}
          transaction={refundTxn}
          onClose={() => setRefundTxn(null)}
          onSubmit={handleConfirmRefund}
        />
      )}

      {selectedReceipt && (
        <TransactionDetailDrawer
          transaction={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
          onRefund={(txn) => setRefundTxn(txn)}
        />
      )}
    </div>
  );
}
