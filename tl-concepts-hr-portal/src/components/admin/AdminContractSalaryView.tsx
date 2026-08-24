import React, { useState } from 'react';
import { FileCheck, TrendingUp, Receipt, AlertTriangle, Plus, Pencil } from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { useEmployees, useEmployee } from '../../hooks/useEmployees';
import { useContracts, useSalaryHistory, useContractLegalWarnings, type DbContract } from '../../hooks/useContracts';
import { useEmployeePayrollHistory } from '../../hooks/usePayroll';
import { formatVND, formatDate } from '../../utils/formatters';
import { ContractDocumentLink } from '../ContractDocumentLink';
import { ContractEditorModal } from './ContractEditorModal';

export const AdminContractSalaryView: React.FC = () => {
  const { selectedEmployeeIdForAdmin, setSelectedEmployeeIdForAdmin, setSelectedPayslipId } = useHR();

  const { data: employees } = useEmployees();
  const allEmployees = employees || [];
  const selectedId = selectedEmployeeIdForAdmin || allEmployees[0]?.id;

  const { data: selectedEmp } = useEmployee(selectedId);
  const { data: contracts } = useContracts(selectedId);
  const { data: salaryHistory } = useSalaryHistory(selectedId);
  const { data: legalWarnings } = useContractLegalWarnings(selectedId);
  const { data: payslipsData } = useEmployeePayrollHistory(selectedId);
  const payslips = payslipsData || [];
  const [editingContract, setEditingContract] = useState<DbContract | null | undefined>(undefined);

  if (!selectedEmp) {
    return <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-sm text-slate-500">Chưa có nhân viên nào.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Quản lý Hợp đồng Lao động & Lương thưởng
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Xem thông tin hợp đồng hiện tại, lịch sử tái ký, tăng bậc lương và các phiếu lương từng tháng.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setEditingContract(null)}
            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Tạo hợp đồng
          </button>
          <div className="flex items-center space-x-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <span className="text-xs font-bold text-slate-500 uppercase px-1">Chọn nhân viên:</span>
          <select
            value={selectedId}
            onChange={(e) => setSelectedEmployeeIdForAdmin(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          >
            {allEmployees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.employee_code} - {emp.full_name} ({emp.department})
              </option>
            ))}
          </select>
          </div>
        </div>
      </div>

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

      {/* Selected Employee Summary Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-extrabold">{selectedEmp.full_name}</h2>
            <span className="px-2.5 py-0.5 bg-primary-500/30 text-primary-200 font-mono text-xs font-bold rounded-md border border-primary-400/30">
              {selectedEmp.employee_code}
            </span>
          </div>
          <p className="text-sm text-slate-300 mt-0.5">{selectedEmp.job_title} • {selectedEmp.department}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-left border-t md:border-t-0 md:border-l border-slate-700/80 pt-4 md:pt-0 md:pl-6">
          <div>
            <span className="text-[11px] uppercase font-bold text-slate-400 block">Lương cơ bản hiện tại</span>
            <span className="text-lg font-black text-success-400">{formatVND(selectedEmp.current_salary || 0)}</span>
          </div>
          <div>
            <span className="text-[11px] uppercase font-bold text-slate-400 block">Ngày bắt đầu làm việc</span>
            <span className="text-sm font-bold text-amber-300">{selectedEmp.start_date ? formatDate(selectedEmp.start_date) : '—'}</span>
          </div>
          <div>
            <span className="text-[11px] uppercase font-bold text-slate-400 block">Xét duyệt lương gần nhất</span>
            <span className="text-sm font-bold text-primary-300">{selectedEmp.last_salary_review_date ? formatDate(selectedEmp.last_salary_review_date) : '—'}</span>
          </div>
        </div>
      </div>

      {/* Contract & Salary History Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
              <FileCheck className="w-5 h-5 text-primary-600" />
              <span>1. Lịch sử Hợp đồng Lao động</span>
            </h3>
            <span className="text-xs text-slate-500">Loại: {selectedEmp.contract_type || '—'}</span>
          </div>

          <div className="space-y-3">
            {!contracts || contracts.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">Chưa có dữ liệu lịch sử hợp đồng.</div>
            ) : (
              contracts.map((contract) => (
                <div key={contract.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-slate-900">{contract.contract_code}</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        contract.status === 'Đang hiệu lực' ? 'bg-success-100 text-success-800' :
                        contract.status === 'Sắp hết hạn' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {contract.status}
                      </span>
                      <button onClick={() => setEditingContract(contract)} className="p-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 cursor-pointer" title="Chỉnh sửa hợp đồng">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1">
                    <p>Loại HĐ: <b>{contract.type}</b></p>
                    <p>Vị trí chuyên môn: <b>{contract.position}</b></p>
                    <p>Thời hạn: <b>{contract.start_date}</b> đến <b>{contract.end_date || 'Không xác định'}</b></p>
                    <p>Mức lương HĐ: <b className="text-success-700">{formatVND(contract.salary || 0)}</b></p>
                    <ContractDocumentLink path={contract.document_path} name={contract.document_name} />
                    {contract.note && <p className="text-slate-500 italic mt-1">Ghi chú: {contract.note}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-success-600" />
              <span>2. Lịch sử Diễn biến Thu nhập & Tăng lương</span>
            </h3>
          </div>

          <div className="space-y-3">
            {!salaryHistory || salaryHistory.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">Chưa có ghi nhận điều chỉnh lương.</div>
            ) : (
              salaryHistory.map((sal) => (
                <div key={sal.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">{sal.change_type}</span>
                    <span className="text-xs text-slate-500 font-medium">Áp dụng: {sal.effective_date}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div>
                      <span className="text-slate-500 block">Lương cũ:</span>
                      <span className="line-through text-slate-400">{formatVND(sal.old_salary || 0)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block">Lương mới:</span>
                      <span className="font-bold text-success-600 text-sm">{formatVND(sal.new_salary)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 pt-1 border-t border-slate-200/60">
                    Lý do: <span className="italic">{sal.reason}</span> (Người duyệt: {sal.approved_by})
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Monthly Payslips Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-primary-600" />
            <span>3. Danh sách Phiếu lương từng tháng của {selectedEmp.full_name}</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] tracking-wider border-y border-slate-200">
              <tr>
                <th className="py-3 px-4">Kỳ lương</th>
                <th className="py-3 px-4">Lương cơ bản</th>
                <th className="py-3 px-4">KPI / Thưởng</th>
                <th className="py-3 px-4">Lương OT</th>
                <th className="py-3 px-4">Thu nhập Gross</th>
                <th className="py-3 px-4">BHXH & Thuế PIT</th>
                <th className="py-3 px-4">Lương Thực nhận (Net)</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payslips.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Chưa có phiếu lương được phát hành cho nhân viên này.
                  </td>
                </tr>
              ) : (
                payslips.map((ps) => (
                  <tr key={ps.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">Tháng {ps.month}/{ps.year}</td>
                    <td className="py-3 px-4">{formatVND(ps.base_salary)}</td>
                    <td className="py-3 px-4 text-success-600 font-medium">+{formatVND(ps.kpi_bonus)}</td>
                    <td className="py-3 px-4 text-primary-600 font-medium">+{formatVND(ps.ot_pay)}</td>
                    <td className="py-3 px-4 font-semibold">{formatVND(ps.gross_income)}</td>
                    <td className="py-3 px-4 text-rose-600">-{formatVND(ps.bhxh_deduction + ps.personal_income_tax)}</td>
                    <td className="py-3 px-4 font-extrabold text-success-700 text-sm">{formatVND(ps.net_salary)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        ps.payment_status === 'Đã thanh toán' ? 'bg-success-100 text-success-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {ps.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedPayslipId(ps.id)}
                        className="px-3 py-1 bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-200 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingContract !== undefined && (
        <ContractEditorModal employee={selectedEmp} contract={editingContract} onClose={() => setEditingContract(undefined)} />
      )}
    </div>
  );
};
