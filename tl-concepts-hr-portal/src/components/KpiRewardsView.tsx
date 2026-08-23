import React, { useState, useMemo } from 'react';
import { useHR } from '../context/HRContext';
import { KpiJobItem } from '../types';
import { getMonthWorkDays, getWorkDaysFormulaText } from '../utils/workDays';
import { 
  Award, 
  TrendingUp, 
  Layers, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Search, 
  Briefcase, 
  FileSpreadsheet, 
  Link, 
  Filter, 
  AlertCircle,
  FolderGit2,
  CalendarCheck,
  Check,
  Eye,
  UserCheck,
  Calculator,
  Info,
  CalendarDays,
  Sparkles
} from 'lucide-react';

interface UserJobGroup {
  orderJob: string;
  items: KpiJobItem[];
}

export const KpiRewardsView: React.FC = () => {
  const { 
    currentEmployee, 
    kpiJobList,
    setIsImportKpiModalOpen 
  } = useHR();

  const [selectedMonth, setSelectedMonth] = useState<number>(7);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [kpiRatePerDay, setKpiRatePerDay] = useState<number>(1.5); // Default 1.5 views per standard work day

  // Dynamic Standard Working Days calculation (1st to 30/31st of month, 5.5 days/week: Mon-Fri 1.0, Sat 0.5)
  const workDaysInfo = useMemo(() => {
    return getMonthWorkDays(selectedMonth, selectedYear, kpiRatePerDay);
  }, [selectedMonth, selectedYear, kpiRatePerDay]);

  // Find user's monthly fallback record if needed
  const kpiRecord = currentEmployee.kpiData.find(
    k => k.month === selectedMonth && k.year === selectedYear
  ) || {
    id: `kpi-fallback-${selectedMonth}-${selectedYear}`,
    month: selectedMonth,
    year: selectedYear,
    renderedViewsActual: workDaysInfo.calculatedKpiTarget,
    kpiConvertedViews: workDaysInfo.calculatedKpiTarget,
    kpiTarget: workDaysInfo.calculatedKpiTarget,
    completionPercentage: 100,
    otHours: 0,
    otHourlyRate: 0,
    bonusAmount: 0,
    benefitAmount: 0,
    additionsDeductions: [],
    notes: '',
  };

  // Helper to check if a job is assigned to the current employee
  const isJobAssignedToCurrentEmployee = (job: KpiJobItem) => {
    if (job.employeeId && job.employeeId === currentEmployee.id) return true;
    if (!job.assigneeName || !currentEmployee.fullName) return false;
    
    const jobAssignee = job.assigneeName.trim().toLowerCase();
    const empName = currentEmployee.fullName.trim().toLowerCase();
    
    if (jobAssignee === empName) return true;
    if (jobAssignee.includes(empName) || empName.includes(jobAssignee)) return true;
    if (currentEmployee.employeeCode && jobAssignee.includes(currentEmployee.employeeCode.toLowerCase())) return true;
    
    return false;
  };

  // Filter KPI Jobs: Strictly filter by Month/Year AND Role Permission (Assigned to Current Employee)
  const assignedJobs = useMemo(() => {
    return kpiJobList.filter(job => {
      const matchPeriod = job.month === selectedMonth && job.year === selectedYear;
      if (!matchPeriod) return false;
      return isJobAssignedToCurrentEmployee(job);
    });
  }, [kpiJobList, selectedMonth, selectedYear, currentEmployee]);

  // Filtered jobs by search query
  const filteredAssignedJobs = useMemo(() => {
    if (!searchQuery.trim()) return assignedJobs;
    const q = searchQuery.toLowerCase().trim();
    return assignedJobs.filter(job => 
      job.orderJob.toLowerCase().includes(q) ||
      (job.subTask && job.subTask.toLowerCase().includes(q)) ||
      (job.deadline && job.deadline.toLowerCase().includes(q))
    );
  }, [assignedJobs, searchQuery]);

  // Group filtered assigned jobs by parent Order / Job
  const groupedAssignedJobs = useMemo(() => {
    const groups: UserJobGroup[] = [];
    const map = new Map<string, KpiJobItem[]>();

    filteredAssignedJobs.forEach(job => {
      const key = (job.orderJob || '').trim();
      if (!map.has(key)) {
        const arr: KpiJobItem[] = [];
        map.set(key, arr);
        groups.push({ orderJob: key, items: arr });
      }
      map.get(key)!.push(job);
    });

    return groups;
  }, [filteredAssignedJobs]);

  // Calculate actual KPI metrics for the current employee
  const totalActualViews = useMemo(() => {
    if (assignedJobs.length > 0) {
      return assignedJobs.reduce((sum, item) => sum + item.viewsCount, 0);
    }
    return kpiRecord.renderedViewsActual || 0;
  }, [assignedJobs, kpiRecord]);

  const totalConvertedKpi = useMemo(() => {
    if (assignedJobs.length > 0) {
      return assignedJobs.reduce((sum, item) => sum + item.convertedKpi, 0);
    }
    return kpiRecord.kpiConvertedViews || 0;
  }, [assignedJobs, kpiRecord]);

  // Calculated KPI Target dynamically based on the exact working days of the month
  const dynamicKpiTarget = workDaysInfo.calculatedKpiTarget;
  const completionPercentage = dynamicKpiTarget > 0 ? Math.round((totalConvertedKpi / dynamicKpiTarget) * 100) : 100;

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
                Chỉ hiển thị các bài / dự án được phân công cho nhân viên: <strong className="text-slate-800">{currentEmployee.fullName}</strong> (<span className="font-mono text-success-700 font-bold">{currentEmployee.employeeCode}</span>)
              </p>
            </div>
          </div>
        </div>

        {/* Right Controls: Month Selector & Import / Link Button */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 border border-slate-200 rounded-xl">
            <Calendar className="w-4 h-4 text-slate-400 ml-2" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-white text-xs font-bold text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-success-500 cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                <option key={m} value={m}>Tháng {m < 10 ? '0' + m : m}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-white text-xs font-bold text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-success-500 cursor-pointer"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
          </div>

          <button
            onClick={() => setIsImportKpiModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-success-800 bg-success-50 hover:bg-success-100 rounded-xl border border-success-200 transition-colors cursor-pointer"
          >
            <Link className="w-4 h-4 text-success-600" />
            <span>Liên kết Bảng KPI</span>
          </button>
        </div>
      </div>

      {/* WORKING DAYS & KPI TARGET CALCULATION ACCORDION / HIGHLIGHT CARD */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-primary-950 text-white p-5 rounded-2xl border border-slate-700 shadow-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-700/80">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success-500/20 border border-success-400/30 flex items-center justify-center text-success-400">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-white">
                  Cơ cấu Ngày Công & Chỉ Tiêu KPI Tháng {selectedMonth}/{selectedYear}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-success-500/20 text-success-300 border border-success-400/30">
                  Lịch làm việc 5.5 ngày/tuần
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Kỳ tính công từ ngày <strong>01/{selectedMonth < 10 ? '0' + selectedMonth : selectedMonth}</strong> đến <strong>{workDaysInfo.lastDayOfMonth}/{selectedMonth < 10 ? '0' + selectedMonth : selectedMonth}</strong> ({workDaysInfo.totalCalendarDays} ngày dương lịch)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-800/80 p-2 rounded-xl border border-slate-700">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-medium">Định mức KPI / ngày công</span>
              <span className="text-xs font-bold text-success-400">{kpiRatePerDay} view/công</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setKpiRatePerDay(prev => Math.max(0.5, Number((prev - 0.1).toFixed(1))))}
                className="w-7 h-7 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold flex items-center justify-center transition-colors cursor-pointer"
                title="Giảm định mức"
              >
                -
              </button>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="5"
                value={kpiRatePerDay}
                onChange={(e) => setKpiRatePerDay(Math.max(0.1, Number(e.target.value) || 1.5))}
                className="w-14 px-1.5 py-1 bg-slate-900 border border-slate-600 rounded-lg text-xs font-mono font-bold text-center text-white focus:ring-1 focus:ring-success-400"
              />
              <button
                type="button"
                onClick={() => setKpiRatePerDay(prev => Number((prev + 0.1).toFixed(1)))}
                className="w-7 h-7 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold flex items-center justify-center transition-colors cursor-pointer"
                title="Tăng định mức"
              >
                +
              </button>
            </div>
          </div>

        </div>

        {/* Detailed Breakdown Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 pt-4 text-xs">
          
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block">Thứ 2 - Thứ 6 (x 1.0)</span>
            <p className="text-base font-bold text-white font-mono mt-0.5">
              {workDaysInfo.fullWeekdaysCount} <span className="text-xs font-normal text-slate-400">ngày</span>
            </p>
            <span className="text-[10px] text-success-400">={workDaysInfo.fullWeekdaysCount} công</span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block">Thứ 7 (Nửa ngày x 0.5)</span>
            <p className="text-base font-bold text-amber-300 font-mono mt-0.5">
              {workDaysInfo.saturdaysCount} <span className="text-xs font-normal text-slate-400">buổi</span>
            </p>
            <span className="text-[10px] text-amber-300">={workDaysInfo.saturdaysCount * 0.5} công</span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block">Chủ Nhật (Nghỉ x 0)</span>
            <p className="text-base font-bold text-slate-400 font-mono mt-0.5">
              {workDaysInfo.sundaysCount} <span className="text-xs font-normal text-slate-500">ngày</span>
            </p>
            <span className="text-[10px] text-slate-500">Nghỉ hàng tuần</span>
          </div>

          <div className="bg-success-950/80 p-3 rounded-xl border border-success-600/40">
            <span className="text-[11px] text-success-300 font-bold block">Tổng Ngày Công Chuẩn</span>
            <p className="text-lg font-black text-success-300 font-mono mt-0.5">
              {workDaysInfo.standardWorkDays} <span className="text-xs font-semibold text-success-400">công</span>
            </p>
            <span className="text-[10px] text-success-400 font-medium">Quy chuẩn tháng {selectedMonth}</span>
          </div>

          <div className="col-span-2 sm:col-span-4 lg:col-span-1 bg-primary-950/80 p-3 rounded-xl border border-primary-500/40">
            <span className="text-[11px] text-primary-200 font-bold block">Chỉ tiêu KPI Tháng</span>
            <p className="text-lg font-black text-white font-mono mt-0.5">
              {dynamicKpiTarget} <span className="text-xs font-semibold text-primary-300">view</span>
            </p>
            <span className="text-[10px] text-primary-300 font-mono">
              {workDaysInfo.standardWorkDays} × {kpiRatePerDay} view
            </span>
          </div>

        </div>
      </div>

      {/* KPI Core Overview Numbers (Purely tracking View Counts & Points) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Rendered Views Actual */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Tổng View Thực tế</span>
            <span className="p-1.5 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold">Tháng {selectedMonth}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-slate-900 font-mono tracking-tight">{totalActualViews}</p>
            <span className="text-xs font-semibold text-slate-500">views</span>
          </div>
          <p className="text-[11px] text-slate-500">Tổng số lượng view render đã được giao</p>
        </div>

        {/* Converted KPI Views */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Điểm KPI Quy đổi</span>
            <span className="p-1.5 bg-success-100 text-success-800 rounded-lg text-[10px] font-bold">Hệ số độ khó</span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-success-700 font-mono tracking-tight">{totalConvertedKpi}</p>
            <span className="text-xs font-semibold text-success-600">điểm</span>
          </div>
          <p className="text-[11px] text-success-600 font-medium">Quy đổi theo loại không gian & yêu cầu</p>
        </div>

        {/* Target KPI & % Completion (Dynamically from standard work days) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Chỉ tiêu Ngày công</span>
            <span className="p-1.5 bg-teal-100 text-teal-800 rounded-lg text-[10px] font-bold">
              {dynamicKpiTarget} view ({workDaysInfo.standardWorkDays} công)
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-success-600 font-mono">{completionPercentage}%</span>
            <span className="text-xs font-bold text-slate-500">tiến độ đạt</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-success-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, completionPercentage)}%` }}
            ></div>
          </div>
        </div>

        {/* Assigned Projects & Tasks Count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Công việc Phân công</span>
            <FolderGit2 className="w-4 h-4 text-primary-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-primary-700 font-mono">{assignedJobs.length}</span>
            <span className="text-xs font-bold text-slate-500">sub-tasks</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Tổng cộng <b>{groupedAssignedJobs.length}</b> Order / Dự án chính
          </p>
        </div>

      </div>

      {/* Main KPI Assigned Projects Table (Role Protected: Only shows currentEmployee projects) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
        
        {/* Table Top Controls & Search Bar */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-800 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <span>Danh sách Dự án & Sub-task Được Giao (KPI Tracking)</span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-primary-50 text-primary-700 rounded-md border border-primary-200">
                  {assignedJobs.length} bài
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Bảng phân quyền cá nhân: Chỉ hiển thị các đầu việc mà <strong>{currentEmployee.fullName}</strong> được chỉ định
              </p>
            </div>
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

        {/* The Spreadsheet-style Project / KPI Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 uppercase tracking-wider font-extrabold text-[11px] border-b border-slate-300">
                <th className="py-3 px-3 text-center w-14 border-r border-slate-300">STT</th>
                <th className="py-3 px-4 min-w-[320px] border-r border-slate-300">Order / Job (Tên bài / Dự án & Sub-task)</th>
                <th className="py-3 px-4 min-w-[170px] border-r border-slate-300">Người thực hiện</th>
                <th className="py-3 px-3 text-center w-28 border-r border-slate-300">Số lượng View</th>
                <th className="py-3 px-3 text-center w-32 border-r border-slate-300">View KPI Quy đổi</th>
                <th className="py-3 px-3 text-center w-32 border-r border-slate-300">Thời gian dự kiến</th>
                <th className="py-3 px-3 text-center w-36 border-r border-slate-300">Deadline (Hạn giao)</th>
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
                        {searchQuery 
                          ? `Không tìm thấy kết quả phù hợp với từ khóa "${searchQuery}"`
                          : `Không có dự án hay sub-task nào được phân công cho bạn trong Tháng ${selectedMonth}/${selectedYear}.`
                        }
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Chọn các tháng khác hoặc liên hệ Admin / Quản lý để cập nhật bảng phân công render.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                groupedAssignedJobs.map((group, groupIdx) => {
                  const hasSubTasks = group.items.some(i => i.subTask && i.subTask.trim().length > 0);

                  // Case 1: Single job without sub-tasks
                  if (!hasSubTasks && group.items.length === 1) {
                    const job = group.items[0];
                    return (
                      <tr key={job.id} className="hover:bg-slate-50 border-b border-slate-200 transition-colors">
                        <td className="py-3.5 px-3 text-center font-bold text-slate-900 border-r border-slate-300 bg-slate-50/30">
                          {groupIdx + 1}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900 leading-snug border-r border-slate-300">
                          <div className="flex items-start gap-2">
                            <span className="font-bold text-slate-900">{job.orderJob}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800 border-r border-slate-300">
                          <div className="flex items-center gap-2">
                            <img src={currentEmployee.avatar} alt="" className="w-5 h-5 rounded-full object-cover border border-success-400" />
                            <span className="text-success-900 font-semibold">{job.assigneeName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-center font-black text-slate-800 text-sm border-r border-slate-300">
                          {job.viewsCount}
                        </td>
                        <td className="py-3.5 px-3 text-center font-black text-success-700 text-sm bg-success-50/50 border-r border-slate-300">
                          {job.convertedKpi}
                        </td>
                        <td className="py-3.5 px-3 text-center font-medium text-slate-600 border-r border-slate-300">
                          {job.durationDays ? `${job.durationDays} ngày` : '—'}
                        </td>
                        <td className="py-3.5 px-3 text-center font-bold text-rose-700 bg-rose-50/40 border-r border-slate-300">
                          {job.deadline || '—'}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-success-100 text-success-800">
                            <CheckCircle2 className="w-3 h-3 text-success-600" />
                            <span>Đã giao việc</span>
                          </span>
                        </td>
                      </tr>
                    );
                  }

                  // Case 2: Parent Order with multiple sub-tasks assigned to current employee
                  return (
                    <React.Fragment key={`group-${groupIdx}`}>
                      {/* Main Order Header Row */}
                      <tr className="bg-slate-50/90 font-bold border-b border-slate-300">
                        <td className="py-3 px-3 text-center font-black text-slate-900 border-r border-slate-300 bg-slate-100">
                          {groupIdx + 1}
                        </td>
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
                        <td className="py-3 px-3 text-center font-bold text-slate-700 border-r border-slate-300">
                          {group.items.reduce((sum, item) => sum + item.viewsCount, 0)}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-success-700 border-r border-slate-300">
                          {group.items.reduce((sum, item) => sum + item.convertedKpi, 0)}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-400 border-r border-slate-300">—</td>
                        <td className="py-3 px-3 text-center text-slate-400 border-r border-slate-300">—</td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-50 text-primary-700 border border-primary-200">
                            Order Tổng
                          </span>
                        </td>
                      </tr>

                      {/* Sub-task Rows */}
                      {group.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-200 transition-colors">
                          <td className="py-2.5 px-3 border-r border-slate-300 bg-slate-50/30"></td>
                          
                          {/* Sub-task description in clean bordered block */}
                          <td className="py-2 px-4 border-r border-slate-300">
                            <div className="bg-slate-100/90 text-slate-800 px-3 py-1.5 rounded-md border-l-4 border-primary-500 font-semibold text-xs flex items-center justify-between">
                              <span>Sub-task : {item.subTask || item.orderJob}</span>
                            </div>
                          </td>

                          <td className="py-2 px-4 font-bold text-slate-800 border-r border-slate-300">
                            <div className="flex items-center gap-1.5">
                              <img src={currentEmployee.avatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                              <span className="text-slate-800 text-xs font-semibold">{item.assigneeName}</span>
                            </div>
                          </td>

                          <td className="py-2 px-3 text-center font-bold text-slate-800 border-r border-slate-300">
                            {item.viewsCount}
                          </td>

                          <td className="py-2 px-3 text-center font-bold text-success-700 border-r border-slate-300">
                            {item.convertedKpi}
                          </td>

                          <td className="py-2 px-3 text-center text-slate-600 border-r border-slate-300">
                            {item.durationDays ? `${item.durationDays} ngày` : '—'}
                          </td>

                          <td className="py-2 px-3 text-center font-bold text-rose-700 border-r border-slate-300">
                            {item.deadline || '—'}
                          </td>

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
                    TỔNG CỘNG TIẾN ĐỘ THÁNG {selectedMonth}/{selectedYear} CỦA {currentEmployee.fullName.toUpperCase()}
                  </td>
                  <td className="py-3 px-3 text-center font-black text-sm border-r border-slate-300 text-slate-900">
                    {totalActualViews} views
                  </td>
                  <td className="py-3 px-3 text-center font-black text-sm border-r border-slate-300 text-success-800 bg-success-100/70">
                    {totalConvertedKpi} điểm
                  </td>
                  <td className="py-3 px-3 text-center border-r border-slate-300" colSpan={3}>
                    Đạt {completionPercentage}% chỉ tiêu tháng ({totalConvertedKpi}/{dynamicKpiTarget} điểm • {workDaysInfo.standardWorkDays} ngày công)
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

      </div>

      {/* Progress & Target Summary Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success-50 border border-success-200 flex items-center justify-center text-success-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Tình trạng hoàn thành chỉ tiêu tháng</h4>
            <p className="text-[11px] text-slate-500">
              Chỉ tiêu tháng: <b>{dynamicKpiTarget} view</b> ({workDaysInfo.standardWorkDays} ngày công × {kpiRatePerDay} view/công) | Đã hoàn thành <b>{totalConvertedKpi} điểm</b> ({completionPercentage}%)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
            completionPercentage >= 100 
              ? 'bg-success-100 text-success-800 border border-success-200' 
              : 'bg-amber-100 text-amber-800 border border-amber-200'
          }`}>
            {completionPercentage >= 100 ? '✅ Đã hoàn thành chỉ tiêu KPI' : '⏳ Đang tiếp tục thực hiện chỉ tiêu'}
          </span>
        </div>
      </div>

    </div>
  );
};
