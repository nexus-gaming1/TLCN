import React from 'react';
import { CheckCircle, Loader2, AlertCircle, ShieldAlert, LogIn, RefreshCw, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCustomerProfile } from './hooks/useCustomerProfile';
import ProfileIdentityHeader from './components/ProfileIdentityHeader';
import ProfileAccountForm from './components/ProfileAccountForm';
import WalletBalanceWidget from './components/WalletBalanceWidget';
import RankRewardsWidget from './components/RankRewardsWidget';

/**
 * CustomerProfileView Component
 * Renders 3-column Light Mode Customer Profile Dashboard matching exact UI design specs.
 */
export default function CustomerProfileView({ user, memberId }) {
  const navigate = useNavigate();

  // Safely resolve member ID strictly from auth user object or explicitly passed prop
  const effectiveMemberId = memberId ?? user?.member_id ?? user?.id ?? user?.user_id;

  const {
    profile,
    formData,
    cloudPreferences,
    loading,
    saving,
    message,
    error,
    isDirty,
    handleAccountFormChange,
    handleCloudPrefChange,
    handleAvatarChange,
    handleSaveProfile
  } = useCustomerProfile(effectiveMemberId);

  // 1. Missing Authentication / Member ID Error State
  if (!effectiveMemberId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] p-8 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-lg mx-auto text-center gap-4 my-8">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold text-slate-800 font-sans">Xác Thực Nguồn Gốc Hồ Sơ Thất Bại</h3>
          <p className="text-xs text-slate-500 font-mono">
            Hệ thống NEXUS Cyber OS không thể trích xuất định danh tài khoản từ phiên làm việc.
          </p>
        </div>
        <p className="text-sm text-slate-600 font-sans">
          Để ngăn chặn truy cập trái phép và bảo vệ thông tin cá nhân, vui lòng đăng nhập lại tài khoản của bạn.
        </p>
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium text-sm flex items-center gap-2 hover:brightness-110 shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Đăng Nhập Lại</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. Loading State
  if (loading && !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500 font-mono">Đang tải hồ sơ NEXUS Cloud Gaming...</p>
      </div>
    );
  }

  // 3. Error State
  if (error && !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] p-8 bg-white rounded-2xl border border-rose-200 shadow-sm max-w-lg mx-auto text-center gap-4 my-8">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-inner">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold text-slate-800 font-sans">Không Thể Tải Hồ Sơ Cá Nhân</h3>
          <p className="text-xs text-rose-600 font-mono font-semibold">{error}</p>
        </div>
        <p className="text-sm text-slate-600 font-sans">
          Yêu cầu của bạn đã bị từ chối do từ chối truy cập hoặc tài khoản không tồn tại.
        </p>
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-xl bg-slate-800 text-white font-medium text-sm flex items-center gap-2 hover:bg-slate-900 shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Thử Lại</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Global Toast Notification */}
      {(message || error) && (
        <div className="fixed bottom-8 right-8 z-[9999] animate-slide-up flex items-center">
          <div
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl shadow-slate-900/10 border font-medium text-sm ${
              error
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-slate-900 border-slate-800 text-white'
            }`}
          >
            {error ? (
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            ) : (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <span>{error || message}</span>
          </div>
        </div>
      )}


      {/* Primary 3-Column Responsive Grid (8 cols Main + 4 cols Right Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CENTER MAIN COLUMN (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Personal Identity Banner */}
          <ProfileIdentityHeader profile={profile} onAvatarChange={handleAvatarChange} />

          {/* Account Details Form Card */}
          <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 flex flex-col gap-6">
            <ProfileAccountForm
              formData={formData}
              availableZones={profile?.available_zones || []}
              onChange={handleAccountFormChange}
            />

            {/* Bottom Form Actions */}
            <div className={`flex items-center justify-end gap-3 pt-4 border-t border-slate-100 transition-all duration-300 ${isDirty ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden pt-0 border-transparent'}`}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <X className="w-4 h-4 text-slate-500" />
                <span>Hủy</span>
              </button>

              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:brightness-110 text-white font-extrabold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>ĐANG LƯU...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Lưu Thay Đổi</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT SIDEBAR COLUMN (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <WalletBalanceWidget balances={profile?.balances} memberId={effectiveMemberId}/>
          <RankRewardsWidget profile={profile} />
        </div>
      </div>
    </div>
  );
}
