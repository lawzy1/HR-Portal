import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardPaste, FileSpreadsheet, Mail, Plus, RotateCcw, Send, ShieldCheck, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useHR } from '../../context/HRContext';
import { useEmployees } from '../../hooks/useEmployees';
import {
  useAllPayrollRecords,
  useApprovePayrollMonth,
  useImportPayrollRecords,
  useProcessPayslipNotifications,
  useRejectPayrollMonth,
  useRetryPayslipNotification,
  useSubmitPayrollMonth,
} from '../../hooks/usePayroll';
import type { TablesInsert } from '../../lib/database.types';
import { formatVND } from '../../utils/formatters';
import { ConfirmationDialog } from '../ConfirmationDialog';
import { PayrollEntryModal } from './PayrollEntryModal';

type PayrollImportField = keyof TablesInsert<'payroll_records'> | 'employee_name';

const HEADER_MAP: Record<string, PayrollImportField> = {
  msnv: 'employee_id',
  ma_nv: 'employee_id',
  ma_nhan_vien: 'employee_id',
  employee_code: 'employee_id',
  ten_nhan_vien: 'employee_name',
  employee_name: 'employee_name',
  luong_co_ban: 'base_salary',
  base_salary: 'base_salary',
  ngay_cong_chuan: 'standard_work_days',
  standard_work_days: 'standard_work_days',
  ngay_cong_thuc_te: 'actual_work_days',
  actual_work_days: 'actual_work_days',
  ngay_cong_thang: 'actual_work_days',
  so_ngay_nghi_phep_nam: 'annual_leave_used_days',
  phep_da_su_dung: 'annual_leave_used_days',
  phep_con_lai: 'annual_leave_remaining_days',
  nguoi_phu_thuoc: 'dependents_count',
  luong_ngay_cong: 'workday_salary',
  phu_cap_dien_thoai: 'phone_allowance',
  phone_allowance: 'phone_allowance',
  phu_cap_an_trua: 'lunch_allowance',
  lunch_allowance: 'lunch_allowance',
  gross: 'gross_income',
  tong_thu_nhap: 'gross_income',
  gross_income: 'gross_income',
  bhxh: 'bhxh_deduction',
  bhxh_10_5: 'bhxh_deduction',
  bhxh_bhyt_bhtn: 'bhxh_deduction',
  bhyt: 'bhyt_deduction',
  bhtn: 'bhtn_deduction',
  thue_tncn: 'personal_income_tax',
  personal_income_tax: 'personal_income_tax',
  thuc_linh: 'net_salary',
  net: 'net_salary',
  net_salary: 'net_salary',
  thuong_kpi: 'kpi_bonus',
  kpi_bonus: 'kpi_bonus',
  kpi: 'kpi_bonus',
  luong_ot: 'ot_pay',
  ot_pay: 'ot_pay',
  ot_thuong_du_an: 'ot_pay',
  thuong_ot_du_an: 'ot_pay',
  ot_thuong_du_an_5_gio_ot: 'ot_pay',
  thuong_du_an: 'project_bonus_amount',
  project_bonus_amount: 'project_bonus_amount',
  // The supplied TL Concepts workbook has one aggregate "Thưởng lễ + OT"
  // column. Keep it as the single OT/project income line to avoid splitting
  // or double-counting the same amount in the payslip.
  thuong_le_ot: 'ot_pay',
  thuong_le: 'holiday_bonus_amount',
  giam_tru_gia_canh: 'family_deduction',
  thu_nhap_chiu_thue_tncn: 'taxable_income',
  luong_thuc_nhan: 'net_salary',
  hoan_chi_phi_phuc_loi: 'welfare_refund',
  hoan_cong_tac_phi: 'business_trip_refund',
  hoan_thue_tncn: 'personal_income_tax_refund',
  truy_linh_dieu_chinh_ky_truoc: 'prior_month_adjustment',
  dieu_chinh_thang_truoc: 'prior_month_adjustment',
  prior_month_adjustment: 'prior_month_adjustment',
  tam_ung: 'advance_payment',
  advance_payment: 'advance_payment',
  khau_tru_khac: 'other_deductions',
  other_deductions: 'other_deductions',
  trang_thai_thanh_toan: 'payment_status',
  payment_status: 'payment_status',
  ghi_chu: 'note',
  note: 'note',
};

const normalizeHeader = (value: string) =>
  value
    // NFD does not transliterate Vietnamese Đ/đ, so normalize it explicitly
    // or headers such as "Phụ cấp điện thoại" will never map.
    .replace(/[Đđ]/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

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
  if (!cleaned) return 0;
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

const PAYROLL_STATUS_LABELS: Record<string, string> = {
  draft: 'Nháp',
  pending_approval: 'Chờ Admin duyệt',
  published: 'Đã duyệt & phát hành',
  rejected: 'Admin trả lại',
};

const NOTIFICATION_STATUS_LABELS: Record<string, string> = {
  not_queued: 'Chưa xếp hàng',
  pending: 'Đang chờ tạo PDF/email',
  sent: 'Đã gửi email',
  failed: 'Gửi lỗi',
  skipped: 'Có PDF, chưa gửi email',
};

type ParsedPayrollRow = {
  rowNumber: number;
  row: Record<string, string | number>;
  displayValues: string[];
};

type ParsedPayroll = {
  headers: string[];
  fields: Array<PayrollImportField | undefined>;
  rows: ParsedPayrollRow[];
};

function parsePayrollPaste(text: string): ParsedPayroll {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { headers: [], fields: [], rows: [] };
  const separator = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(separator).map((header) => header.trim());
  const normalizedHeaders = headers.map(normalizeHeader);
  const fields = normalizedHeaders.map((header) => HEADER_MAP[header]);
  const rows = lines.slice(1).map((line, index) => {
    const values = line.split(separator);
    const row: Record<string, string | number> = {};
    fields.forEach((field, column) => {
      if (!field) return;
      const raw = values[column]?.trim() || '';
      const parsed = ['payment_status', 'note', 'employee_id', 'employee_name'].includes(field)
        ? raw
        : numberValue(raw, field === 'standard_work_days' || field === 'actual_work_days');
      row[field] = parsed;
      // The supplied TL Concepts workbook has one "Ngày công/tháng" column.
      // Until Accounting supplies separate actual/standard columns, use that
      // single confirmed value for both so a payslip never shows 24 / 0 days.
      if (normalizedHeaders[column] === 'ngay_cong_thang') {
        row.standard_work_days = parsed;
        row.actual_work_days = parsed;
      }
    });
    return {
      rowNumber: index + 2,
      row,
      // Keep every source cell in the original column order for the review
      // table, including columns that are intentionally not persisted yet.
      displayValues: headers.map((_header, column) => values[column]?.trim() || ''),
    };
  });
  return { headers, fields, rows };
}

if (import.meta.env.DEV) {
  console.assert(
    parsePayrollPaste('MSNV\tGross\tThực lĩnh\nNV01\t20.000.000\t18.000.000').rows[0]?.row.net_salary === 18000000,
    'Payroll paste parser self-check failed',
  );
  console.assert(
    parsePayrollPaste('MSNV\tGross\tThực lĩnh\nNV01\t22000000\t21476886.45').rows[0]?.row.net_salary === 21476886.45,
    'Payroll decimal formula parser self-check failed',
  );
  const singleWorkdayValue = parsePayrollPaste('MSNV\tNgày công/tháng\tThực lĩnh\nNV01\t24\t18000000').rows[0]?.row;
  console.assert(
    singleWorkdayValue?.actual_work_days === 24 && singleWorkdayValue?.standard_work_days === 24,
    'Payroll single workday column parser self-check failed',
  );
  console.assert(
    parsePayrollPaste('MSNV\tPhụ cấp điện thoại\tThưởng lễ + OT\nOF-01\t550000\t100000').rows[0]?.row.phone_allowance === 550000
      && parsePayrollPaste('MSNV\tPhụ cấp điện thoại\tThưởng lễ + OT\nOF-01\t550000\t100000').rows[0]?.row.ot_pay === 100000,
    'Payroll Vietnamese header mapping self-check failed',
  );
  console.assert(
    parsePayrollPaste('MSNV\tThuế TNCN\nOF-01\t247204.55000000002').rows[0]?.row.personal_income_tax === 247204.55,
    'Payroll floating-point number parser self-check failed',
  );
}

type PreviewColumn = {
  label: string;
  field?: PayrollImportField;
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

const previewMoneyFormatter = new Intl.NumberFormat('en-US', {
  useGrouping: true,
  maximumFractionDigits: 20,
});

const formatPreviewCell = (value: string, field?: PayrollImportField) => {
  if (!field || !PAYROLL_MONEY_FIELDS.has(field)) return value;
  const raw = value.trim();
  // Preserve blank cells and non-numeric placeholders exactly as supplied.
  if (!raw || !/[0-9]/.test(raw)) return value;
  const parsed = numberValue(raw);
  return Number.isFinite(parsed) ? previewMoneyFormatter.format(parsed) : value;
};

type PreviewRow = {
  rowNumber: number;
  employeeName: string;
  displayValues: string[];
  record?: TablesInsert<'payroll_records'>;
  error?: string;
  warning?: string;
  isSummary?: boolean;
};

export const AdminPayrollView: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { showToast, setSelectedPayslipId } = useHR();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [sourceName, setSourceName] = useState('Dán từ Excel');
  const [paste, setPaste] = useState('');
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [previewColumns, setPreviewColumns] = useState<PreviewColumn[]>([]);
  const [approvalDialog, setApprovalDialog] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isPayrollFormOpen, setIsPayrollFormOpen] = useState(false);
  const { data: employeesData } = useEmployees();
  const { data: recordsData } = useAllPayrollRecords(selectedMonth, selectedYear);
  const importPayroll = useImportPayrollRecords();
  const submitPayroll = useSubmitPayrollMonth();
  const approvePayroll = useApprovePayrollMonth();
  const rejectPayroll = useRejectPayrollMonth();
  const processNotifications = useProcessPayslipNotifications();
  const retryNotification = useRetryPayslipNotification();

  const employees = useMemo(() => employeesData || [], [employeesData]);
  const records = recordsData || [];
  const hasPendingRecords = records.some((record) => record.publish_status === 'pending_approval');
  const hasPublishedRecords = records.some((record) => record.publish_status === 'published');
  const hasEditableRecords = records.some((record) => record.publish_status === 'draft' || record.publish_status === 'rejected');
  const importablePreviewCount = preview.filter((row) => !row.isSummary).length;
  const totals = records.reduce(
    (sum, record) => ({
      gross: sum.gross + record.gross_income,
      deductions:
        sum.deductions +
        record.bhxh_deduction +
        record.bhyt_deduction +
        record.bhtn_deduction +
        record.personal_income_tax +
        record.advance_payment +
        record.other_deductions,
      net: sum.net + record.net_salary,
    }),
    { gross: 0, deductions: 0, net: 0 },
  );

  const buildPreview = (
    text: string,
    importSource = sourceName,
    period = { month: selectedMonth, year: selectedYear },
  ) => {
    const seen = new Set<string>();
    const seenEmployeeIds = new Set<string>();
    const parsed = parsePayrollPaste(text);
    setPreviewColumns(parsed.headers.map((label, index) => ({ label, field: parsed.fields[index] })));
    const next = parsed.rows
      .filter(({ row }) => {
        const employeeCode = String(row.employee_id || '').trim();
        const employeeName = String(row.employee_name || '').trim();
        return Boolean(employeeCode) || Boolean(employeeName);
      })
      .map(({ rowNumber, row, displayValues }): PreviewRow => {
      const employeeCode = String(row.employee_id || '').trim();
      const importedEmployeeName = String(row.employee_name || '').trim();
      if (!employeeCode && isPayrollSummaryName(importedEmployeeName)) {
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
        error = `Tên nhân viên và MSNV đang trỏ tới hai hồ sơ khác nhau; cần sửa file trước khi lưu.`;
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
      if (!employee) {
        error = error || (nameMatches.length > 1
          ? `Họ tên trong file trùng nhiều nhân viên, cần bổ sung MSNV đúng.`
          : `Không tìm thấy nhân viên theo họ tên${employeeCode ? ` hoặc MSNV ${employeeCode}` : ''}`);
      }
      else if (!error && normalizedEmployeeCode && seen.has(normalizedEmployeeCode)) error = 'Mã nhân viên bị trùng trong file';
      else if (!error && seenEmployeeIds.has(employee.id)) error = 'Nhân viên bị trùng trong file (nhiều MSNV cùng trỏ một hồ sơ)';
      else if (!error && (!Number.isFinite(gross) || !Number.isFinite(finalNet) || gross < 0 || finalNet < 0)) error = 'Gross/Net không hợp lệ';
      if (normalizedEmployeeCode) seen.add(normalizedEmployeeCode);
      if (employee) seenEmployeeIds.add(employee.id);

      return {
        rowNumber,
        employeeName: employee?.full_name || '—',
        displayValues,
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
          standard_work_days: Number(row.standard_work_days || 0),
          actual_work_days: Number(row.actual_work_days || 0),
          workday_salary: Number(row.workday_salary || 0),
          annual_leave_used_days: Number(row.annual_leave_used_days || 0),
          annual_leave_remaining_days: Number(row.annual_leave_remaining_days || 0),
          dependents_count: Number(row.dependents_count || 0),
          bhxh_deduction: Number(row.bhxh_deduction || 0),
          bhyt_deduction: Number(row.bhyt_deduction || 0),
          bhtn_deduction: Number(row.bhtn_deduction || 0),
          personal_income_tax: Number(row.personal_income_tax || 0),
          family_deduction: Number(row.family_deduction || 0),
          taxable_income: Number(row.taxable_income || 0),
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
    try {
      setSourceName(file.name);
      if (file.name.toLowerCase().endsWith('.xlsx')) {
        const { default: readWorkbook } = await import('read-excel-file/browser');
        const sheets = await readWorkbook(file);
        const payrollSheet = sheets.find((sheet) => normalizeHeader(sheet.sheet).includes('bang_luong')) ?? sheets[0];
        if (!payrollSheet) throw new Error('File Excel không có worksheet nào.');
        const detectedPeriod = detectPayrollPeriod(payrollSheet.data);
        if (!detectedPeriod) throw new Error('Không đọc được kỳ lương từ tiêu đề bảng lương (ví dụ: THÁNG 07-2026).');
        setSelectedMonth(detectedPeriod.month);
        setSelectedYear(detectedPeriod.year);
        const headerIndex = payrollSheet.data.findIndex((row) => row.some((cell) => {
          const header = normalizeHeader(String(cell ?? ''));
          return header === 'msnv' || header === 'ten_nhan_vien' || header === 'employee_name';
        }));
        if (headerIndex < 0) throw new Error('Không tìm thấy dòng tiêu đề có cột Tên nhân viên hoặc MSNV trong file Excel.');
        const text = payrollSheet.data.slice(headerIndex).map((row) => row.map((cell) => {
          return workbookCellValue(cell);
        }).join('\t')).join('\n');
        setPaste(text);
        buildPreview(text, `${file.name} • ${payrollSheet.sheet}`, detectedPeriod ?? undefined);
        return;
      }
      const text = await file.text();
      setPaste(text);
      buildPreview(text, file.name);
    } catch (error) {
      setPreview([]);
      setPreviewColumns([]);
      showToast(error instanceof Error ? error.message : 'Không thể đọc file payroll.');
    }
  };

  const handleImport = async () => {
    const valid = preview
      .filter((row): row is PreviewRow & { record: TablesInsert<'payroll_records'> } => !row.isSummary && !row.error && Boolean(row.record))
      .map((row) => row.record);
    if (!valid.length || valid.length !== importablePreviewCount || hasPendingRecords || hasPublishedRecords) return;
    try {
      await importPayroll.mutateAsync(valid);
      showToast(`Đã nhập ${valid.length} phiếu lương nháp. Kiểm tra tổng trước khi gửi duyệt.`);
      setPreview([]);
      setPreviewColumns([]);
      setPaste('');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể nhập payroll.');
    }
  };

  const handleSubmitForApproval = async () => {
    if (!records.length) return;
    try {
      await submitPayroll.mutateAsync({ month: selectedMonth, year: selectedYear });
      showToast(`Đã gửi payroll Tháng ${selectedMonth}/${selectedYear} cho Admin duyệt.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể gửi duyệt payroll.');
    }
  };

  const handleApprovalDecision = async () => {
    if (!isAdmin || !approvalDialog) return;
    try {
      if (approvalDialog === 'approve') {
        await approvePayroll.mutateAsync({ month: selectedMonth, year: selectedYear });
        try {
          const delivery = await processNotifications.mutateAsync({ limit: 25 });
          const failed = delivery?.results.filter((result) => result.status === 'failed').length ?? 0;
          showToast(failed > 0
            ? `Đã phát hành payroll; ${failed} phiếu chưa xử lý được và đã vào hàng đợi retry.`
            : `Đã duyệt, phát hành và xử lý ${delivery?.processed ?? 0} phiếu lương.`);
        } catch {
          showToast('Đã phát hành payroll. Hàng đợi PDF/email chưa chạy được; Admin có thể bấm gửi lại sau.');
        }
      } else {
        await rejectPayroll.mutateAsync({ month: selectedMonth, year: selectedYear, reason: rejectionReason.trim() });
        showToast(`Đã trả lại payroll Tháng ${selectedMonth}/${selectedYear} cho HR/Kế toán.`);
      }
      setApprovalDialog(null);
      setRejectionReason('');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể xử lý phê duyệt payroll.');
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
          ? `Đã tạo PDF; email được bỏ qua: ${result.error || 'chưa đủ cấu hình.'}`
          : result?.status === 'failed'
            ? `Chưa xử lý được phiếu lương: ${result.error || 'lỗi không xác định.'}`
            : 'Đã đưa phiếu lương vào hàng đợi xử lý.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể gửi lại phiếu lương.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payroll & phê duyệt phiếu lương</h1>
          <p className="text-sm text-slate-600">HR/Kế toán chuẩn bị dữ liệu; Admin duyệt cuối cùng trước khi nhân viên nhìn thấy.</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsPayrollFormOpen(true)}
            disabled={!employees.length}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-3 py-2 text-xs font-bold text-white shadow-md shadow-primary-600/20 transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Thêm phiếu lương
          </button>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="p-2 border rounded-xl text-sm">
            {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => <option key={month} value={month}>Tháng {month}</option>)}
          </select>
          <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="w-24 p-2 border rounded-xl text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Metric label="Tổng Gross" value={totals.gross} />
        <Metric label="Tổng khấu trừ" value={totals.deductions} />
        <Metric label="Tổng thực lĩnh" value={totals.net} />
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <ClipboardPaste className="w-5 h-5 text-primary-600" />
          <div>
            <h2 className="font-bold text-slate-900">Tải file Excel hoặc dán bảng dữ liệu</h2>
            <p className="text-xs text-slate-500">Hỗ trợ trực tiếp các cột trong BẢNG LƯƠNG: ngày công, phép, phụ cấp, KPI, bảo hiểm, thuế, hoàn trả và điều chỉnh kỳ trước.</p>
            <p className="text-xs text-slate-500">Preview giữ nguyên toàn bộ cột trong file; hiện đối chiếu nhân viên ưu tiên họ tên khớp duy nhất, rồi dùng MSNV làm dự phòng.</p>
          </div>
        </div>
        <textarea
          rows={7}
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder={'MSNV\tGross\tBHXH\tBHYT\tBHTN\tThuế TNCN\tThực lĩnh\nNV001\t20000000\t1600000\t300000\t200000\t500000\t17400000'}
          className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl"
        />
        <div className="flex flex-wrap gap-2">
          <label className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-2">
            <Upload className="w-4 h-4" /> Chọn XLSX/CSV/TSV
            <input type="file" accept=".xlsx,.csv,.tsv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/tab-separated-values" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          </label>
          <button onClick={() => buildPreview(paste)} disabled={!paste.trim()} className="px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" /> Kiểm tra dữ liệu
          </button>
          {importablePreviewCount > 0 && (
            <button onClick={handleImport} disabled={preview.some((row) => !row.isSummary && row.error) || importPayroll.isPending || hasPendingRecords || hasPublishedRecords} className="px-4 py-2 bg-success-600 text-white rounded-xl text-xs font-bold disabled:opacity-50">
              Lưu {importablePreviewCount} phiếu nháp
            </button>
          )}
        </div>

        {(hasPendingRecords || hasPublishedRecords) && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Kỳ lương đang chờ duyệt hoặc đã phát hành nên không thể import đè. Admin cần trả lại kỳ lương trước khi HR/Kế toán sửa dữ liệu.
          </p>
        )}

        {preview.length > 0 && (
          <div className="overflow-x-auto border rounded-xl">
            <table className="min-w-max w-full text-left text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-2 whitespace-nowrap">Dòng</th>
                  {previewColumns.map((column, index) => (
                    <th key={`${column.label}-${index}`} className="p-2 whitespace-nowrap">{column.label || `Cột ${index + 1}`}</th>
                  ))}
                  <th className="p-2 whitespace-nowrap">Kiểm tra</th>
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
                    return <td key={`${item.rowNumber}-${column.label}-${index}`} className={`p-2 whitespace-nowrap ${isEmployeeName ? 'font-bold' : ''}`}>{value}</td>;
                  })}
                  <td className={`p-2 font-semibold ${item.error ? 'text-rose-700' : item.warning ? 'text-amber-700' : 'text-success-700'}`}>
                    {item.isSummary ? 'Tổng cộng' : item.error || item.warning || 'Hợp lệ'}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div><h2 className="font-bold text-slate-900">Phiếu lương Tháng {selectedMonth}/{selectedYear}</h2><p className="text-xs text-slate-500">Nhân viên chỉ xem được phiếu sau khi Admin phê duyệt.</p></div>
          <div className="flex flex-wrap justify-end gap-2">
            {hasEditableRecords && (
              <button onClick={handleSubmitForApproval} disabled={submitPayroll.isPending} className="px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-2">
                <Send className="w-4 h-4" /> Gửi Admin duyệt
              </button>
            )}
            {isAdmin && hasPendingRecords && (
              <>
                <button onClick={() => setApprovalDialog('reject')} className="px-4 py-2 border border-rose-300 bg-white text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" /> Trả lại
                </button>
                <button onClick={() => setApprovalDialog('approve')} className="px-4 py-2 bg-success-600 text-white rounded-xl text-xs font-bold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Duyệt & phát hành
                </button>
              </>
            )}
            {hasPublishedRecords && (
              <span className="inline-flex items-center gap-2 rounded-xl border border-success-200 bg-success-50 px-4 py-2 text-xs font-bold text-success-800">
                <CheckCircle2 className="h-4 w-4" /> Đã phát hành
              </span>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50"><tr><th className="p-3">MSNV</th><th className="p-3">Nhân viên</th><th className="p-3">Gross</th><th className="p-3">Khấu trừ</th><th className="p-3">Net</th><th className="p-3">Phê duyệt</th><th className="p-3">PDF / email</th><th className="p-3">Phiếu</th></tr></thead>
            <tbody className="divide-y">
              {records.length === 0 ? <tr><td colSpan={8} className="p-6 text-center text-slate-400">Chưa có dữ liệu kỳ lương.</td></tr> : records.map((record) => (
                <tr key={record.id}>
                  <td className="p-3 font-mono">{record.employees?.employee_code}</td>
                  <td className="p-3 font-bold">{record.employees?.full_name}</td>
                  <td className="p-3">{formatVND(record.gross_income)}</td>
                  <td className="p-3">{formatVND(
                    record.bhxh_deduction
                    + record.bhyt_deduction
                    + record.bhtn_deduction
                    + record.personal_income_tax
                    + record.advance_payment
                    + record.other_deductions
                  )}</td>
                  <td className="p-3 font-bold text-success-700">{formatVND(record.net_salary)}</td>
                  <td className="p-3">
                    <span className="font-semibold">{PAYROLL_STATUS_LABELS[record.publish_status] || record.publish_status}</span>
                    {record.rejection_reason && <span className="mt-1 block text-[10px] text-rose-700">{record.rejection_reason}</span>}
                  </td>
                  <td className="p-3">
                    <span className="block text-[11px] font-semibold text-slate-700">
                      {NOTIFICATION_STATUS_LABELS[record.notification_status] || record.notification_status}
                    </span>
                    {isAdmin && record.publish_status === 'published' && record.notification_status !== 'sent' && (
                      <button
                        type="button"
                        onClick={() => void handleRetryNotification(record.id)}
                        disabled={retryNotification.isPending || processNotifications.isPending}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-primary-700 disabled:opacity-50"
                      >
                        <Mail className="h-3.5 w-3.5" /> Tạo PDF / gửi lại
                      </button>
                    )}
                  </td>
                  <td className="p-3"><button onClick={() => setSelectedPayslipId(record.id)} className="text-primary-700 font-bold">Xem</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

      <PayrollEntryModal
        open={isPayrollFormOpen}
        companyId={profile?.companyId}
        employees={employees}
        initialEmployeeId={records[0]?.employee_id || employees[0]?.id || ''}
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

const Metric: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
    <span className="text-xs font-bold text-slate-500 uppercase">{label}</span>
    <div className="mt-2 text-2xl font-black text-slate-900">{formatVND(value)}</div>
  </div>
);
