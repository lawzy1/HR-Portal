import React from 'react';
import { useHR } from '../context/HRContext';
import { TabType } from '../types';
import {
  LayoutDashboard,
  UserSquare2,
  FileCheck,
  Receipt,
  CalendarDays,
  Award,
  Sparkles,
} from 'lucide-react';
import { Logo } from './Logo';

interface SidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = () => {
  const { activeTab, setActiveTab, currentEmployee } = useHR();

  const navItems: { id: TabType; label: string; icon: React.ReactNode; badge?: string }[] = [
    { 
      id: 'dashboard', 
      label: 'Tổng quan', 
      icon: <LayoutDashboard className="w-5 h-5" /> 
    },
    { 
      id: 'profile', 
      label: 'Hồ sơ cá nhân', 
      icon: <UserSquare2 className="w-5 h-5" /> 
    },
    { 
      id: 'contracts', 
      label: 'Hợp đồng & Lương', 
      icon: <FileCheck className="w-5 h-5" /> 
    },
    { 
      id: 'payslips', 
      label: 'Phiếu lương', 
      icon: <Receipt className="w-5 h-5" />,
      badge: `${currentEmployee.payslips.length}`
    },
    { 
      id: 'leaves', 
      label: 'Ngày phép', 
      icon: <CalendarDays className="w-5 h-5" />,
      badge: `${currentEmployee.leaveBalance.remainingDays} ngày`
    },
    { 
      id: 'kpi', 
      label: 'Theo dõi KPI & Dự án', 
      icon: <Award className="w-5 h-5" /> 
    },
  ];

  return (
    <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex-shrink-0 md:min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between border-r border-slate-800">
      <div className="space-y-6">
        
        {/* User Card inside Sidebar */}
        <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60 flex items-center gap-3">
          <div className="relative">
            <img 
              src={currentEmployee.avatar} 
              alt={currentEmployee.fullName}
              className="w-11 h-11 rounded-lg object-cover ring-2 ring-success-500/40" 
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-success-500 rounded-full border-2 border-slate-900" title="Đang hoạt động"></span>
          </div>
          <div className="overflow-hidden">
            <h3 className="text-xs font-bold text-white truncate">{currentEmployee.fullName}</h3>
            <p className="text-[11px] text-success-400 font-medium truncate">{currentEmployee.employeeCode}</p>
            <p className="text-[11px] text-slate-400 truncate">{currentEmployee.department}</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Danh mục chính
          </p>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-success-600 text-white shadow-md shadow-success-900/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-success-700 text-white' : 'bg-slate-800 text-success-400 border border-slate-700'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

      </div>

      {/* Footer Info Box */}
      <div className="mt-8 pt-4 border-t border-slate-800">
        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/40 text-slate-400 text-[11px] space-y-2">
          <div className="flex items-center gap-1.5 text-success-400 font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Phép tự động +1 ngày/tháng</span>
          </div>
          <p className="text-slate-400 leading-relaxed text-[10px]">
            Hệ thống tự động cộng dồn ngày phép vào đầu mỗi tháng làm việc hoàn thành.
          </p>
          <div className="flex items-center gap-2 pt-2 border-t border-slate-700/40">
            <Logo size="sm" className="w-6 h-6 p-1 ring-0" />
            <span>TL CONCEPTS HR Portal</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
