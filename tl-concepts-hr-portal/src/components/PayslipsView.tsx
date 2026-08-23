import React, { useState } from 'react';
import { useHR } from '../context/HRContext';
import { formatVND, formatDate } from '../utils/formatters';
import { 
  Receipt, 
  Search, 
  Filter, 
  ArrowUpRight, 
  CheckCircle2, 
  ShieldCheck, 
  DollarSign,
  Printer,
  Calendar
} from 'lucide-react';

export const PayslipsView: React.FC = () => {
  const { currentEmployee, setSelectedPayslipId } = useHR();
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // Calculate annual statistics
  const filteredPayslips = currentEmployee.payslips.filter(p => p.year === selectedYear);

  const totalGrossAnnual = filteredPayslips.reduce((acc, p) => acc + p.grossIncome, 0);
  const totalNetAnnual = filteredPayslips.reduce((acc, p) => acc + p.netSalary, 0);
  const totalTaxInsuranceAnnual = filteredPayslips.reduce(
    (acc, p) => acc + p.bhxhDeduction + p.bhytDeduction + p.bhtnDeduction + p.personalIncomeTax, 
    0
  );

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-success-600" />
            <h1 className="text-lg font-extrabold text-slate-900">Quản lý Phiếu lương Cá nhân</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tra cứu toàn bộ phiếu lương hàng tháng của <strong className="text-slate-800">{currentEmployee.fullName}</strong> ({currentEmployee.employeeCode})
          </p>
        </div>

        {/* Year Filter */}
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 border border-slate-200 rounded-xl">
          <Calendar className="w-4 h-4 text-slate-400 ml-2" />
          <span className="text-xs font-bold text-slate-600">Năm:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-white text-xs font-bold text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-success-500 cursor-pointer"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
            <option value={2024}>2024</option>
          </select>
        </div>
      </div>

      {/* Annual Summary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-success-900 to-teal-950 text-white p-5 rounded-2xl shadow-md space-y-1">
          <span className="text-[11px] uppercase font-bold text-success-300 tracking-wider">TỔNG LƯƠNG THỰC LĨNH (NET {selectedYear})</span>
          <p className="text-2xl font-black font-mono text-white">{formatVND(totalNetAnnual)}</p>
          <p className="text-[10px] text-success-200">Đã chuyển khoản trực tiếp qua Ngân hàng</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">TỔNG THU NHẬP (GROSS {selectedYear})</span>
          <p className="text-2xl font-black font-mono text-slate-900">{formatVND(totalGrossAnnual)}</p>
          <p className="text-[10px] text-slate-400">Bao gồm Lương cơ bản, KPI, OT & Các khoản Phụ cấp</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] uppercase font-bold text-rose-600 tracking-wider">TỔNG THUẾ & BẢO HIỂM ĐÃ ĐÓNG</span>
          <p className="text-2xl font-black font-mono text-rose-700">-{formatVND(totalTaxInsuranceAnnual)}</p>
          <p className="text-[10px] text-slate-400">BHXH 8%, BHYT 1.5%, BHTN 1% & Thuế TNCN</p>
        </div>
      </div>

      {/* Payslips Cards Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900">Danh sách các kỳ lương trong năm {selectedYear}</h2>
          <span className="text-[11px] text-slate-500 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
            ℹ️ Ngày công chuẩn: Tính từ ngày 01 đến 30/31 hàng tháng (5.5 ngày/tuần: T2-T6 x 1.0 + T7 x 0.5)
          </span>
        </div>

        {filteredPayslips.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-xs text-slate-400 space-y-2">
            <p className="font-semibold text-slate-600">Chưa có dữ liệu phiếu lương năm {selectedYear}</p>
            <p>Vui lòng chuyển sang chọn năm 2026 để xem phiếu lương gần nhất.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPayslips.map((ps) => (
              <div 
                key={ps.id} 
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-success-300 transition-all overflow-hidden flex flex-col justify-between"
              >
                {/* Card Top Header */}
                <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-success-400" />
                    <span className="font-bold text-sm">Tháng {ps.month}/{ps.year}</span>
                  </div>
                  <span className="text-[10px] font-bold bg-success-500/20 text-success-300 px-2 py-0.5 rounded-md border border-success-500/30">
                    {ps.paymentStatus}
                  </span>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-3.5 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-slate-500">Lương cơ bản ({ps.actualWorkDays}/{ps.standardWorkDays} công):</span>
                    <strong className="font-mono text-slate-800">{formatVND(ps.baseSalary)}</strong>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-slate-500">Lương KPI & OT tăng ca:</span>
                    <strong className="font-mono text-success-700">+{formatVND(ps.kpiBonus + ps.otPay)}</strong>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-slate-500">Tổng khấu trừ Bảo hiểm & Thuế:</span>
                    <strong className="font-mono text-rose-700">
                      -{formatVND(ps.bhxhDeduction + ps.bhytDeduction + ps.bhtnDeduction + ps.personalIncomeTax)}
                    </strong>
                  </div>

                  {/* Net highlight */}
                  <div className="bg-success-50 p-3.5 rounded-xl border border-success-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-success-800">THỰC LĨNH (NET)</span>
                      <p className="text-lg font-black font-mono text-success-800 mt-0.5">{formatVND(ps.netSalary)}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 font-medium block">Ngày chuyển lương</span>
                      <span className="text-xs font-bold text-slate-800">{formatDate(ps.paymentDate || '')}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action */}
                <div className="p-3 bg-slate-50 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedPayslipId(ps.id)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-white bg-success-600 hover:bg-success-700 rounded-xl transition-colors cursor-pointer shadow-xs"
                  >
                    <span>Xem & In phiếu lương chi tiết</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
