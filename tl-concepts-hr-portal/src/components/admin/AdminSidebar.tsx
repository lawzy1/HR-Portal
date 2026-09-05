import React from 'react';
import {
  LayoutDashboard,
  Users,
  FileCheck,
  CalendarDays,
  TrendingUp,
  Receipt,
  BellRing,
  FileBarChart,
  ShieldCheck,
  UserCircle,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { useAuth } from '../../context/AuthContext';
import { useEmployees } from '../../hooks/useEmployees';
import { AdminTabType } from '../../types';
import { Logo } from '../Logo';
import { useI18n } from '../../context/I18nContext';

interface AdminSidebarProps {
  collapsed: boolean;
  toggleCollapsed: () => void;
  onResizeStart: (e: React.MouseEvent) => void;
  mobileOpen: boolean;
  closeMobile: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ collapsed, toggleCollapsed, onResizeStart, mobileOpen, closeMobile }) => {
  const { adminTab, setAdminTab, reminders, pendingOnboardingCount } = useHR();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { data: employees } = useEmployees();
  const { t } = useI18n();

  const unreadRemindersCount = reminders.filter(r => !r.isRead).length;

  const menuItems: { id: AdminTabType; label: string; icon: React.ReactNode; badge?: number; adminOnly?: boolean }[] = [
    {
      id: 'admin-dashboard',
      label: t('nav.adminDashboard'),
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'admin-employees',
      label: t('nav.employees'),
      icon: <Users className="w-5 h-5" />,
      badge: employees?.length,
    },
    {
      id: 'admin-contracts',
      label: t('nav.contracts'),
      icon: <FileCheck className="w-5 h-5" />,
    },
    {
      id: 'admin-leaves',
      label: t('nav.adminLeaves'),
      icon: <CalendarDays className="w-5 h-5" />,
    },
    {
      id: 'admin-kpi',
      label: t('nav.adminKpi'),
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      id: 'admin-payroll',
      label: t('nav.adminPayroll'),
      icon: <Receipt className="w-5 h-5" />,
    },
    {
      id: 'admin-reminders',
      label: t('nav.reminders'),
      icon: <BellRing className="w-5 h-5" />,
      badge: pendingOnboardingCount || (unreadRemindersCount > 0 ? unreadRemindersCount : undefined),
    },
    {
      id: 'admin-reports',
      label: t('nav.reports'),
      icon: <FileBarChart className="w-5 h-5" />,
      adminOnly: true,
    },
    {
      id: 'admin-settings',
      label: t('nav.settings'),
      icon: <ShieldCheck className="w-5 h-5" />,
      adminOnly: true,
    },
    {
      id: 'admin-profile',
      label: t('nav.account'),
      icon: <UserCircle className="w-5 h-5" />,
    },
  ];

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-40 md:hidden" onClick={closeMobile} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 md:relative md:z-20 md:col-start-1 md:row-start-1 md:row-span-2 bg-white text-slate-700 flex flex-col h-screen md:sticky md:top-0 border-r border-slate-200 transition-transform duration-200 md:translate-x-0 md:w-[var(--sidebar-w)] ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <Logo size="sm" />
            {!collapsed && (
              <div className="min-w-0">
                <h1 className="font-bold text-base text-slate-900 tracking-wide truncate">TL CONCEPTS HR</h1>
                <p className="text-xs text-slate-500 font-medium truncate">{t('sidebar.adminPortal')}</p>
              </div>
            )}
          </div>
          <button onClick={closeMobile} className="md:hidden p-1 text-slate-400 hover:text-slate-700 cursor-pointer" aria-label="Close menu">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Banner */}
        <div className={`mx-3 my-3 p-3 bg-sage-50 rounded-xl border border-sage-200 ${collapsed ? 'flex justify-center' : ''}`}>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse flex-shrink-0"></span>
            {!collapsed && (
              <span className="text-xs font-semibold text-sage-800">{isAdmin ? t('sidebar.adminMode') : t('sidebar.hrMode')}</span>
            )}
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {!collapsed && (
            <div className="px-3 pb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {t('sidebar.adminMenu')}
            </div>
          )}
          {menuItems.filter((item) => isAdmin || !item.adminOnly).map(item => {
            const isActive = adminTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setAdminTab(item.id); closeMobile(); }}
                title={collapsed ? item.label : undefined}
                className={`relative w-full flex items-center justify-between px-3 py-2.5 pl-4 rounded-lg font-medium text-sm transition-all cursor-pointer ${
                  collapsed ? 'justify-center px-0' : ''
                } ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-primary-600" />}
                <div className="flex items-center space-x-3">
                  <span className={isActive ? 'text-primary-600' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  {!collapsed && <span>{item.label}</span>}
                </div>

                {!collapsed && (
                  <div className="flex items-center space-x-1.5">
                    {item.badge !== undefined && (
                      <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                        isActive
                          ? 'bg-primary-100 text-primary-700'
                          : item.id === 'admin-reminders'
                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    {isActive && <ChevronRight className="w-4 h-4 text-primary-500" />}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Collapse toggle footer (desktop only) */}
        <div className="hidden md:block border-t border-slate-100 p-2">
          <button
            onClick={toggleCollapsed}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 cursor-pointer ${collapsed ? 'justify-center px-0' : ''}`}
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
