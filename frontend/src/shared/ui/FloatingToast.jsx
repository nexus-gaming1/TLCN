import { CheckCircle2, AlertCircle, PauseCircle, X } from 'lucide-react';

/**
 * FloatingToast
 * Reusable floating toast notification component (DRY & Zero Duplication)
 */
export default function FloatingToast({ toast, onClose }) {
  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-20 right-6 z-[100] max-w-sm w-full animate-in fade-in slide-in-from-top-3 duration-200 pointer-events-auto"
    >
      <div
        className={`p-4 rounded-2xl border shadow-xl flex items-start gap-3 backdrop-blur-md ${
          toast.type === 'warning'
            ? 'bg-amber-50/95 border-amber-200 text-amber-900 shadow-amber-500/10'
            : toast.type === 'error'
            ? 'bg-rose-50/95 border-rose-200 text-rose-900 shadow-rose-500/10'
            : 'bg-emerald-50/95 border-emerald-200 text-emerald-900 shadow-emerald-500/10'
        }`}
      >
        <div className="shrink-0 mt-0.5">
          {toast.type === 'warning' ? (
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
              <PauseCircle className="w-5 h-5" />
            </div>
          ) : toast.type === 'error' ? (
            <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
              <AlertCircle className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <h4 className="text-xs font-black tracking-tight">{toast.title}</h4>
          <p className="text-xs font-medium text-slate-600 mt-0.5 leading-snug break-words">
            {toast.message}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-black/5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer shrink-0"
          aria-label="Đóng thông báo"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

