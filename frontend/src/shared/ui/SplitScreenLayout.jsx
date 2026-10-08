import React from 'react';

export default function SplitScreenLayout({ leftContent, rightContent }) {
  return (
    <main className="h-screen w-full flex flex-col lg:flex-row relative font-sans text-slate-800 antialiased select-none overflow-hidden" data-purpose="split-login-container">
      {/* Left Login Section */}
      <section className="w-full lg:w-1/2 h-full flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-14 overflow-y-auto overscroll-none bg-white/95 relative z-10 shadow-xl border-r border-slate-200/70" data-purpose="auth-interface">
        {leftContent}
      </section>

      {/* Right Visual Showcase Section */}
      <section className="hidden lg:flex lg:w-1/2 h-full relative bg-slate-100 dot-pattern items-center justify-center p-8 xl:p-12 overflow-hidden select-none" data-purpose="cloud-gaming-showcase">
        {rightContent}
      </section>
    </main>
  );
}
