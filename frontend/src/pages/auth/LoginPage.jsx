import React from 'react';
import SplitScreenLayout from '../../shared/ui/SplitScreenLayout';
import LoginForm from '../../features/auth/ui/LoginForm';
import SocialAuthOptions from '../../features/auth/ui/SocialAuthOptions';
import ShowcaseVisuals from '../../features/auth/ui/ShowcaseVisuals';

export default function LoginPage({ onLoginSuccess }) {
  const leftContent = (
    <>
      {/* Top Header Navigation */}
      <header className="flex items-center justify-between pb-4" data-purpose="brand-header">
        <a className="flex items-center space-x-3 group" href="#" title="NEXUS Cyber Command Home">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-sky-400 flex items-center justify-center shadow-md shadow-brand-500/25 group-hover:scale-105 transition-transform duration-200">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.2"
              viewBox="0 0 24 24"
            >
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-brand-700">
                NEXUS
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand-50 text-brand-600 border border-brand-200/70 uppercase tracking-widest">
                CLOUD
              </span>
            </div>
            <p className="text-[10px] tracking-widest text-slate-600 font-semibold uppercase">Cyber OS &amp; Cloud Gaming</p>
          </div>
        </a>

        <div className="flex items-center space-x-3 text-xs">
          {/* Header items removed as requested */}
        </div>
      </header>

      {/* Main Login Form Wrapper */}
      <div className="my-auto py-4 max-w-md w-full mx-auto" data-purpose="login-form-area">
        <div className="mb-6 text-left">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Chào mừng trở lại!</h1>
          <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">
            Đăng nhập để trải nghiệm Cloud Gaming độ trễ siêu thấp (1.1ms) hoặc quản lý tài khoản trạm máy của bạn.
          </p>
        </div>

        <SocialAuthOptions />

        <div className="relative flex items-center justify-center my-5">
          <div className="border-t border-slate-200 w-full"></div>
          <span className="bg-white px-3 text-[11px] font-medium uppercase tracking-wider text-slate-500 whitespace-nowrap">
            Hoặc tiếp tục với tài khoản phòng máy / SĐT
          </span>
          <div className="border-t border-slate-200 w-full"></div>
        </div>

        <LoginForm onSuccess={onLoginSuccess} />

        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-700 font-medium flex flex-wrap items-center justify-center gap-1.5">
            Chưa có tài khoản?
            <a className="font-bold text-brand-600 hover:text-brand-700 transition inline-flex items-center space-x-2 group" href="#">
              <span className="underline underline-offset-2">Đăng ký hội viên mới</span>
              <span className="text-[11px] bg-emerald-500 text-white font-bold px-2.5 py-0.5 rounded-full border border-emerald-500 shadow-sm transition-transform duration-200 group-hover:scale-105">
                +2 Giờ Miễn Phí
              </span>
            </a>
          </p>
        </div>
      </div>

      {/* Footer Info and Security Badges */}
      <footer
        className="pt-4 flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 text-[11px] text-slate-600 space-y-2 sm:space-y-0"
        data-purpose="login-footer"
      >
        <div className="flex items-center space-x-3 text-xs text-slate-700 font-medium">
          <span className="inline-flex items-center">
            <svg className="w-4 h-4 text-emerald-500 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              ></path>
            </svg>
            TLS 1.3 End-to-End
          </span>
          <span className="text-slate-400">•</span>
          <span className="hover:text-slate-900 cursor-pointer transition-colors">Hotline 1900 xxxx (24/7)</span>
        </div>
        <div className="text-xs font-mono font-medium text-slate-600">Build v4.8.2-cloud</div>
      </footer>
    </>
  );

  const rightContent = <ShowcaseVisuals />;

  return <SplitScreenLayout leftContent={leftContent} rightContent={rightContent} />;
}
