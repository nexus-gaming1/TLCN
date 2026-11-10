import React, { useState } from 'react';
import Header from '../../widgets/header/Header';
import Sidebar from '../../widgets/sidebar/Sidebar';
import Footer from '../../widgets/footer/Footer';
import authService from '../../shared/api/auth.service';
import { CreditCard, Coffee, Search, PlusCircle, CheckCircle2, DollarSign, Clock } from 'lucide-react';

export default function StaffDashboardPage({ user, onLogout }) {
  const [topupAmount, setTopupAmount] = useState('');
  const [targetMember, setTargetMember] = useState('');
  const [topupSuccess, setTopupSuccess] = useState(false);
  const [completedOrders, setCompletedOrders] = useState([]);

  const handleLogout = () => {
    authService.logout();
    if (onLogout) onLogout();
  };

  const handleTopupSubmit = (e) => {
    e.preventDefault();
    if (!targetMember || !topupAmount) return;
    setTopupSuccess(true);
    setTimeout(() => {
      setTopupSuccess(false);
      setTopupAmount('');
      setTargetMember('');
    }, 3000);
  };

  const handleCompleteOrder = (orderId) => {
    setCompletedOrders(prev => [...prev, orderId]);
  };

  return (
    <div className="bg-[#F8F9FA] min-h-screen text-slate-800 font-sans antialiased">
      {/* UNIFIED HEADER */}
      <Header user={user} onLogout={handleLogout} />

      {/* UNIFIED SIDEBAR */}
      <Sidebar role="EMPLOYEE" />

      {/* MAIN CONTENT WRAPPER */}
      <div className="lg:pl-[240px]">
        <main className="pt-20 pb-16 px-6 max-w-7xl mx-auto space-y-6">
          {/* Welcome Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200 inline-block mb-2">
                👨‍💼 QUẦY THU NGÂN TẠI QUÁN
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900">Xin chào, {user?.full_name || 'Nhân Viên Thu Ngân'}!</h2>
              <p className="text-xs text-slate-500 mt-1">
                Trạm thu ngân số #1 | Ca làm việc: <span className="font-bold text-slate-700 font-mono">CA SÁNG (07:00 - 15:00)</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-right">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">TỔNG NẠP CA TRỰC</span>
                <span className="text-lg font-extrabold text-emerald-600 font-mono">4,850,000 đ</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top-up Form Panel */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-600" />
                  Nạp Tiền Tài Khoản Hội Viên
                </h3>
              </div>

              {topupSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="font-medium">Đã nạp tiền thành công cho tài khoản!</span>
                </div>
              )}

              <form onSubmit={handleTopupSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Tên tài khoản hội viên / SĐT</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Nhập tên user (vd: user, nexus_pro)..."
                      value={targetMember}
                      onChange={(e) => setTargetMember(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-medium"
                      required
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Số tiền nạp (VNĐ)</label>
                  <input
                    type="number"
                    placeholder="vd: 50000, 100000..."
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-bold text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 font-mono">
                  {['20000', '50000', '100000'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTopupAmount(amt)}
                      className="py-2 rounded-xl bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-700 text-center font-bold border border-slate-200 transition-colors"
                    >
                      +{parseInt(amt).toLocaleString()}đ
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs transition shadow-sm flex items-center justify-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>XÁC NHẬN NẠP TIỀN</span>
                </button>
              </form>
            </div>

            {/* Pending Service Orders Panel */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-amber-600" />
                  Đơn Hàng Dịch Vụ Đang Chờ Chế Biến (Service Orders)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-mono text-xs font-bold">
                  {2 - completedOrders.length} đơn mới
                </span>
              </div>

              <div className="space-y-3">
                {!completedOrders.includes(1) && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-mono text-[10px] font-bold border border-amber-200">MÁY ESP-01</span>
                        <span className="text-xs font-bold text-slate-800">Khách: user (Khách Hàng VIP)</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1.5 font-medium">
                        🍜 1x Cơm Chiên Dương Châu, 🥤 1x Coca Cola Lạnh
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono mt-1">Tổng tiền: 65,000 đ | 10:15 AM</p>
                    </div>
                    <button
                      onClick={() => handleCompleteOrder(1)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
                    >
                      Xác nhận giao món
                    </button>
                  </div>
                )}

                {!completedOrders.includes(2) && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-mono text-[10px] font-bold border border-sky-200">MÁY VIP-01</span>
                        <span className="text-xs font-bold text-slate-800">Khách: nexus_pro</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1.5 font-medium">
                        🍜 2x Mì Bò Trứng Special, 🥤 2x Red Bull
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono mt-1">Tổng tiền: 90,000 đ | 10:22 AM</p>
                    </div>
                    <button
                      onClick={() => handleCompleteOrder(2)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
                    >
                      Xác nhận giao món
                    </button>
                  </div>
                )}

                {completedOrders.length === 2 && (
                  <div className="p-8 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    🎉 Không còn đơn hàng dịch vụ nào đang chờ chế biến!
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* UNIFIED FOOTER */}
      <Footer />
    </div>
  );
}
