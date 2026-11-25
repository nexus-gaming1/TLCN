import React, { useState, useEffect, useCallback } from 'react';
import announcementService from '../../../shared/api/announcement.service';
import { socket, connectSocket } from '../../../shared/socket/socket';
import { Megaphone, AlertTriangle, Sparkles, Trophy, X } from 'lucide-react';

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);
  const [dismissedIds, setDismissedIds] = useState([]);

  const fetchActiveAnnouncements = useCallback(async () => {
    const list = await announcementService.getActiveAnnouncements();
    setAnnouncements(Array.isArray(list) ? list : []);
  }, []);

  useEffect(() => {
    fetchActiveAnnouncements();

    connectSocket();
    const handleAnnouncementUpdated = () => {
      fetchActiveAnnouncements();
    };

    socket.on('announcement:updated', handleAnnouncementUpdated);
    return () => {
      socket.off('announcement:updated', handleAnnouncementUpdated);
    };
  }, [fetchActiveAnnouncements]);

  const visibleAnnouncements = announcements.filter(
    (a) => !dismissedIds.includes(a.announcement_id)
  );

  if (visibleAnnouncements.length === 0) return null;
  const current = visibleAnnouncements[0];

const typeConfig = {
    PROMOTION: {
      wrapper: 'bg-amber-50/90 border-amber-200/90 text-amber-950',
      iconBg: 'bg-amber-100 text-amber-600',
      badge: 'bg-amber-500 text-white',
      desc: 'text-amber-800/90',
      icon: Sparkles,
      label: 'ƯU ĐÃI',
    },
    WARNING: {
      wrapper: 'bg-rose-50/90 border-rose-200/90 text-rose-950',
      iconBg: 'bg-rose-100 text-rose-600',
      badge: 'bg-rose-600 text-white',
      desc: 'text-rose-800/90',
      icon: AlertTriangle,
      label: 'CẢNH BÁO',
    },
    EVENT: {
      wrapper: 'bg-indigo-50/90 border-indigo-200/90 text-indigo-950',
      iconBg: 'bg-indigo-100 text-indigo-600',
      badge: 'bg-indigo-600 text-white',
      desc: 'text-indigo-800/90',
      icon: Trophy,
      label: 'SỰ KIỆN',
    },
    INFO: {
      wrapper: 'bg-cyan-50/90 border-cyan-200/90 text-cyan-950',
      iconBg: 'bg-cyan-100 text-cyan-600',
      badge: 'bg-cyan-600 text-white',
      desc: 'text-cyan-800/90',
      icon: Megaphone,
      label: 'THÔNG BÁO',
    },
  };

  const config = typeConfig[current.type] || typeConfig.INFO;
  const IconComponent = config.icon;

  return (
    <div className={`mb-5 px-4 py-3 rounded-2xl border shadow-2xs flex items-center justify-between gap-3 ${config.wrapper}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`p-2 rounded-xl shrink-0 ${config.iconBg}`}>
          <IconComponent className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${config.badge}`}>
              {config.label}
            </span>
            <strong className="text-xs sm:text-sm font-extrabold truncate">
              {current.title}
            </strong>
          </div>
          <p className={`text-xs truncate mt-0.5 font-medium ${config.desc}`}>
            {current.content}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setDismissedIds((prev) => [...prev, current.announcement_id])}
        className="p-1.5 rounded-lg hover:bg-black/5 text-slate-400 hover:text-slate-700 transition shrink-0 cursor-pointer"
        title="Đóng thông báo"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}