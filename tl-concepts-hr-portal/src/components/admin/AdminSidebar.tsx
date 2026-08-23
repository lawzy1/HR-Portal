import React from 'react';
import {
  LayoutDashboard,
  Users,
  FileCheck,
  CalendarDays,
  TrendingUp,
  Receipt,
  BellRing,
  ShieldCheck,
  Building2,
  ChevronRight
} from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { AdminTabType } from '../../types';

export const AdminSidebar: React.FC = () => {
  const { adminTab, setAdminTab, reminders, employees } = useHR();

  const unreadRemindersCount = reminders.filter(r => !r.isRead).length;

  const menuItems: { id: AdminTabType; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'admin-dashboard',
      label: 'Tổng quan HR',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'admin-employees',
      label: 'Hồ sơ Nhân viên',
      icon: <Users className="w-5 h-5" />,
      badge: employees.length,
    },
    {
      id: 'admin-contracts',
      label: 'Hợp đồng & Lương',
      icon: <FileCheck className="w-5 h-5" />,
    },
    {
      id: 'admin-leaves',
      label: 'Quản lý Ngày phép',
      icon: <CalendarDays className="w-5 h-5" />,
    },
    {
      id: 'admin-kpi',
      label: 'KPI, OT & Thưởng',
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      id: 'admin-payroll',
      label: 'Quản lý Payroll',
      icon: <Receipt className="w-5 h-5" />,
    },
    {
      id: 'admin-reminders',
      label: 'Thông báo & Cảnh báo',
      icon: <BellRing className="w-5 h-5" />,
      badge: unreadRemindersCount > 0 ? unreadRemindersCount : undefined,
    },
    {
      id: 'admin-settings',
      label: 'Cài đặt Phân quyền',
      icon: <ShieldCheck className="w-5 h-5" />,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col h-screen sticky top-0 border-r border-slate-800 shadow-xl z-20">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base text-white tracking-wide">TL CONCEPTS HR</h1>
            <p className="text-xs text-blue-400 font-medium">Cổng Quản trị HR & Nhân sự</p>
          </div>
        </div>
      </div>

      {/* Status Banner */}
      <div className="mx-3 my-3 p-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs font-semibold text-slate-200">Chế độ Admin Portal</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <div className="px-3 pb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Menu Quản trị
        </div>
        {menuItems.map(item => {
          const isActive = adminTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setAdminTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium text-sm transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className={isActive ? 'text-white' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              
              <div className="flex items-center space-x-1.5">
                {item.badge !== undefined && (
                  <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                    isActive 
                      ? 'bg-white text-blue-700' 
                      : item.id === 'admin-reminders' 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}>
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight className="w-4 h-4 text-white/80" />}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
        <div>
          <p className="font-medium text-slate-300">TL CONCEPTS</p>
          <p className="text-[11px] text-slate-500">TL CONCEPTS HR Portal v2.4</p>
        </div>
      </div>
    </aside>
  );
};
