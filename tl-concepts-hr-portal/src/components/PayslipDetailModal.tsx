import React from 'react';
import { useHR } from '../context/HRContext';
import { formatVND, formatDate } from '../utils/formatters';
import { X, Printer, Download, Building2, CheckCircle2, DollarSign, FileText } from 'lucide-react';

export const PayslipDetailModal: React.FC = () => {
  const { currentEmployee, selectedPayslipId, setSelectedPayslipId, showToast } = useHR();

  if (!selectedPayslipId) return null;

  const payslip = currentEmployee.payslips.find(p => p.id === selectedPayslipId);
  if (!payslip) return null;

  const totalAllowances = payslip.allowances.reduce((acc, curr) => acc + curr.amount, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header toolbar */}
        <div className="bg-slate-900 text-white p-4 px-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-success-400" />
            <span className="font-bold text-sm">Chi tiết Phiếu lương • Tháng {payslip.month}/{payslip.year}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In phiếu lương</span>
            </button>
            <button
              onClick={() => showToast('Đã tải xuống file PDF phiếu lương thành công')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-success-600 hover:bg-success-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải PDF</span>
            </button>
            <button
              onClick={() => setSelectedPayslipId(null)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Payslip Body */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 text-slate-800 printable-payslip">
          
          {/* Company branding header */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-5 gap-4">
            <div>
              <div className="flex items-center gap-2 text-success-700 font-extrabold text-base mb-1">
                <Building2 className="w-5 h-5" />
                <span>CÔNG TY TNHH GIẢI PHÁP CÔNG NGHỆ VIỆT</span>
              </div>
              <p className="text-xs text-slate-500">Tòa nhà Innovation Hub, Quận 1, TP. Hồ Chí Minh</p>
              <p className="text-xs text-slate-500">MST: 0312984756 • Hotline: 1900 6868</p>
            </div>
            <div className="text-left sm:text-right">
              <span className="inline-block px-3 py-1 bg-success-50 text-success-800 font-bold text-xs rounded-lg border border-success-200 mb-1">
                Mẫu MISA-PAYROLL-01
              </span>
              <p className="text-xs text-slate-500 font-medium">Mã phiếu: <span className="font-mono">{payslip.id}</span></p>
            </div>
          </div>

          {/* Payslip Title */}
          <div className="text-center py-2">
            <h1 className="text-xl font-extrabold uppercase text-slate-900 tracking-tight">PHIẾU LƯƠNG NHÂN VIÊN</h1>
            <p className="text-xs font-bold text-success-700 mt-1">Kỳ tính lương: Tháng {payslip.month}/{payslip.year}</p>
          </div>

          {/* Employee Basic Info Grid */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4">
            <div>
              <span className="text-slate-500 block text-[11px]">Họ và tên</span>
              <strong className="text-slate-900 text-sm">{currentEmployee.fullName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Mã nhân viên</span>
              <strong className="font-mono text-success-800">{currentEmployee.employeeCode}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Chức vụ</span>
              <strong className="text-slate-800">{currentEmployee.jobTitle}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Phòng ban</span>
              <strong className="text-slate-800">{currentEmployee.department}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Tài khoản ngân hàng</span>
              <strong className="font-mono text-slate-800">{currentEmployee.bankInfo.bankName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Số tài khoản</span>
              <strong className="font-mono text-slate-800">{currentEmployee.bankInfo.accountNumber}</strong>
            </div>
          </div>

          {/* 2-Column Income vs Deductions Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Column 1: Income / Thống kê Thu nhập */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-success-700 text-white text-xs font-bold px-4 py-2.5 flex justify-between items-center">
                <span>I. THU NHẬP (GROSS)</span>
                <span>SỐ TIỀN (VNĐ)</span>
              </div>
              <div className="p-4 space-y-2.5 text-xs">
                <div className="flex justify-between pb-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Lương cơ bản hợp đồng:</span>
                  <span className="font-medium font-mono">{formatVND(payslip.baseSalary)}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-100">
                  <div>
                    <span className="text-slate-600 block">Ngày công thực tế / chuẩn:</span>
                    <span className="text-[10px] text-slate-400 font-medium">Lịch 5.5 ngày/tuần (T2-T6 + 0.5 T7)</span>
                  </div>
                  <span className="font-bold font-mono text-slate-800 self-center">{payslip.actualWorkDays} / {payslip.standardWorkDays} ngày</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Lương KPI hoàn thành:</span>
                  <span className="font-medium font-mono text-success-700">+{formatVND(payslip.kpiBonus)}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Lương tăng ca OT ({payslip.otHours} giờ):</span>
                  <span className="font-medium font-mono text-success-700">+{formatVND(payslip.otPay)}</span>
                </div>

                {/* Allowances list */}
                {payslip.allowances.map((al, idx) => (
                  <div key={idx} className="flex justify-between pb-1.5 border-b border-slate-100 pl-2 text-[11px]">
                    <span className="text-slate-500">• {al.name}:</span>
                    <span className="font-medium font-mono">+{formatVND(al.amount)}</span>
                  </div>
                ))}

                {payslip.otherBonuses > 0 && (
                  <div className="flex justify-between pb-1.5 border-b border-slate-100">
                    <span className="text-slate-600">Thưởng khác:</span>
                    <span className="font-medium font-mono text-success-700">+{formatVND(payslip.otherBonuses)}</span>
                  </div>
                )}

                <div className="flex justify-between pt-2 text-xs font-bold text-slate-900 border-t-2 border-slate-200">
                  <span>TỔNG THU NHẬP (GROSS):</span>
                  <span className="font-mono text-success-800">{formatVND(payslip.grossIncome)}</span>
                </div>
              </div>
            </div>

            {/* Column 2: Deductions / Thống kê Khấu trừ */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-rose-700 text-white text-xs font-bold px-4 py-2.5 flex justify-between items-center">
                <span>II. CÁC KHOẢN KHẤU TRỪ</span>
                <span>SỐ TIỀN (VNĐ)</span>
              </div>
              <div className="p-4 space-y-2.5 text-xs">
                <div className="flex justify-between pb-1.5 border-b border-slate-100">
                  <span className="text-slate-600">BHXH bắt buộc (8%):</span>
                  <span className="font-medium font-mono text-rose-700">-{formatVND(payslip.bhxhDeduction)}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-100">
                  <span className="text-slate-600">BHYT (1.5%):</span>
                  <span className="font-medium font-mono text-rose-700">-{formatVND(payslip.bhytDeduction)}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-100">
                  <span className="text-slate-600">BHTN (1%):</span>
                  <span className="font-medium font-mono text-rose-700">-{formatVND(payslip.bhtnDeduction)}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Thuế Thu nhập cá nhân (TNCN):</span>
                  <span className="font-medium font-mono text-rose-700">-{formatVND(payslip.personalIncomeTax)}</span>
                </div>

                {payslip.advancePayment > 0 && (
                  <div className="flex justify-between pb-1.5 border-b border-slate-100">
                    <span className="text-slate-600">Khấu trừ tạm ứng:</span>
                    <span className="font-medium font-mono text-rose-700">-{formatVND(payslip.advancePayment)}</span>
                  </div>
                )}

                {payslip.otherDeductions > 0 && (
                  <div className="flex justify-between pb-1.5 border-b border-slate-100">
                    <span className="text-slate-600">Khấu trừ khác:</span>
                    <span className="font-medium font-mono text-rose-700">-{formatVND(payslip.otherDeductions)}</span>
                  </div>
                )}

                <div className="flex justify-between pt-2 text-xs font-bold text-slate-900 border-t-2 border-slate-200">
                  <span>TỔNG KHẤU TRỪ:</span>
                  <span className="font-mono text-rose-700">
                    -{formatVND(payslip.bhxhDeduction + payslip.bhytDeduction + payslip.bhtnDeduction + payslip.personalIncomeTax + payslip.advancePayment + payslip.otherDeductions)}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* NET SALARY HIGHLIGHT BOX */}
          <div className="bg-gradient-to-r from-success-800 to-teal-900 text-white p-5 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase font-bold text-success-200 tracking-wider">TỔNG LƯƠNG THỰC LĨNH (NET SALARY)</p>
              <h2 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white mt-0.5">
                {formatVND(payslip.netSalary)}
              </h2>
              <p className="text-[11px] text-success-100 mt-1">
                Lương thực chuyển khoản = Tổng Gross - Các khoản bảo hiểm & Thuế
              </p>
            </div>

            <div className="text-right">
              <div className="inline-flex items-center gap-1.5 bg-success-500/30 text-success-100 text-xs font-bold px-3 py-1.5 rounded-xl border border-success-400/40">
                <CheckCircle2 className="w-4 h-4 text-success-300" />
                <span>{payslip.paymentStatus}</span>
              </div>
              {payslip.paymentDate && (
                <p className="text-[11px] text-success-200 mt-1">Ngày chuyển: {formatDate(payslip.paymentDate)}</p>
              )}
            </div>
          </div>

          {/* Footer signatures */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-2 text-center text-xs text-slate-600">
            <div>
              <p className="font-bold text-slate-800">Người lập phiếu</p>
              <p className="text-[11px] text-slate-400 mt-1">(Ký & ghi rõ họ tên)</p>
              <p className="font-semibold text-slate-700 mt-12">Phòng Nhân sự HR</p>
            </div>
            <div>
              <p className="font-bold text-slate-800">Xác nhận của Nhân viên</p>
              <p className="text-[11px] text-slate-400 mt-1">(Ký & ghi rõ họ tên)</p>
              <p className="font-semibold text-slate-700 mt-12">{currentEmployee.fullName}</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
