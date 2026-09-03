import React, { useState } from 'react';
import { useHR } from '../context/HRContext';
import { MoneyVisibilityToggle, useMoneyVisibility } from '../context/MoneyVisibilityContext';
import { useAuth } from '../context/AuthContext';
import { useEmployees, useEmployee } from '../hooks/useEmployees';
import { useContracts, useSalaryHistory, useContractLegalWarnings } from '../hooks/useContracts';
import { usePayrollRecords } from '../hooks/usePayroll';
import { formatDate } from '../utils/formatters';
import { ContractDocumentLink } from './ContractDocumentLink';
import { useI18n } from '../context/I18nContext';
import { getApproverDisplayName } from '../utils/approver';
import { getContractCustomFields } from '../utils/contracts';
import {
  FileCheck,
  TrendingUp,
  Receipt,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';

export const ContractSalaryView: React.FC = () => {
  const { setSelectedPayslipId, setActiveTab } = useHR();
  const { formatMoney } = useMoneyVisibility();
  const { profile } = useAuth();
  const { t, value: translateValue } = useI18n();
  const employeeId = profile?.employeeId ?? undefined;

  const { data: employee } = useEmployee(employeeId);
  const { data: allEmployees } = useEmployees();
  const { data: contracts } = useContracts(employeeId);
  const { data: salaryHistory } = useSalaryHistory(employeeId);
  const { data: legalWarnings } = useContractLegalWarnings(employeeId);
  const { data: payslips } = usePayrollRecords(employeeId, 2026);

  const [activeSubTab, setActiveSubTab] = useState<'contracts' | 'salaryHistory' | 'payslips'>('contracts');

  if (!employee) {
    return <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-sm text-slate-500">{t('common.loading')}</div>;
  }

  const currentContract = (contracts || []).find((c) => ['Đang hiệu lực', 'Sắp hết hạn'].includes(c.status)) || (contracts || [])[0];

  return (
    <div className="space-y-6">

      {(legalWarnings || []).length > 0 && (
        <div className="space-y-2">
          {legalWarnings!.map((w, i) => (
            <div
              key={i}
              className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-xs font-semibold ${
                w.severity === 'high' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* 1. Overview Banner Section */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-slate-800">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-2">{employee.full_name}</h1>
            <p className="text-xs text-slate-300 font-medium">{t('contract.jobTitle')}: <strong className="text-success-300">{employee.job_title}</strong> • {employee.department}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-success-500/20 text-success-300 border border-success-500/40 text-xs font-bold rounded-xl flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-success-400" />
              <span>{employee.contract_type ? translateValue(employee.contract_type) : t('common.notUpdated')}</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 font-medium block">{t('contract.currentContract')}</span>
            <p className="text-sm font-extrabold text-success-300 mt-1">
              {currentContract ? `${formatDate(currentContract.start_date)} – ${currentContract.end_date ? formatDate(currentContract.end_date) : t('contract.noExpiry')}` : t('common.none')}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">{t('contract.type')}: {translateValue(currentContract?.type || employee.contract_type || '—')}</p>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 font-medium block">{t('contract.startDate')}</span>
            <p className="text-sm font-extrabold text-amber-300 mt-1">{employee.start_date ? formatDate(employee.start_date) : '—'}</p>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 font-medium block">{t('contract.currentSalary')}</span>
            <p className="mt-1 inline-flex items-center gap-1 text-lg font-black font-mono text-success-400">{formatMoney(employee.current_salary || 0)}<MoneyVisibilityToggle className="h-6 w-6" /></p>
            <p className="text-[10px] text-slate-400 mt-1">{t('contract.grossSalary')}</p>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 font-medium block">{t('contract.lastReview')}</span>
            <p className="text-sm font-extrabold text-teal-300 mt-1">{employee.last_salary_review_date ? formatDate(employee.last_salary_review_date) : '—'}</p>
          </div>
        </div>
      </div>

      {/* 2. Sub-tabs Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-2 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('contracts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'contracts' ? 'bg-success-600 text-white shadow-md shadow-success-900/20' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>{t('contract.history', { count: (contracts || []).length })}</span>
        </button>
        <button
          onClick={() => setActiveSubTab('salaryHistory')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'salaryHistory' ? 'bg-success-600 text-white shadow-md shadow-success-900/20' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>{t('contract.salaryHistory', { count: (salaryHistory || []).length })}</span>
        </button>
        <button
          onClick={() => setActiveSubTab('payslips')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'payslips' ? 'bg-success-600 text-white shadow-md shadow-success-900/20' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>{t('contract.payslipHistory', { count: (payslips || []).length })}</span>
        </button>
      </div>

      {/* Sub-tab 1: Contract History */}
      {activeSubTab === 'contracts' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-success-600" />
              <span>{t('contract.title')}</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">{t('contract.updatedByHr')}</span>
          </div>

          {!contracts || contracts.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">{t('contract.empty')}</p>
          ) : (
            <div className="space-y-3">
              {contracts.map((ctr) => {
                const isCurrent = ctr.id === currentContract?.id;
                const parentContract = ctr.parent_contract_id ? contracts.find((item) => item.id === ctr.parent_contract_id) : null;
                const money = (value: number | null) => value ? formatMoney(value) : '—';

                return (
                  <details key={ctr.id} open={isCurrent} className="group rounded-2xl border border-slate-200 bg-white overflow-hidden">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-4 sm:p-5 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {ctr.parent_contract_id && <span className="rounded-md bg-primary-100 px-2 py-0.5 text-[10px] font-bold text-primary-700">{t('contract.addendum')}</span>}
                          {isCurrent && <span className="rounded-md bg-success-100 px-2 py-0.5 text-[10px] font-bold text-success-700">{t('common.current')}</span>}
                          <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                            ctr.status === 'Đang hiệu lực' ? 'border-success-200 bg-success-50 text-success-700' :
                            ctr.status === 'Sắp hết hạn' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                            'border-slate-200 bg-slate-100 text-slate-600'
                          }`}>{translateValue(ctr.status)}</span>
                        </div>
                        <p className="truncate font-mono text-sm font-black text-slate-900">{ctr.contract_code}</p>
                        <p className="text-xs font-semibold text-slate-700">{translateValue(ctr.type)}</p>
                        <p className="text-xs text-slate-500">{t('contract.effective', { from: formatDate(ctr.start_date), to: ctr.end_date ? formatDate(ctr.end_date) : t('contract.noExpiry') })}</p>
                      </div>
                      <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
                    </summary>

                    <div className="space-y-5 border-t border-slate-100 bg-slate-50/50 p-4 sm:p-5">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                          [t('contract.signedDate'), ctr.signed_date ? formatDate(ctr.signed_date) : '—'],
                          [t('contract.start'), formatDate(ctr.start_date)],
                          [t('contract.end'), ctr.end_date ? formatDate(ctr.end_date) : t('contract.noExpiry')],
                          [t('contract.position'), ctr.position || '—'],
                          [t('contract.level'), ctr.level_title || '—'],
                          [t('contract.kpiDay'), ctr.kpi_target_month != null ? `${ctr.kpi_target_month} view/day` : '—'],
                          [t('contract.workLocation'), ctr.work_location || '—'],
                          [t('contract.schedule'), ctr.working_schedule || '—'],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-xl border border-slate-200 bg-white p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                            <p className="mt-1 text-xs font-bold leading-5 text-slate-800">{value}</p>
                          </div>
                        ))}
                      </div>

                      <div>
                        <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-500">{t('contract.income')}</p>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                          {[
                            [t('contract.salary'), money(ctr.salary)],
                            [t('contract.allowance'), money(ctr.allowance_amount)],
                            [t('contract.phoneAllowance'), money(ctr.phone_allowance)],
                            [t('contract.lunchAllowance'), money(ctr.lunch_allowance)],
                            [t('contract.guaranteedIncome'), money(ctr.guaranteed_income)],
                            ['Commission/KPI view', ctr.commission_rate_per_view ? `${formatMoney(ctr.commission_rate_per_view)}/view` : '—'],
                            ['QC commission/view', ctr.qc_commission_rate_per_view ? `${formatMoney(ctr.qc_commission_rate_per_view)}/view` : '—'],
                          ].map(([label, value]) => (
                            <div key={label} className="rounded-xl border border-success-100 bg-success-50/60 p-3">
                              <p className="text-[10px] font-bold text-slate-500">{label}</p>
                              <p className="mt-1 break-words font-mono text-xs font-black text-success-800">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {parentContract && <p className="text-xs text-slate-600">{t('contract.parent')} <strong>{parentContract.contract_code}</strong></p>}
                      {ctr.adjustment_categories.length > 0 && <p className="text-xs text-slate-600">{t('contract.adjustments')} <strong>{ctr.adjustment_categories.join(', ')}</strong></p>}
                      {Object.keys(getContractCustomFields(ctr.custom_fields)).length > 0 && (
                        <div className="rounded-xl border border-primary-100 bg-primary-50/50 p-3">
                          <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-primary-700">Thông tin bổ sung</p>
                          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {Object.entries(getContractCustomFields(ctr.custom_fields)).map(([name, value]) => (
                              <div key={name}>
                                <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{name}</dt>
                                <dd className="mt-1 break-words text-xs font-semibold text-slate-700">{value || '—'}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      )}
                      {ctr.note && <p className="rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600"><strong>{t('common.notes')}:</strong> {ctr.note}</p>}
                      <ContractDocumentLink path={ctr.document_path} name={ctr.document_name} />
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sub-tab 2: Salary Adjustment History */}
      {activeSubTab === 'salaryHistory' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-success-600" />
              <span>{t('contract.salaryChangeTitle')}</span>
            </h3>
          </div>

          {!salaryHistory || salaryHistory.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">{t('contract.noSalaryChange')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-3 rounded-l-lg">{t('contract.effectiveDate')}</th>
                    <th className="py-3 px-3">{t('contract.oldSalary')}</th>
                    <th className="py-3 px-3">{t('contract.newSalary')}</th>
                    <th className="py-3 px-3">{t('contract.increase')}</th>
                    <th className="py-3 px-3">{t('contract.adjustmentType')}</th>
                    <th className="py-3 px-3">{t('contract.reason')}</th>
                    <th className="py-3 px-3 rounded-r-lg">{t('contract.approver')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salaryHistory.map((sal) => {
                    const diff = sal.new_salary - (sal.old_salary || 0);
                    return (
                      <tr key={sal.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-3 font-bold text-slate-900">{formatDate(sal.effective_date)}</td>
                        <td className="py-3.5 px-3 font-mono text-slate-500">{sal.old_salary ? formatMoney(sal.old_salary) : t('contract.initial')}</td>
                        <td className="py-3.5 px-3 font-mono font-bold text-success-800">{formatMoney(sal.new_salary)}</td>
                        <td className="py-3.5 px-3 font-mono font-bold text-success-600">{diff > 0 && '+'}{formatMoney(diff)}</td>
                        <td className="py-3.5 px-3 font-semibold text-slate-800">{sal.change_type}</td>
                        <td className="py-3.5 px-3 text-slate-600 max-w-xs">{sal.reason}</td>
                        <td className="py-3.5 px-3 text-slate-500 font-medium">{getApproverDisplayName(sal.approved_by, allEmployees)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sub-tab 3: Payslips History (current year — full history lives on the dedicated Payslips page) */}
      {activeSubTab === 'payslips' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-success-600" />
              <span>{t('contract.payslipList', { year: 2026 })}</span>
            </h3>
            <button onClick={() => setActiveTab('payslips')} className="text-xs font-bold text-success-700 hover:underline cursor-pointer">
              {t('contract.fullPayslipPage')}
            </button>
          </div>

          {!payslips || payslips.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">{t('contract.noPayslips', { year: 2026 })}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {payslips.map((ps) => (
                <div key={ps.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 hover:border-success-300 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-success-800 bg-success-100 px-2.5 py-1 rounded-lg border border-success-200">
                      {t('common.month', { month: ps.month })}/{ps.year}
                    </span>
                    <span className="text-[11px] text-success-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {translateValue(ps.payment_status)}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">{t('contract.gross')}:</span>
                      <span className="font-mono text-slate-800 font-medium">{formatMoney(ps.gross_income)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{t('contract.deductions')}:</span>
                      <span className="font-mono text-rose-700">-{formatMoney(ps.bhxh_deduction + ps.bhyt_deduction + ps.bhtn_deduction + ps.personal_income_tax)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200 font-bold">
                      <span className="text-slate-900">{t('contract.net')}:</span>
                      <span className="font-mono text-success-700 text-sm">{formatMoney(ps.net_salary)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPayslipId(ps.id)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-success-800 bg-white hover:bg-success-50 rounded-xl border border-success-200 transition-colors cursor-pointer"
                  >
                    <span>{t('contract.payslipDetail')}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
