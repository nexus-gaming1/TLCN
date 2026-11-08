import React, { useState, useEffect, useMemo } from 'react';
import { X, ArrowRight, ShieldCheck, AlertCircle, Loader2, Sparkles, Plus, RotateCcw } from 'lucide-react';
import transactionService from '../../../shared/api/transaction.service';
import memberService from '../../../shared/api/member.service';
import { toVietnameseWords } from '../../../shared/utils/formatters';

const MAX_AMOUNT = 100000000; // 100,000,000 VNĐ

const PRESET_AMOUNTS = [10000, 20000, 50000, 100000, 200000, 500000];

export default function AmountInputModal({
    isOpen,
    onClose,
    action = 'TOPUP', // 'TOPUP' | 'WITHDRAW' | 'BONUS_ADD' | 'BONUS_DEDUCT'
    station,
    currentUser,
    onSuccess
}) {
    const [amount, setAmount] = useState(0);
    const [realBalance, setRealBalance] = useState(0);
    const [bonusBalance, setBonusBalance] = useState(0);
    const [loadingBalance, setLoadingBalance] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const isBonusAction = action === 'BONUS_ADD' || action === 'BONUS_DEDUCT';
    const isAddAction = action === 'TOPUP' || action === 'BONUS_ADD';

    // Tải số dư hội viên tươi mới nhất từ backend khi mở modal (bám sát ComputersScreen.cs:456)
    useEffect(() => {
        if (!isOpen || !station) {
            setAmount(0);
            setErrorMessage('');
            return;
        }

        const memberId = station.member_id || station.memberId;
        if (!memberId) {
            setRealBalance(Number(station.real_balance || 0));
            setBonusBalance(Number(station.bonus_balance || 0));
            return;
        }

        let isMounted = true;
        setLoadingBalance(true);
        memberService.getMemberById(memberId)
            .then((res) => {
                if (!isMounted) return;
                const memberData = res?.data || res;
                if (memberData) {
                    setRealBalance(Number(memberData.real_balance || 0));
                    setBonusBalance(Number(memberData.bonus_balance || 0));
                }
            })
            .catch(() => {
                if (!isMounted) return;
                // Fallback to existing station balances
                setRealBalance(Number(station.real_balance || 0));
                setBonusBalance(Number(station.bonus_balance || 0));
            })
            .finally(() => {
                if (isMounted) setLoadingBalance(false);
            });

        return () => {
            isMounted = false;
        };
    }, [isOpen, station]);

    // Tính toán số dư mới preview
    const numAmount = Number(amount) || 0;

    const newRealBalance = useMemo(() => {
        if (isBonusAction) return realBalance;
        return isAddAction ? realBalance + numAmount : Math.max(0, realBalance - numAmount);
    }, [isBonusAction, isAddAction, realBalance, numAmount]);

    const newBonusBalance = useMemo(() => {
        if (!isBonusAction) return bonusBalance;
        return isAddAction ? bonusBalance + numAmount : Math.max(0, bonusBalance - numAmount);
    }, [isBonusAction, isAddAction, bonusBalance, numAmount]);

    // Nghiệp vụ kiểm tra tính hợp lệ IsValidAmount (bám sát AmountInputForm.cs:159)
    const validationError = useMemo(() => {
        if (numAmount <= 0) return 'Vui lòng nhập số tiền lớn hơn 0đ';
        if (numAmount > MAX_AMOUNT) return `Số tiền tối đa là ${MAX_AMOUNT.toLocaleString('vi-VN')}đ`;
        if (action === 'BONUS_DEDUCT' && numAmount > bonusBalance) {
            return `Số tiền trừ (${numAmount.toLocaleString('vi-VN')}đ) vượt quá số dư miễn phí hiện có (${bonusBalance.toLocaleString('vi-VN')}đ)`;
        }
        if (action === 'WITHDRAW' && numAmount > realBalance) {
            return `Số tiền rút (${numAmount.toLocaleString('vi-VN')}đ) vượt quá số dư tài khoản hiện có (${realBalance.toLocaleString('vi-VN')}đ)`;
        }
        return '';
    }, [numAmount, action, bonusBalance, realBalance]);

    const isValid = !validationError && numAmount > 0;

    const handleAmountChange = (e) => {
        const raw = e.target.value.replace(/[^\d]/g, '');
        let val = Number(raw) || 0;
        if (val > MAX_AMOUNT) {
            val = MAX_AMOUNT;
        }
        setAmount(val);
        setErrorMessage('');
    };

    const addPreset = (val) => {
        setAmount((prev) => {
            const next = Math.min(MAX_AMOUNT, (Number(prev) || 0) + val);
            return next;
        });
        setErrorMessage('');
    };

    const handleReset = () => {
        setAmount(0);
        setErrorMessage('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isValid || isSubmitting) return;

        const memberId = station?.member_id || station?.memberId;
        if (!memberId) {
            setErrorMessage('Máy hiện chưa có hội viên đăng nhập để thực hiện giao dịch.');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage('');

        const computerName = station?.id || station?.computer_name || `Máy #${station?.computer_id || ''}`;
        const staffName = currentUser?.full_name || currentUser?.username || 'Thu ngân';
        const description = `Máy ${computerName} - nhân viên ${staffName}`;

        try {
            let res;
            if (action === 'TOPUP') {
                res = await transactionService.createTopUp({
                    member_id: memberId,
                    amount: numAmount,
                    description
                });
            } else if (action === 'WITHDRAW') {
                res = await transactionService.createWithdraw({
                    member_id: memberId,
                    amount: numAmount,
                    description
                });
            } else if (action === 'BONUS_ADD') {
                res = await transactionService.createBonusTopUp({
                    member_id: memberId,
                    amount: numAmount,
                    description
                });
            } else if (action === 'BONUS_DEDUCT') {
                res = await transactionService.createBonusWithdraw({
                    member_id: memberId,
                    amount: numAmount,
                    description
                });
            }

            const actionName = action === 'TOPUP'
                ? 'Nạp tiền tài khoản'
                : action === 'WITHDRAW'
                    ? 'Rút tiền tài khoản'
                    : action === 'BONUS_ADD'
                        ? 'Tặng tiền miễn phí'
                        : 'Trừ tiền miễn phí';

            onSuccess?.(`${actionName} ${numAmount.toLocaleString('vi-VN')}đ thành công!`, res);
            onClose();
        } catch (err) {
            setErrorMessage(err.message || 'Lỗi khi thực hiện giao dịch số dư.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !station) return null;

    const computerName = station.id || station.computer_name || 'Máy trạm';
    const userName = station.user || station.userName || 'Chưa đăng nhập';

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div
                className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Modal */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-xs shadow-xs">
                            {computerName}
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">
                                Giao dịch số dư hội viên
                            </h3>
                            <p className="text-xs text-slate-500">
                                Thao tác trực tiếp từ quầy quản trị
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Shield Action Tag (ConfigShield bám sát AmountInputForm.cs:46-69) */}
                        <div className="flex items-center text-xs font-bold rounded-lg overflow-hidden border shadow-xs">
                            <span className={`px-2.5 py-1 ${isAddAction ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                                {isAddAction ? 'Thêm' : 'Trừ'}
                            </span>
                            <span className={`px-2.5 py-1 ${isBonusAction ? 'bg-purple-50 text-purple-700 border-l border-purple-200' : 'bg-blue-50 text-blue-700 border-l border-blue-200'}`}>
                                {isBonusAction ? 'Tiền miễn phí' : 'Tiền tài khoản'}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-lg transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Thông tin máy & người dùng */}
                    <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                        <div>
                            <span className="text-slate-500 block font-semibold">Máy tính:</span>
                            <span className="font-extrabold text-slate-900 font-mono text-sm">{computerName}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block font-semibold">Người dùng:</span>
                            <span className="font-extrabold text-slate-900 text-sm truncate block">{userName}</span>
                        </div>
                    </div>

                    {/* Số dư hiện tại */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80">
                            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
                                Số dư tài khoản
                            </span>
                            <span className="font-mono text-lg font-extrabold text-blue-600 mt-0.5 block">
                                {loadingBalance ? '...' : `${realBalance.toLocaleString('vi-VN')}đ`}
                            </span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200/80">
                            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
                                Số dư miễn phí
                            </span>
                            <span className="font-mono text-lg font-extrabold text-purple-600 mt-0.5 block">
                                {loadingBalance ? '...' : `${bonusBalance.toLocaleString('vi-VN')}đ`}
                            </span>
                        </div>
                    </div>

                    {/* Input nhập số tiền */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                            <span>Số tiền giao dịch:</span>
                            <span className="text-[11px] text-slate-400 font-normal">Tối đa 100.000.000đ</span>
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                autoFocus
                                value={numAmount ? numAmount.toLocaleString('en-US') : ''}
                                onChange={handleAmountChange}
                                placeholder="0"
                                className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-300 font-mono text-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 shadow-inner"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                                đ
                            </span>
                        </div>

                        {/* Phím bấm chọn nhanh số tiền */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {PRESET_AMOUNTS.map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => addPreset(p)}
                                    className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-slate-200 bg-slate-50 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700 text-slate-700 transition active:scale-95 cursor-pointer flex items-center gap-1"
                                >
                                    <Plus className="w-3 h-3 text-slate-400" />
                                    {p >= 1000000 ? `${p / 1000000}Tr` : `${p / 1000}k`}
                                </button>
                            ))}
                            {numAmount > 0 && (
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 text-slate-500 transition active:scale-95 cursor-pointer flex items-center gap-1"
                                    title="Đặt lại 0đ"
                                >
                                    <RotateCcw className="w-3 h-3" /> Xóa
                                </button>
                            )}
                        </div>

                        {/* Đọc số bằng chữ (ToVietnameseWords bám sát AmountInputForm.cs:130, 165) */}
                        <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/60 text-xs">
                            <span className="text-amber-900 font-medium italic block">
                                Bằng chữ: <strong className="font-bold not-italic">{toVietnameseWords(numAmount)}</strong>
                            </span>
                        </div>
                    </div>

                    {/* Xem trước thay đổi số dư (Preview bám sát AmountInputForm.cs:131-132) */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                        <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider block font-mono">
                            Dự kiến thay đổi sau giao dịch
                        </span>
                        <div className="flex items-center justify-between py-1 border-b border-slate-200/60 font-mono">
                            <span className="text-slate-600 font-semibold">Số dư tài khoản:</span>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500">{realBalance.toLocaleString('vi-VN')}đ</span>
                                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                                <span className={`font-bold ${newRealBalance !== realBalance ? 'text-blue-600' : 'text-slate-700'}`}>
                                    {newRealBalance.toLocaleString('vi-VN')}đ
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between py-1 font-mono">
                            <span className="text-slate-600 font-semibold">Số dư miễn phí:</span>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500">{bonusBalance.toLocaleString('vi-VN')}đ</span>
                                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                                <span className={`font-bold ${newBonusBalance !== bonusBalance ? 'text-purple-600' : 'text-slate-700'}`}>
                                    {newBonusBalance.toLocaleString('vi-VN')}đ
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Thông báo lỗi nếu có */}
                    {(validationError && numAmount > 0 || errorMessage) && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-semibold">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>{errorMessage || validationError}</span>
                        </div>
                    )}

                    {/* Footer Buttons */}
                    <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs transition cursor-pointer"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="submit"
                            disabled={!isValid || isSubmitting}
                            className={`px-6 py-2.5 rounded-xl text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                                isAddAction
                                    ? isBonusAction ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'
                                    : 'bg-rose-600 hover:bg-rose-700'
                            }`}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Đang thực thi...
                                </>
                            ) : (
                                <>
                                    <ShieldCheck className="w-4 h-4" />
                                    Xác nhận giao dịch
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

