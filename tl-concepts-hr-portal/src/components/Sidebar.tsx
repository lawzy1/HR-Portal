import React from 'react';
import { useHR } from '../context/HRContext';
import { useAuth } from '../context/AuthContext';
import { useEmployee } from '../hooks/useEmployees';
import { useLeaveBalance } from '../hooks/useLeave';
import { usePayrollRecords } from '../hooks/usePayroll';
import { useSignedImageUrl, AVATAR_TRANSFORM } from '../hooks/useFileUpload';
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
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';
import { Logo } from './Logo';
import { useI18n } from '../context/I18nContext';

interface SidebarProps {
  collapsed: boolean;
  toggleCollapsed: () => void;
  onResizeStart: (e: React.MouseEvent) => void;
  mobileOpen: boolean;
  closeMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, toggleCollapsed, onResizeStart, mobileOpen, closeMobile }) => {
  const { activeTab, setActiveTab } = useHR();
  const { profile } = useAuth();
  const { data: employee } = useEmployee(profile?.employeeId ?? undefined);
  const { data: avatarUrl } = useSignedImageUrl(employee?.avatar_url, AVATAR_TRANSFORM);
  const { data: leaveBalance } = useLeaveBalance(profile?.employeeId ?? undefined, new Date().getFullYear());
  const { data: payslips } = usePayrollRecords(profile?.employeeId ?? undefined, new Date().getFullYear());
  const { t } = useI18n();

  const navItems: { id: TabType; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'dashboard',
      label: t('nav.dashboard'),
      icon: <LayoutDashboard className="w-5 h-5" />
    },
    {
      id: 'profile',
      label: t('nav.profile'),
      icon: <UserSquare2 className="w-5 h-5" />
    },
    {
      id: 'contracts',
      label: t('nav.contracts'),
      icon: <FileCheck className="w-5 h-5" />
    },
    {
      id: 'payslips',
      label: t('nav.payslips'),
      icon: <Receipt className="w-5 h-5" />,
      badge: payslips && payslips.length > 0 ? `${payslips.length}` : undefined
    },
    {
      id: 'leaves',
      label: t('nav.leaves'),
      icon: <CalendarDays className="w-5 h-5" />,
      badge: leaveBalance ? t('common.days', { count: leaveBalance.remaining_days ?? 0 }) : undefined
    },
    {
      id: 'kpi',
      label: t('nav.kpi'),
      icon: <Award className="w-5 h-5" />
    },
  ];

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-40 md:hidden" onClick={closeMobile} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 md:relative md:z-20 md:col-start-1 md:row-start-1 md:row-span-2 bg-white text-slate-700 flex-shrink-0 md:h-screen md:sticky md:top-0 flex flex-col justify-between border-r border-slate-200 transition-transform duration-200 md:translate-x-0 md:w-[var(--sidebar-w)] ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 overflow-y-auto p-4 space-y-6">

          {/* Brand */}
          <div className="flex items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-3 min-w-0">
              <Logo size="sm" />
              {!collapsed && (
                <div className="min-w-0">
                  <h1 className="font-bold text-sm text-slate-900 tracking-wide truncate">TL CONCEPTS</h1>
                  <p className="text-[11px] text-slate-500 font-medium truncate">{t('sidebar.employeePortal')}</p>
                </div>
              )}
            </div>
            <button onClick={closeMobile} className="md:hidden p-1 text-slate-400 hover:text-slate-700 cursor-pointer" aria-label="Close menu">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Card inside Sidebar */}
          <div className={`bg-sage-50 rounded-xl border border-sage-200 flex items-center gap-3 ${collapsed ? 'p-2 justify-center' : 'p-3.5'}`}>
            <div className="relative flex-shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={employee?.full_name || ''}
                  className="w-11 h-11 rounded-lg object-cover ring-2 ring-white"
                  loading="lazy"
                  width={44}
                  height={44}
                />
              ) : (
                <div className="w-11 h-11 rounded-lg bg-sage-200 flex items-center justify-center ring-2 ring-white">
                  <User className="w-5 h-5 text-sage-600" />
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-success-500 rounded-full border-2 border-white" title="Đang hoạt động"></span>
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <h3 className="text-xs font-bold text-slate-900 truncate">{employee?.full_name || '...'}</h3>
                <p className="text-[11px] text-success-700 font-medium truncate">{employee?.employee_code}</p>
                <p className="text-[11px] text-sage-700 truncate">{employee?.department}</p>
              </div>
            )}
          </div>

          {/* Navigation Menu */}
          <div className="space-y-1">
            {!collapsed && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                {t('sidebar.mainMenu')}
              </p>
            )}
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); closeMobile(); }}
                  title={collapsed ? item.label : undefined}
                  className={`relative w-full flex items-center justify-between px-3.5 py-2.5 pl-4 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    collapsed ? 'justify-center px-0' : ''
                  } ${
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
                    {!collapsed && <span>{item.label}</span>}
                  </div>
                  {!collapsed && item.badge && (
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
        {!collapsed && (
          <div className="p-4 pt-0">
            <div className="mt-2 pt-4 border-t border-slate-100">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-500 text-[11px] space-y-2">
                <div className="flex items-center gap-1.5 text-success-700 font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t('sidebar.leaveFund')}</span>
                </div>
                <p className="text-slate-500 leading-relaxed text-[10px]">
                  {t('sidebar.leaveFundHelp')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Collapse toggle footer (desktop only) */}
        <div className="hidden md:block border-t border-slate-100 p-2">
          <button
            onClick={toggleCollapsed}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900 cursor-pointer ${collapsed ? 'justify-center px-0' : ''}`}
            aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
            title={collapsed ? t('sidebar.expand') : undefined}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            {!collapsed && <span>{t('sidebar.collapse')}</span>}
          </button>
        </div>

        {/* Resize handle (desktop only) */}
        {!collapsed && (
          <div
            onMouseDown={onResizeStart}
            className="hidden md:block absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-primary-300/60 active:bg-primary-400"
          />
        )}
      </aside>
    </>
  );
};
