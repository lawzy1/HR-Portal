import React, { useMemo, useState } from 'react';
import {
  Clock,
  Plus,
  FileSpreadsheet,
  Award,
  Trash2,
  Edit2,
  Calculator,
  Download,
  Printer,
  CalendarDays,
  Send,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { useAuth } from '../../context/AuthContext';
import { useEmployees } from '../../hooks/useEmployees';
import { useSignedImageUrl } from '../../hooks/useFileUpload';
import {
  useAllKpiJobItems,
  useCreateKpiJobItem,
  useUpdateKpiJobItem,
  useDeleteKpiJobItem,
  useUpsertKpiMonthly,
  useUpdateKpiMonthly,
  useAllKpiMonthly,
  useSubmitKpiMonth,
  useApproveKpiMonth,
  useRejectKpiMonth,
} from '../../hooks/useKpi';
import { useAllOtRecords, useCreateOtRecord, useUpdateOtRecord } from '../../hooks/useOt';
import { useCompanySettings } from '../../hooks/useCompanySettings';
import { useAllLeaveRequests, useCompanyHolidays } from '../../hooks/useLeave';
import { getApprovedLeaveDaysInMonth, getMonthWorkDays } from '../../utils/workDays';
import { ConfirmationDialog } from '../ConfirmationDialog';

const JOB_CATEGORIES: { value: 'new_render' | 'reprocess'; label: string }[] = [
  { value: 'new_render', label: 'New Render' },
  { value: 'reprocess', label: 'Re Process (Chỉnh sửa)' },
];

const categoryBadge = (category: string) =>
  category === 'reprocess'
    ? <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">Re Process</span>
    : <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-success-100 text-success-800 border border-success-300">New Render</span>;

// employee_id is a required FK on kpi_job_items now — job assignment is a real
// employee picker, no more fuzzy assigneeName string matching against full_name.
type KpiJobRow = NonNullable<ReturnType<typeof useAllKpiJobItems>['data']>[number];
type OtRecordRow = NonNullable<ReturnType<typeof useAllOtRecords>['data']>[number];
type DbEmployeeRow = NonNullable<ReturnType<typeof useEmployees>['data']>[number];
type KpiMonthlyRow = NonNullable<ReturnType<typeof useAllKpiMonthly>['data']>[number];

interface JobGroup {
  orderJob: string;
  items: KpiJobRow[];
}

const RowAvatar: React.FC<{ path: string | null | undefined }> = ({ path }) => {
  const { data: url } = useSignedImageUrl(path);
  return url ? (
    <img src={url} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" />
  ) : (
    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 shrink-0" />
  );
};

const isSameMonthYear = (dateStr: string, month: number, year: number): boolean => {
  const d = new Date(dateStr);
  return d.getMonth() + 1 === month && d.getFullYear() === year;
};

export const AdminKpiOtView: React.FC = () => {
  const { selectedEmployeeIdForAdmin, setSelectedEmployeeIdForAdmin, setIsImportKpiModalOpen, showToast } = useHR();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const { data: employees } = useEmployees();
  const { data: companySettings } = useCompanySettings();
  const { data: holidays } = useCompanyHolidays();
  const { data: allLeaveRequests } = useAllLeaveRequests();
  const employeeList = useMemo(() => employees || [], [employees]);

  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 12 }, (_, index) => currentYear - 1 + index);
  }, []);

  const holidayDatesInMonth = useMemo(
    () => (holidays || []).filter((h) => h.date.startsWith(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`)).map((h) => h.date),
    [holidays, selectedMonth, selectedYear]
  );

  // Dynamic Standard Working Days calculation (1st to 30/31st of month, 5.5
  // days/week, minus any công ty holiday) — works for any month, incl. future ones.
  const monthWorkInfo = useMemo(() => {
    return getMonthWorkDays(selectedMonth, selectedYear, holidayDatesInMonth);
  }, [selectedMonth, selectedYear, holidayDatesInMonth]);

  const approvedLeaveDaysByEmployee = useMemo(() => {
    const daysByEmployee = new Map<string, number>();
    (allLeaveRequests || [])
      .filter((request) => request.status === 'Đã duyệt')
      .forEach((request) => {
        const leaveDays = getApprovedLeaveDaysInMonth([request], selectedMonth, selectedYear, holidayDatesInMonth);
        if (leaveDays > 0) {
          daysByEmployee.set(request.employee_id, (daysByEmployee.get(request.employee_id) || 0) + leaveDays);
        }
      });
    return daysByEmployee;
  }, [allLeaveRequests, holidayDatesInMonth, selectedMonth, selectedYear]);

  const getEmployeeWorkDays = (employeeId: string) => Number(
    Math.max(0, monthWorkInfo.standardWorkDays - (approvedLeaveDaysByEmployee.get(employeeId) || 0)).toFixed(1),
  );

  // Mỗi nhân viên có chỉ tiêu KPI/ngày riêng (Hồ sơ nhân viên) — quy đổi ra
  // KPI chuẩn tháng = chỉ tiêu/ngày × ngày công chuẩn của tháng đó.
  const getEmployeeKpiTarget = (emp: DbEmployeeRow) =>
    Number(((emp.kpi_target_per_day || 0) * getEmployeeWorkDays(emp.id)).toFixed(1));

  const { data: currentMonthJobsData } = useAllKpiJobItems(selectedMonth, selectedYear);
  const currentMonthJobs = useMemo(() => currentMonthJobsData || [], [currentMonthJobsData]);
  const { data: monthlyKpiData } = useAllKpiMonthly(selectedMonth, selectedYear);
  const monthlyKpi = monthlyKpiData || [];
  const hasPendingKpi = monthlyKpi.some((record) => record.publish_status === 'pending_approval');
  const hasPublishedKpi = monthlyKpi.some((record) => record.publish_status === 'published');
  const hasEditableKpi = monthlyKpi.some((record) => record.publish_status === 'draft' || record.publish_status === 'rejected');

  const { data: allOtRecordsData } = useAllOtRecords();
  const allOtRecords: OtRecordRow[] = allOtRecordsData || [];

  const createKpiJobItem = useCreateKpiJobItem();
  const updateKpiJobItem = useUpdateKpiJobItem();
  const deleteKpiJobItem = useDeleteKpiJobItem();
  const upsertKpiMonthly = useUpsertKpiMonthly();
  const updateKpiMonthly = useUpdateKpiMonthly();
  const submitKpiMonth = useSubmitKpiMonth();
  const approveKpiMonth = useApproveKpiMonth();
  const rejectKpiMonth = useRejectKpiMonth();
  const createOtRecord = useCreateOtRecord();
  const updateOtRecord = useUpdateOtRecord();

  // New KPI Job Entry Modal / Form
  const [isNewJobModalOpen, setIsNewJobModalOpen] = useState(false);
  const [orderJob, setOrderJob] = useState('');
  const [subTask, setSubTask] = useState('');
  const [jobEmployeeId, setJobEmployeeId] = useState('');
  const [jobCategory, setJobCategory] = useState<'new_render' | 'reprocess'>('new_render');
  const [viewsCount, setViewsCount] = useState<number>(4);
  const [convertedKpi, setConvertedKpi] = useState<number>(4.0);
  const [durationDays, setDurationDays] = useState<number>(2.0);
  const [deadline, setDeadline] = useState<string>('');
  const [deadlineDateInput, setDeadlineDateInput] = useState<string>('');
  const [completedDateInput, setCompletedDateInput] = useState<string>('');

  // Edit Job state
  const [editingJob, setEditingJob] = useState<KpiJobRow | null>(null);

  // OT Form State (Admin Direct Creation)
  const [isNewOtModalOpen, setIsNewOtModalOpen] = useState(false);
  const [otEmpId, setOtEmpId] = useState<string>('');
  const [otDate, setOtDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [otHours, setOtHours] = useState<number>(4);
  const [otViewsRender, setOtViewsRender] = useState<number>(2);
  const [otReason, setOtReason] = useState<string>('');
  const [otPresetType, setOtPresetType] = useState<'AUTO' | 'WEEKDAY' | 'WEEKEND' | 'HOLIDAY' | 'CUSTOM'>('AUTO');
  const [customOtPercentage, setCustomOtPercentage] = useState<number>(150);
  const [otStatus, setOtStatus] = useState<'Đã hoàn thành' | 'Đang thực hiện' | 'Upcoming'>('Đã hoàn thành');
  const [kpiDecision, setKpiDecision] = useState<'approve' | 'reject' | null>(null);
  const [kpiRejectionReason, setKpiRejectionReason] = useState('');

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

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

  const delayLabel = (job: KpiJobRow) => {
    if (!job.deadline_at || !job.completed_at) return null;
    const minutes = Math.ceil((new Date(job.completed_at).getTime() - new Date(job.deadline_at).getTime()) / 60000);
    if (minutes <= 0) return 'Đúng hạn';
    const hours = Math.floor(minutes / 60);
    return `Trễ ${hours} giờ ${minutes % 60} phút`;
  };

  const toIso = (value: string) => value ? new Date(value).toISOString() : null;
  const toLocalInput = (value: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  // Group KPI Jobs by orderJob
  const groupedJobs = useMemo(() => {
    const groups: JobGroup[] = [];
    const map = new Map<string, KpiJobRow[]>();

    currentMonthJobs.forEach(job => {
      const key = (job.order_job || '').trim();
      if (!map.has(key)) {
        const arr: KpiJobRow[] = [];
        map.set(key, arr);
        groups.push({ orderJob: key, items: arr });
      }
      map.get(key)!.push(job);
    });

    return groups;
  }, [currentMonthJobs]);

  // Handle Add / Edit Job Submit
  const handleAddJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderJob.trim()) {
      alert('Vui lòng nhập Order / Job (Tên bài / Dự án)');
      return;
    }
    if (!jobEmployeeId) {
      alert('Vui lòng chọn nhân viên thực hiện (Assignee)');
      return;
    }
    if (!profile?.companyId) return;

    const finalDeadline = deadline || (deadlineDateInput ? formatDeadlineFromDateStr(deadlineDateInput) : '');

    if (editingJob) {
      await updateKpiJobItem.mutateAsync({
        id: editingJob.id,
        updates: {
          order_job: orderJob,
          sub_task: subTask || null,
          parent_task: orderJob,
          employee_id: jobEmployeeId,
          category: jobCategory,
          views_count: viewsCount,
          converted_kpi: convertedKpi,
          duration_days: durationDays,
          deadline: finalDeadline || null,
          deadline_at: toIso(deadlineDateInput),
          completed_at: toIso(completedDateInput),
          month: selectedMonth,
          year: selectedYear,
        },
      });
      showToast('Đã cập nhật chi tiết KPI bài/dự án!');
      setEditingJob(null);
    } else {
      await createKpiJobItem.mutateAsync({
        company_id: profile.companyId,
        order_job: orderJob,
        sub_task: subTask || null,
        parent_task: orderJob,
        employee_id: jobEmployeeId,
        category: jobCategory,
        views_count: viewsCount,
        converted_kpi: convertedKpi,
        duration_days: durationDays,
        deadline: finalDeadline || null,
        deadline_at: toIso(deadlineDateInput),
        completed_at: toIso(completedDateInput),
        month: selectedMonth,
        year: selectedYear,
      });
      showToast('Đã thêm bài / dự án KPI mới thành công!');
    }

    // Reset form
    setOrderJob('');
    setSubTask('');
    setJobCategory('new_render');
    setViewsCount(4);
    setConvertedKpi(4.0);
    setDurationDays(2.0);
    setDeadline('');
    setDeadlineDateInput('');
    setCompletedDateInput('');
    setIsNewJobModalOpen(false);
  };

  const startEditJob = (job: KpiJobRow) => {
    setEditingJob(job);
    setOrderJob(job.order_job);
    setSubTask(job.sub_task || '');
    setJobEmployeeId(job.employee_id);
    setJobCategory(job.category === 'reprocess' ? 'reprocess' : 'new_render');
    setViewsCount(job.views_count || 0);
    setConvertedKpi(job.converted_kpi || 0);
    setDurationDays(job.duration_days || 0);
    setDeadline(job.deadline || '');
    setDeadlineDateInput(toLocalInput(job.deadline_at));
    setCompletedDateInput(toLocalInput(job.completed_at));
    setIsNewJobModalOpen(true);
  };

  const startAddSubTask = (orderName: string) => {
    setEditingJob(null);
    setOrderJob(orderName);
    setSubTask('');
    setJobCategory('new_render');
    setViewsCount(2);
    setConvertedKpi(2.0);
    setDurationDays(1.0);
    setDeadline('');
    setIsNewJobModalOpen(true);
  };

  const handleDeleteJob = async (id: string) => {
    await deleteKpiJobItem.mutateAsync(id);
    showToast('Đã xóa bài/dự án khỏi bảng KPI.');
  };

  // Download KPI as Excel (.csv) matching exact layout
  const handleDownloadExcel = () => {
    const headers = ['STT', 'Order / Job (Tên bài / Dự án)', 'Assignee (Người thực hiện)', 'Số View', 'Quy đổi KPI', 'Thời gian (ngày)', 'Deadline'];
    const rows: (string | number)[][] = [];

    groupedJobs.forEach((group, idx) => {
      const hasSubTasks = group.items.some(i => i.sub_task && i.sub_task.trim().length > 0);

      if (!hasSubTasks && group.items.length === 1) {
        const j = group.items[0];
        rows.push([
          idx + 1,
          `"${(j.order_job || '').replace(/"/g, '""')}"`,
          `"${(j.employees?.full_name || '').replace(/"/g, '""')}"`,
          j.views_count || 0,
          j.converted_kpi || 0,
          j.duration_days || 0,
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
            `"Sub-task : ${(j.sub_task || j.order_job).replace(/"/g, '""')}"`,
            `"${(j.employees?.full_name || '').replace(/"/g, '""')}"`,
            j.views_count || 0,
            j.converted_kpi || 0,
            j.duration_days || 0,
            `"${(j.deadline || '—').replace(/"/g, '""')}"`,
          ]);
        });
      }
    });

    const csvContent = '﻿' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
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

  // Export / Print PDF (browser print — real PDF generation is out of scope, same as PayslipDetailModal)
  const handleDownloadPdf = () => {
    window.print();
  };

  // Sync KPI points directly to employee records & payroll (kpi_monthly upsert)
  const handleSyncKpiToProfiles = async () => {
    if (!companySettings || !profile?.companyId) {
      showToast('Đang tải cấu hình công ty, vui lòng thử lại sau ít giây.');
      return;
    }
    if (hasPendingKpi || hasPublishedKpi) {
      showToast('KPI tháng đang chờ duyệt hoặc đã phát hành nên không thể đồng bộ lại.');
      return;
    }

    await Promise.all(employeeList.map(async (emp) => {
      // Real employee_id FK match — no more fuzzy assigneeName string matching.
      const empJobs = currentMonthJobs.filter(j => j.employee_id === emp.id);

      const totalViews = empJobs.reduce((acc, curr) => acc + (curr.views_count || 0), 0);
      const totalKpiPoints = empJobs.reduce((acc, curr) => acc + (curr.converted_kpi || 0), 0);

      // Mỗi nhân viên có chỉ tiêu KPI/ngày riêng (Hồ sơ nhân viên), không
      // còn dùng chung 1 định mức công ty cho tất cả.
      const target = getEmployeeKpiTarget(emp);
      const completionPct = target ? Math.round((totalKpiPoints / target) * 100) : 0;

      // Commission is configured per employee. Legacy company settings remain
      // a fallback until the employee's current contract/addendum has a rate.
      const commissionRate = emp.performance_commission_rate || companySettings.kpi_bonus_per_point;
      const performanceCommissionAmount = Math.round(totalKpiPoints * commissionRate);
      // Guaranteed income is treated as a monthly floor for base salary plus
      // performance commission. The delta is stored separately for auditability.
      const existingMonthly = monthlyKpi.find(record => record.employee_id === emp.id);
      const qcViews = Number(existingMonthly?.qc_views || 0);
      const qcRate = Number(existingMonthly?.qc_rate_snapshot || emp.qc_commission_rate || 0);
      const qcCommissionAmount = Math.round(qcViews * qcRate);
      const guaranteedIncomeTopup = Math.max(
        0,
        Math.round((emp.guaranteed_income_amount || 0) - (emp.current_salary || 0) - performanceCommissionAmount - qcCommissionAmount),
      );

      // Real OT hours actually logged by this employee in the period — not a flat placeholder.
      const otHoursForEmp = allOtRecords
        .filter(ot => ot.employee_id === emp.id && isSameMonthYear(ot.date, selectedMonth, selectedYear))
        .reduce((sum, ot) => sum + (ot.hours || 0), 0);

      const otHourlyRate = Math.round((emp.current_salary || 0) / companySettings.standard_work_days / 8);

      await upsertKpiMonthly.mutateAsync({
        employee_id: emp.id,
        company_id: profile.companyId,
        month: selectedMonth,
        year: selectedYear,
        rendered_views_actual: totalViews,
        kpi_converted_views: totalKpiPoints,
        kpi_target: target,
        completion_percentage: completionPct,
        ot_hours: otHoursForEmp,
        ot_hourly_rate: otHourlyRate,
        commission_rate_snapshot: commissionRate,
        performance_commission_amount: performanceCommissionAmount,
        qc_views: qcViews,
        qc_rate_snapshot: qcRate,
        qc_commission_amount: qcCommissionAmount,
        guaranteed_income_topup: guaranteedIncomeTopup,
        bonus_amount: performanceCommissionAmount + qcCommissionAmount + guaranteedIncomeTopup,
        publish_status: 'draft',
        // No real "benefit" data source in this phase — left at 0 for admin to fill in
        // manually, rather than fabricating a plausible-looking number.
        benefit_amount: 0,
        notes: `Tính từ ${empJobs.length} bài/dự án; chỉ tiêu ${emp.kpi_target_per_day || 0} view/ngày × ${getEmployeeWorkDays(emp.id)} công (đã trừ ${approvedLeaveDaysByEmployee.get(emp.id) || 0} ngày phép đã duyệt) = ${target} view; commission ${commissionRate.toLocaleString('vi-VN')} VNĐ/view; bù đảm bảo thu nhập ${guaranteedIncomeTopup.toLocaleString('vi-VN')} VNĐ. QC commission được HR nhập khi có số liệu QC thực tế.`,
      });
    }));

    showToast(`Đã tạo bản nháp KPI tháng ${selectedMonth}/${selectedYear}. Kiểm tra số liệu trước khi gửi Admin duyệt.`);
  };

  const handleQcViewsUpdate = async (record: KpiMonthlyRow, rawViews: number) => {
    if (!['draft', 'rejected'].includes(record.publish_status)) return;
    const qcViews = Number.isFinite(rawViews) ? Math.max(0, rawViews) : 0;
    const qcCommissionAmount = Math.round(qcViews * Number(record.qc_rate_snapshot || 0));
    const employee = employeeList.find(item => item.id === record.employee_id);
    const guaranteedIncomeTopup = Math.max(
      0,
      Math.round(
        Number(employee?.guaranteed_income_amount || 0)
        - Number(employee?.current_salary || 0)
        - Number(record.performance_commission_amount || 0)
        - qcCommissionAmount,
      ),
    );

    try {
      await updateKpiMonthly.mutateAsync({
        id: record.id,
        updates: {
          qc_views: qcViews,
          qc_commission_amount: qcCommissionAmount,
          guaranteed_income_topup: guaranteedIncomeTopup,
          bonus_amount: Number(record.performance_commission_amount || 0) + qcCommissionAmount + guaranteedIncomeTopup,
        },
      });
      showToast(`Đã cập nhật QC commission cho ${record.employees?.full_name || 'nhân viên'}.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể cập nhật QC commission.');
    }
  };

  const handleSubmitKpiApproval = async () => {
    try {
      await submitKpiMonth.mutateAsync({ month: selectedMonth, year: selectedYear });
      showToast(`Đã gửi KPI tháng ${selectedMonth}/${selectedYear} cho Admin duyệt.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể gửi duyệt KPI.');
    }
  };

  const handleKpiDecision = async () => {
    if (!kpiDecision) return;
    try {
      if (kpiDecision === 'approve') {
        await approveKpiMonth.mutateAsync({ month: selectedMonth, year: selectedYear });
        showToast(`Đã duyệt và phát hành KPI tháng ${selectedMonth}/${selectedYear}.`);
      } else {
        await rejectKpiMonth.mutateAsync({ month: selectedMonth, year: selectedYear, reason: kpiRejectionReason });
        showToast(`Đã trả lại KPI tháng ${selectedMonth}/${selectedYear}.`);
      }
      setKpiDecision(null);
      setKpiRejectionReason('');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể xử lý KPI tháng.');
    }
  };

  // Calculate OT percentage & rate based on date or preset/custom input — driven by company_settings.
  const getEffectiveOtPercentage = (): number => {
    if (otPresetType === 'WEEKDAY') return companySettings?.ot_weekday_percent ?? 0;
    if (otPresetType === 'WEEKEND') return companySettings?.ot_weekend_percent ?? 0;
    if (otPresetType === 'HOLIDAY') return 300; // no company_settings column for holiday/Tết OT rate yet
    if (otPresetType === 'CUSTOM') return customOtPercentage;

    // AUTO calculation based on date
    if (!otDate) return companySettings?.ot_weekday_percent ?? 0;
    const d = new Date(otDate);
    const day = d.getDay();
    if (day === 0 || day === 6) return companySettings?.ot_weekend_percent ?? 0; // Weekend T7, CN
    return companySettings?.ot_weekday_percent ?? 0; // Regular weekday
  };

  // Handle Admin direct OT creation
  const handleAddOtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmp = employeeList.find(emp => emp.id === otEmpId);
    if (!targetEmp) {
      alert('Vui lòng chọn nhân viên');
      return;
    }
    if (!companySettings || !profile?.companyId) {
      alert('Đang tải cấu hình công ty, vui lòng thử lại sau ít giây.');
      return;
    }

    const hourly = Math.round((targetEmp.current_salary || 0) / companySettings.standard_work_days / 8);
    const effPct = getEffectiveOtPercentage();
    const calcAmount = Math.round(otHours * hourly * (effPct / 100));

    const payLabel = `Thanh toán ${effPct}% (${otPresetType === 'AUTO' ? (effPct === companySettings.ot_weekend_percent ? 'Cuối tuần' : 'Ngày thường') : 'Admin cấu hình'})`;

    await createOtRecord.mutateAsync({
      company_id: profile.companyId,
      employee_id: targetEmp.id,
      date: otDate,
      hours: otHours,
      views_render_count: otViewsRender,
      reason: otReason,
      pay_type: payLabel,
      ot_percentage: effPct,
      status: otStatus,
      amount: calcAmount,
    });

    showToast('Đã đăng ký giờ làm OT tăng ca thành công!');
    setOtReason('');
    setIsNewOtModalOpen(false);
  };

  // Admin-only status update (approve/reject/etc — enforced by RLS on ot_records)
  const handleOtStatusChange = async (id: string, status: string) => {
    await updateOtRecord.mutateAsync({
      id,
      updates: { status, approver_id: profile?.id },
    });
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
              setJobCategory('new_render');
              setJobEmployeeId(employeeList[0]?.id || '');
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
              {yearOptions.map((year) => (
                <option key={year} value={year}>Năm {year}</option>
              ))}
            </select>
          </div>

          <span className="text-xs text-slate-500">
            Tổng số bài/dự án đã nhập trong tháng: <b>{currentMonthJobs.length}</b>
          </span>
        </div>
      </div>

      {/* WORKING DAYS CALCULATION STATS (5.5 DAYS/WEEK SCHEDULE, TRỪ LỄ/TẾT) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-primary-950 text-white p-5 rounded-2xl border border-slate-700 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-700/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success-500/20 text-success-400 flex items-center justify-center border border-success-400/30">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-white">Quy chuẩn Ngày Công Tháng {selectedMonth}/{selectedYear}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-success-500/20 text-success-300 border border-success-400/30">
                  Lịch 5.5 ngày/tuần
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Chu kỳ từ ngày <strong>01/{selectedMonth < 10 ? '0' + selectedMonth : selectedMonth}</strong> đến <strong>{monthWorkInfo.lastDayOfMonth}/{selectedMonth < 10 ? '0' + selectedMonth : selectedMonth}</strong> ({monthWorkInfo.totalCalendarDays} ngày dương lịch) — ngày phép đã duyệt được trừ riêng theo từng nhân viên ở bảng bên dưới.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-4 text-xs">
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

          <div className="bg-rose-950/70 p-3 rounded-xl border border-rose-700/50">
            <span className="text-[11px] text-rose-300 block">Nghỉ Lễ/Tết</span>
            <p className="text-base font-bold text-rose-300 font-mono mt-0.5">
              -{monthWorkInfo.holidaysDeducted} <span className="text-xs font-normal text-rose-400">công</span>
            </p>
            <span className="text-[10px] text-rose-400">{holidayDatesInMonth.length} ngày lễ trong tháng</span>
          </div>

          <div className="bg-success-950/80 p-3 rounded-xl border border-success-600/40">
            <span className="text-[11px] text-success-300 font-bold block">Tổng Ngày Công Chuẩn</span>
            <p className="text-lg font-black text-success-300 font-mono mt-0.5">
              {monthWorkInfo.standardWorkDays} <span className="text-xs font-semibold text-success-400">công</span>
            </p>
            <span className="text-[10px] text-success-400 font-medium">Quy chuẩn tháng {selectedMonth} (đã trừ lễ/Tết, chưa trừ phép cá nhân)</span>
          </div>
        </div>
      </div>

      {/* KPI TIÊU CHUẨN THÁNG THEO TỪNG NHÂN VIÊN */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-success-100 text-success-800 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                KPI tiêu chuẩn tháng {selectedMonth < 10 ? '0' + selectedMonth : selectedMonth} cho từng nhân viên
              </h2>
              <p className="text-xs text-slate-500">
                Chỉ tiêu KPI tháng = Chỉ tiêu x view/ngày × ngày công cá nhân (quy chuẩn tháng trừ ngày phép đã duyệt). Thay đổi chỉ tiêu & level vị trí được quản lý tập trung trong Hồ sơ nhân viên / Hợp đồng.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSyncKpiToProfiles}
              disabled={upsertKpiMonthly.isPending || hasPendingKpi || hasPublishedKpi}
              className="px-4 py-2 bg-success-600 hover:bg-success-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-60 shadow-md shadow-success-600/20"
            >
              <Calculator className="w-4 h-4" />
              <span>Tạo bản nháp KPI tháng</span>
            </button>
            {hasEditableKpi && (
              <button onClick={() => void handleSubmitKpiApproval()} className="px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
                <Send className="w-4 h-4" /> Gửi Admin duyệt
              </button>
            )}
            {isAdmin && hasPendingKpi && (
              <>
                <button onClick={() => setKpiDecision('reject')} className="px-4 py-2 border border-rose-300 bg-white text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4" /> Trả lại
                </button>
                <button onClick={() => setKpiDecision('approve')} className="px-4 py-2 bg-success-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Duyệt & phát hành
                </button>
              </>
            )}
            {hasPublishedKpi && <span className="rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-800">Đã phát hành</span>}
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-slate-100 text-slate-800 uppercase text-[11px] font-bold border-b border-slate-300">
              <tr>
                <th className="py-3 px-4 min-w-[220px] border-r border-slate-200">Tên & Mã nhân viên</th>
                <th className="py-3 px-4 min-w-[180px] border-r border-slate-200">Level vị trí</th>
                <th className="py-3 px-3 text-center border-r border-slate-200">Chỉ tiêu (x view / ngày)</th>
                <th className="py-3 px-3 text-center border-r border-slate-200">Ngày công tháng</th>
                <th className="py-3 px-3 text-center">Số lượng KPI tiêu chuẩn tháng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {employeeList.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-slate-400">Chưa có nhân viên nào.</td></tr>
              ) : employeeList.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 border-r border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <RowAvatar path={emp.avatar_url} />
                      <div>
                        <p className="font-bold text-slate-900">{emp.full_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{emp.employee_code} • {emp.department}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 border-r border-slate-200">
                    {emp.kpi_level
                      ? <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-primary-50 text-primary-700 border border-primary-200">{emp.kpi_level}</span>
                      : <span className="text-slate-400 italic">Chưa thiết lập</span>}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-slate-800 border-r border-slate-200">
                    {emp.kpi_target_per_day != null ? `${emp.kpi_target_per_day} view/ngày` : '—'}
                  </td>
                  <td className="py-3 px-3 text-center text-slate-600 border-r border-slate-200">
                    <span>{getEmployeeWorkDays(emp.id)} công</span>
                    {(approvedLeaveDaysByEmployee.get(emp.id) || 0) > 0 && (
                      <span className="block text-[10px] text-amber-600">− {approvedLeaveDaysByEmployee.get(emp.id)} phép</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-base font-black text-success-700 font-mono">{getEmployeeKpiTarget(emp)}</span>
                    <span className="text-[10px] text-slate-400 block">{emp.kpi_target_per_day || 0} view/ngày × {getEmployeeWorkDays(emp.id)} công</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {monthlyKpi.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <h2 className="font-bold text-slate-900 text-base">Commission KPI & QC tháng {selectedMonth}/{selectedYear}</h2>
            <p className="mt-1 text-xs text-slate-500">
              QC commission là tùy chọn. Chỉ nhập QC views cho Team Leader có mức QC/view trong hồ sơ hoặc hợp đồng; để trống tương đương 0.
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-[11px] uppercase text-slate-700">
                <tr>
                  <th className="p-3">Nhân viên</th>
                  <th className="p-3 text-right">Commission hiệu suất</th>
                  <th className="p-3 text-center">QC views (tùy chọn)</th>
                  <th className="p-3 text-right">Đơn giá QC/view</th>
                  <th className="p-3 text-right">QC commission</th>
                  <th className="p-3 text-right">Bù đảm bảo</th>
                  <th className="p-3 text-right">Tổng thưởng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyKpi.map(record => {
                  const canEditQc = ['draft', 'rejected'].includes(record.publish_status) && record.qc_rate_snapshot > 0;
                  return (
                    <tr key={record.id}>
                      <td className="p-3 font-bold text-slate-900">
                        {record.employees?.full_name}
                        <span className="block font-mono text-[10px] font-normal text-slate-400">{record.employees?.employee_code}</span>
                      </td>
                      <td className="p-3 text-right font-mono">{formatVND(record.performance_commission_amount)}</td>
                      <td className="p-3 text-center">
                        {record.qc_rate_snapshot > 0 ? (
                          <input
                            key={`${record.id}-${record.qc_views}`}
                            type="number"
                            min="0"
                            step="0.5"
                            defaultValue={record.qc_views}
                            disabled={!canEditQc || updateKpiMonthly.isPending}
                            onBlur={event => {
                              const value = Number(event.target.value || 0);
                              if (value !== record.qc_views) void handleQcViewsUpdate(record, value);
                            }}
                            className="w-24 rounded-lg border border-slate-300 p-1.5 text-right font-mono disabled:bg-slate-100"
                          />
                        ) : <span className="text-slate-400">Không áp dụng</span>}
                      </td>
                      <td className="p-3 text-right font-mono">{record.qc_rate_snapshot > 0 ? formatVND(record.qc_rate_snapshot) : '—'}</td>
                      <td className="p-3 text-right font-mono text-primary-700">{formatVND(record.qc_commission_amount)}</td>
                      <td className="p-3 text-right font-mono">{formatVND(record.guaranteed_income_topup)}</td>
                      <td className="p-3 text-right font-mono font-bold text-success-700">{formatVND(record.bonus_amount || 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedEmployeeIdForAdmin || employeeList[0]?.id || ''}
              onChange={e => setSelectedEmployeeIdForAdmin(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              title="Nhân viên đang chọn để Liên kết Bảng KPI"
            >
              {employeeList.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_code})</option>
              ))}
            </select>
            <button
              onClick={() => {
                if (!selectedEmployeeIdForAdmin && employeeList[0]) {
                  setSelectedEmployeeIdForAdmin(employeeList[0].id);
                }
                setIsImportKpiModalOpen(true);
              }}
              className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer"
              title="Liên kết / Import bảng KPI cho nhân viên đã chọn"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Liên kết Bảng KPI</span>
            </button>

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
                setJobCategory('new_render');
                setJobEmployeeId(employeeList[0]?.id || '');
                setIsNewJobModalOpen(true);
              }}
              className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm bài mới</span>
            </button>
          </div>
        </div>

        {/* Category stat cards: Tất cả / Render Dự Án / Chỉnh Sửa (Re Process) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl border-2 border-primary-300 bg-primary-50/60">
            <span className="text-[11px] font-bold text-primary-700 uppercase flex items-center justify-between">
              Tất cả công việc
              <span className="px-2 py-0.5 rounded bg-primary-100 text-primary-800">{currentMonthJobs.length} bài</span>
            </span>
            <p className="text-2xl font-black text-slate-900 mt-1">{currentMonthJobs.reduce((s, j) => s + (j.views_count || 0), 0)} <span className="text-xs font-semibold text-slate-500">views</span></p>
            <span className="text-xs text-success-700 font-bold">{currentMonthJobs.reduce((s, j) => s + (j.converted_kpi || 0), 0)} KPI quy đổi</span>
          </div>
          <div className="p-4 rounded-xl border border-success-200 bg-success-50/60">
            <span className="text-[11px] font-bold text-success-700 uppercase flex items-center justify-between">
              View Render Dự Án
              <span className="px-2 py-0.5 rounded bg-success-100 text-success-800">{currentMonthJobs.filter(j => j.category !== 'reprocess').length} bài</span>
            </span>
            <p className="text-2xl font-black text-slate-900 mt-1">{currentMonthJobs.filter(j => j.category !== 'reprocess').reduce((s, j) => s + (j.views_count || 0), 0)} <span className="text-xs font-semibold text-slate-500">views</span></p>
            <span className="text-xs text-success-700 font-bold">{currentMonthJobs.filter(j => j.category !== 'reprocess').reduce((s, j) => s + (j.converted_kpi || 0), 0)} KPI quy đổi</span>
          </div>
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60">
            <span className="text-[11px] font-bold text-amber-700 uppercase flex items-center justify-between">
              View Chỉnh Sửa (Re Process)
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800">{currentMonthJobs.filter(j => j.category === 'reprocess').length} bài</span>
            </span>
            <p className="text-2xl font-black text-slate-900 mt-1">{currentMonthJobs.filter(j => j.category === 'reprocess').reduce((s, j) => s + (j.views_count || 0), 0)} <span className="text-xs font-semibold text-slate-500">views</span></p>
            <span className="text-xs text-amber-700 font-bold">{currentMonthJobs.filter(j => j.category === 'reprocess').reduce((s, j) => s + (j.converted_kpi || 0), 0)} KPI quy đổi</span>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-300 rounded-xl">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-slate-100 text-slate-800 uppercase text-[11px] font-bold border-b border-slate-300">
              <tr>
                <th className="py-3 px-3 text-center w-12 border-r border-slate-300">STT</th>
                <th className="py-3 px-4 min-w-[320px] border-r border-slate-300">Order / Job (Tên bài / Dự án)</th>
                <th className="py-3 px-3 text-center border-r border-slate-300">Phân loại</th>
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
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Chưa có bài/dự án nào trong Tháng {selectedMonth}/{selectedYear}. Bấm "Thêm bài mới" để nhập liệu.
                  </td>
                </tr>
              ) : (
                groupedJobs.map((group, groupIdx) => {
                  const hasSubTasks = group.items.some(i => i.sub_task && i.sub_task.trim().length > 0);

                  // CASE 1: Single job without sub-tasks
                  if (!hasSubTasks && group.items.length === 1) {
                    const job = group.items[0];
                    return (
                      <tr key={job.id} className="hover:bg-slate-50 border-b border-slate-200">
                        <td className="py-3 px-3 text-center font-bold text-slate-900 border-r border-slate-300">
                          {groupIdx + 1}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 leading-snug border-r border-slate-300">
                          {job.order_job}
                        </td>
                        <td className="py-3 px-3 text-center border-r border-slate-300">
                          {categoryBadge(job.category)}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800 border-r border-slate-300">
                          {job.employees?.full_name}
                        </td>
                        <td className="py-3 px-3 text-center font-black text-slate-800 text-sm border-r border-slate-300">
                          {job.views_count ?? 0}
                        </td>
                        <td className="py-3 px-3 text-center font-black text-success-600 text-sm bg-success-50/50 border-r border-slate-300">
                          {job.converted_kpi ?? 0}
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-slate-600 border-r border-slate-300">
                          {job.duration_days ? `${job.duration_days} ngày` : '—'}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-rose-700 bg-rose-50/40 border-r border-slate-300">
                          {job.deadline || '—'}
                          {delayLabel(job) && <span className={`block text-[10px] ${delayLabel(job)?.startsWith('Trễ') ? 'text-rose-700' : 'text-success-700'}`}>{delayLabel(job)}</span>}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => startAddSubTask(job.order_job)}
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
                              onClick={() => handleDeleteJob(job.id)}
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
                        <td className="py-3 px-3 text-center border-r border-slate-300">
                          {new Set(group.items.map(i => i.category)).size === 1 ? categoryBadge(group.items[0].category) : <span className="text-[10px] text-slate-400 italic">Nhiều loại</span>}
                        </td>
                        <td className="py-3 px-4 text-slate-400 italic text-xs border-r border-slate-300">—</td>
                        <td className="py-3 px-3 text-center font-bold text-slate-500 border-r border-slate-300">
                          {group.items.reduce((sum, item) => sum + (item.views_count || 0), 0)}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-success-700 border-r border-slate-300">
                          {group.items.reduce((sum, item) => sum + (item.converted_kpi || 0), 0)}
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
                      {group.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-200">
                          {/* Blank STT cell */}
                          <td className="py-2.5 px-3 border-r border-slate-300 bg-slate-50/40"></td>

                          {/* Sub-task rendered directly under Order in light gray block */}
                          <td className="py-2 px-4 border-r border-slate-300">
                            <div className="bg-slate-100/90 text-slate-800 px-3 py-1.5 rounded-md border-l-4 border-primary-500 font-semibold text-xs flex items-center justify-between">
                              <span>Sub-task : {item.sub_task || item.order_job}</span>
                            </div>
                          </td>

                          <td className="py-2 px-3 text-center border-r border-slate-300">
                            {categoryBadge(item.category)}
                          </td>

                          <td className="py-2 px-4 font-bold text-slate-800 border-r border-slate-300">
                            {item.employees?.full_name}
                          </td>

                          <td className="py-2 px-3 text-center font-bold text-slate-800 border-r border-slate-300">
                            {item.views_count ?? 0}
                          </td>

                          <td className="py-2 px-3 text-center font-bold text-success-700 border-r border-slate-300">
                            {item.converted_kpi ?? 0}
                          </td>

                          <td className="py-2 px-3 text-center text-slate-600 border-r border-slate-300">
                            {item.duration_days ? `${item.duration_days} ngày` : '—'}
                          </td>

                          <td className="py-2 px-3 text-center font-bold text-rose-700 border-r border-slate-300">
                            {item.deadline || '—'}
                            {delayLabel(item) && <span className={`block text-[10px] ${delayLabel(item)?.startsWith('Trễ') ? 'text-rose-700' : 'text-success-700'}`}>{delayLabel(item)}</span>}
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
                                onClick={() => handleDeleteJob(item.id)}
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
                Tổng hợp số bài, tổng views, tách biệt View Render Dự Án vs View Chỉnh Sửa và % hoàn thành KPI thực tế
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {employeeList.map(emp => {
            // Real employee_id FK match — no more fuzzy assigneeName string matching.
            const empJobs = currentMonthJobs.filter(j => j.employee_id === emp.id);
            const renderJobs = empJobs.filter(j => j.category !== 'reprocess');
            const reprocessJobs = empJobs.filter(j => j.category === 'reprocess');

            const totalViews = empJobs.reduce((a, c) => a + (c.views_count || 0), 0);
            const totalKpi = empJobs.reduce((a, c) => a + (c.converted_kpi || 0), 0);
            const target = getEmployeeKpiTarget(emp);
            const pct = target ? Math.min(150, Math.round((totalKpi / target) * 100)) : 0;
            const estimatedBonus = companySettings
              ? Math.max(companySettings.kpi_bonus_min, Math.round(totalKpi * companySettings.kpi_bonus_per_point))
              : 0;

            const sumViews = (jobs: KpiJobRow[]) => jobs.reduce((a, c) => a + (c.views_count || 0), 0);
            const sumKpi = (jobs: KpiJobRow[]) => jobs.reduce((a, c) => a + (c.converted_kpi || 0), 0);

            return (
              <div key={emp.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center space-x-3">
                  <RowAvatar path={emp.avatar_url} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-xs truncate">{emp.full_name}</p>
                    {emp.kpi_level && <p className="text-[10px] text-primary-600 font-semibold truncate">{emp.kpi_level}</p>}
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
                  <span className="text-[10px] text-slate-400">
                    Chỉ tiêu: {emp.kpi_target_per_day || 0} × {getEmployeeWorkDays(emp.id)} công
                    {(approvedLeaveDaysByEmployee.get(emp.id) || 0) > 0 && ` (đã trừ ${approvedLeaveDaysByEmployee.get(emp.id)} phép)`}
                  </span>
                </div>

                {/* Category breakdown */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="px-2 py-1.5 rounded-lg bg-success-50 border border-success-200 text-[10px]">
                    <span className="block text-success-700 font-bold">Render Dự Án</span>
                    <span className="text-slate-700">{sumViews(renderJobs)}v • {sumKpi(renderJobs)}đ</span>
                  </div>
                  <div className="px-2 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[10px]">
                    <span className="block text-amber-700 font-bold">Chỉnh Sửa</span>
                    <span className="text-slate-700">{sumViews(reprocessJobs)}v • {sumKpi(reprocessJobs)}đ</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                  <span>Tổng: <b>{totalViews} views</b></span>
                  <span className="font-bold text-success-700">{formatVND(estimatedBonus)}</span>
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
                    Chưa có yêu cầu OT nào trong hệ thống.
                  </td>
                </tr>
              ) : (
                allOtRecords.map(ot => (
                  <tr key={ot.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center space-x-2.5">
                        <RowAvatar path={ot.employees?.avatar_url} />
                        <div>
                          <span>{ot.employees?.full_name}</span>
                          <span className="block text-[10px] text-slate-400 font-mono">{ot.employees?.employee_code}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium">{ot.date}</td>
                    <td className="py-3 px-4 font-black text-primary-700">
                      {ot.hours} giờ {ot.views_render_count ? `(${ot.views_render_count} views)` : ''}
                    </td>
                    <td className="py-3 px-4 max-w-[200px] truncate">{ot.reason}</td>
                    <td className="py-3 px-4 font-semibold text-primary-700">
                      {ot.pay_type}
                    </td>
                    <td className="py-3 px-4 font-bold text-success-600">{formatVND(ot.amount || 0)}</td>
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
                        {isAdmin ? (
                          <select
                            value={ot.status}
                            onChange={e => handleOtStatusChange(ot.id, e.target.value)}
                            className="p-1 bg-slate-50 border border-slate-200 rounded text-[11px] font-semibold text-slate-700 cursor-pointer"
                          >
                            <option value="Chờ duyệt">Chờ duyệt</option>
                            <option value="Đã duyệt">Đã duyệt</option>
                            <option value="Từ chối">Từ chối</option>
                          </select>
                        ) : <span className="text-[11px] font-semibold text-slate-500">Admin duyệt trạng thái</span>}
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

              <div className="grid grid-cols-3 gap-3">
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
                    value={jobEmployeeId}
                    onChange={e => setJobEmployeeId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                    required
                  >
                    <option value="">-- Chọn nhân viên --</option>
                    {employeeList.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phân loại *:</label>
                  <select
                    value={jobCategory}
                    onChange={e => setJobCategory(e.target.value as 'new_render' | 'reprocess')}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    {JOB_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
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
                        type="datetime-local"
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

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày hoàn thành:</label>
                  <input
                    type="datetime-local"
                    value={completedDateInput}
                    onChange={e => setCompletedDateInput(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
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
                  required
                >
                  <option value="">-- Chọn nhân viên --</option>
                  {employeeList.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_code}) - {emp.job_title}</option>
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
                  onChange={e => setOtPresetType(e.target.value as 'AUTO' | 'WEEKDAY' | 'WEEKEND' | 'HOLIDAY' | 'CUSTOM')}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-primary-800"
                >
                  <option value="AUTO">Tự động (Ngày thường {companySettings?.ot_weekday_percent ?? '—'}%, T7/CN {companySettings?.ot_weekend_percent ?? '—'}%, Lễ 300%)</option>
                  <option value="WEEKDAY">Ngày thường - Thanh toán {companySettings?.ot_weekday_percent ?? '—'}%</option>
                  <option value="WEEKEND">Cuối tuần (T7, CN) - Thanh toán {companySettings?.ot_weekend_percent ?? '—'}%</option>
                  <option value="HOLIDAY">Lễ Tết - Thanh toán 300%</option>
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
                  onChange={e => setOtStatus(e.target.value as 'Đã hoàn thành' | 'Đang thực hiện' | 'Upcoming')}
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
                const targetEmp = employeeList.find(emp => emp.id === otEmpId);
                const hourly = targetEmp && companySettings
                  ? Math.round((targetEmp.current_salary || 0) / companySettings.standard_work_days / 8)
                  : 0;
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

      <ConfirmationDialog
        open={kpiDecision !== null}
        onOpenChange={(open) => {
          if (!open) {
            setKpiDecision(null);
            setKpiRejectionReason('');
          }
        }}
        title={kpiDecision === 'approve' ? 'Duyệt và phát hành KPI tháng?' : 'Trả lại KPI tháng cho HR/Kế toán?'}
        description={kpiDecision === 'approve'
          ? `KPI tháng ${selectedMonth}/${selectedYear} sẽ hiển thị cho từng nhân viên.`
          : `KPI tháng ${selectedMonth}/${selectedYear} sẽ quay về trạng thái có thể chỉnh sửa.`}
        confirmLabel={kpiDecision === 'approve' ? 'Duyệt & phát hành' : 'Trả lại'}
        onConfirm={() => void handleKpiDecision()}
        isPending={approveKpiMonth.isPending || rejectKpiMonth.isPending}
        isConfirmDisabled={kpiDecision === 'reject' && kpiRejectionReason.trim().length < 3}
        variant={kpiDecision === 'reject' ? 'danger' : 'primary'}
      >
        {kpiDecision === 'reject' && (
          <label className="block text-sm font-semibold text-slate-700">Lý do trả lại
            <textarea
              rows={3}
              value={kpiRejectionReason}
              onChange={(event) => setKpiRejectionReason(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm font-normal"
            />
          </label>
        )}
      </ConfirmationDialog>
    </div>
  );
};
