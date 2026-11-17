import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Smartphone, Download, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="w-full sm:w-auto min-h-[40px] px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
        title="Install I-FEST 2027 App on Device"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="w-full sm:w-auto min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-400" />
          <span>Install App</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Install on iPhone / iPad</h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close instructions"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                1. Tap the <strong>Share</strong> icon in the Safari toolbar.<br />
                2. Scroll down and tap <strong>Add to Home Screen</strong> to install <strong>I-FEST 2027</strong> as a full-screen mobile app.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 py-2.5 text-xs font-bold text-slate-950"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
