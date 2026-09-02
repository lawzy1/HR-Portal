import React, { useState } from 'react';
import { useHR } from '../context/HRContext';
import { useAuth } from '../context/AuthContext';
import { useLeaveRequests, useLeaveBalance, useWorkEvents } from '../hooks/useLeave';
import { formatDate } from '../utils/formatters';
import { CalendarDays, PlusCircle, Sparkles } from 'lucide-react';
import { useI18n } from '../context/I18nContext';

export const LeaveManagementView: React.FC = () => {
  const { setIsNewLeaveModalOpen } = useHR();
  const { profile } = useAuth();
  const { t, value: translateValue } = useI18n();
  const employeeId = profile?.employeeId ?? undefined;

  const [filterStatus, setFilterStatus] = useState<string>('Tất cả');
  const year = new Date().getFullYear();

  const { data: leaveRequests } = useLeaveRequests(employeeId);
  const { data: leaveBalance } = useLeaveBalance(employeeId, year);
  const { data: workEvents } = useWorkEvents(employeeId);

  const filteredRequests = (leaveRequests || []).filter((req) => filterStatus === 'Tất cả' || req.status === filterStatus);

  return (
    <div className="space-y-6">

      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-success-600" />
            <h1 className="text-lg font-extrabold text-slate-900">{t('leave.title')}</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t('leave.description')}
          </p>
        </div>

        <button
          onClick={() => setIsNewLeaveModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-success-600 hover:bg-success-700 rounded-xl transition-all shadow-md shadow-success-900/10 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t('leave.new')}</span>
        </button>
      </div>

      {/* Quota policy banner */}
      <div className="bg-gradient-to-r from-success-900 via-teal-900 to-slate-900 text-white p-4 rounded-2xl border border-success-800/80 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-success-500/20 text-success-300 rounded-xl border border-success-400/30">
            <Sparkles className="w-5 h-5 text-success-300" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase text-success-300 tracking-wider">{t('leave.fundYear', { year })}</h3>
            <p className="text-xs text-slate-100 font-medium mt-0.5">
              {t('leave.policy')}
            </p>
          </div>
        </div>
        {leaveBalance?.expiry_date && (
          <span className="text-[11px] bg-success-950/80 text-success-300 font-mono font-bold px-3 py-1 rounded-lg border border-success-700">
            {t('leave.expiry')}: {formatDate(leaveBalance.expiry_date)}
          </span>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
        <div>
          <h2 className="font-bold text-slate-900 text-sm">{t('leave.workEvents')}</h2>
          <p className="text-xs text-slate-500">{t('leave.workEventsHelp')}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-2.5">{t('leave.date')}</th>
                <th className="p-2.5">{t('leave.type')}</th>
                <th className="p-2.5">{t('leave.duration')}</th>
                <th className="p-2.5">{t('dashboard.reason')}</th>
                <th className="p-2.5">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(workEvents || []).length === 0 ? (
                <tr><td colSpan={5} className="p-5 text-center text-slate-400">{t('leave.noWorkEvents')}</td></tr>
              ) : (workEvents || []).map((event) => (
                <tr key={event.id}>
                  <td className="p-2.5 font-medium">{formatDate(event.event_date)}</td>
                  <td className="p-2.5">{translateValue(event.event_type === 'extra_wfh' ? 'WFH thêm' : 'Đi trễ')}</td>
                  <td className="p-2.5">{event.minutes ? t('leave.minutes', { count: event.minutes }) : '—'}</td>
                  <td className="p-2.5">{event.reason}</td>
                  <td className="p-2.5 font-semibold">{translateValue(event.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 block">{t('leave.total')}</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">{leaveBalance?.total_accumulated ?? 0}</span>
            <span className="text-xs font-semibold text-slate-500">{t('common.days', { count: '' }).trim()}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 block">{t('leave.used')}</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-700">{leaveBalance?.used_days ?? 0}</span>
            <span className="text-xs font-semibold text-slate-500">{t('common.days', { count: '' }).trim()}</span>
          </div>
          <span className="text-[10px] text-success-700 font-semibold block">{t('leave.approved')}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-amber-700 block">{t('payroll.pending')}</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-amber-700">{leaveBalance?.pending_days ?? 0}</span>
            <span className="text-xs font-semibold text-slate-500">{t('common.days', { count: '' }).trim()}</span>
          </div>
        </div>

        <div className="bg-success-50 p-4 rounded-2xl border border-success-300 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-success-900 block">{t('leave.remaining')}</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-success-700">{leaveBalance?.remaining_days ?? 0}</span>
            <span className="text-xs font-semibold text-success-800">{t('common.days', { count: '' }).trim()}</span>
          </div>
          <span className="text-[10px] text-success-800 font-bold block">{t('leave.available')}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 block">{t('leave.expiryDate')}</span>
          <div className="text-xs font-extrabold text-slate-800 pt-1">{leaveBalance?.expiry_date ? formatDate(leaveBalance.expiry_date) : '—'}</div>
        </div>
      </div>

      {/* Leave Requests List */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{t('leave.history')}</h3>
            <p className="text-xs text-slate-500">{t('leave.historyHelp')}</p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 p-1 border border-slate-200 rounded-xl">
            {['Tất cả', 'Chờ duyệt', 'Đã duyệt', 'Từ chối'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  filterStatus === st ? 'bg-success-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {translateValue(st)}
              </button>
            ))}
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-600">{t('leave.noFiltered', { filter: translateValue(filterStatus) })}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-3.5 rounded-l-lg">{t('dashboard.leaveType')}</th>
                  <th className="py-3 px-3.5">{t('leave.period')}</th>
                  <th className="py-3 px-3.5">{t('dashboard.dayCount')}</th>
                  <th className="py-3 px-3.5">{t('leave.reason')}</th>
                  <th className="py-3 px-3.5 rounded-r-lg">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3.5 font-bold text-slate-900">{translateValue(req.leave_type)}</td>
                    <td className="py-3.5 px-3.5 text-slate-700">
                      <div>
                        <strong>{formatDate(req.start_date)} - {formatDate(req.end_date)}</strong>
                        <span className="text-[11px] text-slate-500 block">({translateValue(req.half_day_option)})</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3.5 font-extrabold text-success-800">{t('common.days', { count: req.total_days })}</td>
                    <td className="py-3.5 px-3.5 text-slate-600 max-w-xs">
                      <p className="truncate">{req.reason}</p>
                      {req.approver_comment && <p className="text-[10px] text-slate-500 italic mt-0.5">Note: "{req.approver_comment}"</p>}
                    </td>
                    <td className="py-3.5 px-3.5">
                      <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border inline-block ${
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
