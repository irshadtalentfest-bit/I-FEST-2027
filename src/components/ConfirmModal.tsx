import React from 'react';
import { AlertTriangle, Trash2, CheckCircle, Info, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Yes, Delete Permanently',
  cancelText = 'Cancel',
  type = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <Trash2 className="w-6 h-6 text-rose-400" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-amber-400" />;
      default:
        return <Info className="w-6 h-6 text-cyan-400" />;
    }
  };

  const getButtonClass = () => {
    switch (type) {
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30';
      case 'warning':
        return 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/20';
      default:
        return 'bg-cyan-600 hover:bg-cyan-500 text-white';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div
        className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 my-auto text-left"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2.5 rounded-xl shrink-0 ${type === 'danger' ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
              {getIcon()}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
              <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
                Confirmed Executive Action
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close confirmation dialog"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          {message}
        </p>

        <div className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
            }}
            className={`w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all ${getButtonClass()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
