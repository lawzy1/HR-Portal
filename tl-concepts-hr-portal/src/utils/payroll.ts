import type { Json, TablesInsert } from '../lib/database.types';

// Thu nhập tính thuế = tổng thu nhập − phụ cấp (ăn trưa, điện thoại) − BHXH/BHYT/BHTN thực trích − giảm trừ gia cảnh.
export const calcTaxableIncome = (p: {
  gross: number;
  lunchAllowance: number;
  phoneAllowance: number;
  insurance: number;
  familyDeduction: number;
}) => Math.max(0, p.gross - p.lunchAllowance - p.phoneAllowance - p.insurance - p.familyDeduction);

export const calcFamilyDeduction = (
  dependents: number,
  settings?: { family_deduction?: number | null; dependent_deduction?: number | null } | null,
) => (settings?.family_deduction ?? 15500000) + dependents * (settings?.dependent_deduction ?? 6200000);

export type PayrollField = keyof TablesInsert<'payroll_records'> | 'employee_name';

// Column order of the official "Bảng lương" sheet. The downloadable template
// (public/templates/Mau-bang-luong.xlsx) and the payslip follow this list.
export const PAYROLL_TEMPLATE_COLUMNS: Array<{ label: string; field?: PayrollField }> = [
  { label: 'STT' },
  { label: 'Mã nhân viên', field: 'employee_id' },
  { label: 'Họ Tên', field: 'employee_name' },
  { label: 'Vị trí' },
  { label: 'Làm việc', field: 'actual_work_days' },
  { label: 'Ngày nghỉ', field: 'annual_leave_used_days' },
  { label: 'Nghỉ chế độ', field: 'policy_leave_days' },
  { label: 'Tổng', field: 'paid_work_days' },
  { label: 'Lương cơ bản', field: 'base_salary' },
  { label: 'Hỗ trợ điện thoại', field: 'phone_allowance' },
  { label: 'Hỗ trợ ăn trưa', field: 'lunch_allowance' },
  { label: 'OT ngày lễ (giờ)', field: 'ot_hours' },
  { label: 'Lương + Phụ cấp thiết kế OT', field: 'ot_pay' },
  { label: 'Thưởng lễ', field: 'holiday_bonus_amount' },
  { label: 'Phụ cấp thiết kế', field: 'kpi_bonus' },
  { label: 'Tổng cộng', field: 'gross_income' },
  { label: 'NV BHXH + BHYT + BHTN (10.5%)', field: 'bhxh_deduction' },
  { label: 'Thuế TNCN', field: 'personal_income_tax' },
  { label: 'Thu nhập ròng', field: 'net_salary' },
];

export const PAYROLL_FIELD_LABELS: Partial<Record<PayrollField, string>> = {
  ...Object.fromEntries(PAYROLL_TEMPLATE_COLUMNS.flatMap(({ label, field }) => (field ? [[field, label]] : []))),
  standard_work_days: 'Ngày công chuẩn',
  annual_leave_remaining_days: 'Phép còn lại',
  dependents_count: 'Người phụ thuộc',
  workday_salary: 'Lương ngày công',
  project_bonus_amount: 'Thưởng dự án',
  family_deduction: 'Giảm trừ gia cảnh',
  taxable_income: 'Thu nhập tính thuế TNCN',
  bhyt_deduction: 'BHYT',
  bhtn_deduction: 'BHTN',
  welfare_refund: 'Hoàn chi phí',
  personal_income_tax_refund: 'Hoàn thuế TNCN',
  prior_month_adjustment: 'Truy lĩnh / điều chỉnh kỳ trước',
  advance_payment: 'Khấu trừ tạm ứng',
  other_deductions: 'Khấu trừ khác',
  payment_status: 'Trạng thái thanh toán',
  note: 'Ghi chú',
};

export const normalizeHeader = (value: string) =>
  value
    // NFD does not transliterate Vietnamese Đ/đ, so normalize it explicitly.
    .replace(/[Đđ]/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

// Headers only need to contain the key words, not match exactly. Order
// matters: specific rules (OT giờ, thuế hoàn, thu nhập tính thuế) must run
// before the broader ones they would otherwise be swallowed by.
const HEADER_RULES: Array<[RegExp, PayrollField | 'ignore']> = [
  [/^stt$|^vi_tri|^chuc_vu|^phong_ban/, 'ignore'],
  [/msnv|ma_nhan_vien|ma_nv|employee_code|employee_id/, 'employee_id'],
  [/ho_ten|ho_va_ten|ten_nhan_vien|employee_name/, 'employee_name'],
  [/nghi_che_do/, 'policy_leave_days'],
  [/phep_con_lai/, 'annual_leave_remaining_days'],
  [/ngay_nghi|nghi_phep|phep_da/, 'annual_leave_used_days'],
  [/ngay_cong_chuan|standard_work_days/, 'standard_work_days'],
  [/^lam_viec$|ngay_lam_viec|ngay_cong_thuc_te|ngay_cong_thang|actual_work_days/, 'actual_work_days'],
  [/^tong$|tong_ngay_cong|paid_work_days/, 'paid_work_days'],
  [/nguoi_phu_thuoc/, 'dependents_count'],
  [/(^|_)ot(_|$).*gio|gio_ot|ot_hours/, 'ot_hours'],
  [/thu_nhap_(tinh|chiu)_thue|taxable/, 'taxable_income'],
  [/hoan_thue/, 'personal_income_tax_refund'],
  [/thue_tncn|^thue$|personal_income_tax/, 'personal_income_tax'],
  [/giam_tru/, 'family_deduction'],
  [/bhxh|bao_hiem/, 'bhxh_deduction'],
  [/^bhyt/, 'bhyt_deduction'],
  [/^bhtn/, 'bhtn_deduction'],
  [/thu_nhap_rong|thuc_nhan|thuc_linh|thuc_lanh|^net/, 'net_salary'],
  [/tong_cong|tong_thu_nhap|gross/, 'gross_income'],
  [/hoan_chi_phi|hoan_cong_tac|phuc_loi/, 'welfare_refund'],
  [/truy_linh|dieu_chinh/, 'prior_month_adjustment'],
  [/tam_ung|advance_payment/, 'advance_payment'],
  [/khau_tru_khac|other_deductions/, 'other_deductions'],
  [/(^|_)ot(_|$)|ot_pay/, 'ot_pay'],
  [/thuong_du_an|project_bonus/, 'project_bonus_amount'],
  [/thuong_le|holiday_bonus/, 'holiday_bonus_amount'],
  [/kpi|phu_cap_thiet_ke/, 'kpi_bonus'],
  [/dien_thoai|phone/, 'phone_allowance'],
  [/an_trua|lunch/, 'lunch_allowance'],
  [/luong_ngay_cong|workday_salary/, 'workday_salary'],
  [/luong_co_ban|base_salary/, 'base_salary'],
  [/trang_thai_thanh_toan|payment_status/, 'payment_status'],
  [/ghi_chu|^note$/, 'note'],
];

export const matchPayrollHeader = (header: string): PayrollField | 'ignore' | undefined => {
  const normalized = normalizeHeader(header);
  if (!normalized) return undefined;
  return HEADER_RULES.find(([pattern]) => pattern.test(normalized))?.[1];
};

// Excel copies cells containing line breaks as "quoted" fields, so a plain
// split on \n would break the header row apart.
export const parseDelimited = (text: string): string[][] => {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const separator = firstLine.includes('\t') ? '\t' : firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell === '') quoted = true;
    else if (char === separator) { row.push(cell); cell = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.map((cells) => cells.map((value) => value.replace(/\s+/g, ' ').trim()));
};

export type PayrollCustomSection = 'income' | 'deduction' | 'adjustment';
export type PayrollCustomItem = { id: string; section: PayrollCustomSection; label: string; amount: number };

export const readCustomItems = (value: Json | undefined | null): PayrollCustomItem[] =>
  Array.isArray(value)
    ? value.flatMap((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
      const { id, section, label, amount } = item as Record<string, Json>;
      if (!['income', 'deduction', 'adjustment'].includes(String(section))) return [];
      return [{ id: String(id || crypto.randomUUID()), section: section as PayrollCustomSection, label: String(label ?? ''), amount: Number(amount) || 0 }];
    })
    : [];

export const customTotal = (items: PayrollCustomItem[], section: PayrollCustomSection) =>
  items.reduce((sum, item) => sum + (item.section === section ? item.amount : 0), 0);

if (import.meta.env.DEV) {
  console.assert(
    calcTaxableIncome({ gross: 18774488, lunchAllowance: 1200000, phoneAllowance: 550000, insurance: 735000, familyDeduction: 15500000 }) === 789488,
    'Taxable income self-check failed',
  );
  console.assert(
    calcTaxableIncome({ gross: 9938467, lunchAllowance: 650000, phoneAllowance: 297917, insurance: 735000, familyDeduction: 15500000 }) === 0,
    'Negative taxable income clamp self-check failed',
  );
  console.assert(
    PAYROLL_TEMPLATE_COLUMNS.every(({ label, field }) => matchPayrollHeader(label) === (field ?? 'ignore')),
    'Payroll template header self-check failed',
  );
  console.assert(
    [
      ['Thưởng lễ + OT/ Thưởng thêm', 'ot_pay'], ['Lương OT', 'ot_pay'], ['Phụ cấp thiết kế OT', 'ot_pay'],
      ['Thu nhập tính thuế TNCN', 'taxable_income'], ['Lương thực nhận', 'net_salary'], ['Ngày công/ tháng', 'actual_work_days'],
      ['Hoàn thuế TNCN', 'personal_income_tax_refund'], ['KPI', 'kpi_bonus'], ['BHXH 10.5%', 'bhxh_deduction'],
    ].every(([header, field]) => matchPayrollHeader(header) === field),
    'Payroll legacy header self-check failed',
  );
  const pasted = parseDelimited('STT\t"NV BHXH + BHYT\n(10.5%)"\tThuế TNCN\n1\t735000\t234225');
  console.assert(pasted.length === 2 && pasted[0][1] === 'NV BHXH + BHYT (10.5%)' && pasted[1][2] === '234225', 'Quoted paste self-check failed');
}
