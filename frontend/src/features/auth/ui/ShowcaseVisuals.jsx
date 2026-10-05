import React from 'react';
import GlassBadge from '../../../shared/ui/GlassBadge';
import LiveStats from './LiveStats';

export default function ShowcaseVisuals() {
  return (
    <>
      {/* Ambient Glow and Backdrop Elements */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand-200/40 rounded-full blur-3xl pointer-events-none animate-pulse-glow"></div>
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl pointer-events-none"></div>
      
      {/* Main Visual Container with Glassmorphism Framing */}
      <div className="relative w-full max-w-2xl h-[92%] rounded-3xl overflow-hidden border border-white/80 shadow-2xl bg-white/40 flex flex-col justify-between p-4">
        
        {/* The Provided 3D Controller Image with Depth Stacking */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img 
            alt="An elegant, bright 3D abstract illustration of a futuristic sleek white gaming controller" 
            className="w-full h-full max-w-full max-h-full block object-cover object-center transform scale-105 transition-transform duration-700 hover:scale-100" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBuU7HiZdJkBG0F05r9trJOE76GC2QBo_Wm1lYr3gBZ7LC4r-wc_LkAsjS-FOMAXpyB4IiIjy0HBijII_5CFEU8mDkfV1-btA00sv7erQkgpMjkZQZb64VBQSMBBM4hr5TKR9m79VPZB_dPXTWT8W1FB3t5djkItZevYZgqqn8_WCf-liLBgWvmyAq-ImOiqGb0BPGsM-yu8sFNY6HnyRDcYNDR78Y6nwT0j17FuwlH60KGOKj0N1U" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-white/30 pointer-events-none"></div>
        </div>
        
        {/* Top Floating Overlay Badges */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 p-3">
          
          {/* Real-time Ping Indicator */}
          <GlassBadge className="px-3.5 py-2 rounded-2xl flex items-center space-x-2.5 shadow-md shadow-cyan-900/5">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500"></span>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">WebRTC Protocol</div>
              <div className="text-xs font-extrabold text-slate-800 flex items-center space-x-1">
                <span>Siêu độ trễ 1.1ms</span>
                <span className="text-emerald-500 text-[10px]">● Live</span>
              </div>
            </div>
          </GlassBadge>

          {/* RTX GPU Passthrough Badge */}
          <GlassBadge className="px-3.5 py-2 rounded-2xl flex items-center space-x-2.5 shadow-md shadow-cyan-900/5">
            <div className="w-7 h-7 rounded-xl bg-slate-900 text-cyan-300 flex items-center justify-center font-black text-xs shadow-inner">
              RTX
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">vGPU Passthrough</div>
              <div className="text-xs font-extrabold text-slate-800">
                RTX 4090 • 4K@120FPS HDR
              </div>
            </div>
          </GlassBadge>

        </div>

        {/* Middle Floating Badge: Pre-installed AAA Title Catalog */}
        <div className="relative z-10 self-start ml-4 -mt-2 max-w-xs glass-badge px-4 py-2.5 rounded-2xl shadow-lg border border-white/90">
          <div className="flex items-center space-x-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-brand-500"></span>
            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">42+ Game Bản Quyền</span>
          </div>
          <p className="text-xs text-slate-700 leading-snug">
            Sẵn sàng tức thì: <span className="font-bold text-slate-900">Valorant, CS2, Cyberpunk 2077, Black Myth: Wukong</span>.
          </p>
        </div>
        
        {/* Bottom Feature Tagline and Live Network Counter */}
        <LiveStats />

      </div>
    </>
  );
}
