import React, { useState } from 'react';
import { useHR } from '../context/HRContext';
import { useAuth } from '../context/AuthContext';
import { useEmployeeSensitiveInfo } from '../hooks/useEmployees';
import { usePayrollRecord } from '../hooks/usePayroll';
import { formatVND, formatDate } from '../utils/formatters';
import { X, Printer, Download, Building2, CheckCircle2, FileText } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useSignedImageUrl } from '../hooks/useFileUpload';

export const PayslipDetailModal: React.FC = () => {
  const { selectedPayslipId, setSelectedPayslipId } = useHR();
  const { profile, session } = useAuth();
  const [verifiedPayslipId, setVerifiedPayslipId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [reauthError, setReauthError] = useState('');
  const needsReauth = profile?.role === 'employee' && verifiedPayslipId !== selectedPayslipId;

  const { data: payslip } = usePayrollRecord(needsReauth ? undefined : selectedPayslipId ?? undefined);
  const { data: bankInfo } = useEmployeeSensitiveInfo(payslip?.employee_id);
  const { data: payslipPdfUrl } = useSignedImageUrl(payslip?.payslip_pdf_path);

  if (!selectedPayslipId) return null;

  const close = () => {
    setSelectedPayslipId(null);
    setVerifiedPayslipId(null);
    setPassword('');
    setReauthError('');
  };

  const handleReauth = async (event: React.FormEvent) => {
    event.preventDefault();
    const email = session?.user.email;
    if (!email) return;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setReauthError('Mật khẩu không đúng.');
      return;
    }
    setVerifiedPayslipId(selectedPayslipId);
    setPassword('');
    setReauthError('');
  };

  if (needsReauth) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <form onSubmit={handleReauth} className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-slate-200">
          <div>
            <h2 className="font-bold text-slate-900">Xác nhận trước khi xem phiếu lương</h2>
            <p className="text-xs text-slate-500 mt-1">Nhập lại mật khẩu để bảo vệ dữ liệu trên máy tính dùng chung.</p>
          </div>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus required className="w-full p-2.5 border border-slate-300 rounded-xl text-sm" placeholder="Mật khẩu" />
          {reauthError && <p className="text-xs text-rose-700">{reauthError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={close} className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-semibold">Hủy</button>
            <button type="submit" className="px-4 py-2 bg-success-600 text-white rounded-xl text-xs font-bold">Xác nhận</button>
          </div>
        </form>
      </div>
    );
  }

  if (!payslip) return null;

  const employee = payslip.employees;

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
            {payslipPdfUrl ? (
              <a
                href={payslipPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-success-600 hover:bg-success-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải PDF chính thức</span>
              </a>
            ) : (
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-success-600 hover:bg-success-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>In / Lưu PDF</span>
              </button>
            )}
            <button
              onClick={close}
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
                <span>TL CONCEPTS</span>
              </div>
              <p className="text-xs text-slate-500">Phiếu lương nội bộ — dữ liệu từ kết quả kế toán đã được duyệt.</p>
            </div>
            <div className="text-left sm:text-right">
              <span className="inline-block px-3 py-1 bg-success-50 text-success-800 font-bold text-xs rounded-lg border border-success-200 mb-1">
                PHIẾU LƯƠNG
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
              <strong className="text-slate-900 text-sm">{employee?.full_name}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Mã nhân viên</span>
              <strong className="font-mono text-success-800">{employee?.employee_code}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Chức vụ</span>
              <strong className="text-slate-800">{employee?.job_title}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Phòng ban</span>
              <strong className="text-slate-800">{employee?.department}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Ngày công thực tế / chuẩn</span>
              <strong className="font-mono text-slate-800">{payslip.actual_work_days} / {payslip.standard_work_days} ngày</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Phép đã dùng / còn lại</span>
              <strong className="font-mono text-slate-800">{payslip.annual_leave_used_days} / {payslip.annual_leave_remaining_days} ngày</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Người phụ thuộc</span>
              <strong className="font-mono text-slate-800">{payslip.dependents_count}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Email</span>
              <strong className="text-slate-800">{employee?.email || '—'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Tài khoản nhận lương</span>
              <strong className="font-mono text-slate-800">{bankInfo?.bank_name || '—'} · {bankInfo?.bank_account_number || '—'}</strong>
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
                {payslip.workday_salary > 0 ? (
                  <div className="flex justify-between pb-1.5 border-b border-slate-100">
                    <span className="text-slate-600">Lương theo ngày công <small className="block text-[10px] text-slate-400">Lương HĐ: {formatVND(payslip.base_salary)}</small></span>
                    <span className="font-medium font-mono">{formatVND(payslip.workday_salary)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between pb-1.5 border-b border-slate-100">
                    <span className="text-slate-600">Lương cơ bản hợp đồng:</span>
                    <span className="font-medium font-mono">{formatVND(payslip.base_salary)}</span>
                  </div>
                )}
                <div className="flex justify-between pb-1.5 border-b border-slate-100">
                  <div>
                    <span className="text-slate-600 block">Ngày công thực tế / chuẩn:</span>
                    <span className="text-[10px] text-slate-400 font-medium">Theo dữ liệu kỳ lương đã import</span>
                  </div>
                  <span className="font-bold font-mono text-slate-800 self-center">{payslip.actual_work_days} / {payslip.standard_work_days} ngày</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Lương KPI hoàn thành:</span>
                  <span className="font-medium font-mono text-success-700">+{formatVND(payslip.kpi_bonus)}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-100">
                  <span className="text-slate-600">OT / thưởng dự án:</span>
                  <span className="font-medium font-mono text-success-700">+{formatVND(payslip.ot_pay + payslip.project_bonus_amount)}</span>
                </div>

                <div className="flex justify-between pb-1.5 border-b border-slate-100 pl-2 text-[11px]">
                  <span className="text-slate-500">• Phụ cấp điện thoại:</span>
                  <span className="font-medium font-mono">+{formatVND(payslip.phone_allowance)}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-100 pl-2 text-[11px]">
                  <span className="text-slate-500">• Phụ cấp ăn trưa:</span>
                  <span className="font-medium font-mono">+{formatVND(payslip.lunch_allowance)}</span>
                </div>

                {payslip.holiday_bonus_amount > 0 && (
                  <div className="flex justify-between pb-1.5 border-b border-slate-100">
                    <span className="text-slate-600">Thưởng lễ:</span>
                    <span className="font-medium font-mono text-success-700">+{formatVND(payslip.holiday_bonus_amount)}</span>
                  </div>
                )}

                <div className="flex justify-between pt-2 text-xs font-bold text-slate-900 border-t-2 border-slate-200">
                  <span>TỔNG THU NHẬP (GROSS):</span>
                  <span className="font-mono text-success-800">{formatVND(payslip.gross_income)}</span>
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
                  <span className="text-slate-600">BHXH / BHYT / BHTN bắt buộc (theo Excel):</span>
                  <span className="font-medium font-mono text-rose-700">-{formatVND(
                    payslip.bhxh_deduction + payslip.bhyt_deduction + payslip.bhtn_deduction
                  )}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Thuế Thu nhập cá nhân (TNCN):</span>
                  <span className="font-medium font-mono text-rose-700">-{formatVND(payslip.personal_income_tax)}</span>
                </div>

                {payslip.advance_payment > 0 && (
                  <div className="flex justify-between pb-1.5 border-b border-slate-100">
                    <span className="text-slate-600">Khấu trừ tạm ứng:</span>
                    <span className="font-medium font-mono text-rose-700">-{formatVND(payslip.advance_payment)}</span>
                  </div>
                )}

                {payslip.other_deductions > 0 && (
                  <div className="flex justify-between pb-1.5 border-b border-slate-100">
                    <span className="text-slate-600">Khấu trừ khác:</span>
                    <span className="font-medium font-mono text-rose-700">-{formatVND(payslip.other_deductions)}</span>
                  </div>
                )}

                <div className="flex justify-between pt-2 text-xs font-bold text-slate-900 border-t-2 border-slate-200">
                  <span>TỔNG KHẤU TRỪ:</span>
                  <span className="font-mono text-rose-700">
                    -{formatVND(payslip.bhxh_deduction + payslip.bhyt_deduction + payslip.bhtn_deduction + payslip.personal_income_tax + payslip.advance_payment + payslip.other_deductions)}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {(payslip.welfare_refund > 0 || payslip.business_trip_refund > 0 || payslip.personal_income_tax_refund > 0 || payslip.prior_month_adjustment !== 0) && (
            <div className="overflow-hidden rounded-xl border border-primary-200">
              <div className="flex items-center justify-between bg-primary-50 px-4 py-2.5 text-xs font-bold text-primary-800">
                <span>III. ĐIỀU CHỈNH & HOÀN TRẢ</span>
                <span>SỐ TIỀN (VNĐ)</span>
              </div>
              <div className="grid grid-cols-1 gap-2 p-4 text-xs sm:grid-cols-2">
                <div className="flex justify-between border-b border-slate-100 pb-2"><span>Hoàn chi phí phúc lợi</span><b className="font-mono">+{formatVND(payslip.welfare_refund)}</b></div>
                <div className="flex justify-between border-b border-slate-100 pb-2"><span>Hoàn công tác phí</span><b className="font-mono">+{formatVND(payslip.business_trip_refund)}</b></div>
                <div className="flex justify-between border-b border-slate-100 pb-2"><span>Hoàn thuế TNCN</span><b className="font-mono">+{formatVND(payslip.personal_income_tax_refund)}</b></div>
                <div className="flex justify-between border-b border-slate-100 pb-2"><span>Truy lĩnh / điều chỉnh kỳ trước</span><b className="font-mono">{payslip.prior_month_adjustment > 0 ? '+' : ''}{formatVND(payslip.prior_month_adjustment)}</b></div>
              </div>
            </div>
          )}

          {/* NET SALARY HIGHLIGHT BOX */}
          <div className="bg-gradient-to-r from-success-800 to-teal-900 text-white p-5 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase font-bold text-success-200 tracking-wider">TỔNG LƯƠNG THỰC LĨNH (NET SALARY)</p>
              <h2 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white mt-0.5">
                {formatVND(payslip.net_salary)}
              </h2>
              <p className="text-[11px] text-success-100 mt-1">
                Tổng thu nhập − Tổng khấu trừ + Điều chỉnh &amp; hoàn trả
              </p>
            </div>

            <div className="text-right">
              <div className="inline-flex items-center gap-1.5 bg-success-500/30 text-success-100 text-xs font-bold px-3 py-1.5 rounded-xl border border-success-400/40">
                <CheckCircle2 className="w-4 h-4 text-success-300" />
                <span>{payslip.payment_status}</span>
              </div>
              {payslip.payment_date && (
                <p className="text-[11px] text-success-200 mt-1">Ngày chuyển: {formatDate(payslip.payment_date)}</p>
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
              <p className="font-semibold text-slate-700 mt-12">{employee?.full_name}</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
