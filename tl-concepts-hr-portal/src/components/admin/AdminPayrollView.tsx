import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, ClipboardPaste, Download, FileSpreadsheet, FileText, Mail, Pencil, Plus, RotateCcw, Search, Send, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useHR } from '../../context/HRContext';
import { MoneyVisibilityToggle, useMoneyVisibility } from '../../context/MoneyVisibilityContext';
import { getUserFacingError } from '../../lib/userFacingError';
import { useEmployees } from '../../hooks/useEmployees';
import { useCompanyHolidays } from '../../hooks/useLeave';
import {
  useAllPayrollRecords,
  useApprovePayrollMonth,
  useDeletePayrollRecord,
  useImportPayrollRecords,
  useProcessPayslipNotifications,
  useRejectPayrollMonth,
  useRetryPayslipNotification,
  useSubmitPayrollMonth,
} from '../../hooks/usePayroll';
import type { TablesInsert } from '../../lib/database.types';
import { getMonthWorkDays, getWorkDaysFormulaText } from '../../utils/workDays';
import { calcFamilyDeduction, calcTaxableIncome, matchPayrollHeader, PAYROLL_TEMPLATE_COLUMNS, readCustomItems, normalizeHeader, parseDelimited, PAYROLL_FIELD_LABELS, type PayrollField } from '../../utils/payroll';
import { useCompanySettings } from '../../hooks/useCompanySettings';
import { useCompanyWorkdayOverride } from '../../hooks/useKpi';
import { ConfirmationDialog } from '../ConfirmationDialog';
import { PayrollEntryModal } from './PayrollEntryModal';
import { useI18n } from '../../context/I18nContext';

type PayrollImportField = PayrollField;

const normalizeParsedNumber = (value: number) => {
  if (!Number.isFinite(value)) return value;
  // read-excel-file exposes formula results as IEEE-754 numbers. Precision
  // noise such as 247204.55000000002 is not a business value and would be
  // persisted as a huge numeric amount by Postgres. Keep meaningful decimal
  // precision while removing that representation artefact.
  return Number(value.toPrecision(15));
};

const numberValue = (value: string, decimal = false) => {
  const cleaned = value.trim().replace(/[^0-9,.-]/g, '');
  if (!cleaned || cleaned === '-') return 0;
  if (decimal) {
    if (cleaned.includes(',') && cleaned.includes('.')) return normalizeParsedNumber(Number(cleaned.replace(/\./g, '').replace(',', '.')));
    return normalizeParsedNumber(Number(cleaned.replace(',', '.')));
  }

  // Excel formula results arrive as JS numbers (e.g. 21476886.45), while
  // pasted Vietnamese currency commonly uses dots as grouping separators
  // (e.g. 21.476.886). Distinguish the final 1–2 digit decimal group from a
  // 3-digit thousands group before normalizing.
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  const decimalIndex = Math.max(lastComma, lastDot);
  const fractionalDigits = decimalIndex >= 0 ? cleaned.length - decimalIndex - 1 : 0;
  const separatorCount = (cleaned.match(/[.,]/g) || []).length;
  // A single separator followed by more than three digits is a decimal
  // formula result (for example 247204.55000000002), not a thousands group.
  // A single separator followed by 1–2 digits is also decimal notation.
  if (fractionalDigits > 0 && (fractionalDigits <= 2 || (separatorCount === 1 && fractionalDigits > 3))) {
    const integerPart = cleaned.slice(0, decimalIndex).replace(/[.,]/g, '');
    return normalizeParsedNumber(Number(`${integerPart}.${cleaned.slice(decimalIndex + 1)}`));
  }
  return normalizeParsedNumber(Number(cleaned.replace(/[.,]/g, '')));
};

const normalizeEmployeeCode = (value: string) => value.toUpperCase().replace(/\s*[-–—]\s*/g, '-').replace(/\s+/g, '');

const normalizeEmployeeName = (value: string) =>
  value
    .replace(/[Đđ]/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

const isPayrollSummaryName = (value: string) =>
  ['tong cong', 'total', 'grand total'].includes(normalizeEmployeeName(value));

const workbookCellValue = (cell: unknown) => {
  if (typeof cell === 'number') {
    return Number.isFinite(cell) ? String(normalizeParsedNumber(cell)) : '';
  }
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  return String(cell ?? '').replace(/[\t\r\n]+/g, ' ');
};

const detectPayrollPeriod = (rows: unknown[][]) => {
  for (const row of rows.slice(0, 8)) {
    for (const cell of row) {
      const match = String(cell ?? '').match(/th[aá]ng\s*(\d{1,2})\s*[-/]\s*(\d{4})/i);
      if (!match) continue;
      const month = Number(match[1]);
      const year = Number(match[2]);
      if (month >= 1 && month <= 12 && year >= 2000 && year <= 2100) return { month, year };
    }
  }
  return null;
};

const DECIMAL_FIELDS = new Set<PayrollImportField>([
  'standard_work_days', 'actual_work_days', 'annual_leave_used_days', 'annual_leave_remaining_days',
  'policy_leave_days', 'paid_work_days', 'ot_hours', 'dependents_count',
]);
const TEXT_FIELDS = new Set<PayrollImportField>(['payment_status', 'note', 'employee_id', 'employee_name']);

// mapped: recognised · merged: several money columns summed into one field
// (e.g. "Lương OT" + "Phụ cấp thiết kế OT") · duplicate: non-money field
// claimed twice (blocks saving) · unknown: not recognised, ignored · ignored: STT/Vị trí.
type ColumnStatus = 'mapped' | 'merged' | 'duplicate' | 'unknown' | 'ignored';

type ParsedPayrollRow = {
  rowNumber: number;
  row: Record<string, string | number>;
  displayValues: string[];
  issues: Array<{ column: number; message: string }>;
};

type ParsedPayroll = {
  headers: string[];
  fields: Array<PayrollImportField | undefined>;
  statuses: ColumnStatus[];
  rows: ParsedPayrollRow[];
  blockingIssues: string[];
};

function parsePayrollTable(table: string[][]): ParsedPayroll {
  const headerIndex = table.findIndex((cells) => cells.some((cell) => {
    const field = matchPayrollHeader(cell);
    return field === 'employee_id' || field === 'employee_name';
  }));
  if (headerIndex < 0) {
    return { headers: [], fields: [], statuses: [], rows: [], blockingIssues: ['Không tìm thấy dòng tiêu đề có cột "Mã nhân viên" hoặc "Họ Tên".'] };
  }
  const headers = table[headerIndex];
  const matched = headers.map(matchPayrollHeader);
  const fields = matched.map((field) => (field === 'ignore' ? undefined : field));
  const statuses: ColumnStatus[] = matched.map((field, column) => (!headers[column] || field === 'ignore' ? 'ignored' : field ? 'mapped' : 'unknown'));
  const blockingIssues: string[] = [];
  const firstColumn = new Map<PayrollImportField, number>();
  fields.forEach((field, column) => {
    if (!field) return;
    const first = firstColumn.get(field);
    if (first === undefined) {
      firstColumn.set(field, column);
    } else if (PAYROLL_MONEY_FIELDS.has(field)) {
      statuses[first] = 'merged';
      statuses[column] = 'merged';
    } else {
      statuses[first] = 'duplicate';
      statuses[column] = 'duplicate';
      blockingIssues.push(`Cột "${headers[first]}" và "${headers[column]}" cùng được hiểu là "${PAYROLL_FIELD_LABELS[field] ?? field}" — đổi tên một cột rồi kiểm tra lại.`);
    }
  });

  const rows = table.slice(headerIndex + 1).map((cells, index): ParsedPayrollRow => {
    const values = [...cells];
    while (values.length > headers.length && values[values.length - 1] === '') values.pop();
    const issues: ParsedPayrollRow['issues'] = [];
    if (values.length > headers.length) {
      issues.push({ column: -1, message: `Dòng có ${values.length} ô nhưng tiêu đề chỉ có ${headers.length} cột — dữ liệu bị lệch cột.` });
    }
    const row: Record<string, string | number> = {};
    fields.forEach((field, column) => {
      if (!field) return;
      const raw = values[column]?.trim() || '';
      if (TEXT_FIELDS.has(field)) {
        row[field] = raw;
        return;
      }
      if (raw && raw !== '-' && !/[0-9]/.test(raw)) {
        issues.push({ column, message: `Ô "${headers[column]}" không phải số ("${raw}").` });
      }
      const parsed = numberValue(raw, DECIMAL_FIELDS.has(field));
      row[field] = statuses[column] === 'merged' && field in row ? Number(row[field]) + parsed : parsed;
    });
    return { rowNumber: headerIndex + index + 2, row, displayValues: headers.map((_header, column) => values[column] ?? ''), issues };
  });
  return { headers, fields, statuses, rows, blockingIssues };
}

const parsePayrollPaste = (text: string) => parsePayrollTable(parseDelimited(text.trim()));

type PreviewColumn = {
  label: string;
  field?: PayrollImportField;
  status: ColumnStatus;
};

// The import record keeps every monetary value as a number.  Formatting is
// only applied to the review table so that values remain safe for validation,
// calculations, and the eventual database upsert.
const PAYROLL_MONEY_FIELDS = new Set<PayrollImportField>([
  'base_salary',
  'workday_salary',
  'lunch_allowance',
  'phone_allowance',
  'gross_income',
  'bhxh_deduction',
  'bhyt_deduction',
  'bhtn_deduction',
  'personal_income_tax',
  'net_salary',
  'kpi_bonus',
  'ot_pay',
  'project_bonus_amount',
  'holiday_bonus_amount',
  'family_deduction',
  'taxable_income',
  'welfare_refund',
  'business_trip_refund',
  'personal_income_tax_refund',
  'prior_month_adjustment',
  'advance_payment',
  'other_deductions',
]);

if (import.meta.env.DEV) {
  // Template from Kế toán T09/2026, pasted from Excel (multi-line header cell,
  // decimal comma, "-" for zero, one row shifted by an extra empty cell).
  const sample = parsePayrollPaste([
    'STT\tMã nhân viên\tHọ Tên\tVị trí\tLàm việc\tNgày nghỉ\tNghỉ chế độ\tTổng\tLương cơ bản\tHỗ trợ điện thoại\tHỗ trợ ăn trưa\tOT ngày lễ (giờ)\tLương + Phụ cấp thiết kế OT\tThưởng lễ (số 4)\tPhụ cấp thiết kế (thay cho thưởng KPI sản phẩm)\tTổng cộng\t"NV BHXH + BHYT + BHTN',
    '(10.5%)"\tThuế TNCN\tThu nhập ròng',
    '1\tOF - 03\tTrân Hoàng Khánh Vi\tTrưởng nhóm thiết kế\t22\t\t2\t24\t7000000\t550000\t1200000\t17,6\t5375000\t200000\t13719500\t28044500\t735000\t234225\t27075275',
    '8\tOF - 09\tNguyễn Xuân Hoàng Thịnh\t\tNhân viên xử lý Video\t22\t\t2\t24\t5310000\t550000\t1200000\t-\t0\t200000\t13650000\t20910000\t557550\t155123\t20197327',
  ].join('\n'));
  const first = sample.rows[0];
  console.assert(
    sample.blockingIssues.length === 0 && sample.statuses.every((status) => status === 'mapped' || status === 'ignored')
      && first.issues.length === 0 && first.row.ot_hours === 17.6 && first.row.ot_pay === 5375000 && first.row.kpi_bonus === 13719500
      && first.row.bhxh_deduction === 735000 && first.row.net_salary === 27075275 && first.row.paid_work_days === 24,
    'Payroll template paste self-check failed',
  );
  console.assert(sample.rows[1].issues.length > 0, 'Payroll shifted row self-check failed');
  const twoOtColumns = parsePayrollPaste('Họ Tên\tLương OT\tPhụ cấp thiết kế OT\nA\t1925000\t3450000');
  console.assert(twoOtColumns.rows[0].row.ot_pay === 5375000 && twoOtColumns.statuses[1] === 'merged', 'Payroll merged OT columns self-check failed');
}

const previewMoneyFormatter = new Intl.NumberFormat('en-US', {
  useGrouping: true,
  maximumFractionDigits: 0,
});

const formatPreviewCell = (value: string, field?: PayrollImportField) => {
  if (!field || !PAYROLL_MONEY_FIELDS.has(field)) return value;
  const raw = value.trim();
  // Preserve blank cells and non-numeric placeholders exactly as supplied.
  if (!raw || !/[0-9]/.test(raw)) return value;
  const parsed = numberValue(raw);
  return Number.isFinite(parsed) ? previewMoneyFormatter.format(parsed) : value;
};

if (import.meta.env.DEV) {
  console.assert(previewMoneyFormatter.format(19811702.128) === '19,811,702', 'Payroll preview rounding self-check failed');
}

const COLUMN_STATUS_CLASS: Record<ColumnStatus, string> = {
  mapped: 'text-success-700',
  merged: 'text-amber-700',
  duplicate: 'text-rose-700',
  unknown: 'text-amber-700',
  ignored: 'text-slate-400',
};

// Exact template header → short "✓ Khớp"; a fuzzy match spells out the field it was read as.
const columnStatusText = ({ label, field, status }: PreviewColumn) => {
  if (status === 'unknown') return 'Không nhận diện';
  if (status === 'ignored') return 'Bỏ qua';
  const fieldLabel = field ? PAYROLL_FIELD_LABELS[field] ?? field : '';
  if (status === 'merged') return `→ ${fieldLabel} (cộng dồn)`;
  if (status === 'duplicate') return `→ ${fieldLabel} (trùng)`;
  return normalizeHeader(label) === normalizeHeader(fieldLabel) ? '✓ Khớp' : `→ ${fieldLabel}`;
};

type PreviewRow = {
  rowNumber: number;
  employeeName: string;
  displayValues: string[];
  conflictColumns?: number[];
  record?: TablesInsert<'payroll_records'>;
  error?: string;
  warning?: string;
  isSummary?: boolean;
};

export const AdminPayrollView: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { showToast, setSelectedPayslipId } = useHR();
  const { formatMoney } = useMoneyVisibility();
  const { t } = useI18n();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [sourceName, setSourceName] = useState('Dán từ Excel');
  const [paste, setPaste] = useState('');
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [previewColumns, setPreviewColumns] = useState<PreviewColumn[]>([]);
  const [importIssues, setImportIssues] = useState<string[]>([]);
  const [approvalDialog, setApprovalDialog] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isPayrollFormOpen, setIsPayrollFormOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [recordToDelete, setRecordToDelete] = useState<{
    id: string;
    employee_id: string;
    month: number;
    year: number;
    publish_status: string;
    employees: { full_name: string } | null;
  } | null>(null);
  const { data: employeesData } = useEmployees();
  const { data: holidaysData } = useCompanyHolidays();
  const { data: workdayOverride } = useCompanyWorkdayOverride(selectedMonth, selectedYear);
  const { data: companySettings } = useCompanySettings();
  const { data: recordsData } = useAllPayrollRecords(selectedMonth, selectedYear);
  const importPayroll = useImportPayrollRecords();
  const deletePayroll = useDeletePayrollRecord();
  const submitPayroll = useSubmitPayrollMonth();
  const approvePayroll = useApprovePayrollMonth();
  const rejectPayroll = useRejectPayrollMonth();
  const processNotifications = useProcessPayslipNotifications();
  const retryNotification = useRetryPayslipNotification();

  const employees = useMemo(() => employeesData || [], [employeesData]);
  const records = useMemo(() => recordsData || [], [recordsData]);
  const workDaysInfo = useMemo(
    () => getMonthWorkDays(selectedMonth, selectedYear, (holidaysData || []).map((holiday) => holiday.date)),
    [holidaysData, selectedMonth, selectedYear],
  );
  const visibleRecords = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('vi-VN');
    if (!normalizedSearch) return records;
    return records.filter((record) => [
      record.employees?.employee_code,
      record.employees?.full_name,
      record.employees?.job_title,
    ].some((value) => value?.toLocaleLowerCase('vi-VN').includes(normalizedSearch)));
  }, [records, searchTerm]);
  const hasPendingRecords = records.some((record) => record.publish_status === 'pending_approval');
  const hasPublishedRecords = records.some((record) => record.publish_status === 'published');
  const hasEditableRecords = records.some((record) => record.publish_status === 'draft' || record.publish_status === 'rejected');
  // Import only conflicts with employees who already have a locked (pending/
  // published) record THIS month — one employee already being approved must
  // not block everyone else from being imported into the same month.
  const lockedEmployeeIds = useMemo(
    () => new Set(records.filter((record) => record.publish_status === 'pending_approval' || record.publish_status === 'published').map((record) => record.employee_id)),
    [records]
  );
  const importablePreviewCount = preview.filter((row) => !row.isSummary).length;
  const validPreviewCount = preview.filter((row) => !row.isSummary && !row.error && row.record).length;
  const lockedPreviewCount = preview.filter((row) => !row.isSummary && !row.error && row.record && lockedEmployeeIds.has(row.record.employee_id)).length;
  const importableValidCount = validPreviewCount - lockedPreviewCount;
  const invalidPreviewCount = importablePreviewCount - validPreviewCount;
  const totals = records.reduce(
    (sum, record) => ({
      gross: sum.gross + record.gross_income,
      insurance: sum.insurance + record.bhxh_deduction + record.bhyt_deduction + record.bhtn_deduction,
      pit: sum.pit + record.personal_income_tax,
      net: sum.net + record.net_salary,
    }),
    { gross: 0, insurance: 0, pit: 0, net: 0 },
  );

  const buildPreview = (
    text: string,
    importSource = sourceName,
    period = { month: selectedMonth, year: selectedYear },
  ) => {
    const seen = new Set<string>();
    const seenEmployeeIds = new Set<string>();
    const parsed = parsePayrollPaste(text);
    setPreviewColumns(parsed.headers.map((label, index) => ({ label, field: parsed.fields[index], status: parsed.statuses[index] })));
    setImportIssues(parsed.blockingIssues);
    const columnOf = (field: PayrollImportField) => parsed.fields.indexOf(field);
    const next = parsed.rows
      .filter(({ row }) => {
        const employeeCode = String(row.employee_id || '').trim();
        const employeeName = String(row.employee_name || '').trim();
        return Boolean(employeeCode) || Boolean(employeeName);
      })
      .map(({ rowNumber, row, displayValues, issues }): PreviewRow => {
      const employeeCode = String(row.employee_id || '').trim();
      const importedEmployeeName = String(row.employee_name || '').trim();
      if (isPayrollSummaryName(importedEmployeeName) || isPayrollSummaryName(employeeCode)) {
        return {
          rowNumber,
          employeeName: importedEmployeeName,
          displayValues,
          isSummary: true,
        };
      }
      const normalizedEmployeeCode = normalizeEmployeeCode(employeeCode);
      const codeMatch = employees.find((item) => normalizeEmployeeCode(item.employee_code) === normalizedEmployeeCode);
      const nameMatches = importedEmployeeName
        ? employees.filter((item) => normalizeEmployeeName(item.full_name) === normalizeEmployeeName(importedEmployeeName))
        : [];
      // The supplied workbook currently carries legacy MSNV values. Use an
      // exact, unique name as the temporary bridge; retain code matching as a
      // fallback when a name is absent, and reject contradictory identifiers.
      let employee = nameMatches.length === 1 ? nameMatches[0] : codeMatch;
      let warning: string | undefined;
      let error: string | undefined;

      if (nameMatches.length === 1 && !codeMatch) {
        warning = `MSNV ${employeeCode || '(trống)'} chưa khớp mã hồ sơ; đã khớp duy nhất theo họ tên.`;
      } else if (nameMatches.length === 1 && codeMatch && codeMatch.id !== nameMatches[0].id) {
        error = `Tên ${importedEmployeeName} khớp hồ sơ ${nameMatches[0].employee_code}, nhưng MSNV ${employeeCode} thuộc hồ sơ ${codeMatch.full_name}; cần sửa file trước khi lưu.`;
      } else if (!employee && nameMatches.length > 1) {
        error = `Họ tên trong file trùng nhiều nhân viên, cần bổ sung MSNV đúng.`;
      }

      const derivedGross = Number(row.workday_salary || row.base_salary || 0)
        + Number(row.lunch_allowance || 0)
        + Number(row.phone_allowance || 0)
        + Number(row.kpi_bonus || 0)
        + Number(row.ot_pay || 0)
        + Number(row.project_bonus_amount || 0)
        + Number(row.holiday_bonus_amount || 0);
      const gross = 'gross_income' in row ? Number(row.gross_income || 0) : derivedGross;
      const conflicts = [...issues];
      if ('gross_income' in row && Math.abs(gross - derivedGross) > 1) {
        conflicts.push({
          column: columnOf('gross_income'),
          message: `"${parsed.headers[columnOf('gross_income')]}" trong file (${previewMoneyFormatter.format(gross)}) khác tổng các khoản thu nhập (${previewMoneyFormatter.format(derivedGross)}).`,
        });
      }
      // Standard days always follow the month's rule (Quy chuẩn ngày công),
      // never a value from the file.
      const standardWorkDays = workdayOverride && workdayOverride.month === period.month && workdayOverride.year === period.year
        ? workdayOverride.standard_work_days
        : getMonthWorkDays(period.month, period.year, (holidaysData || []).map((holiday) => holiday.date)).standardWorkDays;
      const totalDeductions = Number(row.bhxh_deduction || 0)
        + Number(row.bhyt_deduction || 0)
        + Number(row.bhtn_deduction || 0)
        + Number(row.personal_income_tax || 0)
        + Number(row.advance_payment || 0)
        + Number(row.other_deductions || 0);
      const totalAdjustments = Number(row.welfare_refund || 0)
        + Number(row.business_trip_refund || 0)
        + Number(row.personal_income_tax_refund || 0)
        + Number(row.prior_month_adjustment || 0);
      const finalNet = gross - totalDeductions + totalAdjustments;
      const insurance = Number(row.bhxh_deduction || 0) + Number(row.bhyt_deduction || 0) + Number(row.bhtn_deduction || 0);
      const familyDeduction = 'family_deduction' in row
        ? Number(row.family_deduction || 0)
        : calcFamilyDeduction(Number(row.dependents_count || 0), companySettings);
      const taxableIncome = 'taxable_income' in row
        ? Number(row.taxable_income || 0)
        : calcTaxableIncome({
          gross,
          lunchAllowance: Number(row.lunch_allowance || 0),
          phoneAllowance: Number(row.phone_allowance || 0),
          insurance,
          familyDeduction,
        });
      // An unrecognised column is ignored, so cross-check against the file's
      // own net and refuse rows that drift.
      const fileNet = 'net_salary' in row ? Number(row.net_salary || 0) : null;
      if (fileNet !== null && Math.abs(fileNet - finalNet) > 1 && Math.abs(fileNet - (gross - totalDeductions)) > 1) {
        const unknown = parsed.headers.filter((_header, column) => parsed.statuses[column] === 'unknown');
        conflicts.push({
          column: columnOf('net_salary'),
          message: `"${parsed.headers[columnOf('net_salary')]}" trong file (${previewMoneyFormatter.format(fileNet)}) lệch với hệ thống tính (${previewMoneyFormatter.format(finalNet)})${unknown.length ? `; kiểm tra cột chưa nhận diện: ${unknown.join(', ')}` : ''}.`,
        });
      }
      if (!employee) {
        error = error || (nameMatches.length > 1
          ? `Họ tên trong file trùng nhiều nhân viên, cần bổ sung MSNV đúng.`
          : `Không tìm thấy nhân viên theo họ tên${employeeCode ? ` hoặc MSNV ${employeeCode}` : ''}`);
      }
      else if (!error && normalizedEmployeeCode && seen.has(normalizedEmployeeCode)) error = 'Mã nhân viên bị trùng trong file';
      else if (!error && seenEmployeeIds.has(employee.id)) error = 'Nhân viên bị trùng trong file (nhiều MSNV cùng trỏ một hồ sơ)';
      else if (!error && (!Number.isFinite(gross) || !Number.isFinite(finalNet) || gross < 0 || finalNet < 0)) error = 'Gross/Net không hợp lệ';
      else if (!error && conflicts.length) error = conflicts.map((conflict) => conflict.message).join(' ');
      const existingCustomCount = employee
        ? readCustomItems(records.find((record) => record.employee_id === employee.id)?.custom_items).length
        : 0;
      if (!error && existingCustomCount) {
        warning = [warning, `Phiếu hiện có ${existingCustomCount} khoản tùy chỉnh sẽ bị xóa khi nhập đè.`].filter(Boolean).join(' ');
      }
      if (normalizedEmployeeCode) seen.add(normalizedEmployeeCode);
      if (employee) seenEmployeeIds.add(employee.id);

      return {
        rowNumber,
        employeeName: employee?.full_name || '—',
        displayValues,
        conflictColumns: conflicts.map((conflict) => conflict.column),
        error,
        warning,
        record: {
          company_id: profile?.companyId || '',
          employee_id: employee?.id || '',
          month: period.month,
          year: period.year,
          gross_income: gross,
          net_salary: finalNet,
          base_salary: Number(row.base_salary || 0),
          standard_work_days: standardWorkDays,
          actual_work_days: Number(row.actual_work_days || 0),
          // The template's "Lương cơ bản" is already prorated by working days.
          workday_salary: Number(row.workday_salary || row.base_salary || 0),
          policy_leave_days: Number(row.policy_leave_days || 0),
          paid_work_days: Number(row.paid_work_days || 0) || Number(row.actual_work_days || 0) + Number(row.policy_leave_days || 0),
          ot_hours: Number(row.ot_hours || 0),
          custom_items: [],
          annual_leave_used_days: Number(row.annual_leave_used_days || 0),
          annual_leave_remaining_days: Number(row.annual_leave_remaining_days || 0),
          dependents_count: Number(row.dependents_count || 0),
          bhxh_deduction: Number(row.bhxh_deduction || 0),
          bhyt_deduction: Number(row.bhyt_deduction || 0),
          bhtn_deduction: Number(row.bhtn_deduction || 0),
          personal_income_tax: Number(row.personal_income_tax || 0),
          family_deduction: familyDeduction,
          taxable_income: taxableIncome,
          kpi_bonus: Number(row.kpi_bonus || 0),
          ot_pay: Number(row.ot_pay || 0),
          phone_allowance: Number(row.phone_allowance || 0),
          lunch_allowance: Number(row.lunch_allowance || 0),
          project_bonus_amount: Number(row.project_bonus_amount || 0),
          holiday_bonus_amount: Number(row.holiday_bonus_amount || 0),
          prior_month_adjustment: Number(row.prior_month_adjustment || 0),
          welfare_refund: Number(row.welfare_refund || 0),
          business_trip_refund: Number(row.business_trip_refund || 0),
          personal_income_tax_refund: Number(row.personal_income_tax_refund || 0),
          advance_payment: Number(row.advance_payment || 0),
          other_deductions: Number(row.other_deductions || 0),
          payment_status: String(row.payment_status || 'Chờ thanh toán'),
          note: row.note ? String(row.note) : null,
          publish_status: 'draft',
          import_source_name: importSource,
        },
      };
    });
    setPreview(next);
  };

  const selectPeriod = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    if (preview.length) buildPreview(paste, sourceName, { month, year });
  };

  // File selection can finish before the employee query. Re-run the preview
  // once the master list arrives so a valid workbook is not incorrectly shown
  // as "Không tìm thấy mã nhân viên" simply because the query was still loading.
  useEffect(() => {
    if (!paste.trim() || !employees.length || !preview.length) return;
    if (!preview.some((row) => row.error?.startsWith('Không tìm thấy'))) return;
    buildPreview(paste, sourceName, { month: selectedMonth, year: selectedYear });
    // buildPreview is intentionally recreated with the current form state;
    // rerunning only when its data inputs change avoids a render loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees.length, paste, preview.length, selectedMonth, selectedYear, sourceName]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    // getUserFacingError hides plain Error messages, so tell the user directly.
    if (file.name.toLowerCase().endsWith('.xls')) {
      showToast('File .xls (Excel 97-2003) chưa được hỗ trợ. Mở file và Lưu thành .xlsx, hoặc bôi đen bảng lương rồi dán vào ô bên dưới.');
      return;
    }
    try {
      setSourceName(file.name);
      if (file.name.toLowerCase().endsWith('.xlsx')) {
        const { default: readWorkbook } = await import('read-excel-file/browser');
        const sheets = await readWorkbook(file);
        const payrollSheet = sheets.find((sheet) => normalizeHeader(sheet.sheet).includes('bang_luong')) ?? sheets[0];
        if (!payrollSheet) throw new Error('File Excel không có worksheet nào.');
        // The template's title row may still read "THÁNG MM-YYYY"; fall back
        // to the period selected on screen instead of rejecting the file.
        const period = detectPayrollPeriod(payrollSheet.data) ?? { month: selectedMonth, year: selectedYear };
        setSelectedMonth(period.month);
        setSelectedYear(period.year);
        const text = payrollSheet.data.map((row) => row.map(workbookCellValue).join('\t')).join('\n');
        setPaste(text);
        buildPreview(text, `${file.name} • ${payrollSheet.sheet}`, period);
        return;
      }
      const text = await file.text();
      setPaste(text);
      buildPreview(text, file.name);
    } catch (error) {
      setPreview([]);
      setPreviewColumns([]);
      setImportIssues([]);
      showToast(await getUserFacingError(error, 'Không thể đọc file payroll. Vui lòng thử lại.'));
    }
  };

  const handleImport = async () => {
    const valid = preview
      .filter((row): row is PreviewRow & { record: TablesInsert<'payroll_records'> } => !row.isSummary && !row.error && Boolean(row.record))
      .map((row) => row.record)
      .filter((record) => !lockedEmployeeIds.has(record.employee_id));
    if (!valid.length) return;
    try {
      await importPayroll.mutateAsync(valid);
      const skippedNotes = [
        invalidPreviewCount ? `bỏ qua ${invalidPreviewCount} dòng lỗi` : '',
        lockedPreviewCount ? `bỏ qua ${lockedPreviewCount} dòng đã chờ duyệt/đã phát hành` : '',
      ].filter(Boolean).join('; ');
      showToast(`Đã lưu ${valid.length} phiếu lương nháp${skippedNotes ? `; ${skippedNotes}` : ''}.`);
      setPreview([]);
      setPreviewColumns([]);
      setImportIssues([]);
      setPaste('');
    } catch (error) {
      showToast(await getUserFacingError(error, 'Không thể nhập payroll. Vui lòng thử lại.'));
    }
  };

  const handleSubmitForApproval = async () => {
    if (!records.length) return;
    try {
      await submitPayroll.mutateAsync({ month: selectedMonth, year: selectedYear });
      showToast(`Đã gửi payroll Tháng ${selectedMonth}/${selectedYear} cho Admin duyệt.`);
    } catch (error) {
      showToast(await getUserFacingError(error, 'Không thể gửi duyệt payroll. Vui lòng thử lại.'));
    }
  };

  const handleApprovalDecision = async () => {
    if (!isAdmin || !approvalDialog) return;
    try {
      if (approvalDialog === 'approve') {
        await approvePayroll.mutateAsync({ month: selectedMonth, year: selectedYear });
        setApprovalDialog(null);
        setRejectionReason('');
        void processNotifications.mutateAsync({ limit: 25 }).then((delivery) => {
          const failed = delivery?.results.filter((result) => result.status === 'failed').length ?? 0;
          showToast(failed > 0
            ? `Đã phát hành payroll; ${failed} phiếu chưa xử lý được và đã vào hàng đợi retry.`
            : `Đã duyệt, phát hành và xử lý ${delivery?.processed ?? 0} phiếu lương.`);
        }).catch(() => {
          showToast('Đã phát hành payroll. Hàng đợi PDF/email chưa chạy được; Admin có thể bấm gửi lại sau.');
        });
        return;
      } else {
        await rejectPayroll.mutateAsync({ month: selectedMonth, year: selectedYear, reason: rejectionReason.trim() });
        showToast(`Đã trả lại payroll Tháng ${selectedMonth}/${selectedYear} cho HR/Kế toán.`);
      }
      setApprovalDialog(null);
      setRejectionReason('');
    } catch (error) {
      showToast(await getUserFacingError(error, 'Không thể xử lý phê duyệt payroll. Vui lòng thử lại.'));
    }
  };

  const handleRetryNotification = async (payrollId: string) => {
    if (!isAdmin) return;
    try {
      await retryNotification.mutateAsync(payrollId);
      const delivery = await processNotifications.mutateAsync({ payrollId, limit: 1 });
      const result = delivery?.results[0];
      showToast(result?.status === 'sent'
        ? 'Đã tạo PDF và gửi lại email phiếu lương.'
        : result?.status === 'skipped'
          ? 'Đã tạo PDF nhưng chưa có email nhận phiếu lương.'
          : result?.status === 'failed'
            ? 'Chưa xử lý được phiếu lương. Hệ thống sẽ tự thử lại.'
            : 'Đã đưa phiếu lương vào hàng đợi xử lý.');
    } catch (error) {
      showToast(await getUserFacingError(error, 'Không thể gửi lại phiếu lương. Vui lòng thử lại.'));
    }
  };

  const handleDeletePayroll = async () => {
    if (!recordToDelete) return;
    try {
      await deletePayroll.mutateAsync(recordToDelete.id);
      showToast(`Đã xóa phiếu lương của ${recordToDelete.employees?.full_name || 'nhân viên'} khỏi kỳ ${recordToDelete.month}/${recordToDelete.year}.`);
      setRecordToDelete(null);
    } catch (error) {
      showToast(await getUserFacingError(error, 'Không thể xóa phiếu lương. Vui lòng thử lại.'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('payroll.title')}</h1>
          <p className="text-sm text-slate-600">{t('payroll.description')}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingEmployeeId(employees[0]?.id || '');
              setIsPayrollFormOpen(true);
            }}
            disabled={!employees.length}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-3 py-2 text-xs font-bold text-white shadow-md shadow-primary-600/20 transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> {t('payroll.add')}
          </button>
          <select value={selectedMonth} onChange={(e) => selectPeriod(Number(e.target.value), selectedYear)} className="p-2 border rounded-xl text-sm">
            {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => <option key={month} value={month}>{t('common.month', { month })}</option>)}
          </select>
          <input type="number" value={selectedYear} onChange={(e) => selectPeriod(selectedMonth, Number(e.target.value))} className="w-24 p-2 border rounded-xl text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label={t('payroll.grossTotal')} value={totals.gross} showToggle />
        <Metric label={t('payroll.insuranceTotal')} value={totals.insurance} tone="rose" />
        <Metric label={t('payroll.pitTotal')} value={totals.pit} tone="primary" />
        <Metric label={t('payroll.netTotal')} value={totals.net} tone="success" />
      </div>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">{t('payroll.tableTitle', { month: selectedMonth, year: selectedYear })}</h2>
            <p className="text-xs text-slate-500">{t('payroll.tableHelp')}</p>
          </div>
          <label className="relative block w-full lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={t('payroll.search')} className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-xs outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
          </label>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl bg-success-800 px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-success-100" />
            <div>
              <p className="text-xs font-extrabold">{t('payroll.workdayRule', { month: selectedMonth, year: selectedYear })}</p>
              <p className="mt-0.5 text-[11px] text-success-100">{getWorkDaysFormulaText(workDaysInfo)}</p>
            </div>
          </div>
          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-right">
            <span className="block text-[10px] font-bold uppercase tracking-wide text-success-100">{t('payroll.standardDays')}</span>
            <strong className="text-base">{t('payroll.workdayUnit', { count: workdayOverride?.standard_work_days ?? workDaysInfo.standardWorkDays })}</strong>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-[1780px] w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="p-3">{t('payroll.employeeCode')}</th><th className="p-3">{t('payroll.employeePosition')}</th><th className="p-3 text-center">{t('payroll.days')}</th>
                <th className="p-3 text-right">{t('payroll.baseSalary')}</th><th className="p-3 text-right">{t('payroll.phoneAllowance')}</th><th className="p-3 text-right">{t('payroll.lunchAllowance')}</th>
                <th className="p-3 text-right">{t('payroll.otBonus')}</th><th className="p-3 text-right">{t('payroll.holidayBonus')}</th><th className="p-3 text-right">{t('payroll.kpiBonus')}</th>
                <th className="bg-slate-100 p-3 text-right">{t('payroll.grossIncome')}</th><th className="p-3 text-right text-rose-700">{t('payroll.insurance')}</th>
                <th className="p-3 text-right">{t('payroll.familyDeduction')}</th><th className="p-3 text-right text-primary-700">{t('payroll.pit')}</th><th className="bg-success-50 p-3 text-right text-success-800">{t('payroll.netIncome')}</th><th className="p-3 text-center">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRecords.length === 0 ? (
                <tr><td colSpan={15} className="p-8 text-center text-slate-400">{records.length ? t('payroll.noSearchResult') : t('payroll.noRows')}</td></tr>
              ) : visibleRecords.map((record) => {
                const insurance = record.bhxh_deduction + record.bhyt_deduction + record.bhtn_deduction;
                const canEdit = record.publish_status === 'draft' || record.publish_status === 'rejected';
                const canDelete = isAdmin || canEdit;
                return <tr key={record.id} className="hover:bg-slate-50/70">
                  <td className="p-3 font-mono text-[11px] font-bold text-slate-700">{record.employees?.employee_code || '—'}</td>
                  <td className="p-3"><strong className="block text-slate-900">{record.employees?.full_name || '—'}</strong><span className="mt-0.5 block text-[10px] text-slate-500">{record.employees?.job_title || t('payroll.positionMissing')}</span></td>
                  <td className="p-3 text-center font-semibold text-slate-700">{record.actual_work_days} / {record.paid_work_days || record.actual_work_days + record.policy_leave_days}</td>
                  <td className="p-3 text-right font-semibold">{formatMoney(record.workday_salary || record.base_salary)}</td><td className="p-3 text-right text-slate-600">{formatMoney(record.phone_allowance)}</td><td className="p-3 text-right text-slate-600">{formatMoney(record.lunch_allowance)}</td>
                  <td className="p-3 text-right font-semibold text-success-800">{formatMoney(record.ot_pay + record.project_bonus_amount)}</td><td className="p-3 text-right font-semibold text-success-800">{formatMoney(record.holiday_bonus_amount)}</td><td className="p-3 text-right font-semibold text-success-800">{formatMoney(record.kpi_bonus)}</td>
                  <td className="bg-slate-50 p-3 text-right font-extrabold text-slate-900">{formatMoney(record.gross_income)}</td><td className="p-3 text-right font-semibold text-rose-700">−{formatMoney(insurance)}</td>
                  <td className="p-3 text-right text-slate-500">{formatMoney(record.family_deduction)}</td><td className="p-3 text-right font-semibold text-primary-700">−{formatMoney(record.personal_income_tax)}</td>
                  <td className="bg-success-50 p-3 text-right font-extrabold text-success-800">{formatMoney(record.net_salary)}</td>
                    <td className="p-3"><div className="flex items-center justify-center gap-1.5"><button type="button" onClick={() => { setEditingEmployeeId(record.employee_id); setIsPayrollFormOpen(true); }} disabled={!canEdit} className="inline-flex items-center gap-1 rounded-lg bg-primary-700 px-2.5 py-1.5 text-[10px] font-bold text-white transition hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-45" title={canEdit ? t('payroll.editTitle') : t('payroll.locked')}><Pencil className="h-3 w-3" />{t('payroll.edit')}</button><button type="button" onClick={() => setRecordToDelete(record)} disabled={!canDelete || deletePayroll.isPending} className="rounded-lg bg-rose-50 p-1.5 text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40" title={canDelete ? t('payroll.deleteTitle') : t('payroll.deleteLocked')} aria-label={canDelete ? t('payroll.deleteTitle') : t('payroll.deleteLocked')}><Trash2 className="h-3.5 w-3.5" /></button><button type="button" onClick={() => setSelectedPayslipId(record.id)} className="rounded-lg bg-slate-100 p-1.5 text-slate-700 transition hover:bg-slate-200" title={t('payroll.viewTitle')}><FileText className="h-3.5 w-3.5" /></button>{isAdmin && record.publish_status === 'published' && record.notification_status !== 'sent' && <button type="button" onClick={() => void handleRetryNotification(record.id)} disabled={retryNotification.isPending || processNotifications.isPending} className="rounded-lg bg-primary-50 p-1.5 text-primary-700 transition hover:bg-primary-100 disabled:opacity-50" title={t('payroll.retryEmail')}><Mail className="h-3.5 w-3.5" /></button>}</div></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-500">{t('payroll.visibleRows', { visible: visibleRecords.length, total: records.length })}</p>
      </section>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <ClipboardPaste className="w-5 h-5 text-primary-600" />
          <div>
            <h2 className="font-bold text-slate-900">{t('payroll.quickImport')}</h2>
            <p className="text-xs text-slate-500">{t('payroll.quickImportHelp')}</p>
            <p className="text-xs text-slate-500">{t('payroll.previewHelp')}</p>
          </div>
        </div>
        <fieldset className="flex flex-wrap items-end gap-2">
          <legend className="mb-1 text-xs font-bold text-slate-700">{t('payroll.importPeriod')}</legend>
          <select value={selectedMonth} onChange={(e) => selectPeriod(Number(e.target.value), selectedYear)} className="rounded-xl border border-slate-300 bg-white p-2 text-sm">
            {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => <option key={month} value={month}>{t('common.month', { month })}</option>)}
          </select>
          <input type="number" value={selectedYear} onChange={(e) => selectPeriod(selectedMonth, Number(e.target.value))} className="w-24 rounded-xl border border-slate-300 bg-white p-2 text-sm" aria-label={t('common.year', { year: selectedYear })} />
        </fieldset>
        <textarea
          rows={7}
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder={`Bôi đen bảng lương trong Excel (gồm dòng tiêu đề) rồi dán vào đây.\nCột theo file mẫu: ${PAYROLL_TEMPLATE_COLUMNS.map((column) => column.label).join(' · ')}`}
          className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl"
        />
        <div className="flex flex-wrap gap-2">
          <a href="/templates/Mau-bang-luong.xlsx" download className="px-4 py-2 border border-slate-300 bg-white rounded-xl text-xs font-bold flex items-center gap-2 text-slate-700 hover:bg-slate-50">
            <Download className="w-4 h-4" /> Tải file mẫu
          </a>
          <label className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-2">
            <Upload className="w-4 h-4" /> {t('payroll.chooseFile')}
            <input type="file" accept=".xlsx,.csv,.tsv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/tab-separated-values" className="hidden" onChange={(e) => { void handleFile(e.target.files?.[0]); e.currentTarget.value = ''; }} />
          </label>
          <button onClick={() => buildPreview(paste)} disabled={!paste.trim()} className="px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" /> {t('payroll.checkData')}
          </button>
          {preview.length > 0 && (
            <button onClick={() => void handleImport()} disabled={!importableValidCount || importIssues.length > 0 || importPayroll.isPending} className="px-4 py-2 bg-success-600 text-white rounded-xl text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50">
              {importPayroll.isPending ? t('payroll.saving') : t('payroll.saveDrafts', { count: importableValidCount })}
            </button>
          )}
        </div>

        {importIssues.length > 0 && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            <p className="font-bold">Không thể lưu — tiêu đề cột bị xung đột:</p>
            <ul className="mt-1 list-disc pl-5">{importIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
          </div>
        )}

        {previewColumns.some((column) => column.status === 'unknown' || column.status === 'merged') && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {previewColumns.some((column) => column.status === 'unknown') && <>Cột không nhận diện được, sẽ bị bỏ qua: <b>{previewColumns.filter((column) => column.status === 'unknown').map((column) => column.label).join(', ')}</b>. </>}
            {previewColumns.some((column) => column.status === 'merged') && <>Các cột được cộng dồn: <b>{previewColumns.filter((column) => column.status === 'merged').map((column) => column.label).join(' + ')}</b>.</>}
          </p>
        )}

        {invalidPreviewCount > 0 && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            Có {invalidPreviewCount} dòng lỗi sẽ được bỏ qua. Sửa các dòng được đánh dấu bên dưới nếu muốn nhập đủ toàn bộ file.
          </p>
        )}

        {lockedPreviewCount > 0 && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Có {lockedPreviewCount} dòng thuộc nhân viên đã có phiếu lương chờ duyệt/đã phát hành tháng này nên sẽ bị bỏ qua khi lưu. Admin cần trả lại phiếu lương của nhân viên đó trước nếu muốn nhập đè.
          </p>
        )}

        {preview.length > 0 && (
          <div className="overflow-x-auto border rounded-xl">
            <table className="min-w-max w-full text-left text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-2 whitespace-nowrap">{t('payroll.row')}</th>
                  {previewColumns.map((column, index) => (
                    <th key={`${column.label}-${index}`} className="p-2 whitespace-nowrap align-bottom">
                      {column.label || `Cột ${index + 1}`}
                      <span className={`mt-0.5 block text-[10px] font-semibold ${COLUMN_STATUS_CLASS[column.status]}`}>
                        {columnStatusText(column)}
                      </span>
                    </th>
                  ))}
                  <th className="p-2 whitespace-nowrap">{t('payroll.validation')}</th>
                </tr>
              </thead>
              <tbody>{preview.map((item) => (
                <tr key={item.rowNumber} className={`border-t ${item.isSummary ? 'bg-slate-50 font-bold' : ''}`}>
                  <td className="p-2">{item.rowNumber}</td>
                  {previewColumns.map((column, index) => {
                    // Render money with thousands separators for readability;
                    // the numeric value in `record` is unchanged and no
                    // currency symbol is added to the preview.
                    const value = formatPreviewCell(item.displayValues[index], column.field);
                    const isEmployeeName = column.field === 'employee_name';
                    const isConflict = item.conflictColumns?.includes(index);
                    return <td key={`${item.rowNumber}-${column.label}-${index}`} className={`p-2 whitespace-nowrap ${isEmployeeName ? 'font-bold' : ''} ${isConflict ? 'bg-rose-100 font-bold text-rose-800 ring-1 ring-inset ring-rose-400' : ''}`}>{value}</td>;
                  })}
                  <td className={`p-2 font-semibold ${item.error ? 'text-rose-700' : item.warning ? 'text-amber-700' : 'text-success-700'}`}>
                    {item.isSummary ? t('payroll.summary') : item.error || item.warning || t('payroll.valid')}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div><h2 className="font-bold text-slate-900">{t('payroll.approvalTitle', { month: selectedMonth, year: selectedYear })}</h2><p className="text-xs text-slate-500">{t('payroll.approvalHelp')}</p></div>
          <div className="flex flex-wrap justify-end gap-2">
            {hasEditableRecords && (
              <button onClick={handleSubmitForApproval} disabled={submitPayroll.isPending} className="px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-2">
                <Send className="w-4 h-4" /> {t('payroll.submit')}
              </button>
            )}
            {isAdmin && hasPendingRecords && (
              <>
                <button onClick={() => setApprovalDialog('reject')} className="px-4 py-2 border border-rose-300 bg-white text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" /> {t('payroll.reject')}
                </button>
                <button onClick={() => setApprovalDialog('approve')} className="px-4 py-2 bg-success-600 text-white rounded-xl text-xs font-bold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> {t('payroll.approve')}
                </button>
              </>
            )}
            {hasPublishedRecords && (
              <span className="inline-flex items-center gap-2 rounded-xl border border-success-200 bg-success-50 px-4 py-2 text-xs font-bold text-success-800">
                <CheckCircle2 className="h-4 w-4" /> {t('payroll.published')}
              </span>
            )}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <ApprovalSummary label={t('payroll.drafts')} value={records.filter((record) => record.publish_status === 'draft' || record.publish_status === 'rejected').length} />
          <ApprovalSummary label={t('payroll.pending')} value={records.filter((record) => record.publish_status === 'pending_approval').length} tone="amber" />
          <ApprovalSummary label={t('payroll.published')} value={records.filter((record) => record.publish_status === 'published').length} tone="success" />
        </div>
        {isAdmin && records.some((record) => record.publish_status === 'published' && record.notification_status !== 'sent') && (
          <div className="rounded-xl border border-primary-100 bg-primary-50 px-3 py-2 text-xs text-primary-900">
            Có phiếu lương đã phát hành chưa gửi email. Mở từng phiếu trong bảng tháng để tạo PDF / gửi lại.
          </div>
        )}
      </div>

      <ConfirmationDialog
        open={approvalDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setApprovalDialog(null);
            setRejectionReason('');
          }
        }}
        title={approvalDialog === 'approve' ? 'Duyệt và phát hành kỳ lương?' : 'Trả lại kỳ lương cho HR/Kế toán?'}
        description={approvalDialog === 'approve'
          ? `Toàn bộ phiếu lương Tháng ${selectedMonth}/${selectedYear} sẽ hiển thị cho từng nhân viên.`
          : `Kỳ lương Tháng ${selectedMonth}/${selectedYear} sẽ quay về trạng thái có thể chỉnh sửa.`}
        confirmLabel={approvalDialog === 'approve' ? 'Duyệt & phát hành' : 'Trả lại'}
        onConfirm={() => void handleApprovalDecision()}
        isPending={approvePayroll.isPending || rejectPayroll.isPending}
        isConfirmDisabled={approvalDialog === 'reject' && rejectionReason.trim().length < 3}
        variant={approvalDialog === 'reject' ? 'danger' : 'primary'}
      >
        {approvalDialog === 'reject' && (
          <label className="block text-sm font-semibold text-slate-700">Lý do trả lại
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm font-normal"
              placeholder="Ví dụ: Sai số tiền BHXH của nhân viên OF - 02"
            />
          </label>
        )}
      </ConfirmationDialog>

      <ConfirmationDialog
        open={Boolean(recordToDelete)}
        onOpenChange={(open) => !open && setRecordToDelete(null)}
        title={t('payroll.deleteConfirmTitle')}
        description={t('payroll.deleteConfirmDescription', {
          name: recordToDelete?.employees?.full_name || 'nhân viên',
          month: recordToDelete?.month || selectedMonth,
          year: recordToDelete?.year || selectedYear,
        })}
        confirmLabel={t('payroll.deleteConfirmButton')}
        variant="danger"
        isPending={deletePayroll.isPending}
        onConfirm={() => void handleDeletePayroll()}
      />

      <PayrollEntryModal
        open={isPayrollFormOpen}
        companyId={profile?.companyId}
        employees={employees}
        initialEmployeeId={editingEmployeeId || records[0]?.employee_id || employees[0]?.id || ''}
        initialMonth={selectedMonth}
        initialYear={selectedYear}
        existingRecords={records}
        onClose={() => setIsPayrollFormOpen(false)}
        onSaved={(month, year) => {
          setSelectedMonth(month);
          setSelectedYear(year);
          setIsPayrollFormOpen(false);
        }}
      />
    </div>
  );
};

const Metric: React.FC<{ label: string; value: number; tone?: 'rose' | 'primary' | 'success'; showToggle?: boolean }> = ({ label, value, tone, showToggle = false }) => {
  const { formatMoney } = useMoneyVisibility();
  const valueClass = tone === 'rose' ? 'text-rose-600' : tone === 'primary' ? 'text-primary-600' : tone === 'success' ? 'text-white' : 'text-slate-900';
  const cardClass = tone === 'success' ? 'border-success-700 bg-success-800' : 'border-slate-200 bg-white';
  const labelClass = tone === 'success' ? 'text-success-100' : 'text-slate-500';
  return <div className={`rounded-2xl border p-5 shadow-sm ${cardClass}`}><span className={`block text-[10px] font-bold uppercase tracking-wide ${labelClass}`}>{label}</span><div className={`mt-3 flex items-center justify-center gap-1 text-2xl font-black ${valueClass}`}>{formatMoney(value)}{showToggle && <MoneyVisibilityToggle className="h-6 w-6" />}</div></div>;
};

const ApprovalSummary: React.FC<{ label: string; value: number; tone?: 'amber' | 'success' }> = ({ label, value, tone }) => {
  const { t } = useI18n();
  const className = tone === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-800' : tone === 'success' ? 'border-success-200 bg-success-50 text-success-800' : 'border-slate-200 bg-slate-50 text-slate-700';
  return <div className={`rounded-xl border px-4 py-3 ${className}`}><span className="block text-[11px] font-semibold">{label}</span><strong className="mt-1 block text-2xl font-black">{t('payroll.payslipCount', { count: value })}</strong></div>;
};
