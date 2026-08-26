import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useEmployee } from '../hooks/useEmployees';
import { useKpiJobItems, useKpiMonthly } from '../hooks/useKpi';
import { useCompanyHolidays, useLeaveRequests } from '../hooks/useLeave';
import { useSignedImageUrl } from '../hooks/useFileUpload';
import { getApprovedLeaveDaysInMonth, getMonthWorkDays } from '../utils/workDays';
import { formatVND } from '../utils/formatters';
import {
  Award,
  Calendar,
  CheckCircle2,
  Search,
  FolderGit2,
  AlertCircle,
  UserCheck,
  Check,
  CalendarDays,
} from 'lucide-react';

interface UserJobGroup {
  orderJob: string;
  items: NonNullable<ReturnType<typeof useKpiJobItems>['data']>;
}

const AssigneeAvatar: React.FC<{ path: string | null | undefined; className: string }> = ({ path, className }) => {
  const { data: url } = useSignedImageUrl(path);
  return url ? <img src={url} alt="" className={className} /> : <div className={`${className} bg-slate-200`} />;
};

export const KpiRewardsView: React.FC = () => {
  const { profile } = useAuth();
  const employeeId = profile?.employeeId ?? undefined;

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 12 }, (_, index) => currentYear - 1 + index);
  }, []);

  const { data: employee } = useEmployee(employeeId);
  const { data: jobs } = useKpiJobItems(employeeId, selectedMonth, selectedYear);
  const { data: kpiMonthly } = useKpiMonthly(employeeId, selectedMonth, selectedYear);
  const { data: holidays } = useCompanyHolidays();
  const { data: leaveRequests } = useLeaveRequests(employeeId);

  const kpiTargetPerDay = employee?.kpi_target_per_day ?? 0;

  const holidayDatesInMonth = useMemo(
    () => (holidays || []).filter((h) => h.date.startsWith(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`)).map((h) => h.date),
    [holidays, selectedMonth, selectedYear]
  );

  const baseWorkDaysInfo = useMemo(() => {
    return getMonthWorkDays(selectedMonth, selectedYear, holidayDatesInMonth);
  }, [selectedMonth, selectedYear, holidayDatesInMonth]);

  const approvedLeaveDays = useMemo(
    () => getApprovedLeaveDaysInMonth(leaveRequests || [], selectedMonth, selectedYear, holidayDatesInMonth),
    [holidayDatesInMonth, leaveRequests, selectedMonth, selectedYear],
  );

  const workDaysInfo = useMemo(() => ({
    ...baseWorkDaysInfo,
    standardWorkDays: Number(Math.max(0, baseWorkDaysInfo.standardWorkDays - approvedLeaveDays).toFixed(1)),
  }), [approvedLeaveDays, baseWorkDaysInfo]);

  const dynamicKpiTarget = Number((kpiTargetPerDay * workDaysInfo.standardWorkDays).toFixed(1));

  const assignedJobs = useMemo(() => jobs || [], [jobs]);

  const filteredAssignedJobs = useMemo(() => {
    if (!searchQuery.trim()) return assignedJobs;
    const q = searchQuery.toLowerCase().trim();
    return assignedJobs.filter(
      (job) =>
        job.order_job.toLowerCase().includes(q) ||
        (job.sub_task && job.sub_task.toLowerCase().includes(q)) ||
        (job.deadline && job.deadline.toLowerCase().includes(q))
    );
  }, [assignedJobs, searchQuery]);

  const groupedAssignedJobs = useMemo(() => {
    const groups: UserJobGroup[] = [];
    const map = new Map<string, UserJobGroup['items']>();

    filteredAssignedJobs.forEach((job) => {
      const key = (job.order_job || '').trim();
      if (!map.has(key)) {
        const arr: UserJobGroup['items'] = [];
        map.set(key, arr);
        groups.push({ orderJob: key, items: arr });
      }
      map.get(key)!.push(job);
    });

    return groups;
  }, [filteredAssignedJobs]);

  const totalActualViews = useMemo(() => {
    if (assignedJobs.length > 0) return assignedJobs.reduce((sum, item) => sum + (item.views_count || 0), 0);
    return kpiMonthly?.rendered_views_actual || 0;
  }, [assignedJobs, kpiMonthly]);

  const totalConvertedKpi = useMemo(() => {
    if (assignedJobs.length > 0) return assignedJobs.reduce((sum, item) => sum + (item.converted_kpi || 0), 0);
    return kpiMonthly?.kpi_converted_views || 0;
  }, [assignedJobs, kpiMonthly]);

  const completionPercentage = dynamicKpiTarget > 0 ? Math.round((totalConvertedKpi / dynamicKpiTarget) * 100) : 100;

  if (!employee) {
    return <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-sm text-slate-500">Đang tải...</div>;
  }

  return (
    <div className="space-y-6">

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-success-100 text-success-800 flex items-center justify-center font-bold">
              <Award className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900">Bảng Theo dõi KPI & Tiến độ Render View</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Chỉ hiển thị các bài / dự án được phân công cho bạn: <strong className="text-slate-800">{employee.full_name}</strong> (<span className="font-mono text-success-700 font-bold">{employee.employee_code}</span>)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 p-1.5 border border-slate-200 rounded-xl">
          <Calendar className="w-4 h-4 text-slate-400 ml-2" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-white text-xs font-bold text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-success-500 cursor-pointer"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
              <option key={m} value={m}>Tháng {m < 10 ? '0' + m : m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-white text-xs font-bold text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-success-500 cursor-pointer"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Working days & KPI target */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-primary-950 text-white p-5 rounded-2xl border border-slate-700 shadow-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-700/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success-500/20 border border-success-400/30 flex items-center justify-center text-success-400">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">
                Cơ cấu Ngày Công & Chỉ Tiêu KPI Tháng {selectedMonth}/{selectedYear}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Kỳ tính công từ ngày <strong>01/{selectedMonth < 10 ? '0' + selectedMonth : selectedMonth}</strong> đến <strong>{workDaysInfo.lastDayOfMonth}/{selectedMonth < 10 ? '0' + selectedMonth : selectedMonth}</strong>
              </p>
            </div>
          </div>

          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 text-right">
            <span className="text-[10px] text-slate-400 block font-medium">Chỉ tiêu KPI của bạn (do Admin cấu hình)</span>
            <span className="text-sm font-bold text-success-400">{kpiTargetPerDay} view/công</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 pt-4 text-xs">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block">Thứ 2 - Thứ 6 (x 1.0)</span>
            <p className="text-base font-bold text-white font-mono mt-0.5">{workDaysInfo.fullWeekdaysCount} <span className="text-xs font-normal text-slate-400">ngày</span></p>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block">Thứ 7 (Nửa ngày x 0.5)</span>
            <p className="text-base font-bold text-amber-300 font-mono mt-0.5">{workDaysInfo.saturdaysCount} <span className="text-xs font-normal text-slate-400">buổi</span></p>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block">Nghỉ Lễ/Tết</span>
            <p className="text-base font-bold text-rose-300 font-mono mt-0.5">-{workDaysInfo.holidaysDeducted} <span className="text-xs font-normal text-slate-500">công</span></p>
          </div>
          <div className="bg-amber-950/70 p-3 rounded-xl border border-amber-700/50">
            <span className="text-[11px] text-amber-300 block">Phép đã duyệt</span>
            <p className="text-base font-bold text-amber-300 font-mono mt-0.5">-{approvedLeaveDays} <span className="text-xs font-normal text-amber-400">công</span></p>
          </div>
          <div className="bg-success-950/80 p-3 rounded-xl border border-success-600/40">
            <span className="text-[11px] text-success-300 font-bold block">Tổng Ngày Công Chuẩn</span>
            <p className="text-lg font-black text-success-300 font-mono mt-0.5">{workDaysInfo.standardWorkDays} <span className="text-xs font-semibold text-success-400">công</span></p>
          </div>
          <div className="col-span-2 sm:col-span-4 lg:col-span-1 bg-primary-950/80 p-3 rounded-xl border border-primary-500/40">
            <span className="text-[11px] text-primary-200 font-bold block">Chỉ tiêu KPI Tháng</span>
            <p className="text-lg font-black text-white font-mono mt-0.5">{dynamicKpiTarget} <span className="text-xs font-semibold text-primary-300">view</span></p>
          </div>
        </div>
      </div>

      {/* KPI overview numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-500">Tổng View Thực tế</span>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-slate-900 font-mono tracking-tight">{totalActualViews}</p>
            <span className="text-xs font-semibold text-slate-500">views</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-500">Điểm KPI Quy đổi</span>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-success-700 font-mono tracking-tight">{totalConvertedKpi}</p>
            <span className="text-xs font-semibold text-success-600">điểm</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-500">Chỉ tiêu tháng</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-success-600 font-mono">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className="bg-success-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, completionPercentage)}%` }}></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-500">Công việc Phân công</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-primary-700 font-mono">{assignedJobs.length}</span>
            <span className="text-xs font-bold text-slate-500">sub-tasks</span>
          </div>
          <p className="text-[11px] text-slate-500">Tổng cộng <b>{groupedAssignedJobs.length}</b> Order / Dự án chính</p>
        </div>
      </div>

      {/* Assigned projects table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <span>Danh sách Dự án & Sub-task Được Giao</span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-primary-50 text-primary-700 rounded-md border border-primary-200">{assignedJobs.length} bài</span>
            </h2>
          </div>
          <div className="w-full sm:w-72 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm kiếm dự án, sub-task, deadline..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-success-500 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 uppercase tracking-wider font-extrabold text-[11px] border-b border-slate-300">
                <th className="py-3 px-3 text-center w-14 border-r border-slate-300">STT</th>
                <th className="py-3 px-4 min-w-[320px] border-r border-slate-300">Order / Job</th>
                <th className="py-3 px-4 min-w-[170px] border-r border-slate-300">Người thực hiện</th>
                <th className="py-3 px-3 text-center w-28 border-r border-slate-300">View</th>
                <th className="py-3 px-3 text-center w-32 border-r border-slate-300">View Quy đổi</th>
                <th className="py-3 px-3 text-center w-32 border-r border-slate-300">Thời gian</th>
                <th className="py-3 px-3 text-center w-36 border-r border-slate-300">Deadline</th>
                <th className="py-3 px-3 text-center w-28">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {groupedAssignedJobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 bg-slate-50/50">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <AlertCircle className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-slate-600 text-xs">
                        {searchQuery ? `Không tìm thấy kết quả phù hợp với từ khóa "${searchQuery}"` : `Không có dự án nào được phân công cho bạn trong Tháng ${selectedMonth}/${selectedYear}.`}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                groupedAssignedJobs.map((group, groupIdx) => {
                  const hasSubTasks = group.items.some((i) => i.sub_task && i.sub_task.trim().length > 0);

                  if (!hasSubTasks && group.items.length === 1) {
                    const job = group.items[0];
                    return (
                      <tr key={job.id} className="hover:bg-slate-50 border-b border-slate-200 transition-colors">
                        <td className="py-3.5 px-3 text-center font-bold text-slate-900 border-r border-slate-300 bg-slate-50/30">{groupIdx + 1}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900 leading-snug border-r border-slate-300">{job.order_job}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-800 border-r border-slate-300">
                          <div className="flex items-center gap-2">
                            <AssigneeAvatar path={employee.avatar_url} className="w-5 h-5 rounded-full object-cover border border-success-400" />
                            <span className="text-success-900 font-semibold">{employee.full_name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-center font-black text-slate-800 text-sm border-r border-slate-300">{job.views_count}</td>
                        <td className="py-3.5 px-3 text-center font-black text-success-700 text-sm bg-success-50/50 border-r border-slate-300">{job.converted_kpi}</td>
                        <td className="py-3.5 px-3 text-center font-medium text-slate-600 border-r border-slate-300">{job.duration_days ? `${job.duration_days} ngày` : '—'}</td>
                        <td className="py-3.5 px-3 text-center font-bold text-rose-700 bg-rose-50/40 border-r border-slate-300">{job.deadline || '—'}</td>
                        <td className="py-3.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-success-100 text-success-800">
                            <CheckCircle2 className="w-3 h-3 text-success-600" />
                            <span>Đã giao việc</span>
                          </span>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <React.Fragment key={`group-${groupIdx}`}>
                      <tr className="bg-slate-50/90 font-bold border-b border-slate-300">
                        <td className="py-3 px-3 text-center font-black text-slate-900 border-r border-slate-300 bg-slate-100">{groupIdx + 1}</td>
                        <td className="py-3 px-4 font-black text-slate-900 text-sm border-r border-slate-300">
                          <div className="flex items-center gap-2">
                            <FolderGit2 className="w-4 h-4 text-primary-600 flex-shrink-0" />
                            <span>{group.orderJob}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-600 text-xs border-r border-slate-300">
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                            <span>Phụ trách ({group.items.length} sub-tasks)</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-700 border-r border-slate-300">{group.items.reduce((sum, item) => sum + (item.views_count || 0), 0)}</td>
                        <td className="py-3 px-3 text-center font-bold text-success-700 border-r border-slate-300">{group.items.reduce((sum, item) => sum + (item.converted_kpi || 0), 0)}</td>
                        <td className="py-3 px-3 text-center text-slate-400 border-r border-slate-300">—</td>
                        <td className="py-3 px-3 text-center text-slate-400 border-r border-slate-300">—</td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-50 text-primary-700 border border-primary-200">Order Tổng</span>
                        </td>
                      </tr>

                      {group.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-200 transition-colors">
                          <td className="py-2.5 px-3 border-r border-slate-300 bg-slate-50/30"></td>
                          <td className="py-2 px-4 border-r border-slate-300">
                            <div className="bg-slate-100/90 text-slate-800 px-3 py-1.5 rounded-md border-l-4 border-primary-500 font-semibold text-xs">
                              Sub-task: {item.sub_task || item.order_job}
                            </div>
                          </td>
                          <td className="py-2 px-4 font-bold text-slate-800 border-r border-slate-300">
                            <div className="flex items-center gap-1.5">
                              <AssigneeAvatar path={employee.avatar_url} className="w-4 h-4 rounded-full object-cover" />
                              <span className="text-slate-800 text-xs font-semibold">{employee.full_name}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-slate-800 border-r border-slate-300">{item.views_count}</td>
                          <td className="py-2 px-3 text-center font-bold text-success-700 border-r border-slate-300">{item.converted_kpi}</td>
                          <td className="py-2 px-3 text-center text-slate-600 border-r border-slate-300">{item.duration_days ? `${item.duration_days} ngày` : '—'}</td>
                          <td className="py-2 px-3 text-center font-bold text-rose-700 border-r border-slate-300">{item.deadline || '—'}</td>
                          <td className="py-2 px-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-success-50 text-success-700 border border-success-200">
                              <Check className="w-3 h-3 text-success-600" />
                              <span>Được giao</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
            {groupedAssignedJobs.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100/90 font-extrabold text-slate-900 border-t-2 border-slate-300 text-xs">
                  <td className="py-3 px-3 text-center border-r border-slate-300" colSpan={3}>
                    TỔNG CỘNG TIẾN ĐỘ THÁNG {selectedMonth}/{selectedYear}
                  </td>
                  <td className="py-3 px-3 text-center font-black text-sm border-r border-slate-300 text-slate-900">{totalActualViews} views</td>
                  <td className="py-3 px-3 text-center font-black text-sm border-r border-slate-300 text-success-800 bg-success-100/70">{totalConvertedKpi} điểm</td>
                  <td className="py-3 px-3 text-center border-r border-slate-300" colSpan={3}>
                    Đạt {completionPercentage}% chỉ tiêu tháng ({totalConvertedKpi}/{dynamicKpiTarget} điểm)
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {kpiMonthly && (
        <div className="rounded-2xl border border-success-200 bg-white p-5 shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-extrabold text-slate-900">Thu nhập theo hiệu suất đã phát hành</h3>
            <p className="mt-1 text-[11px] text-slate-500">Chỉ hiển thị sau khi Admin phê duyệt KPI tháng.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-3">
              <span className="text-[11px] font-semibold text-slate-500">Commission hiệu suất</span>
              <p className="mt-1 font-mono text-base font-black text-slate-900">{formatVND(kpiMonthly.performance_commission_amount)}</p>
            </div>
            {kpiMonthly.qc_commission_amount > 0 && (
              <div className="rounded-xl bg-primary-50 p-3">
                <span className="text-[11px] font-semibold text-primary-700">QC commission ({kpiMonthly.qc_views} views)</span>
                <p className="mt-1 font-mono text-base font-black text-primary-800">{formatVND(kpiMonthly.qc_commission_amount)}</p>
              </div>
            )}
            <div className="rounded-xl bg-amber-50 p-3">
              <span className="text-[11px] font-semibold text-amber-700">Bù đảm bảo thu nhập</span>
              <p className="mt-1 font-mono text-base font-black text-amber-800">{formatVND(kpiMonthly.guaranteed_income_topup)}</p>
            </div>
            <div className="rounded-xl bg-success-50 p-3 ring-1 ring-success-200">
              <span className="text-[11px] font-semibold text-success-700">Tổng thưởng KPI tháng</span>
              <p className="mt-1 font-mono text-lg font-black text-success-800">{formatVND(kpiMonthly.bonus_amount || 0)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Progress summary */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success-50 border border-success-200 flex items-center justify-center text-success-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Tình trạng hoàn thành chỉ tiêu tháng</h4>
            <p className="text-[11px] text-slate-500">
              Chỉ tiêu: <b>{dynamicKpiTarget} view</b> ({workDaysInfo.standardWorkDays} ngày công sau khi trừ {approvedLeaveDays} phép đã duyệt × {kpiTargetPerDay} view/công) | Đã đạt <b>{totalConvertedKpi} điểm</b> ({completionPercentage}%)
            </p>
          </div>
        </div>
        <span className={`px-3 py-1.5 rounded-xl text-xs font-bold ${completionPercentage >= 100 ? 'bg-success-100 text-success-800 border border-success-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
          {completionPercentage >= 100 ? '✅ Đã hoàn thành chỉ tiêu KPI' : '⏳ Đang tiếp tục thực hiện chỉ tiêu'}
        </span>
      </div>
    </div>
  );
};
