import React, { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardPaste, FileSpreadsheet, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useHR } from '../../context/HRContext';
import { useEmployees } from '../../hooks/useEmployees';
import { useAllPayrollRecords, useImportPayrollRecords, usePublishPayrollMonth } from '../../hooks/usePayroll';
import type { TablesInsert } from '../../lib/database.types';
import { formatVND } from '../../utils/formatters';

const HEADER_MAP: Record<string, keyof TablesInsert<'payroll_records'>> = {
  msnv: 'employee_id',
  ma_nv: 'employee_id',
  employee_code: 'employee_id',
  luong_co_ban: 'base_salary',
  base_salary: 'base_salary',
  ngay_cong_chuan: 'standard_work_days',
  standard_work_days: 'standard_work_days',
  ngay_cong_thuc_te: 'actual_work_days',
  actual_work_days: 'actual_work_days',
  phu_cap_dien_thoai: 'phone_allowance',
  phone_allowance: 'phone_allowance',
  phu_cap_an_trua: 'lunch_allowance',
  lunch_allowance: 'lunch_allowance',
  gross: 'gross_income',
  tong_thu_nhap: 'gross_income',
  gross_income: 'gross_income',
  bhxh: 'bhxh_deduction',
  bhyt: 'bhyt_deduction',
  bhtn: 'bhtn_deduction',
  thue_tncn: 'personal_income_tax',
  personal_income_tax: 'personal_income_tax',
  thuc_linh: 'net_salary',
  net: 'net_salary',
  net_salary: 'net_salary',
  thuong_kpi: 'kpi_bonus',
  kpi_bonus: 'kpi_bonus',
  luong_ot: 'ot_pay',
  ot_pay: 'ot_pay',
  thuong_du_an: 'project_bonus_amount',
  project_bonus_amount: 'project_bonus_amount',
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
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

const numberValue = (value: string, decimal = false) => {
  const cleaned = value.trim().replace(/[^0-9,.-]/g, '');
  if (!cleaned) return 0;
  return Number(decimal ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned.replace(/[.,]/g, ''));
};

function parsePayrollPaste(text: string) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const separator = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(separator).map((header) => HEADER_MAP[normalizeHeader(header)]);
  return lines.slice(1).map((line, index) => {
    const values = line.split(separator);
    const row: Record<string, string | number> = {};
    headers.forEach((field, column) => {
      if (!field) return;
      const raw = values[column]?.trim() || '';
      row[field] = ['payment_status', 'note', 'employee_id'].includes(field)
        ? raw
        : numberValue(raw, field === 'standard_work_days' || field === 'actual_work_days');
    });
    return { rowNumber: index + 2, row };
  });
}

if (import.meta.env.DEV) {
  console.assert(
    parsePayrollPaste('MSNV\tGross\tThực lĩnh\nNV01\t20.000.000\t18.000.000')[0]?.row.net_salary === 18000000,
    'Payroll paste parser self-check failed',
  );
}

type PreviewRow = {
  rowNumber: number;
  employeeName: string;
  record: TablesInsert<'payroll_records'>;
  error?: string;
};

export const AdminPayrollView: React.FC = () => {
  const { profile } = useAuth();
  const { showToast, setSelectedPayslipId } = useHR();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [sourceName, setSourceName] = useState('Dán từ Excel');
  const [paste, setPaste] = useState('');
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const { data: employeesData } = useEmployees();
  const { data: recordsData } = useAllPayrollRecords(selectedMonth, selectedYear);
  const importPayroll = useImportPayrollRecords();
  const publishPayroll = usePublishPayrollMonth();

  const employees = useMemo(() => employeesData || [], [employeesData]);
  const records = recordsData || [];
  const totals = records.reduce(
    (sum, record) => ({
      gross: sum.gross + record.gross_income,
      deductions:
        sum.deductions +
        record.bhxh_deduction +
        record.bhyt_deduction +
        record.bhtn_deduction +
        record.personal_income_tax +
        record.other_deductions,
      net: sum.net + record.net_salary,
    }),
    { gross: 0, deductions: 0, net: 0 },
  );

  const buildPreview = (text: string, importSource = sourceName) => {
    const seen = new Set<string>();
    const next = parsePayrollPaste(text).map(({ rowNumber, row }): PreviewRow => {
      const employeeCode = String(row.employee_id || '');
      const employee = employees.find((item) => item.employee_code === employeeCode);
      let error: string | undefined;
      if (!employee) error = `Không tìm thấy mã nhân viên ${employeeCode || '(trống)'}`;
      else if (seen.has(employeeCode)) error = 'Mã nhân viên bị trùng trong file';
      else if (!Number.isFinite(row.gross_income) || !Number.isFinite(row.net_salary) || Number(row.gross_income) < 0 || Number(row.net_salary) < 0) error = 'Gross/Net không hợp lệ';
      seen.add(employeeCode);

      return {
        rowNumber,
        employeeName: employee?.full_name || '—',
        error,
        record: {
          company_id: profile?.companyId || '',
          employee_id: employee?.id || '',
          month: selectedMonth,
          year: selectedYear,
          gross_income: Number(row.gross_income || 0),
          net_salary: Number(row.net_salary || 0),
          base_salary: Number(row.base_salary || 0),
          standard_work_days: Number(row.standard_work_days || 0),
          actual_work_days: Number(row.actual_work_days || 0),
          bhxh_deduction: Number(row.bhxh_deduction || 0),
          bhyt_deduction: Number(row.bhyt_deduction || 0),
          bhtn_deduction: Number(row.bhtn_deduction || 0),
          personal_income_tax: Number(row.personal_income_tax || 0),
          kpi_bonus: Number(row.kpi_bonus || 0),
          ot_pay: Number(row.ot_pay || 0),
          phone_allowance: Number(row.phone_allowance || 0),
          lunch_allowance: Number(row.lunch_allowance || 0),
          project_bonus_amount: Number(row.project_bonus_amount || 0),
          prior_month_adjustment: Number(row.prior_month_adjustment || 0),
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

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setSourceName(file.name);
    const text = await file.text();
    setPaste(text);
    buildPreview(text, file.name);
  };

  const handleImport = async () => {
    const valid = preview.filter((row) => !row.error).map((row) => row.record);
    if (!valid.length || valid.length !== preview.length) return;
    await importPayroll.mutateAsync(valid);
    showToast(`Đã nhập ${valid.length} phiếu lương nháp. Kiểm tra tổng trước khi publish.`);
    setPreview([]);
    setPaste('');
  };

  const handlePublish = async () => {
    if (!profile?.id || !records.length) return;
    await publishPayroll.mutateAsync({ month: selectedMonth, year: selectedYear, profileId: profile.id });
    showToast(`Đã publish phiếu lương Tháng ${selectedMonth}/${selectedYear} cho nhân viên.`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Import & phát hành phiếu lương</h1>
          <p className="text-sm text-slate-600">Nhập kết quả cuối cùng từ kế toán; hệ thống không tự tính thuế hoặc bảo hiểm.</p>
        </div>
        <div className="flex gap-2">
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
            <h2 className="font-bold text-slate-900">Dán bảng từ Excel hoặc tải CSV/TSV</h2>
            <p className="text-xs text-slate-500">Bắt buộc: MSNV, Gross, Thực lĩnh. Có thể thêm BHXH, BHYT, BHTN, Thuế TNCN, KPI, OT, ghi chú.</p>
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
            <Upload className="w-4 h-4" /> Chọn CSV/TSV
            <input type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          </label>
          <button onClick={() => buildPreview(paste)} disabled={!paste.trim()} className="px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" /> Kiểm tra dữ liệu
          </button>
          {preview.length > 0 && (
            <button onClick={handleImport} disabled={preview.some((row) => row.error) || importPayroll.isPending} className="px-4 py-2 bg-success-600 text-white rounded-xl text-xs font-bold disabled:opacity-50">
              Lưu {preview.length} phiếu nháp
            </button>
          )}
        </div>

        {preview.length > 0 && (
          <div className="overflow-x-auto border rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50"><tr><th className="p-2">Dòng</th><th className="p-2">Nhân viên</th><th className="p-2">Gross</th><th className="p-2">Net</th><th className="p-2">Kiểm tra</th></tr></thead>
              <tbody>{preview.map((item) => (
                <tr key={item.rowNumber} className="border-t">
                  <td className="p-2">{item.rowNumber}</td><td className="p-2 font-bold">{item.employeeName}</td>
                  <td className="p-2">{formatVND(item.record.gross_income || 0)}</td><td className="p-2">{formatVND(item.record.net_salary || 0)}</td>
                  <td className={`p-2 font-semibold ${item.error ? 'text-rose-700' : 'text-success-700'}`}>{item.error || 'Hợp lệ'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div><h2 className="font-bold text-slate-900">Phiếu lương Tháng {selectedMonth}/{selectedYear}</h2><p className="text-xs text-slate-500">Nhân viên chỉ xem được phiếu đã publish.</p></div>
          <button onClick={handlePublish} disabled={!records.length || publishPayroll.isPending} className="px-4 py-2 bg-success-600 text-white rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Publish toàn bộ
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50"><tr><th className="p-3">MSNV</th><th className="p-3">Nhân viên</th><th className="p-3">Gross</th><th className="p-3">Khấu trừ</th><th className="p-3">Net</th><th className="p-3">Trạng thái</th><th className="p-3">Phiếu</th></tr></thead>
            <tbody className="divide-y">
              {records.length === 0 ? <tr><td colSpan={7} className="p-6 text-center text-slate-400">Chưa có dữ liệu kỳ lương.</td></tr> : records.map((record) => (
                <tr key={record.id}>
                  <td className="p-3 font-mono">{record.employees?.employee_code}</td>
                  <td className="p-3 font-bold">{record.employees?.full_name}</td>
                  <td className="p-3">{formatVND(record.gross_income)}</td>
                  <td className="p-3">{formatVND(record.gross_income - record.net_salary)}</td>
                  <td className="p-3 font-bold text-success-700">{formatVND(record.net_salary)}</td>
                  <td className="p-3">{record.publish_status === 'published' ? 'Đã publish' : 'Nháp'}</td>
                  <td className="p-3"><button onClick={() => setSelectedPayslipId(record.id)} className="text-primary-700 font-bold">Xem</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
    <span className="text-xs font-bold text-slate-500 uppercase">{label}</span>
    <div className="mt-2 text-2xl font-black text-slate-900">{formatVND(value)}</div>
  </div>
);
