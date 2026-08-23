import React from 'react';
import { useHR } from '../context/HRContext';
import { formatVND, formatDate } from '../utils/formatters';
import { 
  User, 
  CreditCard, 
  CalendarDays, 
  Award, 
  Receipt, 
  Clock, 
  TrendingUp, 
  PlusCircle, 
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  FileCheck,
  Building2,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { 
    currentEmployee, 
    setActiveTab, 
    setIsNewLeaveModalOpen, 
    setSelectedPayslipId, 
    setIsEditProfileModalOpen 
  } = useHR();

  // Get current month KPI or latest
  const latestKpi = currentEmployee.kpiData[0] || {
    month: 8,
    year: 2026,
    renderedViewsActual: 38,
    kpiConvertedViews: 42,
    kpiTarget: 35,
    completionPercentage: 120,
    otHours: 12,
    bonusAmount: 3500000,
    benefitAmount: 3300000,
  };

  // Get latest payslip
  const latestPayslip = currentEmployee.payslips[0];

  return (
    <div className="space-y-6">
      
      {/* Welcome Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-success-500/10 backdrop-blur-3xl rounded-l-full pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img 
              src={currentEmployee.avatar} 
              alt={currentEmployee.fullName} 
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-4 ring-success-500/40 shadow-lg"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">{currentEmployee.fullName}</h1>
                <span className="px-2.5 py-0.5 text-xs font-bold bg-success-500/20 text-success-300 rounded-lg border border-success-500/30">
                  {currentEmployee.employeeCode}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
                {currentEmployee.jobTitle} • <span className="text-success-400 font-bold">{currentEmployee.department}</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                <span>Ngày vào làm: {formatDate(currentEmployee.startDate)}</span>
                <span>•</span>
                <span>HĐ: {currentEmployee.contractType}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setIsEditProfileModalOpen(true)}
              className="px-4 py-2 text-xs font-bold text-slate-200 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all cursor-pointer"
            >
              Cập nhật hồ sơ
            </button>
            <button
              onClick={() => setIsNewLeaveModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-success-600 hover:bg-success-700 rounded-xl transition-all shadow-md shadow-success-900/20 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Xin nghỉ phép</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Core Metric Quick Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Salary */}
        <div 
          onClick={() => setActiveTab('contracts')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">Mức lương hiện tại</span>
            <div className="p-2 bg-success-50 text-success-600 rounded-xl group-hover:bg-success-600 group-hover:text-white transition-colors">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900 font-mono tracking-tight">
            {formatVND(currentEmployee.currentSalary)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Review gần nhất: {formatDate(currentEmployee.lastSalaryReviewDate)}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </div>

        {/* Card 2: Remaining Leave */}
        <div 
          onClick={() => setActiveTab('leaves')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">Phép năm còn lại</span>
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-success-700">{currentEmployee.leaveBalance.remainingDays}</span>
            <span className="text-xs font-semibold text-slate-500">/ {currentEmployee.leaveBalance.totalAccumulated} ngày tích lũy</span>
          </div>
          <p className="text-[11px] text-success-600 font-medium mt-1 flex items-center justify-between">
            <span>+1 ngày phép/tháng hoàn thành</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </div>

        {/* Card 3: Contract expiry */}
        <div 
          onClick={() => setActiveTab('contracts')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">Thời hạn Hợp đồng</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-sm font-extrabold text-slate-900 truncate">
            {currentEmployee.contractEndDate === '2099-12-31' ? 'Không xác định thời hạn' : formatDate(currentEmployee.contractEndDate)}
          </p>
          <p className="text-[11px] text-amber-700 font-medium mt-1 flex items-center justify-between">
            <span>Gia hạn: {formatDate(currentEmployee.contractRenewalDate)}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </div>

        {/* Card 4: Current KPI % */}
        <div 
          onClick={() => setActiveTab('kpi')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">KPI Tháng {latestKpi.month}</span>
            <div className="p-2 bg-success-50 text-success-600 rounded-xl group-hover:bg-success-600 group-hover:text-white transition-colors">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-2xl font-black text-success-600">{latestKpi.completionPercentage}%</span>
            <span className="text-xs text-slate-500 font-medium">{latestKpi.kpiConvertedViews}/{latestKpi.kpiTarget} view</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-success-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, latestKpi.completionPercentage)}%` }}
            ></div>
          </div>
        </div>

      </div>

      {/* Row 2: Latest Payslip Summary & Monthly KPI / OT Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Latest Payslip Summary Card (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-success-100 text-success-800 rounded-xl">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Phiếu lương gần nhất</h3>
                <p className="text-xs text-slate-500">
                  {latestPayslip ? `Tháng ${latestPayslip.month}/${latestPayslip.year}` : 'Chưa có dữ liệu'}
                </p>
              </div>
            </div>
            
            {latestPayslip && (
              <button
                onClick={() => setSelectedPayslipId(latestPayslip.id)}
                className="flex items-center gap-1 text-xs font-bold text-success-700 hover:text-success-800 bg-success-50 hover:bg-success-100 px-3 py-1.5 rounded-xl border border-success-200/60 transition-colors cursor-pointer"
              >
                <span>Xem chi tiết phiếu lương</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {latestPayslip ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Lương Gross</span>
                  <strong className="text-slate-900 font-mono text-xs">{formatVND(latestPayslip.grossIncome)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Bảo hiểm (10.5%)</span>
                  <strong className="text-rose-700 font-mono text-xs">
                    -{formatVND(latestPayslip.bhxhDeduction + latestPayslip.bhytDeduction + latestPayslip.bhtnDeduction)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Thuế TNCN</span>
                  <strong className="text-rose-700 font-mono text-xs">-{formatVND(latestPayslip.personalIncomeTax)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Trạng thái</span>
                  <span className="font-bold text-success-700 inline-flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {latestPayslip.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Net highlight */}
              <div className="bg-success-900 text-white p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-success-300 uppercase tracking-wider">THỰC LĨNH CHUYỂN KHOẢN (NET)</p>
                  <p className="text-xl sm:text-2xl font-black font-mono mt-0.5">{formatVND(latestPayslip.netSalary)}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs bg-success-800 text-success-200 px-3 py-1 rounded-lg border border-success-700 font-mono">
                    Vietcombank
                  </span>
                  <p className="text-[10px] text-success-300 mt-1">Ngày chuyển: {formatDate(latestPayslip.paymentDate || '')}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic py-4">Chưa có phiếu lương nào.</p>
          )}
        </div>

        {/* Monthly KPI, OT, Bonus Quick Summary (1 col) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">KPI & OT Tháng này</h3>
              <button 
                onClick={() => setActiveTab('kpi')}
                className="text-xs text-success-700 hover:underline font-semibold cursor-pointer"
              >
                Xem chi tiết
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-600">Số view render thực tế:</span>
                <span className="font-bold text-slate-900">{latestKpi.renderedViewsActual} view</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-600">Số view quy đổi KPI:</span>
                <span className="font-bold text-success-700">{latestKpi.kpiConvertedViews} view</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-600">Thời gian OT tăng ca:</span>
                <span className="font-bold text-amber-700">{latestKpi.otHours} giờ</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-600">Thưởng & Phụ cấp khác:</span>
                <span className="font-bold text-success-700 font-mono">+{formatVND(latestKpi.bonusAmount + latestKpi.benefitAmount)}</span>
              </div>
            </div>
          </div>

          <div className="bg-success-50 p-3 rounded-xl border border-success-200 text-[11px] text-success-900 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-success-600 flex-shrink-0 mt-0.5" />
            <p className="leading-snug">
              KPI hoàn thành <strong>{latestKpi.completionPercentage}%</strong> chỉ tiêu tháng. Đạt thưởng định kỳ xuất sắc!
            </p>
          </div>
        </div>

      </div>

      {/* Row 3: Recent Leave Requests */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Yêu cầu Nghỉ phép gần đây</h3>
            <p className="text-xs text-slate-500">Lịch sử xin nghỉ phép & trạng thái duyệt từ Quản lý</p>
          </div>
          <button
            onClick={() => setActiveTab('leaves')}
            className="text-xs font-bold text-success-700 hover:underline cursor-pointer"
          >
            Quản lý tất cả ngày phép
          </button>
        </div>

        {currentEmployee.leaveRequests.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4">Chưa có yêu cầu nghỉ phép nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-lg">Loại nghỉ</th>
                  <th className="py-2.5 px-3">Thời gian</th>
                  <th className="py-2.5 px-3">Số ngày</th>
                  <th className="py-2.5 px-3">Lý do</th>
                  <th className="py-2.5 px-3">Người duyệt</th>
                  <th className="py-2.5 px-3 rounded-r-lg">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentEmployee.leaveRequests.slice(0, 4).map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{req.leaveType}</td>
                    <td className="py-3 px-3 text-slate-600">
                      {formatDate(req.startDate)} - {formatDate(req.endDate)} ({req.halfDayOption})
                    </td>
                    <td className="py-3 px-3 font-semibold text-success-800">{req.totalDays} ngày</td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate">{req.reason}</td>
                    <td className="py-3 px-3 text-slate-600">{req.approverName}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border ${
                        req.status === 'Đã duyệt' ? 'bg-success-50 text-success-700 border-success-200' :
                        req.status === 'Chờ duyệt' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
