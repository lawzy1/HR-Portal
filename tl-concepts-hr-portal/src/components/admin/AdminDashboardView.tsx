import React from 'react';
import { 
  Users, 
  UserCheck, 
  Clock, 
  FileCheck, 
  AlertTriangle, 
  TrendingUp, 
  Receipt, 
  Calendar, 
  BellRing, 
  UserPlus, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  ShieldAlert,
  FileWarning
} from 'lucide-react';
import { useHR } from '../../context/HRContext';

export const AdminDashboardView: React.FC = () => {
  const { 
    employees, 
    reminders, 
    setAdminTab, 
    setSelectedEmployeeIdForAdmin,
    setIsNewEmployeeModalOpen,
    resolveReminder
  } = useHR();

  // Metrics computation
  const totalEmployees = employees.length;
  const officialCount = employees.filter(e => e.status === 'Chính thức').length;
  const probationCount = employees.filter(e => e.status === 'Thử việc').length;
  const newJoinerCount = employees.filter(e => e.status === 'Mới tiếp nhận').length;

  // Contracts expiring in < 60 days
  const expiringContracts = employees.filter(
    e => e.contractEndDate && e.contractEndDate !== '2099-12-31'
  );

  // Pending leave requests across company
  const pendingLeaves = employees.flatMap(e => 
    e.leaveRequests.filter(l => l.status === 'Chờ duyệt').map(l => ({ ...l, employee: e }))
  );

  // Pending payroll
  const pendingPayrollPayslips = employees.flatMap(e => 
    e.payslips.filter(p => p.paymentStatus === 'Chờ thanh toán').map(p => ({ ...p, employee: e }))
  );

  // Missing docs count
  const missingDocsCount = employees.filter(e => !e.documents.idCardFrontImage || !e.documents.taxCode).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-100 text-primary-700">
              Admin Portal
            </span>
            <span className="text-xs text-slate-500">Hôm nay: {new Date().toLocaleDateString('vi-VN')}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Tổng quan Quản trị HR & Báo cáo Doanh nghiệp
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Theo dõi tình hình nhân sự, hợp đồng, biến động lương và yêu cầu chờ xử lý.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsNewEmployeeModalOpen(true)}
            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium text-sm flex items-center space-x-2 shadow-md shadow-primary-500/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Thêm nhân viên mới</span>
          </button>
          
          <button
            onClick={() => setAdminTab('admin-payroll')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-medium text-sm flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Receipt className="w-4 h-4 text-success-600" />
            <span>Xử lý Payroll</span>
          </button>
        </div>
      </div>

      {/* Top Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Employees */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng nhân sự</span>
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">{totalEmployees}</span>
            <span className="text-xs font-medium text-success-600 bg-success-50 px-2 py-0.5 rounded-md">
              100% nhân sự active
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 flex justify-between">
            <span>Chính thức: <b>{officialCount}</b></span>
            <span>Thử việc: <b>{probationCount}</b></span>
            <span>Mới: <b>{newJoinerCount}</b></span>
          </div>
        </div>

        {/* Expiring Contracts Alert */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">HĐ Sắp hết hạn (30-60d)</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileWarning className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-amber-600">{expiringContracts.length}</span>
            <button 
              onClick={() => setAdminTab('admin-contracts')}
              className="text-xs text-primary-600 font-semibold hover:underline flex items-center space-x-1"
            >
              <span>Xem tất cả</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <p className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
            Cần rà soát gia hạn hoặc tái ký hợp đồng mới.
          </p>
        </div>

        {/* Pending Leave Requests */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đơn phép chờ duyệt</span>
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-primary-600">{pendingLeaves.length}</span>
            <button 
              onClick={() => setAdminTab('admin-leaves')}
              className="text-xs text-primary-600 font-semibold hover:underline flex items-center space-x-1"
            >
              <span>Phê duyệt</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <p className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
            {pendingLeaves.length > 0 ? `${pendingLeaves[0].employee.fullName} vừa gửi đơn phép` : 'Không có đơn phép tồn đọng'}
          </p>
        </div>

        {/* Missing Documents Alert */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hồ sơ chưa hoàn thiện</span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-rose-600">{missingDocsCount}</span>
            <button 
              onClick={() => setAdminTab('admin-reminders')}
              className="text-xs text-rose-600 font-semibold hover:underline flex items-center space-x-1"
            >
              <span>Xem chi tiết</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <p className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
            Thiếu ảnh CCCD hoặc mã số thuế cá nhân.
          </p>
        </div>
      </div>

      {/* Main Grid: Reminders List & HR Tasks Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Automatic Alerts & Reminders */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <BellRing className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-base">Cảnh báo & Nhắc nhở HR tự động</h2>
                <p className="text-xs text-slate-500">Hệ thống tự động phát hiện lịch hết hạn HĐ, xét lương, và đơn phép</p>
              </div>
            </div>
            
            <button
              onClick={() => setAdminTab('admin-reminders')}
              className="text-xs font-semibold text-primary-600 hover:text-primary-800 transition-colors"
            >
              Xem tất cả ({reminders.length})
            </button>
          </div>

          <div className="space-y-3">
            {reminders.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-10 h-10 text-success-500 mx-auto mb-2" />
                <p className="font-medium text-slate-700">Tất cả nhiệm vụ HR đã được xử lý hoàn tất!</p>
                <p className="text-xs text-slate-500 mt-1">Không có cảnh báo tồn đọng trong hệ thống.</p>
              </div>
            ) : (
              reminders.slice(0, 5).map(rem => (
                <div 
                  key={rem.id}
                  className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                    rem.severity === 'high' 
                      ? 'bg-rose-50/50 border-rose-200 text-rose-900' 
                      : rem.severity === 'medium'
                        ? 'bg-amber-50/50 border-amber-200 text-amber-900'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5">
                      {rem.severity === 'high' ? (
                        <AlertTriangle className="w-5 h-5 text-rose-600" />
                      ) : rem.severity === 'medium' ? (
                        <Clock className="w-5 h-5 text-amber-600" />
                      ) : (
                        <BellRing className="w-5 h-5 text-primary-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm">{rem.title}</span>
                        {rem.employeeName && (
                          <span className="px-2 py-0.5 text-[11px] font-medium bg-white rounded border border-slate-200 text-slate-700">
                            {rem.employeeName}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {rem.message}
                      </p>
                      {rem.dueDate && (
                        <div className="mt-2 text-[11px] font-medium text-slate-500 flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Mốc thời gian: {rem.dueDate}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
                    {rem.employeeId && (
                      <button
                        onClick={() => {
                          setSelectedEmployeeIdForAdmin(rem.employeeId!);
                          if (rem.category === 'contract' || rem.category === 'salary_review') {
                            setAdminTab('admin-contracts');
                          } else if (rem.category === 'leave_request') {
                            setAdminTab('admin-leaves');
                          } else {
                            setAdminTab('admin-employees');
                          }
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                      >
                        Xử lý ngay
                      </button>
                    )}
                    <button
                      onClick={() => resolveReminder(rem.id)}
                      className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 text-xs font-medium cursor-pointer"
                      title="Đánh dấu đã xong"
                    >
                      Đã xong
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column (1 col): HR Checklist & Shortcuts */}
        <div className="space-y-6">
          {/* HR Operations Checklist */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 text-base mb-3 flex items-center justify-between">
              <span>Danh mục Công việc HR</span>
              <span className="text-xs font-normal text-slate-500">Tháng 08/2026</span>
            </h3>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-success-600 shrink-0" />
                  <span className="text-xs font-medium text-slate-700">Tái ký HĐ cho Nguyễn Văn An</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-success-100 text-success-700">Đã xong</span>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-xs font-medium text-slate-800">Rà soát thử việc Phạm Minh Đức</span>
                </div>
                <button 
                  onClick={() => setAdminTab('admin-contracts')}
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-800 hover:bg-amber-300"
                >
                  Xử lý
                </button>
              </div>

              <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <FileWarning className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="text-xs font-medium text-slate-800">Thu thập CCCD Phạm Minh Đức</span>
                </div>
                <button 
                  onClick={() => {
                    setSelectedEmployeeIdForAdmin('emp-04');
                    setAdminTab('admin-employees');
                  }}
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-200 text-rose-800 hover:bg-rose-300"
                >
                  Yêu cầu
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Clock className="w-4 h-4 text-primary-600 shrink-0" />
                  <span className="text-xs font-medium text-slate-700">Duyệt Payroll Tháng 07/2026</span>
                </div>
                <button 
                  onClick={() => setAdminTab('admin-payroll')}
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary-100 text-primary-700 hover:bg-primary-200"
                >
                  Chi trả
                </button>
              </div>
            </div>
          </div>

          {/* Employee Quick List */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-sm">Danh sách Nhân sự Nổi bật</h3>
              <button 
                onClick={() => setAdminTab('admin-employees')}
                className="text-xs text-primary-600 font-semibold hover:underline"
              >
                Tất cả ({employees.length})
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {employees.slice(0, 4).map(emp => (
                <div 
                  key={emp.id}
                  onClick={() => {
                    setSelectedEmployeeIdForAdmin(emp.id);
                    setAdminTab('admin-employees');
                  }}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-50 rounded-lg px-2 transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <img 
                      src={emp.avatar} 
                      alt={emp.fullName} 
                      className="w-8 h-8 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">{emp.fullName}</p>
                      <p className="text-[11px] text-slate-500">{emp.jobTitle}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    emp.status === 'Chính thức' 
                      ? 'bg-success-100 text-success-700' 
                      : emp.status === 'Thử việc'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-primary-100 text-primary-700'
                  }`}>
                    {emp.status || 'Chính thức'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
