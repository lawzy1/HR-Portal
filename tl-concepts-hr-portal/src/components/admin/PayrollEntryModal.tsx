import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, Link2, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { useMoneyVisibility } from '../../context/MoneyVisibilityContext';
import { getUserFacingError } from '../../lib/userFacingError';
import { useCompanySettings } from '../../hooks/useCompanySettings';
import { useContracts } from '../../hooks/useContracts';
import type { DbEmployee } from '../../hooks/useEmployees';
import { useCompanyWorkdayOverride, useKpiMonthly } from '../../hooks/useKpi';
import { useCompanyHolidays, useLeaveBalance, useLeaveRequests } from '../../hooks/useLeave';
import { useOtRecords } from '../../hooks/useOt';
import { useSyncPayrollCustomItem, useUpsertPayrollRecord, type DbPayrollRecord } from '../../hooks/usePayroll';
import type { TablesInsert } from '../../lib/database.types';
import { ConfirmationDialog } from '../ConfirmationDialog';
import { CurrencyInput } from '../CurrencyInput';
import { SearchableSelect } from '../ui/SearchableSelect';
import { getApprovedLeaveDaysInMonth, getMonthWorkDays } from '../../utils/workDays';
import {
  calcFamilyDeduction,
  calcTaxableIncome,
  customTotal,
  readCustomItems,
  type PayrollCustomItem,
  type PayrollCustomSection,
} from '../../utils/payroll';

type PayrollFormState = {
  employeeId: string;
  month: number;
  year: number;
  actualWorkDays: number;
  annualLeaveUsedDays: number;
  policyLeaveDays: number;
  paidWorkDays: number;
  annualLeaveRemainingDays: number;
  dependentsCount: number;
  baseSalary: number;
  workdaySalary: number;
  // Shown exactly as imported/saved; re-summed only when an income line is edited.
  grossIncome: number;
  lunchAllowance: number;
  phoneAllowance: number;
  kpiBonus: number;
  otHours: number;
  otPay: number;
  projectBonusAmount: number;
  holidayBonusAmount: number;
  // BHXH + BHYT + BHTN as one line, like the "Bảng lương" template.
  insuranceDeduction: number;
  personalIncomeTax: number;
  familyDeductionOverride: number | null;
  taxableIncomeOverride: number | null;
  advancePayment: number;
  otherDeductions: number;
  // "Hoàn chi phí" (formerly phúc lợi + công tác phí).
  expenseRefund: number;
  personalIncomeTaxRefund: number;
  priorMonthAdjustment: number;
  customItems: PayrollCustomItem[];
  paymentStatus: string;
  paymentDate: string;
  note: string;
};

type PayrollEntryModalProps = {
  open: boolean;
  companyId: string | undefined;
  employees: DbEmployee[];
  initialEmployeeId: string;
  initialMonth: number;
  initialYear: number;
  existingRecords: DbPayrollRecord[];
  onClose: () => void;
  onSaved: (month: number, year: number) => void;
};

const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20';
const numberClass = `${inputClass} font-mono`;

const createInitialForm = (employeeId: string, month: number, year: number): PayrollFormState => ({
  employeeId,
  month,
  year,
  actualWorkDays: 0,
  annualLeaveUsedDays: 0,
  policyLeaveDays: 0,
  paidWorkDays: 0,
  annualLeaveRemainingDays: 0,
  dependentsCount: 0,
  baseSalary: 0,
  workdaySalary: 0,
  grossIncome: 0,
  lunchAllowance: 0,
  phoneAllowance: 0,
  kpiBonus: 0,
  otHours: 0,
  otPay: 0,
  projectBonusAmount: 0,
  holidayBonusAmount: 0,
  insuranceDeduction: 0,
  personalIncomeTax: 0,
  familyDeductionOverride: null,
  taxableIncomeOverride: null,
  advancePayment: 0,
  otherDeductions: 0,
  expenseRefund: 0,
  personalIncomeTaxRefund: 0,
  priorMonthAdjustment: 0,
  customItems: [],
  paymentStatus: 'Chờ thanh toán',
  paymentDate: '',
  note: '',
});

const asMoney = (value: number | null | undefined) => Number.isFinite(value) ? Number(value) : 0;

const INCOME_FIELDS = new Set<keyof PayrollFormState>(['workdaySalary', 'lunchAllowance', 'phoneAllowance', 'kpiBonus', 'otPay', 'projectBonusAmount', 'holidayBonusAmount']);
const sumIncome = (form: PayrollFormState) => form.workdaySalary + form.lunchAllowance + form.phoneAllowance + form.kpiBonus + form.otPay
  + form.projectBonusAmount + form.holidayBonusAmount + customTotal(form.customItems, 'income');
const differs = (a: number, b: number) => Math.abs(a - b) > 1;

const MoneyField: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
}> = ({ label, value, onChange, hint }) => (
  <label className="block space-y-1">
    <span className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-700">
      <span>{label}</span>
      {hint && <span className="text-[10px] font-medium text-success-700">{hint}</span>}
    </span>
    <CurrencyInput
      value={value}
      onValueChange={(next) => onChange(Number(next || 0))}
      className={`${inputClass} font-mono`}
    />
  </label>
);

const NumberField: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  hint?: string;
  readOnly?: boolean;
}> = ({ label, value, onChange, step = 1, hint, readOnly }) => (
  <label className="block space-y-1">
    <span className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-700">
      <span>{label}</span>
      {hint && <span className="text-[10px] font-medium text-success-700">{hint}</span>}
    </span>
    <input
      type="number"
      min="0"
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value) || 0)}
      readOnly={readOnly}
      className={numberClass}
    />
  </label>
);

// A value with an automatic default that Accounting may overwrite.
const AutoMoneyField: React.FC<{
  label: string;
  autoValue: number;
  override: number | null;
  onChange: (value: number | null) => void;
  formula: string;
}> = ({ label, autoValue, override, onChange, formula }) => {
  const { formatMoney } = useMoneyVisibility();
  return (
    <div className="space-y-1">
      <MoneyField label={label} value={override ?? autoValue} onChange={onChange} hint={override === null ? 'Tự tính' : 'Đã chỉnh tay'} />
      <span className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
        <span>{formula} = {formatMoney(autoValue)}</span>
        {override !== null && (
          <button type="button" onClick={() => onChange(null)} className="shrink-0 font-semibold text-primary-700 hover:underline">Tính lại tự động</button>
        )}
      </span>
    </div>
  );
};

const CustomItemsEditor: React.FC<{
  section: PayrollCustomSection;
  items: PayrollCustomItem[];
  onChange: (items: PayrollCustomItem[]) => void;
  onSync: (item: PayrollCustomItem) => void;
  canSync: boolean;
}> = ({ section, items, onChange, onSync, canSync }) => {
  const sectionItems = items.filter((item) => item.section === section);
  const update = (id: string, patch: Partial<PayrollCustomItem>) => onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  return (
    <div className="space-y-2">
      {sectionItems.map((item) => (
        <div key={item.id} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-2 md:grid-cols-[2fr_1fr_auto]">
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-slate-600">Tên khoản (chỉ áp dụng tháng này)</span>
            <input value={item.label} onChange={(event) => update(item.id, { label: event.target.value })} placeholder="Ví dụ: Thưởng sinh nhật" className={inputClass} />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-slate-600">Số tiền</span>
            <CurrencyInput value={item.amount} onValueChange={(next) => update(item.id, { amount: Number(next || 0) })} className={numberClass} />
          </label>
          <div className="flex gap-1 pb-1">
            {canSync && (
              <button type="button" onClick={() => onSync(item)} disabled={!item.label.trim()} title="Thêm khoản này cho các nhân viên còn lại trong tháng" className="inline-flex items-center gap-1 rounded-lg bg-success-50 px-2 py-2 text-[11px] font-bold text-success-800 transition hover:bg-success-100 disabled:opacity-40">
                <RefreshCw className="h-3.5 w-3.5" /> Đồng bộ
              </button>
            )}
            <button type="button" onClick={() => onChange(items.filter((other) => other.id !== item.id))} title="Xóa khoản" aria-label="Xóa khoản" className="rounded-lg bg-rose-50 p-2 text-rose-700 transition hover:bg-rose-100">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { id: crypto.randomUUID(), section, label: '', amount: 0 }])} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50">
        <Plus className="h-3.5 w-3.5" /> Thêm khoản tùy chỉnh
      </button>
    </div>
  );
};

const SectionTitle: React.FC<{ tone: 'green' | 'rose' | 'orange'; title: string; description?: string }> = ({ tone, title, description }) => {
  const toneClass = tone === 'green'
    ? 'border-success-200 bg-success-50 text-success-900'
    : tone === 'rose'
      ? 'border-rose-200 bg-rose-50 text-rose-900'
      : 'border-primary-200 bg-primary-50 text-primary-900';
  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClass}`}>
      <h3 className="text-sm font-extrabold">{title}</h3>
      {description && <p className="mt-0.5 text-[11px] font-medium opacity-75">{description}</p>}
    </div>
  );
};

export const PayrollEntryModal: React.FC<PayrollEntryModalProps> = ({
  open,
  companyId,
  employees: employeeOptions,
  initialEmployeeId,
  initialMonth,
  initialYear,
  existingRecords,
  onClose,
  onSaved,
}) => {
  const { showToast } = useHR();
  const { formatMoney } = useMoneyVisibility();
  const employees = employeeOptions;
  const [form, setForm] = useState<PayrollFormState>(() => createInitialForm(initialEmployeeId, initialMonth, initialYear));
  const [prefillKey, setPrefillKey] = useState<string | null>(null);
  const [itemToSync, setItemToSync] = useState<PayrollCustomItem | null>(null);
  const upsertPayroll = useUpsertPayrollRecord();
  const syncCustomItem = useSyncPayrollCustomItem();

  const contractsQuery = useContracts(open && form.employeeId ? form.employeeId : undefined);
  const leaveRequestsQuery = useLeaveRequests(open && form.employeeId ? form.employeeId : undefined);
  const leaveBalanceQuery = useLeaveBalance(open && form.employeeId ? form.employeeId : undefined, form.year);
  const kpiMonthlyQuery = useKpiMonthly(open && form.employeeId ? form.employeeId : undefined, form.month, form.year);
  const otRecordsQuery = useOtRecords(open && form.employeeId ? form.employeeId : undefined);
  const holidaysQuery = useCompanyHolidays();
  const { data: companySettings, isFetched: companySettingsFetched } = useCompanySettings();
  const { data: workdayOverride } = useCompanyWorkdayOverride(form.month, form.year);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === form.employeeId),
    [employees, form.employeeId],
  );
  const existingRecord = useMemo(
    () => existingRecords.find((record) => record.employee_id === form.employeeId && record.month === form.month && record.year === form.year),
    [existingRecords, form.employeeId, form.month, form.year],
  );
  const holidayDates = useMemo(() => (holidaysQuery.data || []).map((holiday) => holiday.date), [holidaysQuery.data]);
  const workDaysInfo = useMemo(() => getMonthWorkDays(form.month, form.year, holidayDates), [form.month, form.year, holidayDates]);
  // Always the month's rule ("Quy chuẩn ngày công"), never a per-payslip value.
  const standardWorkDays = workdayOverride?.standard_work_days ?? workDaysInfo.standardWorkDays;
  const approvedLeaveDays = useMemo(
    () => getApprovedLeaveDaysInMonth(leaveRequestsQuery.data || [], form.month, form.year, holidayDates),
    [leaveRequestsQuery.data, form.month, form.year, holidayDates],
  );
  const linkedOt = useMemo(() => {
    const prefix = `${form.year}-${String(form.month).padStart(2, '0')}-`;
    return (otRecordsQuery.data || [])
      .filter((record) => record.status === 'Đã duyệt' && record.date.startsWith(prefix))
      .reduce((hours, record) => hours + asMoney(record.hours), 0);
  }, [otRecordsQuery.data, form.month, form.year]);

  const { grossIncome } = form;
  const totalDeductions = form.insuranceDeduction + form.personalIncomeTax + form.advancePayment + form.otherDeductions
    + customTotal(form.customItems, 'deduction');
  const totalAdjustments = form.expenseRefund + form.personalIncomeTaxRefund + form.priorMonthAdjustment
    + customTotal(form.customItems, 'adjustment');
  const netSalary = grossIncome - totalDeductions + totalAdjustments;
  const autoFamilyDeduction = calcFamilyDeduction(form.dependentsCount, companySettings);
  const familyDeduction = form.familyDeductionOverride ?? autoFamilyDeduction;
  const autoTaxableIncome = calcTaxableIncome({
    gross: grossIncome,
    lunchAllowance: form.lunchAllowance,
    phoneAllowance: form.phoneAllowance,
    insurance: form.insuranceDeduction,
    familyDeduction,
  });
  const taxableIncome = form.taxableIncomeOverride ?? autoTaxableIncome;
  const lockedExistingRecord = existingRecord && ['pending_approval', 'published'].includes(existingRecord.publish_status);

  // Other payslips of the same month that can still receive a synced field.
  const syncTargets = useMemo(() => {
    if (!itemToSync) return { editable: [] as DbPayrollRecord[], locked: 0, existing: 0 };
    const label = itemToSync.label.trim().toLocaleLowerCase('vi-VN');
    const others = existingRecords.filter((record) => record.employee_id !== form.employeeId && record.month === form.month && record.year === form.year);
    const missing = others.filter((record) => !readCustomItems(record.custom_items).some((item) => item.section === itemToSync.section && item.label.trim().toLocaleLowerCase('vi-VN') === label));
    const editable = missing.filter((record) => record.publish_status === 'draft' || record.publish_status === 'rejected');
    return { editable, locked: missing.length - editable.length, existing: others.length - missing.length };
  }, [itemToSync, existingRecords, form.employeeId, form.month, form.year]);

  useEffect(() => {
    if (!open) return;
    setForm(createInitialForm(initialEmployeeId, initialMonth, initialYear));
    setPrefillKey(null);
  }, [open, initialEmployeeId, initialMonth, initialYear]);

  useEffect(() => {
    if (!open || !selectedEmployee || !form.employeeId) return;
    const key = `${form.employeeId}-${form.month}-${form.year}-${existingRecord?.id || 'new'}`;
    if (prefillKey === key) return;
    // Wait for all linked sources before seeding the form. This prevents a
    // slow query from overwriting a value after the Admin starts typing.
    if (!contractsQuery.isFetched || !leaveRequestsQuery.isFetched || !leaveBalanceQuery.isFetched || !kpiMonthlyQuery.isFetched || !otRecordsQuery.isFetched || !holidaysQuery.isFetched || !companySettingsFetched) return;

    const activeContract = (contractsQuery.data || [])
      .filter((contract) => contract.publish_status === 'published' && ['Đang hiệu lực', 'Sắp hết hạn'].includes(contract.status))
      .sort((a, b) => b.start_date.localeCompare(a.start_date))[0]
      || (contractsQuery.data || []).find((contract) => contract.publish_status === 'published');
    const linkedKpiBonus = kpiMonthlyQuery.data?.bonus_amount != null
      ? asMoney(kpiMonthlyQuery.data.bonus_amount)
      : asMoney(kpiMonthlyQuery.data?.performance_commission_amount)
        + asMoney(kpiMonthlyQuery.data?.qc_commission_amount)
        + asMoney(kpiMonthlyQuery.data?.guaranteed_income_topup);
    const leaveUsed = asMoney(approvedLeaveDays);
    const standardDays = standardWorkDays;
    const holidays = workDaysInfo.holidaysDeducted;
    const defaultActualDays = Math.max(standardDays - leaveUsed, 0);
    const defaultSalary = asMoney(selectedEmployee.current_salary ?? activeContract?.salary);
    const insuranceRate = ((companySettings?.bhxh_employee_rate ?? 8) + (companySettings?.bhyt_employee_rate ?? 1.5) + (companySettings?.bhtn_employee_rate ?? 1)) / 100;

    // Stored values that differ from their formula were entered manually, so
    // keep them as overrides; otherwise stay on auto so later edits recalc.
    let familyDeductionOverride: number | null = null;
    let taxableIncomeOverride: number | null = null;
    if (existingRecord) {
      const storedAutoFamily = calcFamilyDeduction(existingRecord.dependents_count, companySettings);
      if (differs(existingRecord.family_deduction, storedAutoFamily)) familyDeductionOverride = existingRecord.family_deduction;
      const storedAutoTaxable = calcTaxableIncome({
        gross: existingRecord.gross_income,
        lunchAllowance: existingRecord.lunch_allowance,
        phoneAllowance: existingRecord.phone_allowance,
        insurance: existingRecord.bhxh_deduction + existingRecord.bhyt_deduction + existingRecord.bhtn_deduction,
        familyDeduction: existingRecord.family_deduction,
      });
      if (differs(existingRecord.taxable_income, storedAutoTaxable)) taxableIncomeOverride = existingRecord.taxable_income;
    }

    const nextForm: PayrollFormState = {
      employeeId: form.employeeId,
      month: form.month,
      year: form.year,
      actualWorkDays: existingRecord?.actual_work_days ?? defaultActualDays,
      annualLeaveUsedDays: existingRecord?.annual_leave_used_days ?? leaveUsed,
      policyLeaveDays: existingRecord?.policy_leave_days ?? holidays,
      paidWorkDays: existingRecord ? existingRecord.paid_work_days || existingRecord.actual_work_days : defaultActualDays + holidays,
      annualLeaveRemainingDays: existingRecord?.annual_leave_remaining_days ?? asMoney(leaveBalanceQuery.data?.remaining_days),
      dependentsCount: existingRecord?.dependents_count ?? 0,
      baseSalary: existingRecord?.base_salary ?? defaultSalary,
      // Same convention as the Bảng lương sheet: contract salary × paid days /
      // (standard days + holidays), e.g. 7.000.000 × 12 / 24 = 3.500.000.
      workdaySalary: existingRecord
        ? existingRecord.workday_salary || existingRecord.base_salary
        : standardDays + holidays > 0 ? Math.round((defaultSalary * (defaultActualDays + holidays)) / (standardDays + holidays)) : 0,
      grossIncome: existingRecord?.gross_income ?? 0,
      lunchAllowance: existingRecord?.lunch_allowance ?? asMoney(activeContract?.lunch_allowance),
      phoneAllowance: existingRecord?.phone_allowance ?? asMoney(activeContract?.phone_allowance),
      kpiBonus: existingRecord?.kpi_bonus ?? linkedKpiBonus,
      otHours: existingRecord?.ot_hours ?? linkedOt,
      otPay: existingRecord?.ot_pay ?? 0,
      projectBonusAmount: existingRecord?.project_bonus_amount ?? 0,
      holidayBonusAmount: existingRecord?.holiday_bonus_amount ?? 0,
      insuranceDeduction: existingRecord
        ? existingRecord.bhxh_deduction + existingRecord.bhyt_deduction + existingRecord.bhtn_deduction
        : Math.round(defaultSalary * insuranceRate),
      personalIncomeTax: existingRecord?.personal_income_tax ?? 0,
      familyDeductionOverride,
      taxableIncomeOverride,
      advancePayment: existingRecord?.advance_payment ?? 0,
      otherDeductions: existingRecord?.other_deductions ?? 0,
      expenseRefund: existingRecord ? existingRecord.welfare_refund + existingRecord.business_trip_refund : 0,
      personalIncomeTaxRefund: existingRecord?.personal_income_tax_refund ?? 0,
      priorMonthAdjustment: existingRecord?.prior_month_adjustment ?? 0,
      customItems: readCustomItems(existingRecord?.custom_items),
      paymentStatus: existingRecord?.payment_status || 'Chờ thanh toán',
      paymentDate: existingRecord?.payment_date || '',
      note: existingRecord?.note || '',
    };
    setForm(existingRecord ? nextForm : { ...nextForm, grossIncome: sumIncome(nextForm) });
    setPrefillKey(key);
  }, [
    open,
    selectedEmployee,
    form.employeeId,
    form.month,
    form.year,
    prefillKey,
    existingRecord,
    contractsQuery.data,
    contractsQuery.isFetched,
    leaveRequestsQuery.isFetched,
    leaveBalanceQuery.data,
    leaveBalanceQuery.isFetched,
    kpiMonthlyQuery.data,
    kpiMonthlyQuery.isFetched,
    otRecordsQuery.isFetched,
    holidaysQuery.isFetched,
    companySettingsFetched,
    approvedLeaveDays,
    standardWorkDays,
    workDaysInfo.holidaysDeducted,
    linkedOt,
    companySettings,
  ]);

  const updateField = <K extends keyof PayrollFormState>(field: K, value: PayrollFormState[K]) => {
    setForm((previous) => {
      const next = { ...previous, [field]: value };
      const incomeChanged = INCOME_FIELDS.has(field)
        || (field === 'customItems' && customTotal(previous.customItems, 'income') !== customTotal(next.customItems, 'income'));
      return incomeChanged ? { ...next, grossIncome: sumIncome(next) } : next;
    });
    if (field === 'employeeId' || field === 'month' || field === 'year') setPrefillKey(null);
  };

  const handleSync = async () => {
    if (!itemToSync) return;
    try {
      await syncCustomItem.mutateAsync({ records: syncTargets.editable, item: itemToSync });
      showToast(`Đã thêm khoản "${itemToSync.label.trim()}" cho ${syncTargets.editable.length} phiếu lương tháng ${form.month}/${form.year}.`);
      setItemToSync(null);
    } catch (error) {
      showToast(await getUserFacingError(error, 'Không thể đồng bộ khoản tùy chỉnh. Vui lòng thử lại.'));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!companyId || !form.employeeId) {
      showToast('Vui lòng chọn nhân viên trước khi lưu phiếu lương.');
      return;
    }
    if (lockedExistingRecord) {
      showToast('Phiếu lương đang chờ duyệt hoặc đã phát hành nên không thể chỉnh sửa.');
      return;
    }
    if (standardWorkDays <= 0) {
      showToast('Ngày công chuẩn phải lớn hơn 0.');
      return;
    }
    if (form.customItems.some((item) => !item.label.trim())) {
      showToast('Vui lòng đặt tên cho mọi khoản tùy chỉnh hoặc xóa khoản trống.');
      return;
    }
    if (netSalary < 0) {
      showToast('Thực lãnh đang âm. Hãy kiểm tra lại khoản khấu trừ và điều chỉnh.');
      return;
    }

    const payload: TablesInsert<'payroll_records'> = {
      company_id: companyId,
      employee_id: form.employeeId,
      month: form.month,
      year: form.year,
      base_salary: form.baseSalary,
      standard_work_days: standardWorkDays,
      actual_work_days: form.actualWorkDays,
      policy_leave_days: form.policyLeaveDays,
      paid_work_days: form.paidWorkDays,
      workday_salary: form.workdaySalary,
      annual_leave_used_days: form.annualLeaveUsedDays,
      annual_leave_remaining_days: form.annualLeaveRemainingDays,
      dependents_count: form.dependentsCount,
      lunch_allowance: form.lunchAllowance,
      phone_allowance: form.phoneAllowance,
      kpi_bonus: form.kpiBonus,
      ot_hours: form.otHours,
      ot_pay: form.otPay,
      project_bonus_amount: form.projectBonusAmount,
      holiday_bonus_amount: form.holidayBonusAmount,
      gross_income: grossIncome,
      bhxh_deduction: form.insuranceDeduction,
      bhyt_deduction: 0,
      bhtn_deduction: 0,
      personal_income_tax: form.personalIncomeTax,
      family_deduction: familyDeduction,
      taxable_income: taxableIncome,
      advance_payment: form.advancePayment,
      other_deductions: form.otherDeductions,
      welfare_refund: form.expenseRefund,
      business_trip_refund: 0,
      personal_income_tax_refund: form.personalIncomeTaxRefund,
      prior_month_adjustment: form.priorMonthAdjustment,
      custom_items: form.customItems.map((item) => ({ ...item, label: item.label.trim() })),
      payment_status: form.paymentStatus,
      payment_date: form.paymentDate || null,
      note: form.note.trim() || null,
      import_source_name: 'Nhập thủ công trên Portal',
      publish_status: 'draft',
      approval_requested_at: null,
      approval_requested_by: null,
      approved_at: null,
      approved_by: null,
      rejection_reason: null,
    };

    try {
      await upsertPayroll.mutateAsync(payload);
      showToast(existingRecord ? 'Đã cập nhật phiếu lương nháp.' : 'Đã thêm phiếu lương nháp. Kiểm tra tổng trước khi gửi duyệt.');
      onSaved(form.month, form.year);
    } catch (error) {
      showToast(await getUserFacingError(error, 'Không thể lưu phiếu lương. Vui lòng thử lại.'));
    }
  };

  if (!open) return null;

  const customEditor = (section: PayrollCustomSection) => (
    <CustomItemsEditor
      section={section}
      items={form.customItems}
      onChange={(items) => updateField('customItems', items)}
      onSync={setItemToSync}
      canSync={existingRecords.some((record) => record.employee_id !== form.employeeId && record.month === form.month && record.year === form.year)}
    />
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-4 bg-slate-900 px-5 py-4 text-white">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-success-300">TL CONCEPTS · PAYROLL</p>
            <h2 className="mt-1 text-lg font-extrabold">{existingRecord ? 'Cập nhật phiếu lương' : 'Thêm phiếu lương thủ công'}</h2>
            <p className="mt-0.5 text-xs text-slate-300">Các cột theo file mẫu Bảng lương; số thuế và điều chỉnh do Kế toán xác nhận.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white" aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <section className="space-y-3">
            <SectionTitle tone="green" title="1. Thông tin nhân viên & ngày làm việc" description="Tên, email, mã nhân viên lấy từ Hồ sơ nhân viên; ngày công và phép lấy theo kỳ đang chọn." />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <label className="block space-y-1 md:col-span-2">
                <span className="text-xs font-semibold text-slate-700">Nhân viên *</span>
                <SearchableSelect
                  value={form.employeeId}
                  onChange={(value) => updateField('employeeId', value)}
                  placeholder="Chọn nhân viên"
                  options={employees.map((employee) => ({ value: employee.id, label: `${employee.full_name} (${employee.employee_code})` }))}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-700">Tháng *</span>
                <select value={form.month} onChange={(event) => updateField('month', Number(event.target.value))} className={inputClass}>
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => <option key={month} value={month}>Tháng {month}</option>)}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-700">Năm *</span>
                <input type="number" min="2000" max="2100" value={form.year} onChange={(event) => updateField('year', Number(event.target.value) || initialYear)} className={numberClass} />
              </label>
            </div>
            <p className="text-[11px] font-semibold text-slate-500">Kỳ tính lương: 01/{String(form.month).padStart(2, '0')}/{form.year} – {String(workDaysInfo.lastDayOfMonth).padStart(2, '0')}/{String(form.month).padStart(2, '0')}/{form.year}</p>

            {selectedEmployee && (
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs md:grid-cols-3">
                <div><span className="block text-[11px] text-slate-500">Họ và tên</span><strong className="text-sm text-slate-900">{selectedEmployee.full_name}</strong></div>
                <div><span className="block text-[11px] text-slate-500">Email / MSNV</span><strong className="text-slate-800">{selectedEmployee.email || '—'} · {selectedEmployee.employee_code}</strong></div>
                <div><span className="block text-[11px] text-slate-500">Chức vụ / Phòng ban</span><strong className="text-slate-800">{selectedEmployee.job_title || '—'} · {selectedEmployee.department || '—'}</strong></div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <NumberField label="Làm việc" value={form.actualWorkDays} onChange={(value) => updateField('actualWorkDays', value)} step={0.5} />
              <NumberField label="Ngày nghỉ" value={form.annualLeaveUsedDays} onChange={(value) => updateField('annualLeaveUsedDays', value)} step={0.5} hint="Phép đã duyệt" />
              <NumberField label="Nghỉ chế độ" value={form.policyLeaveDays} onChange={(value) => updateField('policyLeaveDays', value)} step={0.5} hint={`${workDaysInfo.holidaysDeducted} công lễ/Tết`} />
              <NumberField label="Tổng" value={form.paidWorkDays} onChange={(value) => updateField('paidWorkDays', value)} step={0.5} />
              <NumberField label="Ngày công chuẩn" value={standardWorkDays} onChange={() => undefined} readOnly hint={workdayOverride ? 'Quy chuẩn tháng (đã điều chỉnh)' : 'Quy chuẩn tháng'} />
              <NumberField label="Phép còn lại" value={form.annualLeaveRemainingDays} onChange={(value) => updateField('annualLeaveRemainingDays', value)} step={0.5} hint="Từ quỹ phép" />
              <NumberField label="Người phụ thuộc" value={form.dependentsCount} onChange={(value) => updateField('dependentsCount', Math.max(0, Math.floor(value)))} hint="Nhập theo KT" />
            </div>
            {selectedEmployee && <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500"><Link2 className="h-3.5 w-3.5 text-success-600" /> Lương/phụ cấp lấy từ hợp đồng hiện hành; phép đã duyệt, KPI và OT được gợi ý theo dữ liệu cùng kỳ.</p>}
          </section>

          <section className="space-y-3">
            <SectionTitle tone="green" title="2. Thu nhập" description="Tổng cộng = các khoản bên dưới (kể cả khoản tùy chỉnh)." />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <MoneyField label="Lương cơ bản" value={form.workdaySalary} onChange={(value) => updateField('workdaySalary', value)} hint="Theo ngày công thực tế" />
              <MoneyField label="Hỗ trợ điện thoại" value={form.phoneAllowance} onChange={(value) => updateField('phoneAllowance', value)} />
              <MoneyField label="Hỗ trợ ăn trưa" value={form.lunchAllowance} onChange={(value) => updateField('lunchAllowance', value)} />
              <NumberField label="OT ngày lễ (giờ)" value={form.otHours} onChange={(value) => updateField('otHours', value)} step={0.01} hint={linkedOt > 0 ? `${linkedOt} giờ OT đã duyệt` : undefined} />
              <MoneyField label="Lương + Phụ cấp thiết kế OT" value={form.otPay} onChange={(value) => updateField('otPay', value)} />
              <MoneyField label="Thưởng lễ" value={form.holidayBonusAmount} onChange={(value) => updateField('holidayBonusAmount', value)} />
              <MoneyField label="Phụ cấp thiết kế" value={form.kpiBonus} onChange={(value) => updateField('kpiBonus', value)} hint="KPI tháng" />
              {form.projectBonusAmount > 0 && <MoneyField label="Thưởng dự án (dữ liệu cũ)" value={form.projectBonusAmount} onChange={(value) => updateField('projectBonusAmount', value)} />}
            </div>
            {customEditor('income')}
            <div className="flex items-center justify-between rounded-xl border border-success-200 bg-success-50 px-4 py-3 font-extrabold text-success-900"><span className="text-sm">TỔNG CỘNG</span><span className="font-mono text-xl font-black">{formatMoney(grossIncome)}</span></div>
          </section>

          <section className="space-y-3">
            <SectionTitle tone="rose" title="3. Các khoản khấu trừ" description="Bảo hiểm gợi ý theo cấu hình công ty; thuế TNCN nhập theo số Kế toán cung cấp." />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <MoneyField label="NV BHXH + BHYT + BHTN (10.5%)" value={form.insuranceDeduction} onChange={(value) => updateField('insuranceDeduction', value)} />
              <MoneyField label="Thuế TNCN" value={form.personalIncomeTax} onChange={(value) => updateField('personalIncomeTax', value)} hint="Nhập từ KT" />
              <MoneyField label="Khấu trừ tạm ứng" value={form.advancePayment} onChange={(value) => updateField('advancePayment', value)} />
              <MoneyField label="Khấu trừ khác" value={form.otherDeductions} onChange={(value) => updateField('otherDeductions', value)} />
            </div>
            {customEditor('deduction')}
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-2">
              <AutoMoneyField
                label="Giảm trừ gia cảnh"
                autoValue={autoFamilyDeduction}
                override={form.familyDeductionOverride}
                onChange={(value) => updateField('familyDeductionOverride', value)}
                formula="Bản thân + người phụ thuộc theo cấu hình công ty"
              />
              <AutoMoneyField
                label="Thu nhập tính thuế TNCN"
                autoValue={autoTaxableIncome}
                override={form.taxableIncomeOverride}
                onChange={(value) => updateField('taxableIncomeOverride', value)}
                formula="Tổng cộng − phụ cấp − BHXH/BHYT/BHTN − giảm trừ gia cảnh"
              />
              <p className="text-[10px] text-slate-500 md:col-span-2">Hai số này chỉ để tham chiếu tính thuế, không cộng vào tổng khấu trừ.</p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 font-extrabold text-rose-900"><span className="text-sm">TỔNG KHẤU TRỪ</span><span className="font-mono text-xl font-black">{formatMoney(totalDeductions)}</span></div>
          </section>

          <section className="space-y-3">
            <SectionTitle tone="orange" title="4. Điều chỉnh & hoàn trả" description="Nhập các khoản hoàn trả/truy lĩnh theo xác nhận của Kế toán." />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <MoneyField label="Hoàn chi phí" value={form.expenseRefund} onChange={(value) => updateField('expenseRefund', value)} />
              <MoneyField label="Hoàn thuế TNCN" value={form.personalIncomeTaxRefund} onChange={(value) => updateField('personalIncomeTaxRefund', value)} />
              <MoneyField label="Truy lĩnh / điều chỉnh kỳ trước" value={form.priorMonthAdjustment} onChange={(value) => updateField('priorMonthAdjustment', value)} />
            </div>
            {customEditor('adjustment')}
            <div className="flex items-center justify-between rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm font-extrabold text-primary-900"><span>TỔNG CỘNG THÊM</span><span className="font-mono">{formatMoney(totalAdjustments)}</span></div>
          </section>

          <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-700"><Calculator className="h-4 w-4" /> Kiểm tra trước khi lưu</div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div><span className="block font-semibold text-slate-500">Tổng cộng</span><strong className="font-mono text-xl font-black text-success-800">{formatMoney(grossIncome)}</strong></div>
                <div><span className="block font-semibold text-slate-500">Tổng khấu trừ</span><strong className="font-mono text-xl font-black text-rose-700">− {formatMoney(totalDeductions)}</strong></div>
                <div><span className="block font-semibold text-slate-500">Điều chỉnh & hoàn trả</span><strong className="font-mono text-xl font-black text-primary-700">+ {formatMoney(totalAdjustments)}</strong></div>
              </div>
            </div>
            <div className="rounded-2xl border border-success-300 bg-success-50 p-4 text-right"><span className="block text-xs font-bold uppercase tracking-wider text-success-800">THU NHẬP RÒNG</span><strong className={`mt-1 block font-mono text-2xl ${netSalary < 0 ? 'text-rose-700' : 'text-success-900'}`}>{formatMoney(netSalary)}</strong><span className="mt-1 block text-[10px] text-success-800">Tổng cộng − Tổng khấu trừ + Điều chỉnh</span></div>
          </section>

          <section className="border-t border-slate-200 pt-4">
            <label className="block space-y-1"><span className="text-xs font-semibold text-slate-700">Ghi chú trên phiếu lương</span><textarea rows={2} value={form.note} onChange={(event) => updateField('note', event.target.value)} className={`${inputClass} resize-y`} placeholder="Để trống nếu không cần hiển thị ghi chú trên phiếu lương" /></label>
          </section>

          {lockedExistingRecord && <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">Phiếu lương này đang chờ Admin duyệt hoặc đã phát hành, nên chỉ được xem. Hãy trả lại kỳ lương trước khi chỉnh sửa.</p>}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <span className="text-[11px] text-slate-500">Phiếu sẽ lưu ở trạng thái <strong>Nháp</strong>; Admin duyệt xong User mới nhìn thấy.</span>
          <div className="flex gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100">Hủy</button><button type="submit" disabled={upsertPayroll.isPending || Boolean(lockedExistingRecord)} className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-primary-600/20 transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"><Save className="h-4 w-4" />{upsertPayroll.isPending ? 'Đang lưu...' : existingRecord ? 'Lưu thay đổi' : 'Lưu phiếu nháp'}</button></div>
        </footer>
      </form>

      <ConfirmationDialog
        open={Boolean(itemToSync)}
        onOpenChange={(isOpen) => !isOpen && setItemToSync(null)}
        title={`Đồng bộ khoản "${itemToSync?.label.trim() ?? ''}"?`}
        description={syncTargets.editable.length
          ? `Thêm khoản này (giá trị 0) vào ${syncTargets.editable.length} phiếu lương nháp khác của tháng ${form.month}/${form.year}; sau đó nhập số tiền riêng cho từng người. Phiếu đang mở vẫn cần bấm Lưu.`
          : `Không còn phiếu nháp nào trong tháng ${form.month}/${form.year} cần thêm khoản này.`}
        confirmLabel="Đồng bộ"
        onConfirm={() => void handleSync()}
        isPending={syncCustomItem.isPending}
        isConfirmDisabled={!syncTargets.editable.length}
      >
        {(syncTargets.existing > 0 || syncTargets.locked > 0) && (
          <p className="text-xs text-slate-500">
            {syncTargets.existing > 0 && `${syncTargets.existing} phiếu đã có khoản cùng tên. `}
            {syncTargets.locked > 0 && `${syncTargets.locked} phiếu đang chờ duyệt/đã phát hành sẽ được bỏ qua.`}
          </p>
        )}
      </ConfirmationDialog>
    </div>
  );
};
