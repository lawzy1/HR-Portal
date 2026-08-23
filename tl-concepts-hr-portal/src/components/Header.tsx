import React from 'react';
import { useHR } from '../context/HRContext';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Search,
  PlusCircle,
  ShieldCheck,
  LogOut,
} from 'lucide-react';

export const Header: React.FC = () => {
  const { setIsNewLeaveModalOpen, showToast } = useHR();
  const { profile, session, signOut } = useAuth();

  const isAdmin = profile?.role === 'admin';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">

          {/* Brand & App Identifier */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold text-lg shadow-md ${
              isAdmin
                ? 'bg-gradient-to-br from-blue-600 to-indigo-800 shadow-blue-900/10'
                : 'bg-gradient-to-br from-emerald-600 to-teal-800 shadow-emerald-900/10'
            }`}>
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-base tracking-tight">TL CONCEPTS</span>
                <span className={`px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase rounded-md border ${
                  isAdmin
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  {isAdmin ? 'HR Portal (Admin)' : 'HR Portal (User)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                {isAdmin ? 'Quản trị Nhân sự & Vận hành' : 'Portal Dịch vụ Nhân viên'}
              </p>
            </div>
          </div>

          {/* Search bar & Actions */}
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={isAdmin ? "Tra cứu nhân sự, hợp đồng, đơn phép..." : "Tra cứu phiếu lương, quy trình, chính sách..."}
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    showToast('Đã thực hiện tìm kiếm trên hệ thống');
                  }
                }}
              />
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">

            {!isAdmin && (
              <button
                onClick={() => setIsNewLeaveModalOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-emerald-600" />
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
                  {isAdmin && <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />}
                </div>
                <span className="text-[11px] text-slate-500 font-medium block">
                  {isAdmin ? 'Admin / HR' : 'Nhân viên'}
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
      </div>
    </header>
  );
};
