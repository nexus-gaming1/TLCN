import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Crown, Trophy, AlertCircle, X, Search } from 'lucide-react';

// Component hiển thị huy hiệu thứ hạng
function RankBadge({ rank }) {
  if (rank === 1) {
    return (
      <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-950 flex items-center justify-center font-black text-xs shadow-xs border border-amber-400 shrink-0">
        <Crown className="w-4 h-4 fill-amber-950" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-7 h-7 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-black text-xs shadow-xs border border-slate-300 shrink-0">
        2
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-7 h-7 rounded-xl bg-orange-100 text-orange-800 flex items-center justify-center font-black text-xs shadow-xs border border-orange-200 shrink-0">
        3
      </div>
    );
  }
  return (
    <div className="w-7 h-7 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center font-bold text-xs border border-slate-200 shrink-0">
      {rank}
    </div>
  );
}

export default function TopMembersTable({ data = [], allMembers = [] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const fullList = useMemo(() => {
    if (Array.isArray(allMembers) && allMembers.length > 0) return allMembers;
    return Array.isArray(data) ? data : [];
  }, [allMembers, data]);
  const filteredMembers = useMemo(() => {
    const q = searchKeyword.trim().toLowerCase();
    if (!q) return fullList;
    return fullList.filter((m) =>
      String(m.name || '').toLowerCase().includes(q) ||
      String(m.username || '').toLowerCase().includes(q)
    );
  }, [fullList, searchKeyword]);
  const totalTopupAll = useMemo(
    () => fullList.reduce((sum, m) => sum + Number(m.totalTopup || 0), 0),
    [fullList]
  );
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);
  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col items-center justify-center min-h-[280px] h-full text-center gap-2">
        <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
        <p className="text-xs font-bold text-slate-600">Chưa có dữ liệu hội viên</p>
        <p className="text-[11px] text-slate-400">Không phát sinh giao dịch nạp trong kỳ thống kê này</p>
      </div>
    );
  }
  return (
    <>
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-bold shrink-0">
              <Trophy className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-900 leading-tight truncate">Top Hội Viên Nạp Tiền</h3>
              <p className="text-[11px] text-slate-400 font-medium truncate">Khách hàng chi tiêu hàng đầu</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchKeyword('');
              setIsModalOpen(true);
            }}
            className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-extrabold text-xs border border-amber-200 transition-all cursor-pointer shrink-0 shadow-2xs"
            title="Xem danh sách đầy đủ hội viên nạp tiền trong kỳ"
          >
            Xem tất cả ({fullList.length}) ➔
          </button>
        </div>
        {/* Danh sách Top 5 hội viên */}
        <div className="space-y-2.5">
          {data.map((m, index) => {
            const rank = index + 1;
            const total = Number(m.totalTopup || 0);
            return (
              <div
                key={m.memberId || index}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 hover:bg-slate-100/80 transition-colors border border-slate-200/60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <RankBadge rank={rank} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-extrabold text-slate-900 truncate">
                      {m.name || 'Hội viên không tên'}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 truncate">
                      @{m.username || `id-${m.memberId}`}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0 pl-3">
                  <span className="font-mono font-black text-xs text-emerald-700">
                    {total.toLocaleString('vi-VN')} đ
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Tổng nạp</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Modal Xem Tất Cả Hội Viên Nạp Tiền */}
      {isModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Bảng Xếp Hạng Hội Viên Nạp Tiền
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Hiển thị {fullList.length} hội viên — Tổng nạp:{' '}
                    <span className="font-mono font-extrabold text-emerald-700">
                      {totalTopupAll.toLocaleString('vi-VN')} đ
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                title="Đóng (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Ô tìm kiếm */}
            <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/70">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Tìm theo họ tên hoặc @username hội viên..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400"
                />
              </div>
            </div>
            {/* Danh sách cuộn */}
            <div className="flex-1 overflow-y-auto p-6 space-y-2.5">
              {filteredMembers.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 font-medium">
                  Không tìm thấy hội viên nào khớp từ khóa "{searchKeyword}".
                </div>
              ) : (
                filteredMembers.map((m, idx) => {
                  // Giữ nguyên thứ hạng thật trong fullList ngay cả khi đang lọc tìm kiếm
                  const originalRank = fullList.findIndex(
                    (item) => (item.memberId && item.memberId === m.memberId) || item === m
                  ) + 1;
                  const total = Number(m.totalTopup || 0);
                  return (
                    <div
                      key={m.memberId || idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 transition-colors border border-slate-200/70"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <RankBadge rank={originalRank || idx + 1} />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-extrabold text-slate-900 truncate">
                            {m.name || 'Hội viên không tên'}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500 truncate">
                            @{m.username || `id-${m.memberId}`}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0 pl-3">
                        <span className="font-mono font-black text-sm text-emerald-700">
                          {total.toLocaleString('vi-VN')} đ
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Tổng nạp trong kỳ</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}