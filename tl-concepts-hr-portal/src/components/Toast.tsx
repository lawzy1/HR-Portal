import React from 'react';
import { useHR } from '../context/HRContext';
import { CheckCircle2, X } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toastMessage } = useHR();

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-slate-700 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <CheckCircle2 className="w-5 h-5 text-success-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 text-xs">
        <p className="font-semibold text-success-300 mb-0.5">Thông báo hệ thống HR</p>
        <p className="text-slate-200 leading-normal">{toastMessage}</p>
      </div>
    </div>
  );
};
