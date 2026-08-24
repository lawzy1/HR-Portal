import React from 'react';
import { useHR } from '../context/HRContext';
import { useAuth } from '../context/AuthContext';
import { useEmployee } from '../hooks/useEmployees';
import { useLeaveBalance } from '../hooks/useLeave';
import { usePayrollRecords } from '../hooks/usePayroll';
import { useSignedImageUrl } from '../hooks/useFileUpload';
import { TabType } from '../types';
import {
  LayoutDashboard,
  UserSquare2,
  FileCheck,
  Receipt,
  CalendarDays,
  Award,
  Sparkles,
  User,
} from 'lucide-react';
import { Logo } from './Logo';

interface SidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = () => {
  const { activeTab, setActiveTab } = useHR();
  const { profile } = useAuth();
  const { data: employee } = useEmployee(profile?.employeeId ?? undefined);
  const { data: avatarUrl } = useSignedImageUrl(employee?.avatar_url);
  const { data: leaveBalance } = useLeaveBalance(profile?.employeeId ?? undefined, new Date().getFullYear());
  const { data: payslips } = usePayrollRecords(profile?.employeeId ?? undefined, new Date().getFullYear());

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
      badge: payslips && payslips.length > 0 ? `${payslips.length}` : undefined
    },
    {
      id: 'leaves',
      label: 'Ngày phép',
      icon: <CalendarDays className="w-5 h-5" />,
      badge: leaveBalance ? `${leaveBalance.remaining_days ?? 0} ngày` : undefined
    },
    {
      id: 'kpi',
      label: 'Theo dõi KPI & Dự án',
      icon: <Award className="w-5 h-5" />
    },
  ];

  return (
    <aside className="w-full md:w-64 md:col-start-1 md:row-start-1 md:row-span-2 bg-white text-slate-700 flex-shrink-0 md:h-screen md:sticky md:top-0 p-4 flex flex-col justify-between border-r border-slate-200">
      <div className="space-y-6">

        {/* Brand */}
        <div className="flex items-center gap-3 px-1">
          <Logo size="sm" />
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-wide">TL CONCEPTS</h1>
            <p className="text-[11px] text-slate-500 font-medium">Portal Dịch vụ Nhân viên</p>
          </div>
        </div>

        {/* User Card inside Sidebar */}
        <div className="bg-sage-50 p-3.5 rounded-xl border border-sage-200 flex items-center gap-3">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={employee?.full_name || ''}
                className="w-11 h-11 rounded-lg object-cover ring-2 ring-white"
              />
            ) : (
              <div className="w-11 h-11 rounded-lg bg-sage-200 flex items-center justify-center ring-2 ring-white">
                <User className="w-5 h-5 text-sage-600" />
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-success-500 rounded-full border-2 border-white" title="Đang hoạt động"></span>
          </div>
          <div className="overflow-hidden">
            <h3 className="text-xs font-bold text-slate-900 truncate">{employee?.full_name || '...'}</h3>
            <p className="text-[11px] text-success-700 font-medium truncate">{employee?.employee_code}</p>
            <p className="text-[11px] text-sage-700 truncate">{employee?.department}</p>
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
                className={`relative w-full flex items-center justify-between px-3.5 py-2.5 pl-4 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-success-50 text-success-800'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-success-600" />}
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-success-600' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-success-100 text-success-700' : 'bg-slate-100 text-slate-500 border border-slate-200'
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
      <div className="mt-8 pt-4 border-t border-slate-100">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-500 text-[11px] space-y-2">
          <div className="flex items-center gap-1.5 text-success-700 font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Quỹ phép năm</span>
          </div>
          <p className="text-slate-500 leading-relaxed text-[10px]">
            Quỹ phép do Admin/HR cấp và điều chỉnh — xem chi tiết ở mục Ngày phép.
          </p>
        </div>
      </div>
    </aside>
  );
};
