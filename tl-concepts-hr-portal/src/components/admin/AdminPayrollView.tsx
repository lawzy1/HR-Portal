import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  DollarSign, 
  CheckCircle2, 
  Printer, 
  Search, 
  Calculator,
  Edit,
  Save,
  RotateCcw,
  PlusCircle,
  FileSpreadsheet,
  CalendarDays,
  Info
} from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { Payslip, Employee } from '../../types';
import { getMonthWorkDays } from '../../utils/workDays';

export const AdminPayrollView: React.FC = () => {
  const { employees, updatePayslipRecord, setSelectedPayslipId, showToast } = useHR();

  const [selectedMonth, setSelectedMonth] = useState<number>(7);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Calculate dynamic standard work days for the selected month (1st to 30/31st, 5.5 days/week)
  const monthWorkInfo = useMemo(() => {
    return getMonthWorkDays(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  // Editing Payslip Modal State
  const [editingRow, setEditingRow] = useState<{
    employee: Employee;
    payslip: Payslip;
  } | null>(null);

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  // Compile monthly payroll table for all active employees
  const payrollRows = employees.map(emp => {
    // Check if employee already has a saved payslip for this month/year
    const existingPayslip = emp.payslips.find(p => p.month === selectedMonth && p.year === selectedYear);

    if (existingPayslip) {
      return {
        employee: emp,
        payslip: existingPayslip,
      };
    }

    // Auto calculate dynamic initial values using standard work days calculated for this month
    const baseSal = emp.currentSalary || 20000000;
    const stdDays = monthWorkInfo.standardWorkDays;
    const actDays = monthWorkInfo.standardWorkDays;

    // Phụ cấp điện thoại, ăn trưa
    const phoneAllowance = 500000;
    const lunchAllowance = 1000000;

    // Phụ cấp thiết kế (KPI) - linked from KPI data of the selected month
    const kpiData = emp.kpiData.find(k => k.month === selectedMonth && k.year === selectedYear);
    const kpiDesignAllowance = kpiData ? kpiData.bonusAmount : 3000000;

    // Lương OT
    const otTotal = (emp.otRecords || []).reduce((acc, curr) => acc + (curr.amount || 0), 0);

    // Thưởng % dự án & Điều chỉnh tháng trước
    const projectBonusAmount = 0;
    const priorMonthAdjustment = 0;

    // Gross Income calculation
    const proratedBase = Math.round((baseSal / stdDays) * actDays);
    const gross = proratedBase + phoneAllowance + lunchAllowance + kpiDesignAllowance + otTotal + projectBonusAmount + priorMonthAdjustment;

    // BHXH (10.5%: 8% BHXH + 1.5% BHYT + 1% BHTN)
    const bhxh = Math.round(baseSal * 0.08);
    const bhyt = Math.round(baseSal * 0.015);
    const bhtn = Math.round(baseSal * 0.01);
    const totalInsurance = bhxh + bhyt + bhtn;

    // Giảm trừ gia cảnh (11.000.000đ)
    const familyDeduction = 11000000;
    const taxExemptIncome = 0;

    // Thu nhập tính thuế = Gross - Insurance - Giảm trừ gia cảnh - Miễn thuế
    const taxable = Math.max(0, gross - totalInsurance - familyDeduction - taxExemptIncome);
    const pit = Math.round(taxable * 0.1);
    const net = Math.max(0, gross - totalInsurance - pit);

    const generatedPayslip: Payslip = {
      id: `ps-gen-${emp.id}-${selectedMonth}-${selectedYear}`,
      month: selectedMonth,
      year: selectedYear,
      baseSalary: baseSal,
      standardWorkDays: stdDays,
      actualWorkDays: actDays,
      kpiBonus: kpiDesignAllowance,
      kpiDesignAllowance,
      phoneAllowance,
      lunchAllowance,
      otHours: 5,
      otPay: otTotal,
      projectBonusAmount,
      priorMonthAdjustment,
      familyDeduction,
      taxExemptIncome,
      allowances: [
        { name: 'Phụ cấp điện thoại', amount: phoneAllowance },
        { name: 'Phụ cấp ăn trưa', amount: lunchAllowance },
        { name: 'Phụ cấp thiết kế (KPI)', amount: kpiDesignAllowance },
      ],
      otherBonuses: projectBonusAmount,
      grossIncome: gross,
      bhxhDeduction: bhxh,
      bhytDeduction: bhyt,
      bhtnDeduction: bhtn,
      taxableIncome: taxable,
      personalIncomeTax: pit,
      advancePayment: 0,
      otherDeductions: 0,
      netSalary: net,
      paymentStatus: 'Chờ thanh toán',
    };

    return {
      employee: emp,
      payslip: generatedPayslip,
    };
  });

  const filteredPayroll = payrollRows.filter(row => 
    row.employee.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.employee.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.employee.jobTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Aggregated Financial Totals for Month
  const totalCompanyGross = filteredPayroll.reduce((acc, curr) => acc + curr.payslip.grossIncome, 0);
  const totalCompanyInsurance = filteredPayroll.reduce((acc, curr) => acc + (curr.payslip.bhxhDeduction + curr.payslip.bhytDeduction + curr.payslip.bhtnDeduction), 0);
  const totalCompanyPit = filteredPayroll.reduce((acc, curr) => acc + curr.payslip.personalIncomeTax, 0);
  const totalCompanyNet = filteredPayroll.reduce((acc, curr) => acc + curr.payslip.netSalary, 0);

  const handleOpenEditModal = (row: { employee: Employee; payslip: Payslip }) => {
    setEditingRow({
      employee: row.employee,
      payslip: { ...row.payslip },
    });
  };

  const handleSavePayslipModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRow) {
      updatePayslipRecord(editingRow.employee.id, editingRow.payslip);
      setEditingRow(null);
    }
  };

  const handleApproveAllPayroll = () => {
    payrollRows.forEach(row => {
      updatePayslipRecord(row.employee.id, {
        ...row.payslip,
        paymentStatus: 'Đã thanh toán',
        paymentDate: new Date().toISOString().split('T')[0]
      });
    });
    showToast(`Đã duyệt và xác nhận thanh toán Bảng lương Tháng ${selectedMonth}/${selectedYear} cho tất cả nhân viên!`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Quản lý Bảng Lương & Tính Payroll TL CONCEPTS
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Công cụ nhập liệu, tự động liên kết phụ cấp KPI, lương OT, bảo hiểm, giảm trừ gia cảnh và tính thuế TNCN.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleApproveAllPayroll}
            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm flex items-center space-x-2 shadow-md shadow-primary-500/20 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Phê duyệt & Chi trả toàn bộ Payroll</span>
          </button>
        </div>
      </div>

      {/* Monthly Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase">Tổng chi phí Quỹ Lương Gross</span>
          <div className="mt-2 text-2xl font-black text-slate-900">{formatVND(totalCompanyGross)}</div>
          <p className="text-xs text-slate-500 mt-1">Lương CB, Phụ cấp KPI, OT & Thưởng</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase">Trích nộp BHXH / BHYT / BHTN</span>
          <div className="mt-2 text-2xl font-black text-rose-600">{formatVND(totalCompanyInsurance)}</div>
          <p className="text-xs text-slate-500 mt-1">Tổng bảo hiểm khấu trừ người lao động</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase">Thuế TNCN (PIT) Khấu trừ</span>
          <div className="mt-2 text-2xl font-black text-amber-600">{formatVND(totalCompanyPit)}</div>
          <p className="text-xs text-slate-500 mt-1">Nộp Kho bạc Nhà nước</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase">Tổng Lương Thực nhận (Net)</span>
          <div className="mt-2 text-2xl font-black text-success-600">{formatVND(totalCompanyNet)}</div>
          <p className="text-xs text-slate-500 mt-1">Tổng thực chi chuyển khoản ngân hàng</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-500">Kỳ Lương:</span>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
            >
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
          </div>

          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text"
              placeholder="Tìm nhân viên, mã NV, vị trí..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Hiển thị <b>{filteredPayroll.length}</b> bản ghi lương Tháng {selectedMonth}/{selectedYear}
        </div>
      </div>

      {/* Standard Work Days Formula Info Box */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-success-500/20 text-success-400 flex items-center justify-center border border-success-400/30">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Quy chuẩn Ngày Công Tháng {selectedMonth}/{selectedYear}:</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-success-500/20 text-success-300 border border-success-400/30">
                5.5 ngày/tuần (T2-T6 + 0.5 T7)
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Chu kỳ từ <strong>01/{selectedMonth < 10 ? '0' + selectedMonth : selectedMonth}</strong> đến <strong>{monthWorkInfo.lastDayOfMonth}/{selectedMonth < 10 ? '0' + selectedMonth : selectedMonth}</strong> ({monthWorkInfo.totalCalendarDays} ngày) • {monthWorkInfo.fullWeekdaysCount} ngày thường (T2-T6) + {monthWorkInfo.saturdaysCount} buổi Thứ 7 (x 0.5) + {monthWorkInfo.sundaysCount} Chủ Nhật (nghỉ)
            </p>
          </div>
        </div>

        <div className="bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 text-right">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Ngày công chuẩn (Standard):</span>
          <span className="text-base font-black text-success-400 font-mono">{monthWorkInfo.standardWorkDays} ngày công</span>
        </div>
      </div>

      {/* FULL PAYROLL CALCULATION TABLE WITH ALL REQUESTED FIELDS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 min-w-[1500px]">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-y border-slate-200">
              <tr>
                <th className="py-3 px-3">MSNV</th>
                <th className="py-3 px-3">Họ Tên & Vị trí công việc</th>
                <th className="py-3 px-2 text-center">Ngày Chuẩn / Thực tế</th>
                <th className="py-3 px-3 text-right">Lương cơ bản</th>
                <th className="py-3 px-3 text-right">Phụ cấp Điện thoại</th>
                <th className="py-3 px-3 text-right">Phụ cấp Ăn trưa</th>
                <th className="py-3 px-3 text-right">Phụ cấp Thiết kế (KPI)</th>
                <th className="py-3 px-3 text-right">Lương OT</th>
                <th className="py-3 px-3 text-right">Thưởng % Dự án</th>
                <th className="py-3 px-3 text-right">Điều chỉnh T.trước</th>
                <th className="py-3 px-3 text-right font-bold text-slate-900">Thu nhập Gross</th>
                <th className="py-3 px-3 text-right text-rose-600">Khấu trừ BHXH (10.5%)</th>
                <th className="py-3 px-3 text-right">Giảm trừ Gia cảnh</th>
                <th className="py-3 px-3 text-right text-amber-600">Thuế TNCN</th>
                <th className="py-3 px-3 text-right font-black text-success-700">Thực nhận (Net)</th>
                <th className="py-3 px-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayroll.map(row => {
                const ps = row.payslip;
                const emp = row.employee;

                return (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-600">{emp.employeeCode}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      <div className="flex items-center space-x-2">
                        <img src={emp.avatar} alt="" className="w-7 h-7 rounded-full object-cover border border-slate-200" />
                        <div>
                          <span>{emp.fullName}</span>
                          <span className="block text-[10px] text-slate-400 font-normal">{emp.jobTitle}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center font-bold">
                      <span className="text-slate-500">{ps.standardWorkDays}</span> / <span className="text-primary-700">{ps.actualWorkDays}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold">{formatVND(ps.baseSalary)}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{formatVND(ps.phoneAllowance || 500000)}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{formatVND(ps.lunchAllowance || 1000000)}</td>
                    <td className="py-3 px-3 text-right font-bold text-primary-600 bg-primary-50/40 rounded">
                      {formatVND(ps.kpiDesignAllowance || ps.kpiBonus)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-primary-600">{formatVND(ps.otPay)}</td>
                    <td className="py-3 px-3 text-right text-success-600 font-semibold">{formatVND(ps.projectBonusAmount || 0)}</td>
                    <td className="py-3 px-3 text-right text-slate-500">{formatVND(ps.priorMonthAdjustment || 0)}</td>
                    <td className="py-3 px-3 text-right font-extrabold text-slate-900 bg-slate-50">{formatVND(ps.grossIncome)}</td>
                    <td className="py-3 px-3 text-right text-rose-600 font-semibold">-{formatVND(ps.bhxhDeduction + ps.bhytDeduction + ps.bhtnDeduction)}</td>
                    <td className="py-3 px-3 text-right text-slate-500">{formatVND(ps.familyDeduction || 11000000)}</td>
                    <td className="py-3 px-3 text-right text-amber-600 font-semibold">-{formatVND(ps.personalIncomeTax)}</td>
                    <td className="py-3 px-3 text-right font-black text-success-700 text-sm bg-success-50/50">
                      {formatVND(ps.netSalary)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => handleOpenEditModal(row)}
                          className="px-2.5 py-1 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                          title="Nhập / Chỉnh sửa Lương"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Sửa lương</span>
                        </button>
                        <button
                          onClick={() => setSelectedPayslipId(ps.id)}
                          className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                          title="Xuất phiếu lương"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CÔNG CỤ NHẬP LIỆU & TÍNH LƯƠNG DETAILED */}
      {editingRow && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <img src={editingRow.employee.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Công cụ Nhập liệu Lương: {editingRow.employee.fullName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    MSNV: <b>{editingRow.employee.employeeCode}</b> | Vị trí: <b>{editingRow.employee.jobTitle}</b>
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSavePayslipModal} className="space-y-4 text-xs">
              
              {/* Standard vs Actual Work Days & Base Salary */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-800 uppercase text-[11px]">1. Ngày làm việc & Lương cơ bản</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Số ngày chuẩn:</label>
                    <input 
                      type="number"
                      value={editingRow.payslip.standardWorkDays}
                      onChange={e => {
                        const std = Number(e.target.value);
                        setEditingRow(prev => prev ? {
                          ...prev,
                          payslip: { ...prev.payslip, standardWorkDays: std }
                        } : null);
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Số ngày thực tế:</label>
                    <input 
                      type="number"
                      value={editingRow.payslip.actualWorkDays}
                      onChange={e => {
                        const act = Number(e.target.value);
                        setEditingRow(prev => prev ? {
                          ...prev,
                          payslip: { ...prev.payslip, actualWorkDays: act }
                        } : null);
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-primary-700"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Lương cơ bản (VND):</label>
                    <input 
                      type="number"
                      value={editingRow.payslip.baseSalary}
                      onChange={e => {
                        const sal = Number(e.target.value);
                        setEditingRow(prev => prev ? {
                          ...prev,
                          payslip: { ...prev.payslip, baseSalary: sal }
                        } : null);
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Allowances & KPI Design Bonus */}
              <div className="p-3 bg-primary-50/50 rounded-xl border border-primary-100 space-y-2">
                <h4 className="font-bold text-primary-900 uppercase text-[11px]">2. Phụ cấp & KPI Thưởng Thiết kế</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Phụ cấp Điện thoại:</label>
                    <input 
                      type="number"
                      value={editingRow.payslip.phoneAllowance || 500000}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setEditingRow(prev => prev ? {
                          ...prev,
                          payslip: { ...prev.payslip, phoneAllowance: val }
                        } : null);
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Phụ cấp Ăn trưa:</label>
                    <input 
                      type="number"
                      value={editingRow.payslip.lunchAllowance || 1000000}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setEditingRow(prev => prev ? {
                          ...prev,
                          payslip: { ...prev.payslip, lunchAllowance: val }
                        } : null);
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Phụ cấp Thiết kế (KPI) *:</label>
                    <input 
                      type="number"
                      value={editingRow.payslip.kpiDesignAllowance || editingRow.payslip.kpiBonus}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setEditingRow(prev => prev ? {
                          ...prev,
                          payslip: { 
                            ...prev.payslip, 
                            kpiDesignAllowance: val,
                            kpiBonus: val 
                          }
                        } : null);
                      }}
                      className="w-full p-2 bg-white border border-primary-300 rounded-lg font-extrabold text-primary-800"
                    />
                    <span className="text-[10px] text-primary-600 italic">Link từ bảng KPI tháng</span>
                  </div>
                </div>
              </div>

              {/* OT, Project Bonus & Prior Month Adjustment */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-800 uppercase text-[11px]">3. Lương OT, Thưởng dự án & Điều chỉnh</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Lương OT (Thanh toán):</label>
                    <input 
                      type="number"
                      value={editingRow.payslip.otPay}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setEditingRow(prev => prev ? {
                          ...prev,
                          payslip: { ...prev.payslip, otPay: val }
                        } : null);
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-primary-700"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Thưởng % Dự án (VND):</label>
                    <input 
                      type="number"
                      value={editingRow.payslip.projectBonusAmount || 0}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setEditingRow(prev => prev ? {
                          ...prev,
                          payslip: { ...prev.payslip, projectBonusAmount: val }
                        } : null);
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-success-700"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Điều chỉnh tháng trước (+/-):</label>
                    <input 
                      type="number"
                      value={editingRow.payslip.priorMonthAdjustment || 0}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setEditingRow(prev => prev ? {
                          ...prev,
                          payslip: { ...prev.payslip, priorMonthAdjustment: val }
                        } : null);
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Deductions & Tax */}
              <div className="p-3 bg-rose-50/40 rounded-xl border border-rose-100 space-y-2">
                <h4 className="font-bold text-rose-900 uppercase text-[11px]">4. Các khoản Khấu trừ & Giảm trừ thuế</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Khấu trừ BHXH (10.5%):</label>
                    <input 
                      type="number"
                      value={editingRow.payslip.bhxhDeduction + editingRow.payslip.bhytDeduction + editingRow.payslip.bhtnDeduction}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setEditingRow(prev => prev ? {
                          ...prev,
                          payslip: { ...prev.payslip, bhxhDeduction: val, bhytDeduction: 0, bhtnDeduction: 0 }
                        } : null);
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-rose-700"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Mức giảm trừ gia cảnh:</label>
                    <input 
                      type="number"
                      value={editingRow.payslip.familyDeduction || 11000000}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setEditingRow(prev => prev ? {
                          ...prev,
                          payslip: { ...prev.payslip, familyDeduction: val }
                        } : null);
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Thu nhập miễn thuế:</label>
                    <input 
                      type="number"
                      value={editingRow.payslip.taxExemptIncome || 0}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setEditingRow(prev => prev ? {
                          ...prev,
                          payslip: { ...prev.payslip, taxExemptIncome: val }
                        } : null);
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Realtime Calculated Totals */}
              {(() => {
                const ps = editingRow.payslip;
                const base = ps.baseSalary;
                const std = ps.standardWorkDays || 22;
                const act = ps.actualWorkDays || 22;
                const prorated = Math.round((base / std) * act);
                const phone = ps.phoneAllowance || 500000;
                const lunch = ps.lunchAllowance || 1000000;
                const kpi = ps.kpiDesignAllowance || ps.kpiBonus || 0;
                const ot = ps.otPay || 0;
                const proj = ps.projectBonusAmount || 0;
                const adj = ps.priorMonthAdjustment || 0;

                const calcGross = prorated + phone + lunch + kpi + ot + proj + adj;
                const totalIns = ps.bhxhDeduction + ps.bhytDeduction + ps.bhtnDeduction;
                const family = ps.familyDeduction || 11000000;
                const exempt = ps.taxExemptIncome || 0;

                const calcTaxable = Math.max(0, calcGross - totalIns - family - exempt);
                const calcPit = Math.round(calcTaxable * 0.1);
                const calcNet = Math.max(0, calcGross - totalIns - calcPit);

                return (
                  <div className="p-4 bg-success-50 rounded-2xl border border-success-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-500 block uppercase">Kết quả tính toán Tự động:</span>
                      <p className="text-xs text-slate-700 mt-0.5">
                        Gross: <b>{formatVND(calcGross)}</b> | Tính thuế: <b>{formatVND(calcTaxable)}</b> | PIT: <b>{formatVND(calcPit)}</b>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-success-800 block">Thực nhận Net:</span>
                      <span className="text-xl font-black text-success-700">{formatVND(calcNet)}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRow(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  onClick={() => {
                    if (editingRow) {
                      const ps = editingRow.payslip;
                      const base = ps.baseSalary;
                      const std = ps.standardWorkDays || 22;
                      const act = ps.actualWorkDays || 22;
                      const prorated = Math.round((base / std) * act);
                      const phone = ps.phoneAllowance || 500000;
                      const lunch = ps.lunchAllowance || 1000000;
                      const kpi = ps.kpiDesignAllowance || ps.kpiBonus || 0;
                      const ot = ps.otPay || 0;
                      const proj = ps.projectBonusAmount || 0;
                      const adj = ps.priorMonthAdjustment || 0;

                      const calcGross = prorated + phone + lunch + kpi + ot + proj + adj;
                      const totalIns = ps.bhxhDeduction + ps.bhytDeduction + ps.bhtnDeduction;
                      const family = ps.familyDeduction || 11000000;
                      const exempt = ps.taxExemptIncome || 0;

                      const calcTaxable = Math.max(0, calcGross - totalIns - family - exempt);
                      const calcPit = Math.round(calcTaxable * 0.1);
                      const calcNet = Math.max(0, calcGross - totalIns - calcPit);

                      setEditingRow({
                        ...editingRow,
                        payslip: {
                          ...ps,
                          grossIncome: calcGross,
                          taxableIncome: calcTaxable,
                          personalIncomeTax: calcPit,
                          netSalary: calcNet,
                        }
                      });
                    }
                  }}
                  className="px-4 py-2 bg-success-600 hover:bg-success-700 text-white rounded-xl text-xs font-bold shadow-md shadow-success-600/20 cursor-pointer"
                >
                  Lưu & Cập nhật Bảng lương
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
