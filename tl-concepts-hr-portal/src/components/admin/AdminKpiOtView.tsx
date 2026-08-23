import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Clock, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Search, 
  FileSpreadsheet, 
  Award,
  Trash2,
  Edit2,
  RefreshCw,
  Calculator,
  Download,
  Printer,
  FileText,
  Calendar,
  Layers,
  UserCheck,
  CalendarDays
} from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { KpiJobItem, OtRecord } from '../../types';
import { getMonthWorkDays } from '../../utils/workDays';

interface JobGroup {
  orderJob: string;
  items: KpiJobItem[];
}

export const AdminKpiOtView: React.FC = () => {
  const { 
    employees, 
    selectedEmployeeIdForAdmin, 
    setSelectedEmployeeIdForAdmin,
    kpiJobList,
    addKpiJobItem,
    updateKpiJobItem,
    deleteKpiJobItem,
    addOtRecord,
    updateOtStatus,
    setIsImportKpiModalOpen,
    addOrUpdateKpi,
    showToast
  } = useHR();

  const [selectedMonth, setSelectedMonth] = useState<number>(7);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [kpiRatePerDay, setKpiRatePerDay] = useState<number>(1.5);

  // Dynamic Standard Working Days calculation (1st to 30/31st of month, 5.5 days/week)
  const monthWorkInfo = useMemo(() => {
    return getMonthWorkDays(selectedMonth, selectedYear, kpiRatePerDay);
  }, [selectedMonth, selectedYear, kpiRatePerDay]);

  // New KPI Job Entry Modal / Form
  const [isNewJobModalOpen, setIsNewJobModalOpen] = useState(false);
  const [orderJob, setOrderJob] = useState('');
  const [subTask, setSubTask] = useState('');
  const [assigneeName, setAssigneeName] = useState(employees[0]?.fullName || '');
  const [viewsCount, setViewsCount] = useState<number>(4);
  const [convertedKpi, setConvertedKpi] = useState<number>(4.0);
  const [durationDays, setDurationDays] = useState<number>(2.0);
  const [deadline, setDeadline] = useState<string>('Thứ Bảy, 15/07');
  const [deadlineDateInput, setDeadlineDateInput] = useState<string>('');

  // Edit Job state
  const [editingJob, setEditingJob] = useState<KpiJobItem | null>(null);

  // OT Form State (Admin Direct Creation)
  const [isNewOtModalOpen, setIsNewOtModalOpen] = useState(false);
  const [otEmpId, setOtEmpId] = useState<string>(employees[0]?.id || '');
  const [otDate, setOtDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [otHours, setOtHours] = useState<number>(4);
  const [otViewsRender, setOtViewsRender] = useState<number>(2);
  const [otReason, setOtReason] = useState<string>('Tăng ca hoàn thiện phối cảnh render dự án gấp');
  const [otPresetType, setOtPresetType] = useState<'AUTO' | '150' | '200' | '300' | 'CUSTOM'>('AUTO');
  const [customOtPercentage, setCustomOtPercentage] = useState<number>(150);
  const [otStatus, setOtStatus] = useState<'Đã hoàn thành' | 'Đang thực hiện' | 'Upcoming'>('Đã hoàn thành');

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  const selectedEmp = employees.find(e => e.id === selectedEmployeeIdForAdmin) || employees[0];

  // Helper date formatter for Deadline (e.g. "Thứ Ba, 15/08")
  const formatDeadlineFromDateStr = (dateStr: string): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayName = days[d.getDay()];
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dayName}, ${dd}/${mm}`;
  };

  // Filter KPI Job Items for active month/year
  const currentMonthJobs = useMemo(() => {
    return kpiJobList.filter(j => j.month === selectedMonth && j.year === selectedYear);
  }, [kpiJobList, selectedMonth, selectedYear]);

  // Group KPI Jobs by orderJob
  const groupedJobs = useMemo(() => {
    const groups: JobGroup[] = [];
    const map = new Map<string, KpiJobItem[]>();

    currentMonthJobs.forEach(job => {
      const key = (job.orderJob || '').trim();
      if (!map.has(key)) {
        const arr: KpiJobItem[] = [];
        map.set(key, arr);
        groups.push({ orderJob: key, items: arr });
      }
      map.get(key)!.push(job);
    });

    return groups;
  }, [currentMonthJobs]);

  // Handle Add / Edit Job Submit
  const handleAddJobSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderJob.trim()) {
      alert('Vui lòng nhập Order / Job (Tên bài / Dự án)');
      return;
    }

    const finalDeadline = deadline || (deadlineDateInput ? formatDeadlineFromDateStr(deadlineDateInput) : '');

    if (editingJob) {
      updateKpiJobItem(editingJob.id, {
        orderJob,
        subTask,
        parentTask: orderJob,
        assigneeName,
        viewsCount,
        convertedKpi,
        durationDays,
        deadline: finalDeadline,
        month: selectedMonth,
        year: selectedYear,
      });
      setEditingJob(null);
    } else {
      addKpiJobItem({
        orderJob,
        subTask,
        parentTask: orderJob,
        assigneeName,
        viewsCount,
        convertedKpi,
        durationDays,
        deadline: finalDeadline,
        month: selectedMonth,
        year: selectedYear,
      });
    }

    // Reset form
    setOrderJob('');
    setSubTask('');
    setViewsCount(4);
    setConvertedKpi(4.0);
    setDurationDays(2.0);
    setDeadline('Thứ Bảy, 15/07');
    setDeadlineDateInput('');
    setIsNewJobModalOpen(false);
  };

  const startEditJob = (job: KpiJobItem) => {
    setEditingJob(job);
    setOrderJob(job.orderJob);
    setSubTask(job.subTask || '');
    setAssigneeName(job.assigneeName);
    setViewsCount(job.viewsCount);
    setConvertedKpi(job.convertedKpi);
    setDurationDays(job.durationDays);
    setDeadline(job.deadline || '');
    setIsNewJobModalOpen(true);
  };

  const startAddSubTask = (orderName: string) => {
    setEditingJob(null);
    setOrderJob(orderName);
    setSubTask('');
    setViewsCount(2);
    setConvertedKpi(2.0);
    setDurationDays(1.0);
    setDeadline('');
    setIsNewJobModalOpen(true);
  };

  // Download KPI as Excel (.csv) matching exact layout
  const handleDownloadExcel = () => {
    const headers = ['STT', 'Order / Job (Tên bài / Dự án)', 'Assignee (Người thực hiện)', 'Số View', 'Quy đổi KPI', 'Thời gian (ngày)', 'Deadline'];
    const rows: (string | number)[][] = [];

    groupedJobs.forEach((group, idx) => {
      const hasSubTasks = group.items.some(i => i.subTask && i.subTask.trim().length > 0);

      if (!hasSubTasks && group.items.length === 1) {
        const j = group.items[0];
        rows.push([
          idx + 1,
          `"${(j.orderJob || '').replace(/"/g, '""')}"`,
          `"${(j.assigneeName || '').replace(/"/g, '""')}"`,
          j.viewsCount,
          j.convertedKpi,
          j.durationDays,
          `"${(j.deadline || '—').replace(/"/g, '""')}"`,
        ]);
      } else {
        // Main Order Header Row
        rows.push([
          idx + 1,
          `"${(group.orderJob || '').replace(/"/g, '""')}"`,
          '',
          '',
          '',
          '',
          '',
        ]);

        // Sub-task rows
        group.items.forEach(j => {
          rows.push([
            '',
            `"Sub-task : ${(j.subTask || j.orderJob).replace(/"/g, '""')}"`,
            `"${(j.assigneeName || '').replace(/"/g, '""')}"`,
            j.viewsCount,
            j.convertedKpi,
            j.durationDays,
            `"${(j.deadline || '—').replace(/"/g, '""')}"`,
          ]);
        });
      }
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Bang_KPI_TL_CONCEPTS_Thang_${selectedMonth}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Đã tải file Excel KPI Tháng ${selectedMonth}/${selectedYear} về máy!`);
  };

  // Export / Print PDF
  const handleDownloadPdf = () => {
    window.print();
  };

  // Sync KPI points directly to employee records & payroll
  const handleSyncKpiToProfiles = () => {
    const dynamicTarget = monthWorkInfo.calculatedKpiTarget;

    employees.forEach(emp => {
      // Find all jobs assigned to this employee
      const empJobs = currentMonthJobs.filter(j => 
        j.assigneeName.toLowerCase().includes(emp.fullName.toLowerCase()) ||
        emp.fullName.toLowerCase().includes(j.assigneeName.toLowerCase())
      );

      const totalViews = empJobs.reduce((acc, curr) => acc + curr.viewsCount, 0);
      const totalKpiPoints = empJobs.reduce((acc, curr) => acc + curr.convertedKpi, 0);
      
      const target = dynamicTarget || 35; // Dynamically calculated target from 5.5 days/week schedule
      const completionPct = Math.round((totalKpiPoints / target) * 100) || 100;
      
      // Calculate design allowance bonus
      const bonusAmount = Math.max(2000000, Math.round(totalKpiPoints * 500000));

      addOrUpdateKpi(emp.id, {
        id: `kpi-${emp.id}-${selectedMonth}-${selectedYear}`,
        month: selectedMonth,
        year: selectedYear,
        renderedViewsActual: totalViews || target,
        kpiConvertedViews: totalKpiPoints || target,
        kpiTarget: target,
        completionPercentage: completionPct,
        otHours: 5,
        otHourlyRate: 200000,
        bonusAmount,
        benefitAmount: 1500000,
        additionsDeductions: [],
        notes: `Tính toán từ ${empJobs.length} bài/dự án (Chỉ tiêu tháng ${monthWorkInfo.standardWorkDays} ngày công x ${kpiRatePerDay} view/ngày = ${target} view).`
      });
    });

    showToast(`Đã đồng bộ thành công dữ liệu KPI của tất cả nhân viên (Chỉ tiêu: ${dynamicTarget} views theo ${monthWorkInfo.standardWorkDays} ngày công) vào Payroll Tháng ${selectedMonth}/${selectedYear}!`);
  };

  // Calculate OT percentage & rate based on date or custom input
  const getEffectiveOtPercentage = (): number => {
    if (otPresetType === '150') return 150;
    if (otPresetType === '200') return 200;
    if (otPresetType === '300') return 300;
    if (otPresetType === 'CUSTOM') return customOtPercentage;

    // AUTO calculation based on date
    if (!otDate) return 150;
    const d = new Date(otDate);
    const day = d.getDay();
    if (day === 0 || day === 6) return 200; // Weekend T7, CN
    return 150; // Regular weekday
  };

  // Collect all OT records across all employees
  const allOtRecords = employees.flatMap(emp => 
    (emp.otRecords || []).map(ot => ({
      ...ot,
      employeeId: emp.id,
      employeeName: emp.fullName,
      employeeCode: emp.employeeCode,
      department: emp.department,
      hourlyRate: Math.round(emp.currentSalary / 22 / 8),
    }))
  );

  // Handle Admin direct OT creation
  const handleAddOtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmp = employees.find(e => e.id === otEmpId) || employees[0];
    if (!targetEmp) {
      alert('Vui lòng chọn nhân viên');
      return;
    }

    const hourly = Math.round(targetEmp.currentSalary / 22 / 8);
    const effPct = getEffectiveOtPercentage();
    const calcAmount = Math.round(otHours * hourly * (effPct / 100));

    const payLabel = `Thanh toán ${effPct}% (${otPresetType === 'AUTO' ? (effPct === 200 ? 'Cuối tuần' : 'Ngày thường') : 'Admin cấu hình'})`;

    addOtRecord(targetEmp.id, {
      date: otDate,
      hours: otHours,
      viewsRenderCount: otViewsRender,
      reason: otReason,
      approverName: 'Admin HR Manager',
      payType: payLabel,
      otPercentage: effPct,
      status: otStatus,
      amount: calcAmount,
    });

    setIsNewOtModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Quản lý KPI, OT & Thưởng Thiết kế
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Nhập liệu bài/dự án trực tiếp để tính KPI, chia nhỏ sub-task, tải file xuất báo cáo và Admin khởi tạo giờ OT.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setEditingJob(null);
              setOrderJob('');
              setSubTask('');
              setIsNewJobModalOpen(true);
            }}
            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm flex items-center space-x-2 shadow-md shadow-primary-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm bài mới</span>
          </button>

          {/* Download Excel & PDF Buttons */}
          <button
            onClick={handleDownloadExcel}
            className="px-3.5 py-2.5 bg-success-600 hover:bg-success-700 text-white rounded-xl font-semibold text-xs flex items-center space-x-1.5 shadow-md shadow-success-600/20 transition-all cursor-pointer"
            title="Tải bảng KPI về máy dạng Excel (.csv)"
          >
            <Download className="w-4 h-4" />
            <span>Tải Excel</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            className="px-3 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold text-xs flex items-center space-x-1.5 shadow-md shadow-slate-800/20 transition-all cursor-pointer"
            title="In / Xuất PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Xuất PDF / In</span>
          </button>

          <button
            onClick={() => setIsImportKpiModalOpen(true)}
            className="px-3 py-2.5 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-xl font-semibold text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Import Excel</span>
          </button>
        </div>
      </div>

      {/* Selectors Bar: Month & Year */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-500">Kỳ đánh giá:</span>
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
              <option value={2026}>Năm 2026</option>
              <option value={2025}>Năm 2025</option>
            </select>
          </div>

          <span className="text-xs text-slate-500">
            Tổng số bài/dự án đã nhập trong tháng: <b>{currentMonthJobs.length}</b>
          </span>
        </div>

        <button
          onClick={handleSyncKpiToProfiles}
          className="px-4 py-1.5 bg-success-100 hover:bg-success-200 text-success-800 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-all"
        >
          <Calculator className="w-4 h-4 text-success-700" />
          <span>Đồng bộ điểm KPI sang Payroll</span>
        </button>
      </div>

      {/* WORKING DAYS & KPI TARGET CALCULATION STATS (5.5 DAYS/WEEK SCHEDULE) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-primary-950 text-white p-5 rounded-2xl border border-slate-700 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-700/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success-500/20 text-success-400 flex items-center justify-center border border-success-400/30">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-white">Quy chuẩn Ngày Công & Định mức KPI Tháng {selectedMonth}/{selectedYear}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-success-500/20 text-success-300 border border-success-400/30">
                  Lịch 5.5 ngày/tuần
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Chu kỳ từ ngày <strong>01/{selectedMonth < 10 ? '0' + selectedMonth : selectedMonth}</strong> đến <strong>{monthWorkInfo.lastDayOfMonth}/{selectedMonth < 10 ? '0' + selectedMonth : selectedMonth}</strong> ({monthWorkInfo.totalCalendarDays} ngày dương lịch)
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

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 pt-4 text-xs">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block">Thứ 2 - Thứ 6 (x 1.0)</span>
            <p className="text-base font-bold text-white font-mono mt-0.5">
              {monthWorkInfo.fullWeekdaysCount} <span className="text-xs font-normal text-slate-400">ngày</span>
            </p>
            <span className="text-[10px] text-success-400">={monthWorkInfo.fullWeekdaysCount} công</span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block">Thứ 7 (Nửa ngày x 0.5)</span>
            <p className="text-base font-bold text-amber-300 font-mono mt-0.5">
              {monthWorkInfo.saturdaysCount} <span className="text-xs font-normal text-slate-400">buổi</span>
            </p>
            <span className="text-[10px] text-amber-300">={monthWorkInfo.saturdaysCount * 0.5} công</span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block">Chủ Nhật (Nghỉ x 0)</span>
            <p className="text-base font-bold text-slate-400 font-mono mt-0.5">
              {monthWorkInfo.sundaysCount} <span className="text-xs font-normal text-slate-500">ngày</span>
            </p>
            <span className="text-[10px] text-slate-500">Nghỉ hàng tuần</span>
          </div>

          <div className="bg-success-950/80 p-3 rounded-xl border border-success-600/40">
            <span className="text-[11px] text-success-300 font-bold block">Tổng Ngày Công Chuẩn</span>
            <p className="text-lg font-black text-success-300 font-mono mt-0.5">
              {monthWorkInfo.standardWorkDays} <span className="text-xs font-semibold text-success-400">công</span>
            </p>
            <span className="text-[10px] text-success-400 font-medium">Quy chuẩn tháng {selectedMonth}</span>
          </div>

          <div className="col-span-2 sm:col-span-4 lg:col-span-1 bg-primary-950/80 p-3 rounded-xl border border-primary-500/40">
            <span className="text-[11px] text-primary-200 font-bold block">Chỉ tiêu KPI Tháng</span>
            <p className="text-lg font-black text-white font-mono mt-0.5">
              {monthWorkInfo.calculatedKpiTarget} <span className="text-xs font-semibold text-primary-300">view</span>
            </p>
            <span className="text-[10px] text-primary-300 font-mono">
              {monthWorkInfo.standardWorkDays} × {kpiRatePerDay} view
            </span>
          </div>
        </div>
      </div>

      {/* 1. DIRECT KPI INPUT & CALCULATION TOOL TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-800 flex items-center justify-center font-bold">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                Bảng Nhập liệu & Tính toán KPI Trực tiếp (Tháng {selectedMonth}/{selectedYear})
              </h2>
              <p className="text-xs text-slate-500">
                Các sub-task nằm trực tiếp dưới Order / Job tương ứng (không tốn thêm cột riêng)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadExcel}
              className="px-3 py-1.5 bg-success-50 hover:bg-success-100 text-success-700 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải file Excel</span>
            </button>

            <button
              onClick={() => {
                setEditingJob(null);
                setOrderJob('');
                setSubTask('');
                setIsNewJobModalOpen(true);
              }}
              className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm bài mới</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-300 rounded-xl">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-slate-100 text-slate-800 uppercase text-[11px] font-bold border-b border-slate-300">
              <tr>
                <th className="py-3 px-3 text-center w-12 border-r border-slate-300">STT</th>
                <th className="py-3 px-4 min-w-[320px] border-r border-slate-300">Order / Job (Tên bài / Dự án)</th>
                <th className="py-3 px-4 min-w-[160px] border-r border-slate-300">Assignee (Người thực hiện)</th>
                <th className="py-3 px-3 text-center border-r border-slate-300">Số View</th>
                <th className="py-3 px-3 text-center border-r border-slate-300">Quy đổi KPI</th>
                <th className="py-3 px-3 text-center border-r border-slate-300">Thời gian thực hiện</th>
                <th className="py-3 px-3 text-center border-r border-slate-300 min-w-[120px]">Deadline</th>
                <th className="py-3 px-3 text-center w-28">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {groupedJobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Chưa có bài/dự án nào trong Tháng {selectedMonth}/{selectedYear}. Bấm "Thêm bài mới" để nhập liệu.
                  </td>
                </tr>
              ) : (
                groupedJobs.map((group, groupIdx) => {
                  const hasSubTasks = group.items.some(i => i.subTask && i.subTask.trim().length > 0);

                  // CASE 1: Single job without sub-tasks
                  if (!hasSubTasks && group.items.length === 1) {
                    const job = group.items[0];
                    return (
                      <tr key={job.id} className="hover:bg-slate-50 border-b border-slate-200">
                        <td className="py-3 px-3 text-center font-bold text-slate-900 border-r border-slate-300">
                          {groupIdx + 1}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 leading-snug border-r border-slate-300">
                          {job.orderJob}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800 border-r border-slate-300">
                          {job.assigneeName}
                        </td>
                        <td className="py-3 px-3 text-center font-black text-slate-800 text-sm border-r border-slate-300">
                          {job.viewsCount}
                        </td>
                        <td className="py-3 px-3 text-center font-black text-success-600 text-sm bg-success-50/50 border-r border-slate-300">
                          {job.convertedKpi}
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-slate-600 border-r border-slate-300">
                          {job.durationDays ? `${job.durationDays} ngày` : '—'}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-rose-700 bg-rose-50/40 border-r border-slate-300">
                          {job.deadline || '—'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => startAddSubTask(job.orderJob)}
                              className="p-1.5 hover:bg-primary-100 text-primary-600 rounded-lg cursor-pointer text-[10px] font-bold"
                              title="Thêm Sub-task"
                            >
                              +Sub
                            </button>
                            <button
                              onClick={() => startEditJob(job)}
                              className="p-1.5 hover:bg-primary-100 text-primary-600 rounded-lg cursor-pointer"
                              title="Sửa bài"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteKpiJobItem(job.id)}
                              className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer"
                              title="Xóa bài"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  // CASE 2: Order has Sub-tasks (Parent Order header row + sub-task rows)
                  return (
                    <React.Fragment key={`group-${groupIdx}`}>
                      {/* Main Order Header Row */}
                      <tr className="bg-slate-50/90 font-bold border-b border-slate-300">
                        <td className="py-3 px-3 text-center font-black text-slate-900 border-r border-slate-300 bg-slate-100">
                          {groupIdx + 1}
                        </td>
                        <td className="py-3 px-4 font-black text-slate-900 text-sm border-r border-slate-300" colSpan={1}>
                          {group.orderJob}
                        </td>
                        <td className="py-3 px-4 text-slate-400 italic text-xs border-r border-slate-300">—</td>
                        <td className="py-3 px-3 text-center font-bold text-slate-500 border-r border-slate-300">
                          {group.items.reduce((sum, item) => sum + item.viewsCount, 0)}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-success-700 border-r border-slate-300">
                          {group.items.reduce((sum, item) => sum + item.convertedKpi, 0)}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-400 border-r border-slate-300">—</td>
                        <td className="py-3 px-3 text-center text-slate-400 border-r border-slate-300">—</td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => startAddSubTask(group.orderJob)}
                            className="px-2 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded text-[11px] font-bold shadow-xs cursor-pointer"
                            title="Thêm Sub-task mới vào Order này"
                          >
                            + Thêm Sub-task
                          </button>
                        </td>
                      </tr>

                      {/* Sub-task Rows */}
                      {group.items.map((item, itemIdx) => (
                        <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-200">
                          {/* Blank STT cell */}
                          <td className="py-2.5 px-3 border-r border-slate-300 bg-slate-50/40"></td>
                          
                          {/* Sub-task rendered directly under Order in light gray block */}
                          <td className="py-2 px-4 border-r border-slate-300">
                            <div className="bg-slate-100/90 text-slate-800 px-3 py-1.5 rounded-md border-l-4 border-primary-500 font-semibold text-xs flex items-center justify-between">
                              <span>Sub-task : {item.subTask || item.orderJob}</span>
                            </div>
                          </td>

                          <td className="py-2 px-4 font-bold text-slate-800 border-r border-slate-300">
                            {item.assigneeName}
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
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => startEditJob(item)}
                                className="p-1 hover:bg-primary-100 text-primary-600 rounded cursor-pointer"
                                title="Sửa Sub-task"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteKpiJobItem(item.id)}
                                className="p-1 hover:bg-rose-100 text-rose-600 rounded cursor-pointer"
                                title="Xóa Sub-task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. TIẾN ĐỘ KPI CỦA TỪNG NHÂN VIÊN ĐẾN HÔM NAY */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-success-100 text-success-800 flex items-center justify-center font-bold">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                Tiến độ KPI của từng nhân viên đến hôm nay
              </h2>
              <p className="text-xs text-slate-500">
                Tổng hợp số bài, tổng views, tổng điểm quy đổi và % hoàn thành KPI thực tế từ bảng nhập liệu
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {employees.map(emp => {
            const empJobs = currentMonthJobs.filter(j => 
              j.assigneeName.toLowerCase().includes(emp.fullName.toLowerCase()) ||
              emp.fullName.toLowerCase().includes(j.assigneeName.toLowerCase())
            );

            const totalViews = empJobs.reduce((a, c) => a + c.viewsCount, 0);
            const totalKpi = empJobs.reduce((a, c) => a + c.convertedKpi, 0);
            const target = 35;
            const pct = Math.min(150, Math.round((totalKpi / target) * 100)) || 100;

            return (
              <div key={emp.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center space-x-3">
                  <img src={emp.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-xs truncate">{emp.fullName}</p>
                    <p className="text-[10px] text-slate-500 truncate">{emp.jobTitle}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                    pct >= 100 ? 'bg-success-100 text-success-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {pct}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                    <span>Quy đổi: <b>{totalKpi}</b> / {target} điểm</span>
                    <span>{empJobs.length} sub-tasks</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-success-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                  <span>Tổng render views: <b>{totalViews} views</b></span>
                  <span className="font-bold text-success-700">{formatVND(Math.round(totalKpi * 500000))}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. QUẢN LÝ TĂNG CA LÀM THÊM GIỜ (OT) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-800 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                Quản lý Tăng ca làm thêm giờ (OT)
              </h2>
              <p className="text-xs text-slate-500">
                Admin trực tiếp tạo mới và quản lý lịch tăng ca làm thêm giờ cho nhân viên
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsNewOtModalOpen(true)}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-md shadow-primary-500/20 flex items-center space-x-1.5 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo mới giờ OT</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] tracking-wider border-y border-slate-200">
              <tr>
                <th className="py-3 px-4">Nhân viên</th>
                <th className="py-3 px-4">Ngày OT</th>
                <th className="py-3 px-4">Số giờ / View render</th>
                <th className="py-3 px-4">Mô tả / Lý do OT</th>
                <th className="py-3 px-4">Phụ cấp & Mức % OT</th>
                <th className="py-3 px-4">Lương OT dự kiến</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-center">Cập nhật</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allOtRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Chưa có lịch tăng ca OT nào trong hệ thống. Bấm "Tạo mới giờ OT" để khởi tạo.
                  </td>
                </tr>
              ) : (
                allOtRecords.map(ot => (
                  <tr key={ot.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div>
                        <span>{ot.employeeName}</span>
                        <span className="block text-[10px] text-slate-400 font-mono">{ot.employeeCode}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium">{ot.date}</td>
                    <td className="py-3 px-4 font-black text-primary-700">
                      {ot.hours} giờ {ot.viewsRenderCount ? `(${ot.viewsRenderCount} views)` : ''}
                    </td>
                    <td className="py-3 px-4 max-w-[200px] truncate">{ot.reason}</td>
                    <td className="py-3 px-4 font-semibold text-primary-700">
                      {ot.payType}
                    </td>
                    <td className="py-3 px-4 font-bold text-success-600">{formatVND(ot.amount)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full font-extrabold text-[10px] ${
                        ot.status === 'Đã hoàn thành' || ot.status === 'Đã duyệt'
                          ? 'bg-success-100 text-success-800 border border-success-300'
                          : ot.status === 'Đang thực hiện'
                            ? 'bg-primary-100 text-primary-800 border border-primary-300'
                            : ot.status === 'Upcoming'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-100 text-slate-700'
                      }`}>
                        {ot.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <select
                          value={ot.status}
                          onChange={e => updateOtStatus(ot.employeeId, ot.id, e.target.value as any)}
                          className="p-1 bg-slate-50 border border-slate-200 rounded text-[11px] font-semibold text-slate-700 cursor-pointer"
                        >
                          <option value="Đã hoàn thành">Đã hoàn thành</option>
                          <option value="Đang thực hiện">Đang thực hiện</option>
                          <option value="Upcoming">Upcoming</option>
                          <option value="Từ chối">Từ chối</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit KPI Job Item */}
      {isNewJobModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              {editingJob ? 'Cập nhật chi tiết Bài / Dự án KPI' : 'Nhập liệu Bài / Dự án KPI mới'}
            </h3>

            <form onSubmit={handleAddJobSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Order / Job (Tên bài / Mô tả render dự án) *:
                </label>
                <input 
                  type="text"
                  placeholder="Ví dụ: 70_Remko_5 interior staging luxury; 4 impressions"
                  value={orderJob}
                  onChange={e => setOrderJob(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    sub-task (Hạng mục công việc chia nhỏ):
                  </label>
                  <input 
                    type="text"
                    placeholder="Ví dụ: 2 bedrooms, 2 living room..."
                    value={subTask}
                    onChange={e => setSubTask(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-primary-700"
                  />
                  <span className="text-[10px] text-slate-400 italic">Hiển thị nằm dưới Order trong bảng</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assignee (Người thực hiện) *:</label>
                  <select
                    value={assigneeName}
                    onChange={e => setAssigneeName(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.fullName}>{emp.fullName} ({emp.employeeCode})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số View:</label>
                  <input 
                    type="number"
                    step="1"
                    value={viewsCount}
                    onChange={e => setViewsCount(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quy đổi KPI:</label>
                  <input 
                    type="number"
                    step="0.1"
                    value={convertedKpi}
                    onChange={e => setConvertedKpi(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-success-700"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Thời gian thực hiện (ngày):</label>
                  <input 
                    type="number"
                    step="0.5"
                    value={durationDays}
                    onChange={e => setDurationDays(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Deadline (Format: Thứ xx, dd/mm):
                  </label>
                  <div className="space-y-1">
                    <input 
                      type="text"
                      placeholder="Thứ Bảy, 15/07"
                      value={deadline}
                      onChange={e => setDeadline(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-rose-700"
                    />
                    <div className="flex items-center space-x-1">
                      <span className="text-[10px] text-slate-400">Hoặc chọn ngày:</span>
                      <input 
                        type="date"
                        value={deadlineDateInput}
                        onChange={e => {
                          const dt = e.target.value;
                          setDeadlineDateInput(dt);
                          if (dt) {
                            setDeadline(formatDeadlineFromDateStr(dt));
                          }
                        }}
                        className="p-1 text-[11px] bg-slate-100 border rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewJobModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-md shadow-primary-500/20 cursor-pointer"
                >
                  {editingJob ? 'Cập nhật bài KPI' : 'Lưu bài KPI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add OT (Admin Direct Creation) */}
      {isNewOtModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Tạo mới giờ OT cho Nhân viên
            </h3>

            <form onSubmit={handleAddOtSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nhân viên *:</label>
                <select
                  value={otEmpId}
                  onChange={e => setOtEmpId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                >
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.fullName} ({e.employeeCode}) - {e.jobTitle}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày OT *:</label>
                <input 
                  type="date"
                  value={otDate}
                  onChange={e => setOtDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số giờ OT *:</label>
                  <input 
                    type="number"
                    min="1"
                    max="16"
                    value={otHours}
                    onChange={e => setOtHours(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-primary-700"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">View render OT (Nếu có):</label>
                  <input 
                    type="number"
                    min="0"
                    value={otViewsRender}
                    onChange={e => setOtViewsRender(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phụ cấp & Mức % OT *:</label>
                <select
                  value={otPresetType}
                  onChange={e => setOtPresetType(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-primary-800"
                >
                  <option value="AUTO">Tự động (Ngày thường 150%, T7/CN 200%, Lễ 300%)</option>
                  <option value="150">Ngày thường - Thanh toán 150%</option>
                  <option value="200">Cuối tuần (T7, CN) - Thanh toán 200%</option>
                  <option value="300">Lễ Tết - Thanh toán 300%</option>
                  <option value="CUSTOM">Admin tự nhập mức % OT</option>
                </select>
              </div>

              {otPresetType === 'CUSTOM' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nhập Mức % OT tùy chỉnh:</label>
                  <input 
                    type="number"
                    step="10"
                    value={customOtPercentage}
                    onChange={e => setCustomOtPercentage(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-success-700"
                    placeholder="VD: 150, 200, 250, 300..."
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng thái OT *:</label>
                <select
                  value={otStatus}
                  onChange={e => setOtStatus(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                >
                  <option value="Đã hoàn thành">Đã hoàn thành</option>
                  <option value="Đang thực hiện">Đang thực hiện</option>
                  <option value="Upcoming">Upcoming (Sắp tới)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Lý do / Nội dung OT:</label>
                <textarea
                  rows={2}
                  value={otReason}
                  onChange={e => setOtReason(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  required
                />
              </div>

              {/* Realtime estimated OT Pay display */}
              {(() => {
                const targetEmp = employees.find(e => e.id === otEmpId) || employees[0];
                const hourly = targetEmp ? Math.round(targetEmp.currentSalary / 22 / 8) : 0;
                const effPct = getEffectiveOtPercentage();
                const calcAmt = Math.round(otHours * hourly * (effPct / 100));

                return (
                  <div className="p-3 bg-primary-50/70 rounded-xl border border-primary-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-600 block">Tự tính Lương OT ({effPct}%):</span>
                      <span className="text-[11px] text-slate-500">{otHours} giờ x {formatVND(hourly)}/giờ</span>
                    </div>
                    <span className="text-base font-black text-primary-700">{formatVND(calcAmt)}</span>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewOtModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-md shadow-primary-500/20 cursor-pointer"
                >
                  Xác nhận Tạo giờ OT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
