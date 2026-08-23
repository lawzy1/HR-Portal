import React, { useState } from 'react';
import { useHR } from '../context/HRContext';
import { formatVND, formatDate } from '../utils/formatters';
import { 
  FileCheck, 
  CreditCard, 
  Calendar, 
  Clock, 
  TrendingUp, 
  History, 
  Receipt, 
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const ContractSalaryView: React.FC = () => {
  const { currentEmployee, setSelectedPayslipId, setActiveTab } = useHR();

  const [activeSubTab, setActiveSubTab] = useState<'contracts' | 'salaryHistory' | 'payslips'>('contracts');

  return (
    <div className="space-y-6">
      
      {/* 1. Overview Banner Section */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-slate-800">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-md border border-emerald-800/80">
              MISA & BambooHR Contract Engine
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-2">{currentEmployee.fullName}</h1>
            <p className="text-xs text-slate-300 font-medium">Chức vụ: <strong className="text-emerald-300">{currentEmployee.jobTitle}</strong> • {currentEmployee.department}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold rounded-xl flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{currentEmployee.contractType}</span>
            </span>
          </div>
        </div>

        {/* Overview Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 font-medium block">Hợp đồng hiện tại</span>
            <p className="text-sm font-extrabold text-emerald-300 mt-1">
              {formatDate(currentEmployee.contractStartDate)} – {currentEmployee.contractEndDate === '2099-12-31' ? 'Không xác định' : formatDate(currentEmployee.contractEndDate)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Loại: {currentEmployee.contractType}</p>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 font-medium block">Ngày cần gia hạn hợp đồng</span>
            <p className="text-sm font-extrabold text-amber-300 mt-1">
              {formatDate(currentEmployee.contractRenewalDate)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              {currentEmployee.contractRenewalDate === 'N/A' ? 'Hợp đồng không thời hạn' : 'Thông báo HR trước 30 ngày'}
            </p>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 font-medium block">Mức lương hiện tại</span>
            <p className="text-lg font-black font-mono text-emerald-400 mt-1">
              {formatVND(currentEmployee.currentSalary)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Lương Gross chính thức</p>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 font-medium block">Ngày xét/tăng lương gần nhất</span>
            <p className="text-sm font-extrabold text-teal-300 mt-1">
              {formatDate(currentEmployee.lastSalaryReviewDate)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Đánh giá hiệu suất công việc định kỳ</p>
          </div>

        </div>
      </div>

      {/* 2. Sub-tabs Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-2 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('contracts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'contracts'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Lịch sử Hợp đồng ({currentEmployee.contracts.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('salaryHistory')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'salaryHistory'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Lịch sử Thay đổi Lương ({currentEmployee.salaryHistory.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('payslips')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'payslips'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Lịch sử Phiếu lương Hàng tháng ({currentEmployee.payslips.length})</span>
        </button>
      </div>

      {/* Sub-tab 1: Contract History */}
      {activeSubTab === 'contracts' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>Chi tiết Lịch sử Hợp đồng Lao động</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">Cập nhật bởi Phòng HR</span>
          </div>

          {currentEmployee.contracts.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">Chưa có dữ liệu lịch sử hợp đồng.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-3 rounded-l-lg">Mã Hợp đồng</th>
                    <th className="py-3 px-3">Loại hợp đồng</th>
                    <th className="py-3 px-3">Vị trí</th>
                    <th className="py-3 px-3">Thời hạn từ – đến</th>
                    <th className="py-3 px-3">Mức lương HD</th>
                    <th className="py-3 px-3">Trạng thái</th>
                    <th className="py-3 px-3 rounded-r-lg">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentEmployee.contracts.map((ctr) => (
                    <tr key={ctr.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3 font-bold font-mono text-emerald-800">{ctr.contractCode}</td>
                      <td className="py-3.5 px-3 font-semibold text-slate-900">{ctr.type}</td>
                      <td className="py-3.5 px-3 text-slate-700">{ctr.position}</td>
                      <td className="py-3.5 px-3 text-slate-600">
                        {formatDate(ctr.startDate)} – {ctr.endDate === '2099-12-31' ? 'Không thời hạn' : formatDate(ctr.endDate)}
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-900">{formatVND(ctr.salary)}</td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border ${
                          ctr.status === 'Đang hiệu lực' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          ctr.status === 'Sắp hết hạn' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {ctr.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-500 text-[11px]">{ctr.note || 'Không có'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sub-tab 2: Salary Adjustment History */}
      {activeSubTab === 'salaryHistory' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Chi tiết Lịch sử Điều chỉnh & Tăng lương</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">Lưu trữ quyết định tăng lương</span>
          </div>

          {currentEmployee.salaryHistory.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">Chưa có dữ liệu biến động lương.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-3 rounded-l-lg">Ngày hiệu lực</th>
                    <th className="py-3 px-3">Mức lương cũ</th>
                    <th className="py-3 px-3">Mức lương mới</th>
                    <th className="py-3 px-3">Tăng thêm</th>
                    <th className="py-3 px-3">Loại điều chỉnh</th>
                    <th className="py-3 px-3">Lý do điều chỉnh</th>
                    <th className="py-3 px-3 rounded-r-lg">Người phê duyệt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentEmployee.salaryHistory.map((sal) => {
                    const diff = sal.newSalary - sal.oldSalary;
                    return (
                      <tr key={sal.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-3 font-bold text-slate-900">{formatDate(sal.effectiveDate)}</td>
                        <td className="py-3.5 px-3 font-mono text-slate-500">{sal.oldSalary > 0 ? formatVND(sal.oldSalary) : 'Ban đầu'}</td>
                        <td className="py-3.5 px-3 font-mono font-bold text-emerald-800">{formatVND(sal.newSalary)}</td>
                        <td className="py-3.5 px-3 font-mono font-bold text-emerald-600">
                          {diff > 0 ? `+${formatVND(diff)}` : formatVND(diff)}
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-slate-800">{sal.changeType}</td>
                        <td className="py-3.5 px-3 text-slate-600 max-w-xs">{sal.reason}</td>
                        <td className="py-3.5 px-3 text-slate-500 font-medium">{sal.approvedBy}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sub-tab 3: Payslips History */}
      {activeSubTab === 'payslips' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>Danh sách Phiếu lương hàng tháng (Từ khi bắt đầu làm việc)</span>
            </h3>
            <button
              onClick={() => setActiveTab('payslips')}
              className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
            >
              Xem trang Phiếu lương đầy đủ
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {currentEmployee.payslips.map((ps) => (
              <div key={ps.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 hover:border-emerald-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200">
                    Tháng {ps.month}/{ps.year}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {ps.paymentStatus}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Lương Gross:</span>
                    <span className="font-mono text-slate-800 font-medium">{formatVND(ps.grossIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">BHXH/BHYT/Thuế:</span>
                    <span className="font-mono text-rose-700">-{formatVND(ps.bhxhDeduction + ps.bhytDeduction + ps.bhtnDeduction + ps.personalIncomeTax)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200 font-bold">
                    <span className="text-slate-900">THỰC LĨNH (NET):</span>
                    <span className="font-mono text-emerald-700 text-sm">{formatVND(ps.netSalary)}</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedPayslipId(ps.id)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-50 rounded-xl border border-emerald-200 transition-colors cursor-pointer"
                >
                  <span>Chi tiết phiếu lương</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
