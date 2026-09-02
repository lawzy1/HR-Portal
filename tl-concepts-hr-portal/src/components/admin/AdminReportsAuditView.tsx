import React from 'react';
import { Download, FileClock, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { useEmployees } from '../../hooks/useEmployees';
import { useAllContracts } from '../../hooks/useContracts';
import { useAllLeaveRequests } from '../../hooks/useLeave';
import { useAllPayrollHistory } from '../../hooks/usePayroll';
import { useAuditLogs, useRecordAuditEvent } from '../../hooks/useAuditLogs';
import { downloadCsv } from '../../utils/csv';
import { formatDateTime } from '../../utils/formatters';

const ACTION_LABEL: Record<string, string> = { INSERT: 'Tạo mới', UPDATE: 'Cập nhật', DELETE: 'Xoá', VIEW: 'Xem', EXPORT: 'Xuất dữ liệu' };
const ENTITY_LABEL: Record<string, string> = {
  profiles: 'Tài khoản/phân quyền',
  employees: 'Hồ sơ nhân viên',
  employee_sensitive_info: 'Thông tin nhạy cảm',
  contracts: 'Hợp đồng',
  salary_history: 'Lịch sử lương',
  leave_requests: 'Đơn nghỉ phép',
  leave_balance_adjustments: 'Điều chỉnh phép',
  work_events: 'WFH/đi muộn',
  ot_records: 'OT',
  payroll_records: 'Payroll',
  company_settings: 'Cấu hình công ty',
};

export const AdminReportsAuditView: React.FC = () => {
  const { data: employees = [] } = useEmployees();
  const { data: contracts = [] } = useAllContracts();
  const { data: leaveRequests = [] } = useAllLeaveRequests();
  const { data: payroll = [] } = useAllPayrollHistory();
  const { data: auditLogs = [], isLoading: auditLoading } = useAuditLogs();
  const recordAuditEvent = useRecordAuditEvent();
  const recordExport = (entityType: string, count: number) =>
    recordAuditEvent.mutate({ action: 'EXPORT', entityType, details: { count: String(count) } });

  const exports = [
    {
      label: 'Danh sách nhân sự',
      count: employees.length,
      run: () => {
        recordExport('employees', employees.length);
        downloadCsv('bao-cao-nhan-su.csv',
        ['Mã NV', 'Họ tên', 'Trạng thái', 'Chức danh', 'Phòng ban', 'Ngày vào làm', 'Email', 'Điện thoại', 'Lương hiện tại'],
        employees.map(row => [row.employee_code, row.full_name, row.status, row.job_title, row.department, row.start_date, row.email, row.phone, row.current_salary]));
      },
    },
    {
      label: 'Hợp đồng lao động',
      count: contracts.length,
      run: () => {
        recordExport('contracts', contracts.length);
        downloadCsv('bao-cao-hop-dong.csv',
        ['Mã NV', 'Nhân viên', 'Mã HĐ', 'Loại', 'Từ ngày', 'Đến ngày', 'Vị trí', 'Lương', 'Trạng thái', 'File'],
        contracts.map(row => [row.employees?.employee_code, row.employees?.full_name, row.contract_code, row.type, row.start_date, row.end_date, row.position, row.salary, row.status, row.document_name]));
      },
    },
    {
      label: 'Đơn nghỉ phép',
      count: leaveRequests.length,
      run: () => {
        recordExport('leave_requests', leaveRequests.length);
        downloadCsv('bao-cao-nghi-phep.csv',
        ['Mã NV', 'Nhân viên', 'Loại nghỉ', 'Từ ngày', 'Đến ngày', 'Số ngày', 'Trạng thái', 'Lý do'],
        leaveRequests.map(row => [row.employees?.employee_code, row.employees?.full_name, row.leave_type, row.start_date, row.end_date, row.total_days, row.status, row.reason]));
      },
    },
    {
      label: 'Payroll',
      count: payroll.length,
      run: () => {
        recordExport('payroll_records', payroll.length);
        downloadCsv('bao-cao-payroll.csv',
        ['Mã NV', 'Nhân viên', 'Tháng', 'Năm', 'Gross', 'Thuế TNCN', 'BHXH', 'BHYT', 'BHTN', 'Net', 'Thanh toán', 'Phát hành'],
        payroll.map(row => [row.employees?.employee_code, row.employees?.full_name, row.month, row.year, row.gross_income, row.personal_income_tax, row.bhxh_deduction, row.bhyt_deduction, row.bhtn_deduction, row.net_salary, row.payment_status, row.publish_status]));
      },
    },
    {
      label: 'Nhật ký thao tác',
      count: auditLogs.length,
      run: () => {
        recordExport('audit_logs', auditLogs.length);
        downloadCsv('nhat-ky-thao-tac.csv',
        ['Thời gian', 'Thao tác', 'Đối tượng', 'Mã bản ghi', 'Người thực hiện', 'Trường thay đổi'],
        auditLogs.map(row => [row.created_at, ACTION_LABEL[row.action] || row.action, ENTITY_LABEL[row.entity_type] || row.entity_type, row.entity_id, row.profiles?.employees?.full_name || row.actor_profile_id || 'Hệ thống', JSON.stringify(row.details)]));
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Báo cáo & Nhật ký thao tác</h1>
        <p className="text-sm text-slate-600 mt-1">Xuất CSV dữ liệu công ty và theo dõi các thay đổi nhạy cảm do Admin thực hiện.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {exports.map(item => (
          <button key={item.label} onClick={item.run} className="text-left bg-white p-4 rounded-2xl border border-slate-200 hover:border-primary-300 hover:shadow-sm transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <FileSpreadsheet className="w-5 h-5 text-success-600" />
              <Download className="w-4 h-4 text-primary-600" />
            </div>
            <p className="font-bold text-sm text-slate-900 mt-3">{item.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{item.count} bản ghi</p>
          </button>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex gap-2">
        <ShieldCheck className="w-4 h-4 shrink-0" />
        File Payroll và hồ sơ nhân sự có dữ liệu nhạy cảm. Chỉ lưu tại thiết bị và vị trí được công ty phê duyệt.
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center gap-2">
          <FileClock className="w-5 h-5 text-primary-600" />
          <div>
            <h2 className="font-bold text-slate-900">100 thao tác gần nhất</h2>
            <p className="text-xs text-slate-500">Log được ghi tại database khi dữ liệu thay đổi, không phụ thuộc giao diện.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
              <tr><th className="p-3">Thời gian</th><th className="p-3">Người thực hiện</th><th className="p-3">Thao tác</th><th className="p-3">Đối tượng</th><th className="p-3">Trường thay đổi</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Đang tải nhật ký...</td></tr>
              ) : auditLogs.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Chưa có thao tác nào sau khi bật Audit.</td></tr>
              ) : auditLogs.map(log => {
                const details = log.details as { changed_fields?: string[] };
                return (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-3 whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                    <td className="p-3 font-semibold">{log.profiles?.employees?.full_name || (log.actor_profile_id ? 'Admin' : 'Hệ thống')}</td>
                    <td className="p-3">{ACTION_LABEL[log.action] || log.action}</td>
                    <td className="p-3">{ENTITY_LABEL[log.entity_type] || log.entity_type}</td>
                    <td className="p-3 text-slate-500 max-w-xs truncate">{details.changed_fields?.join(', ') || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
