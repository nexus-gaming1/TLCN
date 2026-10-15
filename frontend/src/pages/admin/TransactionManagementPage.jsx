import React, { useState, useEffect } from 'react';
import Header from '../../widgets/header/Header';
import Sidebar from '../../widgets/sidebar/Sidebar';
import Footer from '../../widgets/footer/Footer';
import TransactionKpiCards from '../../features/transactions/ui/TransactionKpiCards';
import TransactionFilterBar from '../../features/transactions/ui/TransactionFilterBar';
import TransactionTable from '../../features/transactions/ui/TransactionTable';
import CreateTopUpModal from '../../features/transactions/ui/CreateTopUpModal';
import RefundConfirmModal from '../../features/transactions/ui/RefundConfirmModal';
import TransactionDetailDrawer from '../../features/transactions/ui/TransactionDetailDrawer';
import TransactionService from '../../shared/api/transaction.service';
import { AlertCircle } from 'lucide-react';

export default function TransactionManagementPage({ user, onLogout }) {
    const [transactions, setTransactions] = useState([]);
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal & Drawer State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [refundTxn, setRefundTxn] = useState(null);

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
            const queryParams = {
                search: filters.search || undefined,
                dateRange: filters.dateRange !== 'all' ? filters.dateRange : undefined,
                category: filters.category !== 'all' ? filters.category : undefined,
                paymentMethod: filters.paymentMethod !== 'all' ? filters.paymentMethod : undefined,
                status: filters.status !== 'all' ? filters.status : undefined
            };
            const data = await TransactionService.getTransactions(queryParams);
            setTransactions(data.transactions || []);
            setMetrics(data.metrics || null);
        } catch (err) {
            console.error('Lỗi khi tải giao dịch:', err);
            setError('Không thể kết nối CSDL MySQL backend. Vui lòng kiểm tra lại dịch vụ.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactionsData();
    }, [filters.dateRange, filters.category, filters.paymentMethod, filters.status, filters.search]);

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const handleResetFilters = () => {
        setFilters({
            search: '',
            dateRange: 'all',
            category: 'all',
            paymentMethod: 'all',
            status: 'all'
        });
    };

    const handleCreateTopUpSubmit = async (formData) => {
        await TransactionService.createTopUp(formData);
        fetchTransactionsData();
    };

    const handleOpenRefundModal = (transaction) => {
        setRefundTxn(transaction);
    };

    const handleConfirmRefund = async (transaction, reason) => {
        const txnId = transaction.transaction_id || transaction.id;
        try {
            await TransactionService.refundTransaction(txnId, reason);
            alert('Đã xử lý hoàn tiền thành công!');
            if (selectedReceipt && (selectedReceipt.transaction_id || selectedReceipt.id) === txnId) {
                setSelectedReceipt(null);
            }
            fetchTransactionsData();
        } catch (err) {
            alert('Lỗi hoàn tiền: ' + (err?.response?.data?.message || err?.message));
        }
    };

    const handleExportExcel = () => {
        alert('Tính năng xuất báo cáo Excel cho ' + transactions.length + ' giao dịch đang khởi tạo!');
    };

    return (
        <div className="bg-slate-100 font-sans text-slate-900 antialiased min-h-screen">
            {/* Header Widget */}
            <Header user={user} onLogout={onLogout} />

            {/* Sidebar Widget with activeNav='transactions' */}
            <Sidebar activeNav="transactions" />

            {/* Main Content Area — đồng bộ khoảng cách với ManageConfigPage */}
            <div className="pl-[240px]">
                <main className="relative pt-16 min-h-screen bg-slate-100 w-full px-6 py-6 pb-24 flex flex-col justify-between">
                    <div className="flex flex-col w-full gap-6">

                        {/* Backend Error Banner */}
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* 4 Financial KPI Summary Cards */}
                        <TransactionKpiCards metrics={metrics} loading={loading} />

                        {/* Table Toolbar: tìm kiếm, bộ lọc, xuất file, nạp tiền */}
                        <TransactionFilterBar
                            filters={filters}
                            onFilterChange={handleFilterChange}
                            onExport={handleExportExcel}
                            onOpenCreateModal={() => setIsCreateModalOpen(true)}
                        />

                        {/* Transaction Data Table */}
                        <TransactionTable
                            transactions={transactions}
                            loading={loading}
                            onSelectReceipt={(txn) => setSelectedReceipt(txn)}
                            onRefundTransaction={handleOpenRefundModal}
                        />
                    </div>

                    {/* Shared Footer */}
                    <Footer />
                </main>
            </div>

            {/* Create Top Up Modal */}
            <CreateTopUpModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleCreateTopUpSubmit}
            />

            {/* Refund Confirmation Modal */}
            {refundTxn && (
                <RefundConfirmModal
                    isOpen={Boolean(refundTxn)}
                    transaction={refundTxn}
                    onClose={() => setRefundTxn(null)}
                    onSubmit={handleConfirmRefund}
                />
            )}

            {/* Digital Receipt Detail Drawer */}
            {selectedReceipt && (
                <TransactionDetailDrawer
                    transaction={selectedReceipt}
                    onClose={() => setSelectedReceipt(null)}
                    onRefund={handleOpenRefundModal}
                />
            )}
        </div>
    );
}
