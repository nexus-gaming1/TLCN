import React from 'react';
import CustomerSidebar from './CustomerSidebar';
import CustomerHeader from './CustomerHeader';
import AnnouncementBanner from './AnnouncementBanner';

/**
 * CustomerLayout Widget
 * Located at: widgets/layouts/customer/CustomerLayout.jsx
 * Wrapper component for all Customer Portal pages (Light Theme).
 */
export default function CustomerLayout({ user, onLogout, activeTab = 'profile', children }) {
  return (
    <div className="bg-[#F1F5F9] font-sans text-slate-900 min-h-screen">
      <CustomerSidebar activeTab={activeTab} />
      <CustomerHeader user={user} onLogout={onLogout} />

      <div className="pl-[17.5rem]">
        <main className="w-full pt-20 pb-8 px-8 min-h-screen">
          <AnnouncementBanner />
          {children}
        </main>
      </div>
    </div>
  );
}

