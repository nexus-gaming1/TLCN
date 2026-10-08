import React from 'react';
import { ShieldCheck, RotateCcw, PlusCircle } from 'lucide-react';

export default function Footer({ metrics, variant = 'default' }) {
    if (variant === 'compact') {
        return (
            <footer className="pt-4 flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 text-[11px] text-slate-600 space-y-2 sm:space-y-0">
                <div className="flex items-center space-x-3 text-xs text-slate-700 font-medium">
                    <span className="inline-flex items-center">
                        <ShieldCheck className="w-4 h-4 text-emerald-500 mr-1.5" />
                        TLS 1.3 End-to-End
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="hover:text-slate-900 cursor-pointer transition-colors">Hotline 1900 xxxx (24/7)</span>
                </div>
                <div className="text-xs font-mono font-medium text-slate-600">Build v4.8.2-cloud</div>
            </footer>
        );
    }

    const m = metrics || { localCount: 56, cloudCount: 28, readyCount: 28, maintCount: 8 };

    return null;
}
