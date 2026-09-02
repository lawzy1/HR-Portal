import React, { useMemo } from 'react';
import { useHR } from '../context/HRContext';
import { useMoneyVisibility } from '../context/MoneyVisibilityContext';
import { useAuth } from '../context/AuthContext';
import { useEmployee } from '../hooks/useEmployees';
import { useSignedImageUrl } from '../hooks/useFileUpload';
import { useContracts } from '../hooks/useContracts';
import { useLeaveBalance, useLeaveRequests } from '../hooks/useLeave';
import { useKpiMonthly } from '../hooks/useKpi';
import { useLatestPayrollRecord } from '../hooks/usePayroll';
import { formatDate } from '../utils/formatters';
import { employeeNeedsContract } from '../utils/contracts';
import {
  CreditCard,
  CalendarDays,
  Award,
  Receipt,
  PlusCircle,
  ChevronRight,
  ShieldCheck,
  FileCheck,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { useI18n } from '../context/I18nContext';

export const DashboardView: React.FC = () => {
  const {
    setActiveTab,
    setIsNewLeaveModalOpen,
    setSelectedPayslipId,
    setIsEditProfileModalOpen
  } = useHR();
  const { formatMoney } = useMoneyVisibility();
  const { profile } = useAuth();
  const { t, value: translateValue } = useI18n();
  const employeeId = profile?.employeeId ?? undefined;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const { data: employee } = useEmployee(employeeId);
  const { data: avatarUrl } = useSignedImageUrl(employee?.avatar_url);
  const { data: contracts } = useContracts(employeeId);
  const { data: leaveBalance } = useLeaveBalance(employeeId, currentYear);
  const { data: leaveRequestsData } = useLeaveRequests(employeeId);
  const leaveRequests = useMemo(() => leaveRequestsData || [], [leaveRequestsData]);
  const { data: latestKpi } = useKpiMonthly(employeeId, currentMonth, currentYear);
  const { data: latestPayslip } = useLatestPayrollRecord(employeeId);

  const currentContract = (contracts || [])[0];
  const hasPublishedContract = (contracts || []).some((c) => c.publish_status === 'published');
  const isAwaitingContract = !hasPublishedContract && !!employee && employeeNeedsContract(employee, contracts || []);

  if (!employee) {
    return <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-sm text-slate-500">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-6">

      {/* Welcome Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-success-500/10 backdrop-blur-3xl rounded-l-full pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={employee.full_name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-4 ring-success-500/40 shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-700 ring-4 ring-success-500/40 shadow-lg" />
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">{employee.full_name}</h1>
                <span className="px-2.5 py-0.5 text-xs font-bold bg-success-500/20 text-success-300 rounded-lg border border-success-500/30">
                  {employee.employee_code}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
                {employee.job_title} • <span className="text-success-400 font-bold">{employee.department}</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                <span>{t('dashboard.startDate')}: {employee.start_date ? formatDate(employee.start_date) : '—'}</span>
                <span>•</span>
                <span>{t('dashboard.contractShort')}: {translateValue(employee.contract_type || '—')}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setIsEditProfileModalOpen(true)}
              className="px-4 py-2 text-xs font-bold text-slate-200 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all cursor-pointer"
            >
              {t('dashboard.updateProfile')}
            </button>
            <button
              onClick={() => setIsNewLeaveModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-success-600 hover:bg-success-700 rounded-xl transition-all shadow-md shadow-success-900/20 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('header.leaveRequest')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Core Metrics: bento-style row - one featured card + two compact ones, then a KPI spotlight strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Card 1: Salary (featured, spans 2 cols) */}
        <div
          onClick={() => setActiveTab('contracts')}
          className="relative sm:col-span-2 bg-white pl-6 p-5 rounded-2xl border border-slate-200 shadow-soft-xs hover:shadow-soft-md transition-all cursor-pointer group"
        >
          <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-success-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">{t('contract.currentSalary')}</span>
            <div className="p-2 bg-success-50 text-success-600 rounded-xl group-hover:bg-success-600 group-hover:text-white transition-colors">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
            {formatMoney(employee.current_salary || 0)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1.5 flex items-center justify-between">
            <span>{t('dashboard.latestReview')}: {employee.last_salary_review_date ? formatDate(employee.last_salary_review_date) : t('common.none')}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </div>

        {/* Card 2: Remaining Leave */}
        <div
          onClick={() => setActiveTab('leaves')}
          className="relative bg-white pl-6 p-5 rounded-2xl border border-slate-200 shadow-soft-xs hover:shadow-soft-md transition-all cursor-pointer group"
        >
          <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-sage-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">{t('dashboard.remainingLeave')}</span>
            <div className="p-2 bg-sage-50 text-sage-700 rounded-xl group-hover:bg-sage-600 group-hover:text-white transition-colors">
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{leaveBalance?.remaining_days ?? 0}</span>
            <span className="text-xs font-semibold text-slate-500">/ {t('common.days', { count: leaveBalance?.total_accumulated ?? 0 })}</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1.5 flex items-center justify-between">
            <span>{t('dashboard.accrual')}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </div>

        {/* Card 3: Contract expiry */}
        <div
          onClick={() => setActiveTab('contracts')}
          className="relative bg-white pl-6 p-5 rounded-2xl border border-slate-200 shadow-soft-xs hover:shadow-soft-md transition-all cursor-pointer group"
        >
          <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-amber-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">{t('dashboard.contractExpiry')}</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-sm font-extrabold text-slate-900 truncate">
            {isAwaitingContract
              ? t('dashboard.awaitingContract')
              : currentContract ? (currentContract.end_date ? formatDate(currentContract.end_date) : t('contract.noExpiry')) : t('dashboard.noContract')}
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-1.5 flex items-center justify-between">
            <span>{!isAwaitingContract && currentContract ? `${t('dashboard.contractType')}: ${translateValue(currentContract.type)}` : ''}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </div>

        {/* KPI spotlight strip - full width, ring visual instead of a flat bar */}
        <div
          onClick={() => setActiveTab('kpi')}
          className="sm:col-span-2 lg:col-span-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white p-5 sm:p-6 rounded-2xl shadow-soft-md hover:shadow-soft-lg transition-all cursor-pointer group flex items-center gap-5"
        >
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full grid place-items-center shrink-0">
            <div
              className="absolute inset-0 rounded-full"
              style={{ background: `conic-gradient(white ${Math.min(100, latestKpi?.completion_percentage || 0)}%, rgb(255 255 255 / 0.25) 0)` }}
            />
            <div className="absolute inset-[5px] bg-primary-700 rounded-full" />
            <span className="relative text-sm sm:text-base font-black">{latestKpi?.completion_percentage ?? 0}%</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-primary-100">
              <Award className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wide">{t('dashboard.kpiMonth', { month: currentMonth })}</span>
            </div>
            {latestKpi ? (
              <>
                <p className="text-sm sm:text-base font-bold mt-1">
                  {t('dashboard.convertedViews', { current: latestKpi.kpi_converted_views ?? 0, target: latestKpi.kpi_target ?? 0 })}
                </p>
                <p className="text-[11px] text-primary-100 mt-1">{t('dashboard.otAndBonus', { hours: latestKpi.ot_hours ?? 0, amount: formatMoney((latestKpi.bonus_amount || 0) + (latestKpi.benefit_amount || 0)) })}</p>
              </>
            ) : (
              <p className="text-sm sm:text-base font-bold mt-1">{t('dashboard.noKpi')}</p>
            )}
          </div>

          <ChevronRight className="w-5 h-5 text-primary-100 group-hover:translate-x-1 transition-transform shrink-0 hidden sm:block" />
        </div>

      </div>

      {/* Row 2: Latest Payslip Summary & Monthly KPI / OT Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Latest Payslip Summary Card (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-soft-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-success-100 text-success-800 rounded-xl">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{t('dashboard.latestPayslip')}</h3>
                <p className="text-xs text-slate-500">
                  {latestPayslip ? `${t('common.month', { month: latestPayslip.month })}/${latestPayslip.year}` : t('common.noData')}
                </p>
              </div>
            </div>

            {latestPayslip && (
              <button
                onClick={() => setSelectedPayslipId(latestPayslip.id)}
                className="flex items-center gap-1 text-xs font-bold text-success-700 hover:text-success-800 bg-success-50 hover:bg-success-100 px-3 py-1.5 rounded-xl border border-success-200/60 transition-colors cursor-pointer"
              >
                <span>{t('contract.payslipDetail')}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {latestPayslip ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">{t('contract.gross')}</span>
                  <strong className="text-slate-900 font-mono text-xs">{formatMoney(latestPayslip.gross_income)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">{t('dashboard.insurance')}</span>
                  <strong className="text-rose-700 font-mono text-xs">
                    -{formatMoney(latestPayslip.bhxh_deduction + latestPayslip.bhyt_deduction + latestPayslip.bhtn_deduction)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">{t('payroll.pit')}</span>
                  <strong className="text-rose-700 font-mono text-xs">-{formatMoney(latestPayslip.personal_income_tax)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">{t('common.status')}</span>
                  <span className="font-bold text-success-700 inline-flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {translateValue(latestPayslip.payment_status)}
                  </span>
                </div>
              </div>

              {/* Net highlight */}
              <div className="bg-success-900 text-white p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-success-300 uppercase tracking-wider">{t('dashboard.netTransfer')}</p>
                  <p className="text-xl sm:text-2xl font-black font-mono mt-0.5">{formatMoney(latestPayslip.net_salary)}</p>
                </div>
                <div className="text-right">
                  {latestPayslip.payment_date && (
                    <p className="text-[10px] text-success-300 mt-1">{t('dashboard.paymentDate')}: {formatDate(latestPayslip.payment_date)}</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic py-4">{t('dashboard.noPayslip')}</p>
          )}
        </div>

        {/* Monthly KPI, OT, Bonus Quick Summary (1 col) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">{t('dashboard.kpiThisMonth')}</h3>
              <button
                onClick={() => setActiveTab('kpi')}
                className="text-xs text-success-700 hover:underline font-semibold cursor-pointer"
              >
                {t('common.viewDetails')}
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-600">{t('dashboard.renderedViews')}:</span>
                <span className="font-bold text-slate-900">{latestKpi?.rendered_views_actual ?? 0} view</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-600">{t('dashboard.kpiViews')}:</span>
                <span className="font-bold text-success-700">{latestKpi?.kpi_converted_views ?? 0} view</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-600">{t('dashboard.otHours')}:</span>
                <span className="font-bold text-amber-700">{t('common.hours', { count: latestKpi?.ot_hours ?? 0 })}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-600">{t('dashboard.bonusAllowance')}:</span>
                <span className="font-bold text-success-700 font-mono">+{formatMoney((latestKpi?.bonus_amount || 0) + (latestKpi?.benefit_amount || 0))}</span>
              </div>
            </div>
          </div>

          {latestKpi && (
            <div className="bg-success-50 p-3 rounded-xl border border-success-200 text-[11px] text-success-900 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-success-600 flex-shrink-0 mt-0.5" />
              <p className="leading-snug">
                {t('dashboard.kpiProgress', { percent: latestKpi.completion_percentage ?? 0 })}
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Row 3: Recent Leave Requests */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{t('dashboard.recentLeave')}</h3>
            <p className="text-xs text-slate-500">{t('dashboard.recentLeaveHelp')}</p>
          </div>
          <button
            onClick={() => setActiveTab('leaves')}
            className="text-xs font-bold text-success-700 hover:underline cursor-pointer"
          >
            {t('dashboard.manageLeave')}
          </button>
        </div>

        {leaveRequests.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4">{t('dashboard.noLeave')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-lg">{t('dashboard.leaveType')}</th>
                  <th className="py-2.5 px-3">{t('dashboard.period')}</th>
                  <th className="py-2.5 px-3">{t('dashboard.dayCount')}</th>
                  <th className="py-2.5 px-3">{t('dashboard.reason')}</th>
                  <th className="py-2.5 px-3 rounded-r-lg">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaveRequests.slice(0, 4).map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{translateValue(req.leave_type)}</td>
                    <td className="py-3 px-3 text-slate-600">
                      {formatDate(req.start_date)} - {formatDate(req.end_date)} ({req.half_day_option})
                    </td>
                    <td className="py-3 px-3 font-semibold text-success-800">{t('common.days', { count: req.total_days })}</td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate">{req.reason}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border ${
                        req.status === 'Đã duyệt' ? 'bg-success-50 text-success-700 border-success-200' :
                        req.status === 'Chờ duyệt' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {translateValue(req.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
