import React, { useState } from 'react';
import { Eye, X } from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { useI18n } from '../../context/I18nContext';
import { PayslipsView } from '../PayslipsView';
import { ContractSalaryView } from '../ContractSalaryView';
import { SearchableSelect } from '../ui/SearchableSelect';

export const ViewAsUserModal: React.FC = () => {
  const { employees, viewAsEmployeeId, setViewAsEmployeeId } = useHR();
  const { t } = useI18n();
  const [tab, setTab] = useState<'payslips' | 'contract'>('payslips');

  if (viewAsEmployeeId === null) return null;

  const activeEmployees = employees.filter((e) => e.status !== 'offboarded');
  const viewedEmployee = employees.find((e) => e.id === viewAsEmployeeId);

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col">
        <div className="mb-4 flex flex-col gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-amber-900">
            <Eye className="h-4 w-4 shrink-0" />
            <span className="text-xs font-bold">{t('viewAsUser.banner')}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SearchableSelect
              value={viewAsEmployeeId}
              onChange={setViewAsEmployeeId}
              options={activeEmployees.map((emp) => ({ value: emp.id, label: `${emp.full_name} (${emp.employee_code})` }))}
              className="w-64"
            />
            <div className="flex rounded-xl border border-amber-300 bg-white p-1">
              <button
                onClick={() => setTab('payslips')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${tab === 'payslips' ? 'bg-amber-100 text-amber-900' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {t('nav.payslips')}
              </button>
              <button
                onClick={() => setTab('contract')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${tab === 'contract' ? 'bg-amber-100 text-amber-900' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {t('nav.contracts')}
              </button>
            </div>
            <button
              onClick={() => setViewAsEmployeeId(null)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
            >
              <X className="h-4 w-4" /> {t('viewAsUser.exit')}
            </button>
          </div>
        </div>

        <div className="flex-1 rounded-2xl bg-slate-100/70 p-4 sm:p-6">
          {viewedEmployee ? (
            tab === 'payslips'
              ? <PayslipsView employeeIdOverride={viewAsEmployeeId} />
              : <ContractSalaryView employeeIdOverride={viewAsEmployeeId} />
          ) : (
            <p className="text-xs text-slate-500">Không tìm thấy nhân viên.</p>
          )}
        </div>
      </div>
    </div>
  );
};
