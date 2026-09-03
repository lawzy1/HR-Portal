import React, { useMemo } from 'react';
import {
  Users,
  Receipt,
  Calendar,
  UserPlus,
  ArrowRight,
  ShieldAlert,
  FileWarning,
  FileBarChart
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useHR } from '../../context/HRContext';
import { useEmployees, useAllEmployeeSensitiveInfo } from '../../hooks/useEmployees';
import { useAllContracts } from '../../hooks/useContracts';
import { useAllLeaveRequests } from '../../hooks/useLeave';
import { useSignedImageUrl } from '../../hooks/useFileUpload';
import { getContractLifecycleStatus, latestContractsByEmployee } from '../../utils/contracts';
import { formatDate } from '../../utils/formatters';
import { useI18n } from '../../context/I18nContext';

const RowAvatar: React.FC<{ path: string | null | undefined; alt: string }> = ({ path, alt }) => {
  const { data: url } = useSignedImageUrl(path);
  return url ? (
    <img src={url} alt={alt} className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" />
  ) : (
    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 shrink-0" />
  );
};

export const AdminDashboardView: React.FC = () => {
  const { t, value: translateValue } = useI18n();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const {
    setAdminTab,
    setSelectedEmployeeIdForAdmin,
    setIsNewEmployeeModalOpen,
  } = useHR();

  const { data: employeesData } = useEmployees();
  const employees = useMemo(() => employeesData || [], [employeesData]);
  const { data: allContractsData } = useAllContracts();
  const allContracts = useMemo(() => allContractsData || [], [allContractsData]);
  const { data: allLeaveRequestsData } = useAllLeaveRequests();
  const allLeaveRequests = useMemo(() => allLeaveRequestsData || [], [allLeaveRequestsData]);
  const { data: allSensitiveInfoData } = useAllEmployeeSensitiveInfo();
  const allSensitiveInfo = useMemo(() => allSensitiveInfoData || [], [allSensitiveInfoData]);

  // Metrics computation
  const totalEmployees = employees.length;
  const officialCount = employees.filter(e => e.status === 'Chính thức').length;
  const probationCount = employees.filter(e => e.status === 'Thử việc').length;
  const newJoinerCount = employees.filter(e => e.status === 'Mới tiếp nhận').length;

  // Contracts expiring — most recently started contract per employee, based on
  // dates so this cannot drift from the contract directory's status labels.
  const expiringContractsCount = useMemo(() => {
    return latestContractsByEmployee(allContracts)
      .filter((contract) => getContractLifecycleStatus(contract) === 'Sắp hết hạn')
      .length;
  }, [allContracts]);

  // Pending leave requests across company
  const pendingLeaves = allLeaveRequests.filter(l => l.status === 'Chờ duyệt');

  // Missing docs count
  const missingDocsCount = useMemo(() => {
    const sensitiveByEmployee = new Map(allSensitiveInfo.map(s => [s.employee_id, s]));
    return employees.filter(e => {
      const info = sensitiveByEmployee.get(e.id);
      return !info || !info.id_card_front_url || !info.tax_code;
    }).length;
  }, [employees, allSensitiveInfo]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-soft-xs">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-100 text-primary-700">
              {isAdmin ? t('adminDashboard.adminPortal') : t('adminDashboard.hrPortal')}
            </span>
            <span className="text-xs text-slate-500">{t('adminDashboard.today', { date: formatDate(new Date().toISOString()) })}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t('adminDashboard.title')}
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {t('adminDashboard.subtitle')}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setIsNewEmployeeModalOpen(true)}
              className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium text-sm flex items-center space-x-2 shadow-md shadow-primary-500/20 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t('adminDashboard.addEmployee')}</span>
            </button>
          )}

          <button
            onClick={() => setAdminTab('admin-payroll')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-medium text-sm flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Receipt className="w-4 h-4 text-success-600" />
            <span>{t('adminDashboard.processPayroll')}</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => setAdminTab('admin-reports')}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-medium text-sm flex items-center space-x-2 transition-all cursor-pointer"
            >
              <FileBarChart className="w-4 h-4 text-primary-600" />
              <span>{t('adminDashboard.exportReports')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Metrics: bento-style row - featured headcount card + two compact ones, then a full-width alert strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Employees (featured, spans 2 cols) */}
        <div className="relative sm:col-span-2 bg-white pl-6 p-5 rounded-2xl border border-slate-200 shadow-soft-xs hover:shadow-soft-md transition-all">
          <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-primary-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('adminDashboard.totalEmployees')}</span>
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">{totalEmployees}</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
            <span>{t('adminDashboard.officialCount', { count: '' }).split(':')[0]}: <b className="text-slate-800">{officialCount}</b></span>
            <span>{t('adminDashboard.probationCount', { count: '' }).split(':')[0]}: <b className="text-slate-800">{probationCount}</b></span>
            <span>{t('adminDashboard.newJoinerCount', { count: '' }).split(':')[0]}: <b className="text-slate-800">{newJoinerCount}</b></span>
          </div>
        </div>

        {/* Expiring Contracts Alert */}
        <div className="relative bg-white pl-6 p-5 rounded-2xl border border-slate-200 shadow-soft-xs hover:shadow-soft-md transition-all">
          <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-amber-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('adminDashboard.expiringContracts')}</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileWarning className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">{expiringContractsCount}</span>
            <button
              onClick={() => setAdminTab('admin-contracts')}
              className="text-xs text-amber-700 font-semibold hover:underline flex items-center space-x-1 cursor-pointer"
            >
              <span>{t('adminDashboard.viewAll')}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <p className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
            {t('adminDashboard.expiringContractsHelp')}
          </p>
        </div>

        {/* Pending Leave Requests */}
        <div className="relative bg-white pl-6 p-5 rounded-2xl border border-slate-200 shadow-soft-xs hover:shadow-soft-md transition-all">
          <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-sage-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('adminDashboard.pendingLeaves')}</span>
            <div className="w-10 h-10 rounded-xl bg-sage-50 text-sage-700 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">{pendingLeaves.length}</span>
            <button
              onClick={() => setAdminTab('admin-leaves')}
              className="text-xs text-sage-700 font-semibold hover:underline flex items-center space-x-1 cursor-pointer"
            >
              <span>{t('adminDashboard.approve')}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <p className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
            {pendingLeaves.length > 0
              ? t('adminDashboard.recentlySubmittedLeave', { name: pendingLeaves[0].employees?.full_name || '' })
              : t('adminDashboard.noPendingLeaves')}
          </p>
        </div>

        {/* Missing Documents Alert - full-width spotlight strip */}
        <div className="sm:col-span-2 lg:col-span-4 bg-rose-50 border border-rose-200 rounded-2xl p-5 shadow-soft-xs hover:shadow-soft-md transition-all flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-soft-xs">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-rose-700">{missingDocsCount}</span>
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">{t('adminDashboard.missingDocs')}</span>
            </div>
            <p className="text-xs text-rose-700 mt-0.5">{t('adminDashboard.missingDocsHelp')}</p>
          </div>
          <button
            onClick={() => setAdminTab('admin-reminders')}
            className="shrink-0 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>{t('common.viewDetails')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Compact quick list; operational reminders live in their dedicated screen. */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-soft-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900 text-sm">{t('adminDashboard.featuredEmployees')}</h3>
            <button
              onClick={() => setAdminTab('admin-employees')}
              className="text-xs text-primary-600 font-semibold hover:underline"
            >
              {t('adminDashboard.allEmployees', { count: employees.length })}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
            {employees.slice(0, 8).map(emp => (
              <div
                key={emp.id}
                onClick={() => {
                  setSelectedEmployeeIdForAdmin(emp.id);
                  setAdminTab('admin-employees');
                }}
                className="py-2.5 flex items-center justify-between hover:bg-slate-50 rounded-lg px-2 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <RowAvatar path={emp.avatar_url} alt={emp.full_name} />
                  <div>
                    <p className="text-xs font-bold text-slate-900">{emp.full_name}</p>
                    <p className="text-[11px] text-slate-500">{emp.job_title}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                  emp.status === 'Chính thức'
                    ? 'bg-success-100 text-success-700'
                    : emp.status === 'Thử việc'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-primary-100 text-primary-700'
                }`}>
                  {translateValue(emp.status || 'Chính thức')}
                </span>
              </div>
            ))}
          </div>
      </div>
    </div>
  );
};
