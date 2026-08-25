import React, { useMemo } from 'react';
import {
  Users,
  Clock,
  AlertTriangle,
  Receipt,
  Calendar,
  BellRing,
  UserPlus,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  FileWarning,
  FileBarChart
} from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { useEmployees, useAllEmployeeSensitiveInfo } from '../../hooks/useEmployees';
import { useAllContracts } from '../../hooks/useContracts';
import { useAllLeaveRequests } from '../../hooks/useLeave';
import { useSignedImageUrl } from '../../hooks/useFileUpload';

const RowAvatar: React.FC<{ path: string | null | undefined; alt: string }> = ({ path, alt }) => {
  const { data: url } = useSignedImageUrl(path);
  return url ? (
    <img src={url} alt={alt} className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" />
  ) : (
    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 shrink-0" />
  );
};

export const AdminDashboardView: React.FC = () => {
  const {
    reminders,
    setAdminTab,
    setSelectedEmployeeIdForAdmin,
    setIsNewEmployeeModalOpen,
    resolveReminder
  } = useHR();

  const { data: employeesData } = useEmployees();
  const employees = useMemo(() => employeesData || [], [employeesData]);
  const { data: allContractsData } = useAllContracts();
  const allContracts = useMemo(() => allContractsData || [], [allContractsData]);
  const { data: allLeaveRequestsData } = useAllLeaveRequests();
  const allLeaveRequests = useMemo(() => allLeaveRequestsData || [], [allLeaveRequestsData]);
  const { data: allSensitiveInfoData } = useAllEmployeeSensitiveInfo();
  const allSensitiveInfo = useMemo(() => allSensitiveInfoData || [], [allSensitiveInfoData]);

  // Metrics computation
  const totalEmployees = employees.length;
  const officialCount = employees.filter(e => e.status === 'Chính thức').length;
  const probationCount = employees.filter(e => e.status === 'Thử việc').length;
  const newJoinerCount = employees.filter(e => e.status === 'Mới tiếp nhận').length;

  // Contracts expiring — most recently started contract per employee, if it
  // has a finite end date (an indefinite contract has end_date null). Same
  // dedupe pattern as HRContext's reminders useMemo.
  const expiringContractsCount = useMemo(() => {
    const latestContractByEmployee = new Map<string, (typeof allContracts)[number]>();
    allContracts.forEach(c => {
      const existing = latestContractByEmployee.get(c.employee_id);
      if (!existing || c.start_date > existing.start_date) {
        latestContractByEmployee.set(c.employee_id, c);
      }
    });
    let count = 0;
    latestContractByEmployee.forEach(c => {
      if (!c.end_date) return;
      const remainingDays = Math.ceil((new Date(`${c.end_date}T00:00:00`).getTime() - Date.now()) / 86_400_000);
      if (remainingDays >= 0 && remainingDays <= 60) count += 1;
    });
    return count;
  }, [allContracts]);

  // Pending leave requests across company
  const pendingLeaves = allLeaveRequests.filter(l => l.status === 'Chờ duyệt');

  // Missing docs count
  const missingDocsCount = useMemo(() => {
    const sensitiveByEmployee = new Map(allSensitiveInfo.map(s => [s.employee_id, s]));
    return employees.filter(e => {
      const info = sensitiveByEmployee.get(e.id);
      return !info || !info.id_card_front_url || !info.tax_code;
    }).length;
  }, [employees, allSensitiveInfo]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-soft-xs">
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
            <span>Mời nhân viên ngoại lệ</span>
          </button>

          <button
            onClick={() => setAdminTab('admin-payroll')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-medium text-sm flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Receipt className="w-4 h-4 text-success-600" />
            <span>Xử lý Payroll</span>
          </button>
          <button
            onClick={() => setAdminTab('admin-reports')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-medium text-sm flex items-center space-x-2 transition-all cursor-pointer"
          >
            <FileBarChart className="w-4 h-4 text-primary-600" />
            <span>Xuất báo cáo</span>
          </button>
        </div>
      </div>

      {/* Top Metrics: bento-style row - featured headcount card + two compact ones, then a full-width alert strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Employees (featured, spans 2 cols) */}
        <div className="relative sm:col-span-2 bg-white pl-6 p-5 rounded-2xl border border-slate-200 shadow-soft-xs hover:shadow-soft-md transition-all">
          <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-primary-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng nhân sự</span>
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">{totalEmployees}</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
            <span>Chính thức: <b className="text-slate-800">{officialCount}</b></span>
            <span>Thử việc: <b className="text-slate-800">{probationCount}</b></span>
            <span>Mới: <b className="text-slate-800">{newJoinerCount}</b></span>
          </div>
        </div>

        {/* Expiring Contracts Alert */}
        <div className="relative bg-white pl-6 p-5 rounded-2xl border border-slate-200 shadow-soft-xs hover:shadow-soft-md transition-all">
          <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-amber-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">HĐ Sắp hết hạn</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileWarning className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">{expiringContractsCount}</span>
            <button
              onClick={() => setAdminTab('admin-contracts')}
              className="text-xs text-amber-700 font-semibold hover:underline flex items-center space-x-1 cursor-pointer"
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
        <div className="relative bg-white pl-6 p-5 rounded-2xl border border-slate-200 shadow-soft-xs hover:shadow-soft-md transition-all">
          <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-sage-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đơn phép chờ duyệt</span>
            <div className="w-10 h-10 rounded-xl bg-sage-50 text-sage-700 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">{pendingLeaves.length}</span>
            <button
              onClick={() => setAdminTab('admin-leaves')}
              className="text-xs text-sage-700 font-semibold hover:underline flex items-center space-x-1 cursor-pointer"
            >
              <span>Phê duyệt</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <p className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
            {pendingLeaves.length > 0 ? `${pendingLeaves[0].employees?.full_name || ''} vừa gửi đơn phép` : 'Không có đơn phép tồn đọng'}
          </p>
        </div>

        {/* Missing Documents Alert - full-width spotlight strip */}
        <div className="sm:col-span-2 lg:col-span-4 bg-rose-50 border border-rose-200 rounded-2xl p-5 shadow-soft-xs hover:shadow-soft-md transition-all flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-soft-xs">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-rose-700">{missingDocsCount}</span>
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Hồ sơ chưa hoàn thiện</span>
            </div>
            <p className="text-xs text-rose-700 mt-0.5">Thiếu ảnh CCCD hoặc mã số thuế cá nhân &mdash; cần bổ sung sớm.</p>
          </div>
          <button
            onClick={() => setAdminTab('admin-reminders')}
            className="shrink-0 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Xem chi tiết</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Grid: Reminders List & Employee Quick List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Automatic Alerts & Reminders */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-soft-xs space-y-4">
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
                          } else if (rem.category === 'ot_request' || rem.category === 'work_event') {
                            setAdminTab('admin-kpi');
                          } else if (rem.category === 'payroll') {
                            setAdminTab('admin-payroll');
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
                      title="Đánh dấu đã đọc"
                    >
                      Đã đọc
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column (1 col): Employee Quick List */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-6 shadow-soft-xs h-fit">
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
                  <RowAvatar path={emp.avatar_url} alt={emp.full_name} />
                  <div>
                    <p className="text-xs font-bold text-slate-900">{emp.full_name}</p>
                    <p className="text-[11px] text-slate-500">{emp.job_title}</p>
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
  );
};
