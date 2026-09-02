import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, Link2, Save, X } from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { useMoneyVisibility } from '../../context/MoneyVisibilityContext';
import { getUserFacingError } from '../../lib/userFacingError';
import { useCompanySettings } from '../../hooks/useCompanySettings';
import { useContracts } from '../../hooks/useContracts';
import type { DbEmployee } from '../../hooks/useEmployees';
import { useKpiMonthly } from '../../hooks/useKpi';
import { useCompanyHolidays, useLeaveBalance, useLeaveRequests } from '../../hooks/useLeave';
import { useOtRecords } from '../../hooks/useOt';
import { useUpsertPayrollRecord, type DbPayrollRecord } from '../../hooks/usePayroll';
import type { TablesInsert } from '../../lib/database.types';
import { CurrencyInput } from '../CurrencyInput';
import { SearchableSelect } from '../ui/SearchableSelect';
import { getApprovedLeaveDaysInMonth, getMonthWorkDays } from '../../utils/workDays';

type PayrollFormState = {
  employeeId: string;
  month: number;
  year: number;
  standardWorkDays: number;
  actualWorkDays: number;
  annualLeaveUsedDays: number;
  annualLeaveRemainingDays: number;
  dependentsCount: number;
  baseSalary: number;
  lunchAllowance: number;
  phoneAllowance: number;
  kpiBonus: number;
  otHours: number;
  otPay: number;
  projectBonusAmount: number;
  holidayBonusAmount: number;
  bhxhDeduction: number;
  bhytDeduction: number;
  bhtnDeduction: number;
  personalIncomeTax: number;
  advancePayment: number;
  otherDeductions: number;
  welfareRefund: number;
  businessTripRefund: number;
  personalIncomeTaxRefund: number;
  priorMonthAdjustment: number;
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
  standardWorkDays: 0,
  actualWorkDays: 0,
  annualLeaveUsedDays: 0,
  annualLeaveRemainingDays: 0,
  dependentsCount: 0,
  baseSalary: 0,
  lunchAllowance: 0,
  phoneAllowance: 0,
  kpiBonus: 0,
  otHours: 0,
  otPay: 0,
  projectBonusAmount: 0,
  holidayBonusAmount: 0,
  bhxhDeduction: 0,
  bhytDeduction: 0,
  bhtnDeduction: 0,
  personalIncomeTax: 0,
  advancePayment: 0,
  otherDeductions: 0,
  welfareRefund: 0,
  businessTripRefund: 0,
  personalIncomeTaxRefund: 0,
  priorMonthAdjustment: 0,
  paymentStatus: 'Chờ thanh toán',
  paymentDate: '',
  note: '',
});

const asMoney = (value: number | null | undefined) => Number.isFinite(value) ? Number(value) : 0;

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
  const upsertPayroll = useUpsertPayrollRecord();

  const contractsQuery = useContracts(open && form.employeeId ? form.employeeId : undefined);
  const leaveRequestsQuery = useLeaveRequests(open && form.employeeId ? form.employeeId : undefined);
  const leaveBalanceQuery = useLeaveBalance(open && form.employeeId ? form.employeeId : undefined, form.year);
  const kpiMonthlyQuery = useKpiMonthly(open && form.employeeId ? form.employeeId : undefined, form.month, form.year);
  const otRecordsQuery = useOtRecords(open && form.employeeId ? form.employeeId : undefined);
  const holidaysQuery = useCompanyHolidays();
  const { data: companySettings, isFetched: companySettingsFetched } = useCompanySettings();

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
  const approvedLeaveDays = useMemo(
    () => getApprovedLeaveDaysInMonth(leaveRequestsQuery.data || [], form.month, form.year, holidayDates),
    [leaveRequestsQuery.data, form.month, form.year, holidayDates],
  );
  const linkedOt = useMemo(() => {
    const prefix = `${form.year}-${String(form.month).padStart(2, '0')}-`;
    return (otRecordsQuery.data || [])
      .filter((record) => record.status === 'Đã duyệt' && record.date.startsWith(prefix))
      .reduce(
        (sum, record) => ({
          hours: sum.hours + asMoney(record.hours),
          amount: sum.amount + asMoney(record.amount),
        }),
        { hours: 0, amount: 0 },
      );
  }, [otRecordsQuery.data, form.month, form.year]);

  const workdaySalary = useMemo(() => {
    if (form.actualWorkDays <= 0 || form.standardWorkDays <= 0) return 0;
    return Math.round((form.baseSalary * form.actualWorkDays) / form.standardWorkDays);
  }, [form.actualWorkDays, form.baseSalary, form.standardWorkDays]);
  const grossIncome = useMemo(
    () => workdaySalary + form.lunchAllowance + form.phoneAllowance + form.kpiBonus + form.otPay + form.projectBonusAmount + form.holidayBonusAmount,
    [workdaySalary, form.lunchAllowance, form.phoneAllowance, form.kpiBonus, form.otPay, form.projectBonusAmount, form.holidayBonusAmount],
  );
  const totalDeductions = useMemo(
    () => form.bhxhDeduction + form.bhytDeduction + form.bhtnDeduction + form.personalIncomeTax + form.advancePayment + form.otherDeductions,
    [form.bhxhDeduction, form.bhytDeduction, form.bhtnDeduction, form.personalIncomeTax, form.advancePayment, form.otherDeductions],
  );
  const totalAdjustments = useMemo(
    () => form.welfareRefund + form.businessTripRefund + form.personalIncomeTaxRefund + form.priorMonthAdjustment,
    [form.welfareRefund, form.businessTripRefund, form.personalIncomeTaxRefund, form.priorMonthAdjustment],
  );
  const netSalary = grossIncome - totalDeductions + totalAdjustments;
  const familyDeduction = (companySettings?.family_deduction ?? 15500000) + form.dependentsCount * (companySettings?.dependent_deduction ?? 6200000);
  const taxableIncome = workdaySalary + form.kpiBonus + form.otPay + form.projectBonusAmount + form.holidayBonusAmount
    - (form.baseSalary * 0.105) - familyDeduction;
  const lockedExistingRecord = existingRecord && ['pending_approval', 'published'].includes(existingRecord.publish_status);

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
    const linkedOtPay = linkedOt.amount > 0
      ? linkedOt.amount
      : Math.round(asMoney(kpiMonthlyQuery.data?.ot_hours) * asMoney(kpiMonthlyQuery.data?.ot_hourly_rate));
    const leaveUsed = asMoney(approvedLeaveDays);
    const standardDays = workDaysInfo.standardWorkDays;
    const defaultActualDays = Math.max(standardDays - leaveUsed, 0);
    const defaultSalary = asMoney(selectedEmployee.current_salary ?? activeContract?.salary);
    const bhxhRate = (companySettings?.bhxh_employee_rate ?? 8) / 100;
    const bhytRate = (companySettings?.bhyt_employee_rate ?? 1.5) / 100;
    const bhtnRate = (companySettings?.bhtn_employee_rate ?? 1) / 100;

    setForm({
      employeeId: form.employeeId,
      month: form.month,
      year: form.year,
      standardWorkDays: existingRecord?.standard_work_days ?? standardDays,
      actualWorkDays: existingRecord?.actual_work_days ?? defaultActualDays,
      annualLeaveUsedDays: existingRecord?.annual_leave_used_days ?? leaveUsed,
      annualLeaveRemainingDays: existingRecord?.annual_leave_remaining_days ?? asMoney(leaveBalanceQuery.data?.remaining_days),
      dependentsCount: existingRecord?.dependents_count ?? 0,
      baseSalary: existingRecord?.base_salary ?? defaultSalary,
      lunchAllowance: existingRecord?.lunch_allowance ?? asMoney(activeContract?.lunch_allowance),
      phoneAllowance: existingRecord?.phone_allowance ?? asMoney(activeContract?.phone_allowance),
      kpiBonus: existingRecord?.kpi_bonus ?? linkedKpiBonus,
      otHours: existingRecord?.ot_hours ?? linkedOt.hours,
      otPay: existingRecord?.ot_pay ?? linkedOtPay,
      projectBonusAmount: existingRecord?.project_bonus_amount ?? 0,
      holidayBonusAmount: existingRecord?.holiday_bonus_amount ?? 0,
      bhxhDeduction: existingRecord?.bhxh_deduction ?? Math.round(defaultSalary * bhxhRate),
      bhytDeduction: existingRecord?.bhyt_deduction ?? Math.round(defaultSalary * bhytRate),
      bhtnDeduction: existingRecord?.bhtn_deduction ?? Math.round(defaultSalary * bhtnRate),
      personalIncomeTax: existingRecord?.personal_income_tax ?? 0,
      advancePayment: existingRecord?.advance_payment ?? 0,
      otherDeductions: existingRecord?.other_deductions ?? 0,
      welfareRefund: existingRecord?.welfare_refund ?? 0,
      businessTripRefund: existingRecord?.business_trip_refund ?? 0,
      personalIncomeTaxRefund: existingRecord?.personal_income_tax_refund ?? 0,
      priorMonthAdjustment: existingRecord?.prior_month_adjustment ?? 0,
      paymentStatus: existingRecord?.payment_status || 'Chờ thanh toán',
      paymentDate: existingRecord?.payment_date || '',
      note: existingRecord?.note || '',
    });
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
    otRecordsQuery.data,
    otRecordsQuery.isFetched,
    holidaysQuery.isFetched,
    companySettingsFetched,
    approvedLeaveDays,
    workDaysInfo.standardWorkDays,
    linkedOt.hours,
    linkedOt.amount,
    companySettings,
  ]);

  const updateField = <K extends keyof PayrollFormState>(field: K, value: PayrollFormState[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    if (field === 'employeeId' || field === 'month' || field === 'year') setPrefillKey(null);
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
    if (form.standardWorkDays <= 0) {
      showToast('Ngày công chuẩn phải lớn hơn 0.');
      return;
    }
    if (form.actualWorkDays > form.standardWorkDays) {
      showToast('Ngày công thực tế không được lớn hơn ngày công chuẩn của kỳ lương.');
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
      standard_work_days: form.standardWorkDays,
      actual_work_days: form.actualWorkDays,
      workday_salary: workdaySalary,
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
      bhxh_deduction: form.bhxhDeduction,
      bhyt_deduction: form.bhytDeduction,
      bhtn_deduction: form.bhtnDeduction,
      personal_income_tax: form.personalIncomeTax,
      advance_payment: form.advancePayment,
      other_deductions: form.otherDeductions,
      welfare_refund: form.welfareRefund,
      business_trip_refund: form.businessTripRefund,
      personal_income_tax_refund: form.personalIncomeTaxRefund,
      prior_month_adjustment: form.priorMonthAdjustment,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-4 bg-slate-900 px-5 py-4 text-white">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-success-300">TL CONCEPTS · PAYROLL</p>
            <h2 className="mt-1 text-lg font-extrabold">{existingRecord ? 'Cập nhật phiếu lương' : 'Thêm phiếu lương thủ công'}</h2>
            <p className="mt-0.5 text-xs text-slate-300">Các trường liên kết được tự điền; số thuế và điều chỉnh vẫn do Kế toán xác nhận.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white" aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <section className="space-y-3">
            <SectionTitle tone="green" title="1. Thông tin nhân viên & kỳ lương" description="Tên, email, mã nhân viên lấy từ Hồ sơ nhân viên; ngày công và phép lấy theo kỳ đang chọn." />
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
              <NumberField label="Ngày công chuẩn" value={form.standardWorkDays} onChange={(value) => updateField('standardWorkDays', value)} step={0.5} hint={`Mặc định ${workDaysInfo.standardWorkDays} · ${workDaysInfo.holidaysDeducted} công lễ/Tết`} />
              <NumberField label="Ngày công thực tế" value={form.actualWorkDays} onChange={(value) => updateField('actualWorkDays', value)} step={0.5} />
              <NumberField label="Phép đã sử dụng" value={form.annualLeaveUsedDays} onChange={(value) => updateField('annualLeaveUsedDays', value)} step={0.5} hint="Đã duyệt" />
              <NumberField label="Phép còn lại" value={form.annualLeaveRemainingDays} onChange={(value) => updateField('annualLeaveRemainingDays', value)} step={0.5} hint="Từ quỹ phép" />
              <NumberField label="Người phụ thuộc" value={form.dependentsCount} onChange={(value) => updateField('dependentsCount', Math.max(0, Math.floor(value)))} hint="Nhập theo KT" />
            </div>
            {selectedEmployee && <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500"><Link2 className="h-3.5 w-3.5 text-success-600" /> Lương/phụ cấp lấy từ hợp đồng hiện hành; phép đã duyệt, KPI và OT được gợi ý theo dữ liệu cùng kỳ.</p>}
          </section>

          <section className="space-y-3">
            <SectionTitle tone="green" title="2. Thu nhập" description="Tổng thu nhập tự tính từ lương ngày công, phụ cấp và các khoản thưởng." />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <MoneyField label="Lương cơ bản" value={form.baseSalary} onChange={(value) => updateField('baseSalary', value)} hint="HĐLĐ" />
              <MoneyField label="Phụ cấp ăn trưa" value={form.lunchAllowance} onChange={(value) => updateField('lunchAllowance', value)} hint="HĐLĐ" />
              <MoneyField label="Phụ cấp điện thoại" value={form.phoneAllowance} onChange={(value) => updateField('phoneAllowance', value)} hint="HĐLĐ" />
              <div className="rounded-xl border border-dashed border-success-300 bg-success-50/60 p-3">
                <span className="block text-xs font-semibold text-slate-700">Lương ngày công</span>
                <strong className="mt-1 block font-mono text-lg text-success-800">{formatMoney(workdaySalary)}</strong>
                <span className="mt-1 block text-[10px] text-slate-500">Lương cơ bản × ngày công thực tế / ngày công chuẩn</span>
              </div>
              <MoneyField label="Thưởng KPI sản phẩm" value={form.kpiBonus} onChange={(value) => updateField('kpiBonus', value)} hint="KPI tháng" />
              <MoneyField label="OT / thưởng dự án" value={form.otPay} onChange={(value) => updateField('otPay', value)} hint={linkedOt.amount > 0 ? 'OT đã duyệt' : undefined} />
              <NumberField label="Số giờ OT" value={form.otHours} onChange={(value) => updateField('otHours', value)} step={0.5} hint="OT đã duyệt" />
              <MoneyField label="Thưởng dự án (tách riêng)" value={form.projectBonusAmount} onChange={(value) => updateField('projectBonusAmount', value)} />
              <MoneyField label="Thưởng lễ" value={form.holidayBonusAmount} onChange={(value) => updateField('holidayBonusAmount', value)} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-sm font-extrabold text-success-900"><span>TỔNG THU NHẬP</span><span className="font-mono">{formatMoney(grossIncome)}</span></div>
          </section>

          <section className="space-y-3">
            <SectionTitle tone="rose" title="3. Các khoản khấu trừ" description="Bảo hiểm được gợi ý theo cấu hình công ty; thuế TNCN vẫn nhập theo số Kế toán cung cấp (MVP)." />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <MoneyField label="BHXH" value={form.bhxhDeduction} onChange={(value) => updateField('bhxhDeduction', value)} hint={`${companySettings?.bhxh_employee_rate ?? 8}%`} />
              <MoneyField label="BHYT" value={form.bhytDeduction} onChange={(value) => updateField('bhytDeduction', value)} hint={`${companySettings?.bhyt_employee_rate ?? 1.5}%`} />
              <MoneyField label="BHTN" value={form.bhtnDeduction} onChange={(value) => updateField('bhtnDeduction', value)} hint={`${companySettings?.bhtn_employee_rate ?? 1}%`} />
              <MoneyField label="Thuế TNCN" value={form.personalIncomeTax} onChange={(value) => updateField('personalIncomeTax', value)} hint="Nhập từ KT" />
              <MoneyField label="Khấu trừ tạm ứng" value={form.advancePayment} onChange={(value) => updateField('advancePayment', value)} />
              <MoneyField label="Khấu trừ khác" value={form.otherDeductions} onChange={(value) => updateField('otherDeductions', value)} />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600"><span className="font-semibold">Giảm trừ gia cảnh (tự tính)</span><strong className="mt-1 block font-mono text-sm text-slate-900">{formatMoney(familyDeduction)}</strong><span className="mt-1 block text-[10px]">Bản thân + người phụ thuộc theo cấu hình công ty</span></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600"><span className="font-semibold">Thu nhập chịu thuế (tham chiếu)</span><strong className={`mt-1 block font-mono text-sm ${taxableIncome < 0 ? 'text-slate-700' : 'text-rose-700'}`}>{formatMoney(taxableIncome)}</strong><span className="mt-1 block text-[10px]">Lương ngày công + KPI + OT/thưởng − BHXH 10,5% − giảm trừ</span></div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-extrabold text-rose-900"><span>TỔNG KHẤU TRỪ</span><span className="font-mono">{formatMoney(totalDeductions)}</span></div>
          </section>

          <section className="space-y-3">
            <SectionTitle tone="orange" title="4. Điều chỉnh & hoàn trả" description="Nhập các khoản hoàn trả/truy lĩnh theo xác nhận của Kế toán." />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <MoneyField label="Hoàn chi phí phúc lợi" value={form.welfareRefund} onChange={(value) => updateField('welfareRefund', value)} />
              <MoneyField label="Hoàn công tác phí" value={form.businessTripRefund} onChange={(value) => updateField('businessTripRefund', value)} />
              <MoneyField label="Hoàn thuế TNCN" value={form.personalIncomeTaxRefund} onChange={(value) => updateField('personalIncomeTaxRefund', value)} />
              <MoneyField label="Truy lĩnh / điều chỉnh kỳ trước" value={form.priorMonthAdjustment} onChange={(value) => updateField('priorMonthAdjustment', value)} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm font-extrabold text-primary-900"><span>TỔNG CỘNG THÊM</span><span className="font-mono">{formatMoney(totalAdjustments)}</span></div>
          </section>

          <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-900 p-4 text-white md:col-span-2">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-success-300"><Calculator className="h-4 w-4" /> Kiểm tra trước khi lưu</div>
              <div className="grid grid-cols-3 gap-3 text-xs"><div><span className="block text-slate-400">Tổng thu nhập</span><strong className="font-mono text-sm">{formatMoney(grossIncome)}</strong></div><div><span className="block text-slate-400">Tổng khấu trừ</span><strong className="font-mono text-sm">− {formatMoney(totalDeductions)}</strong></div><div><span className="block text-slate-400">Điều chỉnh & hoàn trả</span><strong className="font-mono text-sm">+ {formatMoney(totalAdjustments)}</strong></div></div>
            </div>
            <div className="rounded-2xl border border-success-300 bg-success-50 p-4 text-right"><span className="block text-xs font-bold uppercase tracking-wider text-success-800">THỰC LÃNH (NET PAY)</span><strong className={`mt-1 block font-mono text-2xl ${netSalary < 0 ? 'text-rose-700' : 'text-success-900'}`}>{formatMoney(netSalary)}</strong><span className="mt-1 block text-[10px] text-success-800">Tổng thu nhập − Tổng khấu trừ + Điều chỉnh</span></div>
          </section>

          <section className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 md:grid-cols-3">
            <label className="block space-y-1"><span className="text-xs font-semibold text-slate-700">Trạng thái thanh toán</span><select value={form.paymentStatus} onChange={(event) => updateField('paymentStatus', event.target.value)} className={inputClass}><option>Chờ thanh toán</option><option>Đã thanh toán</option><option>Tạm ứng</option></select></label>
            <label className="block space-y-1"><span className="text-xs font-semibold text-slate-700">Ngày thanh toán</span><input type="date" value={form.paymentDate} onChange={(event) => updateField('paymentDate', event.target.value)} className={inputClass} /></label>
            <label className="block space-y-1 md:col-span-1"><span className="text-xs font-semibold text-slate-700">Ghi chú</span><input value={form.note} onChange={(event) => updateField('note', event.target.value)} className={inputClass} placeholder="Ví dụ: Đã đối chiếu với bảng lương tháng" /></label>
          </section>

          {lockedExistingRecord && <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">Phiếu lương này đang chờ Admin duyệt hoặc đã phát hành, nên chỉ được xem. Hãy trả lại kỳ lương trước khi chỉnh sửa.</p>}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <span className="text-[11px] text-slate-500">Phiếu sẽ lưu ở trạng thái <strong>Nháp</strong>; Admin duyệt xong User mới nhìn thấy.</span>
          <div className="flex gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100">Hủy</button><button type="submit" disabled={upsertPayroll.isPending || Boolean(lockedExistingRecord)} className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-primary-600/20 transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"><Save className="h-4 w-4" />{upsertPayroll.isPending ? 'Đang lưu...' : existingRecord ? 'Lưu thay đổi' : 'Lưu phiếu nháp'}</button></div>
        </footer>
      </form>
    </div>
  );
};
