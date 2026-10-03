import React, { useState } from 'react';
import { Camera, Star, ShieldCheck, Copy, Check } from 'lucide-react';

/**
 * ProfileIdentityHeader Component
 * Fixes text overlapping by enforcing clear vertical & horizontal hierarchy:
 * Row 1: Large Display Name ("Khách Hàng VIP")
 * Row 2: Nickname ("@user") + Gold Rank Badge ("⭐ VÀNG")
 * Row 3: KYC Level 1 Status + Active Status Tags
 * Right: UID Copy Capsule Box
 */
export default function ProfileIdentityHeader({ profile, onAvatarChange }) {
  const [copied, setCopied] = useState(false);
  const uidString = profile?.uid || 'NX-0002-VN01';
  const fileInputRef = React.useRef(null);

  const handleCopyUid = () => {
    navigator.clipboard.writeText(uidString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (onAvatarChange) onAvatarChange(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-200/80">
      {/* Top Banner Gradient */}
      <div
        className="h-36 sm:h-40 w-full relative overflow-hidden flex items-start justify-between p-4"
        style={{ background: 'linear-gradient(135deg, #090e1a 0%, #171d3d 45%, #0369a1 80%, #06b6d4 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(#00f2fe 1px, transparent 1px)', backgroundSize: '16px 16px' }}
        ></div>

        <div className="relative z-10 flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/20 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#00f2fe] animate-pulse"></span>
          <span className="font-mono text-[11px] uppercase tracking-wider text-[#a5f3fc] font-bold">
            NEXUS Cloud Gaming Infrastructure
          </span>
        </div>
      </div>

      {/* Identity Bar & Badges */}
      <div className="px-6 pb-10 pt-4 bg-white flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 relative z-20">
          {/* Avatar Container */}
          <div className="relative group shrink-0 -mt-12 sm:-mt-14">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden shrink-0 shadow-xl ring-4 ring-white bg-slate-100 relative">
              <img
                className="w-full h-full max-w-full max-h-full block object-cover transition-transform duration-300 group-hover:scale-105"
                alt="Avatar"
                src={profile?.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAs8dBAUHnsFAlRsHsjgaT6wrKt-GrttfGiw1_eIniAUOa-8Njbsfgqvj8LCwo2GG725KkvX-7UNAQWJU9OuU_WzUP2CgXPbJRiUV2hQPM7ZklsLgfjfm4Z126zsxn16iDfJkNt5VahCr6FbdbVPCJ1uVXn-eawT4Ch_6ofpZq9gypCMIlKT5S6zHbGA5K0ArpqFJa2jp1YtccknO3eEtqIE2EFI4SYJqeoQORRG8KlTgY0AUReON8'}
              />
            </div>
            <button
              onClick={handleAvatarClick}
              className="absolute bottom-0 right-0 w-8.5 h-8.5 rounded-full text-white flex items-center justify-center shadow-md transition-transform hover:scale-110 border-2 border-white cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #6366f1)' }}
              title="Thay đổi ảnh đại diện"
              type="button"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          {/* User Details Column */}
          <div className="flex flex-col gap-1.5 pt-2 sm:pt-0">
            {/* Row 1: Large Display Name */}
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-sans leading-tight">
              {profile?.full_name || 'Khách Hàng VIP'}
            </h2>

            {/* Row 2: Nickname & Gold Badge */}
            <div className="flex items-center flex-wrap gap-2.5">
              <span className="text-sm font-semibold text-slate-500 font-mono">
                (@{profile?.username || 'user'})
              </span>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-800 border border-amber-400/40 shadow-xs">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider font-mono">
                  ⭐ {(profile?.rank?.name || 'Đồng').toUpperCase()}
                </span>
              </div>
            </div>

            {/* Row 3: Activity Status Tag */}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 text-green-700 border border-green-200 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-xs font-medium text-green-700">
                  Trạng thái: Hoạt động (Active)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* UID Box Container (Right Aligned) */}
        <div className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 shadow-xs shrink-0 mt-4 md:mt-0 self-start md:self-center">
          <span className="text-[11px] text-slate-500 uppercase font-bold">UID:</span>
          <span className="text-xs font-extrabold text-cyan-700 font-mono tracking-wide">{uidString}</span>
          <button
            onClick={handleCopyUid}
            className="text-slate-400 hover:text-cyan-600 transition-colors flex items-center ml-1 cursor-pointer"
            title="Sao chép UID"
            type="button"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
