import React, { useState, useEffect } from 'react';
import Header from '../../widgets/header/Header';
import Sidebar from '../../widgets/sidebar/Sidebar';
import TransactionKpiCards from '../../features/transactions/ui/TransactionKpiCards';
import TransactionFilterBar from '../../features/transactions/ui/TransactionFilterBar';
import TransactionTable from '../../features/transactions/ui/TransactionTable';
import CreateTopUpModal from '../../features/transactions/ui/CreateTopUpModal';
import TransactionDetailDrawer from '../../features/transactions/ui/TransactionDetailDrawer';
import RefundConfirmModal from '../../features/transactions/ui/RefundConfirmModal';
import TransactionService from '../../shared/api/transaction.service';
import { Download, PlusCircle, AlertCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function TransactionManagementPage({ user, onLogout }) {
    const [transactions, setTransactions] = useState([]);
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Pagination State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const limit = 10;

    // Modal & Drawer State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [refundTarget, setRefundTarget] = useState(null);

    // Filters State
    const [filters, setFilters] = useState({
        search: '',
        dateRange: 'all',
        category: 'all',
        paymentMethod: 'all',
        status: 'all'
    });

    const fetchTransactionsData = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await TransactionService.getTransactions({
                ...filters,
                page,
                limit
            });
            setTransactions(data.transactions || []);
            setTotalPages(data.totalPages || 1);
            setTotalRecords(data.total || 0);
            if (data.metrics) setMetrics(data.metrics);
        } catch (err) {
            console.error('Lỗi khi tải giao dịch:', err);
            setError(err?.response?.data?.message || 'Lỗi hệ thống khi tải danh sách giao dịch. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    // Re-fetch when filters or page changes
    useEffect(() => {
        fetchTransactionsData();
    }, [filters, page]);

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setPage(1); // Reset to page 1 when filter changes
    };

    const handleResetFilters = () => {
        setFilters({
            search: '',
            dateRange: 'all',
            category: 'all',
            paymentMethod: 'all',
            status: 'all'
        });
        setPage(1);
    };

    const handleCreateTopUpSubmit = async (formData) => {
        await TransactionService.createTopUp(formData);
        toast.success('Đã nạp tiền tại quầy thành công!');
        fetchTransactionsData();
    };

    const handleRefundSubmit = async (transaction, reason) => {
        const txnId = transaction.transaction_id || transaction.id;
        try {
            await TransactionService.refundTransaction(txnId, reason);
            toast.success('Đã xử lý hoàn tiền thành công!');
            if (selectedReceipt && (selectedReceipt.transaction_id || selectedReceipt.id) === txnId) {
                setSelectedReceipt(null);
            }
            fetchTransactionsData();
        } catch (err) {
            toast.error('Lỗi hoàn tiền: ' + (err?.response?.data?.message || err?.message));
        }
    };

    const handleExportExcel = () => {
        toast.success(`Tính năng xuất báo cáo Excel cho ${totalRecords} giao dịch đang khởi tạo!`);
    };

    return (
        <div className="min-h-screen bg-slate-100 font-sans antialiased text-slate-900">
            <Toaster position="top-right" />

            {/* Header Widget */}
            <Header user={user} onLogout={onLogout} />

            {/* Sidebar Widget */}
            <Sidebar activeNav="transactions" />

            {/* Main Content Area */}
            <main className="pl-[240px] pt-16 min-h-screen p-6">
                <div className="max-w-[1600px] mx-auto space-y-6">
                    {/* Top Level Page Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-col">
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Giao dịch</h1>
                            <p className="text-slate-500 text-sm mt-1">Quản lý thu chi và hóa đơn điện tử</p>
                        </div>

                        {/* Top Right Action Buttons */}
                        <div className="flex items-center gap-2 self-start md:self-auto">
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 text-white shadow-sm hover:bg-sky-700 transition-all text-sm font-semibold"
                            >
                                <PlusCircle className="w-4 h-4" />
                                <span>+ Nạp Tiền Tại Quầy</span>
                            </button>
                        </div>
                    </div>

                    {/* Backend Error Banner */}
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* 4 Financial KPI Summary Cards */}
                    <TransactionKpiCards metrics={metrics} loading={loading} />

                    {/* Detailed Filter Toolbar */}
                    <TransactionFilterBar
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onResetFilters={handleResetFilters}
                        onRefresh={fetchTransactionsData}
                        onExportExcel={handleExportExcel}
                        onOpenCreateModal={() => setIsCreateModalOpen(true)}
                        loading={loading}
                    />

                    {/* Transaction Data Table */}
                    <TransactionTable
                        transactions={transactions}
                        loading={loading}
                        onSelectReceipt={(txn) => setSelectedReceipt(txn)}
                        onRefundTransaction={(txn) => setRefundTarget(txn)}
                        page={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                    />
                </div>

                {/* Create Top Up Modal */}
                <CreateTopUpModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSubmit={handleCreateTopUpSubmit}
                />

                {/* Digital Receipt Detail Drawer */}
                {selectedReceipt && (
                    <TransactionDetailDrawer
                        transaction={selectedReceipt}
                        onClose={() => setSelectedReceipt(null)}
                        onRefund={(txn) => setRefundTarget(txn)}
                    />
                )}

                {/* Refund Confirmation Modal */}
                <RefundConfirmModal
                    isOpen={!!refundTarget}
                    transaction={refundTarget}
                    onClose={() => setRefundTarget(null)}
                    onSubmit={handleRefundSubmit}
                />
            </main>
        </div>
    );
}
