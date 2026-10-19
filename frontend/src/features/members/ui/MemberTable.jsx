import { Eye, Edit, Lock, LockOpen, Award, Phone } from 'lucide-react';
import { USER_STATUS_LABELS } from '../../../shared/constants/userConstants';

/**
 * Tier configurations mapping
 */
const TIER_CONFIGS = Object.freeze({
  diamond: { label: 'Kim Cương', badgeClass: 'bg-cyan-100 text-cyan-950 border-cyan-300', iconColor: 'text-cyan-700' },
  gold: { label: 'Vàng', badgeClass: 'bg-amber-100 text-amber-950 border-amber-400', iconColor: 'text-amber-800' },
  silver: { label: 'Bạc', badgeClass: 'bg-slate-200 text-slate-900 border-slate-300', iconColor: 'text-slate-700' },
  normal: { label: 'Đồng', badgeClass: 'bg-orange-100 text-orange-950 border-orange-300', iconColor: 'text-orange-800' }
});

/**
 * Helper to render Member Tier Badge with High Contrast
 */
function TierBadge({ rankName, tier }) {
  const tierKey = tier || (
    rankName?.includes('Kim Cương') ? 'diamond' :
    rankName?.includes('Vàng') ? 'gold' :
    rankName?.includes('Bạc') ? 'silver' : 'normal'
  );
  const config = TIER_CONFIGS[tierKey] || TIER_CONFIGS.normal;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border shadow-2xs text-xs font-extrabold tracking-wide ${config.badgeClass}`}>
      <Award className={`w-3.5 h-3.5 ${config.iconColor}`} />
      {rankName || config.label}
    </span>
  );
}

/**
 * Helper to render Account Status Badge strictly based on USER_STATUS_LABELS
 */
function AccountStatusBadge({ status }) {
  const normalized = (status || '').toUpperCase();
  const config = USER_STATUS_LABELS[normalized];

  if (config) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[11px] font-extrabold border ${config.badgeClass}`}>
        <span className={`h-2 w-2 rounded-full ${config.dotClass}`}></span>
        {config.label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full font-mono text-[11px] font-bold">
      {status || 'Không rõ'}
    </span>
  );
}

/**
 * MemberTable component optimized for high contrast, right-aligned numbers, and overflow prevention
 */
export default function MemberTable({
  members = [],
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
  onViewDetail,
  onEditInfo,
  onChangeStatus
}) {
  const isAllSelected = members.length > 0 && selectedIds.length === members.length;

  return (
    <div className="w-full bg-white rounded-lg shadow-flat border border-slate-200 flex flex-col">
      <div className="w-full overflow-x-auto rounded-lg">
        <table className="w-full text-left border-collapse" id="memberFleetTable">
          <thead>
            <tr className="bg-slate-100/90 text-slate-800 text-[11px] uppercase tracking-wider border-b border-slate-200 font-extrabold select-none">
              <th className="py-3.5 px-4 w-12 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onToggleSelectAll}
                  className="w-4 h-4 rounded accent-sky-600 cursor-pointer"
                  id="check-all"
                />
              </th>
              <th className="py-3.5 px-4 font-extrabold text-slate-800 min-w-[220px]">Hội Viên &amp; UID</th>
              <th className="py-3.5 px-4 font-extrabold text-slate-800 min-w-[140px] whitespace-nowrap">Số Điện Thoại</th>
              <th className="py-3.5 px-4 font-extrabold text-slate-800 min-w-[130px] whitespace-nowrap">Hạng</th>
              <th className="py-3.5 px-4 font-extrabold text-slate-800 text-right pr-6 min-w-[150px] whitespace-nowrap">SỐ DƯ</th>
              <th className="py-3.5 px-4 font-extrabold text-slate-800 text-right pr-6 min-w-[120px] whitespace-nowrap">ĐIỂM TÍCH LŨY</th>
              <th className="py-3.5 px-4 font-extrabold text-slate-800 min-w-[180px] whitespace-nowrap">Trạm &amp; Trạng Thái Hoạt Động</th>
              <th className="py-3.5 px-4 font-extrabold text-slate-800 min-w-[160px] whitespace-nowrap">Trạng Thái Tài Khoản</th>
              <th className="py-3.5 px-4 font-extrabold text-slate-800 min-w-[170px] whitespace-nowrap">Lần Đăng Nhập Cuối</th>
              <th className="py-3.5 px-4 font-extrabold text-slate-800 text-right pr-6 min-w-[150px] whitespace-nowrap">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
            {members.map((m) => {
              const isSelected = selectedIds.includes(m.id);
              const isLocked = m.status === 'LOCKED' || m.status === 'locked';

              return (
                <tr
                  key={m.id}
                  className={`hover:bg-slate-50/80 transition-colors group ${
                    isSelected ? 'bg-sky-50/70' : isLocked ? 'bg-rose-50/30 hover:bg-rose-50/50' : ''
                  }`}
                >
                  {/* Checkbox */}
                  <td className="py-3.5 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect && onToggleSelect(m.id)}
                      className="w-4 h-4 rounded accent-sky-600 cursor-pointer"
                    />
                  </td>

                  {/* Member Name, Username & Merged UID */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center font-extrabold text-xs text-sky-900 shrink-0 shadow-2xs">
                        {m.name ? m.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() : 'MB'}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={`text-xs font-extrabold truncate ${isLocked ? 'text-slate-500 line-through' : 'text-slate-900'}`} title={m.name}>
                          {m.name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[11px] text-slate-600 font-medium truncate">
                            @{m.username}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="font-mono text-[10px] font-bold text-sky-800 bg-sky-50 border border-sky-200/80 px-1.5 py-0.2 rounded shrink-0">
                            {m.uid || `#MB-${String(m.id).padStart(3, '0')}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Phone Number */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-mono text-xs">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className={m.phone && m.phone !== 'Chưa cập nhật' ? 'font-bold text-slate-800' : 'text-slate-400 italic'}>
                        {m.phone || 'Chưa cập nhật'}
                      </span>
                    </div>
                  </td>

                  {/* Rank */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <TierBadge rankName={m.rankName} tier={m.tier} />
                  </td>

                  {/* Balance (Right Aligned) */}
                  <td className="py-3.5 px-4 text-right pr-6 whitespace-nowrap">
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-black font-mono tracking-tight text-slate-900">
                        {(m.realBalance || m.balance || 0).toLocaleString()} <span className="text-[11px] font-bold text-slate-600">đ</span>
                      </span>
                      {m.bonusBalance > 0 && (
                        <span className="text-[10px] font-mono text-emerald-700 font-bold">
                          +{(m.bonusBalance).toLocaleString()} đ thưởng
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Points (Right Aligned) */}
                  <td className="py-3.5 px-4 text-right pr-6 whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-1 font-mono">
                      <span className="font-black text-amber-900 text-xs">
                        {(m.pts || 0).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-amber-800 font-extrabold bg-amber-50 px-1 py-0.2 rounded border border-amber-200/80">pts</span>
                    </div>
                  </td>

                  {/* Station & Active Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          m.stationCode ? 'bg-sky-500 animate-pulse' : 'bg-slate-400'
                        }`}
                      ></span>
                      <span className="text-xs font-bold text-slate-800">
                        {m.station || 'Chưa vào máy'}
                      </span>
                    </div>
                  </td>

                  {/* Account Status Badge */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <AccountStatusBadge status={m.status} />
                  </td>

                  {/* Last Login */}
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                    {m.lastLoginTime || 'Chưa đăng nhập'}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right pr-6 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {/* Xem Chi Tiết */}
                      <button
                        type="button"
                        onClick={() => onViewDetail && onViewDetail(m)}
                        className="w-8 h-8 rounded-lg text-slate-600 hover:text-sky-600 hover:bg-sky-50 flex items-center justify-center transition-colors"
                        title="Xem chi tiết hồ sơ hội viên"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Chỉnh Sửa Thông Tin (Chỉ Họ tên, SĐT, Email) */}
                      <button
                        type="button"
                        onClick={() => onEditInfo && onEditInfo(m)}
                        className="w-8 h-8 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors"
                        title="Sửa thông tin hồ sơ (Họ tên, SĐT, Email)"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      {/* Status Change Buttons: Khóa hoặc Mở khóa */}
                      {isLocked || m.status === 'BANNED' ? (
                        <button
                          type="button"
                          onClick={() => onChangeStatus && onChangeStatus(m.id, 'ACTIVE')}
                          className="w-8 h-8 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                          title="Kích hoạt lại tài khoản"
                        >
                          <LockOpen className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onChangeStatus && onChangeStatus(m.id, 'LOCKED')}
                          className="w-8 h-8 rounded-lg text-amber-600 hover:bg-amber-50 hover:text-amber-700 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                          title="Tạm khóa tài khoản"
                        >
                          <Lock className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
