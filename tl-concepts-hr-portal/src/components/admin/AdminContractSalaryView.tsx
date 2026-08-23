import React, { useState } from 'react';
import { 
  FileCheck, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Search, 
  ChevronDown, 
  Receipt, 
  AlertTriangle,
  CheckCircle2,
  Building2,
  DollarSign
} from 'lucide-react';
import { useHR } from '../../context/HRContext';

export const AdminContractSalaryView: React.FC = () => {
  const { 
    employees, 
    selectedEmployeeIdForAdmin, 
    setSelectedEmployeeIdForAdmin,
    setSelectedPayslipId
  } = useHR();

  const [searchEmpQuery, setSearchEmpQuery] = useState('');

  const selectedEmp = employees.find(e => e.id === selectedEmployeeIdForAdmin) || employees[0];

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

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

        {/* Employee Dropdown Selector */}
        <div className="flex items-center space-x-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <span className="text-xs font-bold text-slate-500 uppercase px-1">Chọn nhân viên:</span>
          <select
            value={selectedEmp?.id}
            onChange={e => setSelectedEmployeeIdForAdmin(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.employeeCode} - {emp.fullName} ({emp.department})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Employee Summary Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-center space-x-4">
          <img 
            src={selectedEmp.avatar} 
            alt={selectedEmp.fullName} 
            className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-400/40 shadow-md"
          />
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-extrabold">{selectedEmp.fullName}</h2>
              <span className="px-2.5 py-0.5 bg-blue-500/30 text-blue-200 font-mono text-xs font-bold rounded-md border border-blue-400/30">
                {selectedEmp.employeeCode}
              </span>
            </div>
            <p className="text-sm text-slate-300 mt-0.5">{selectedEmp.jobTitle} • {selectedEmp.department}</p>
          </div>
        </div>

        {/* Highlighted Contract & Salary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-left border-t md:border-t-0 md:border-l border-slate-700/80 pt-4 md:pt-0 md:pl-6">
          <div>
            <span className="text-[11px] uppercase font-bold text-slate-400 block">Lương cơ bản hiện tại</span>
            <span className="text-lg font-black text-emerald-400">{formatVND(selectedEmp.currentSalary)}</span>
          </div>

          <div>
            <span className="text-[11px] uppercase font-bold text-slate-400 block">Ngày gia hạn HĐ tiếp</span>
            <span className="text-sm font-bold text-amber-300">{selectedEmp.contractRenewalDate}</span>
          </div>

          <div>
            <span className="text-[11px] uppercase font-bold text-slate-400 block">Xét duyệt lương gần nhất</span>
            <span className="text-sm font-bold text-blue-300">{selectedEmp.lastSalaryReviewDate}</span>
          </div>
        </div>
      </div>

      {/* Contract & Salary History Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Contract History */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
              <FileCheck className="w-5 h-5 text-blue-600" />
              <span>1. Lịch sử Hợp đồng Lao động</span>
            </h3>
            <span className="text-xs text-slate-500">Loại: {selectedEmp.contractType}</span>
          </div>

          <div className="space-y-3">
            {selectedEmp.contracts.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                Chưa có dữ liệu lịch sử hợp đồng.
              </div>
            ) : (
              selectedEmp.contracts.map(contract => (
                <div key={contract.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">{contract.contractCode}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      contract.status === 'Đang hiệu lực'
                        ? 'bg-emerald-100 text-emerald-800'
                        : contract.status === 'Sắp hết hạn'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-600'
                    }`}>
                      {contract.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1">
                    <p>Loại HĐ: <b>{contract.type}</b></p>
                    <p>Vị trí chuyên môn: <b>{contract.position}</b></p>
                    <p>Thời hạn: <b>{contract.startDate}</b> đến <b>{contract.endDate}</b></p>
                    <p>Mức lương HĐ: <b className="text-emerald-700">{formatVND(contract.salary)}</b></p>
                    {contract.note && <p className="text-slate-500 italic mt-1">Ghi chú: {contract.note}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Salary Adjustments History */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span>2. Lịch sử Diễn biến Thu nhập & Tăng lương</span>
            </h3>
          </div>

          <div className="space-y-3">
            {selectedEmp.salaryHistory.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                Chưa có ghi nhận điều chỉnh lương.
              </div>
            ) : (
              selectedEmp.salaryHistory.map(sal => (
                <div key={sal.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {sal.changeType}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">Áp dụng: {sal.effectiveDate}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div>
                      <span className="text-slate-500 block">Lương cũ:</span>
                      <span className="line-through text-slate-400">{formatVND(sal.oldSalary)}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-500 block">Lương mới:</span>
                      <span className="font-bold text-emerald-600 text-sm">{formatVND(sal.newSalary)}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 pt-1 border-t border-slate-200/60">
                    Lý do: <span className="italic">{sal.reason}</span> (Người duyệt: {sal.approvedBy})
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Monthly Payslips Table for Selected Employee */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-indigo-600" />
            <span>3. Danh sách Phiếu lương từng tháng của {selectedEmp.fullName}</span>
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
              {selectedEmp.payslips.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Chưa có phiếu lương được phát hành cho nhân viên này.
                  </td>
                </tr>
              ) : (
                selectedEmp.payslips.map(ps => (
                  <tr key={ps.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      Tháng {ps.month}/{ps.year}
                    </td>
                    <td className="py-3 px-4">{formatVND(ps.baseSalary)}</td>
                    <td className="py-3 px-4 text-emerald-600 font-medium">+{formatVND(ps.kpiBonus)}</td>
                    <td className="py-3 px-4 text-blue-600 font-medium">+{formatVND(ps.otPay)}</td>
                    <td className="py-3 px-4 font-semibold">{formatVND(ps.grossIncome)}</td>
                    <td className="py-3 px-4 text-rose-600">-{formatVND(ps.bhxhDeduction + ps.personalIncomeTax)}</td>
                    <td className="py-3 px-4 font-extrabold text-emerald-700 text-sm">{formatVND(ps.netSalary)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        ps.paymentStatus === 'Đã thanh toán' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {ps.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedPayslipId(ps.id)}
                        className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold cursor-pointer"
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
    </div>
  );
};
