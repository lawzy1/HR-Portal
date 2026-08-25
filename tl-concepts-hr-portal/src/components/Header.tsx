import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useHR } from '../context/HRContext';
import {
  PlusCircle,
  ShieldCheck,
  LogOut,
} from 'lucide-react';

export const Header: React.FC = () => {
  const { setIsNewLeaveModalOpen } = useHR();
  const { profile, session, signOut } = useAuth();

  const isAdmin = profile?.role === 'admin';
  const isBackoffice = isAdmin || profile?.role === 'hr';

  return (
    <header className="md:col-start-2 md:row-start-1 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-end h-16 gap-3">

          {!isBackoffice && (
            <button
              onClick={() => setIsNewLeaveModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-success-800 bg-success-50 hover:bg-success-100 border border-success-200 rounded-lg transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-success-600" />
              <span>Xin nghỉ phép</span>
            </button>
          )}

          <div className="h-6 w-px bg-slate-200"></div>

          {/* Authenticated user */}
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 pr-3 border border-slate-200 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs">
              {session?.user.email?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="text-left hidden lg:block">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-slate-800 truncate max-w-[140px]">{session?.user.email}</span>
                {isBackoffice && <ShieldCheck className="w-3.5 h-3.5 text-primary-600" />}
              </div>
              <span className="text-[11px] text-slate-500 font-medium block">
                {isAdmin ? 'Admin' : profile?.role === 'hr' ? 'HR / Kế toán' : 'Nhân viên'}
              </span>
            </div>
          </div>

          <button
            onClick={() => signOut()}
            title="Đăng xuất"
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>

        </div>
      </div>
    </header>
  );
};
