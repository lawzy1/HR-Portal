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
  Users,
} from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { useI18n } from '../../context/I18nContext';
import { useMoneyVisibility } from '../../context/MoneyVisibilityContext';
import { getUserFacingError } from '../../lib/userFacingError';
import { useAuth } from '../../context/AuthContext';
import { useEmployees, useUpdateEmployee } from '../../hooks/useEmployees';
import { useAllProfiles } from '../../hooks/useProfiles';
import { useSignedImageUrl, AVATAR_TRANSFORM } from '../../hooks/useFileUpload';
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
  useCompanyWorkdayOverride,
  useUpsertCompanyWorkdayOverride,
} from '../../hooks/useKpi';
import { useAllOtRecords, useCreateOtRecord, useDeleteOtRecord, useUpdateOtRecord } from '../../hooks/useOt';
import { useAllLeaveRequests, useCompanyHolidays } from '../../hooks/useLeave';
import { getApprovedLeaveDaysInMonth, getMonthWorkDays } from '../../utils/workDays';
import { formatDate } from '../../utils/formatters';
import { ConfirmationDialog } from '../ConfirmationDialog';
import { SearchableSelect } from '../ui/SearchableSelect';
import { ModalPanel } from '../ui/ModalPanel';
import { MonthYearFilter } from '../ui/MonthYearFilter';

const JOB_CATEGORIES: { value: 'new_render' | 'reprocess'; label: string }[] = [
  { value: 'new_render', label: 'New Render' },
  { value: 'reprocess', label: 'Re Process (Chỉnh sửa)' },
];

const categoryBadge = (category: string) =>
  category === 'reprocess'
    ? <span className="inline-flex whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">Re Process</span>
    : <span className="inline-flex whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-bold bg-success-100 text-success-800 border border-success-300">New Render</span>;

// employee_id is a required FK on kpi_job_items now — job assignment is a real
// employee picker, no more fuzzy assigneeName string matching against full_name.
type KpiJobRow = NonNullable<ReturnType<typeof useAllKpiJobItems>['data']>[number];
type OtRecordRow = NonNullable<ReturnType<typeof useAllOtRecords>['data']>[number];
type DbEmployeeRow = NonNullable<ReturnType<typeof useEmployees>['data']>[number];
type KpiMonthlyRow = NonNullable<ReturnType<typeof useAllKpiMonthly>['data']>[number];
type OtStatus = 'Chờ duyệt' | 'Đã duyệt' | 'Từ chối' | 'Đã hoàn thành' | 'Đang thực hiện' | 'Upcoming';

const OT_STATUS_OPTIONS: { value: OtStatus; label: string }[] = [
  { value: 'Chờ duyệt', label: 'Chờ duyệt' },
  { value: 'Đã duyệt', label: 'Đã duyệt' },
  { value: 'Từ chối', label: 'Từ chối' },
  { value: 'Đã hoàn thành', label: 'Đã hoàn thành' },
  { value: 'Đang thực hiện', label: 'Đang thực hiện' },
  { value: 'Upcoming', label: 'Upcoming' },
];

interface JobGroup {
  orderJob: string;
  items: KpiJobRow[];
}

const RowAvatar: React.FC<{ path: string | null | undefined }> = ({ path }) => {
  const { data: url } = useSignedImageUrl(path, AVATAR_TRANSFORM);
  return url ? (
    <img src={url} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" loading="lazy" width={40} height={40} />
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
  const { formatMoney } = useMoneyVisibility();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { t, value } = useI18n();

  const { data: employees } = useEmployees();
  const { data: holidays } = useCompanyHolidays();
  const { data: allLeaveRequests } = useAllLeaveRequests();
  const { data: allProfiles } = useAllProfiles();
  const updateEmployee = useUpdateEmployee();
  const employeeList = useMemo(() => employees || [], [employees]);
  const backofficeEmployeeIds = useMemo(
    () => new Set((allProfiles || []).filter(p => p.role === 'admin' || p.role === 'hr').map(p => p.employee_id)),
    [allProfiles]
  );
  const kpiEligibleEmployees = useMemo(() => employeeList.filter(e => e.include_in_kpi), [employeeList]);

  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

  const holidayDatesInMonth = useMemo(
    () => (holidays || []).filter((h) => h.date.startsWith(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`)).map((h) => h.date),
    [holidays, selectedMonth, selectedYear]
  );

  // Dynamic Standard Working Days calculation (1st to 30/31st of month, 5.5
  // days/week, minus any công ty holiday) — works for any month, incl. future ones.
  const monthWorkInfo = useMemo(() => {
    return getMonthWorkDays(selectedMonth, selectedYear, holidayDatesInMonth);
  }, [selectedMonth, selectedYear, holidayDatesInMonth]);
  const { data: workdayOverride } = useCompanyWorkdayOverride(selectedMonth, selectedYear);
  const effectiveStandardWorkDays = workdayOverride?.standard_work_days ?? monthWorkInfo.standardWorkDays;

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
    Math.max(0, effectiveStandardWorkDays - (approvedLeaveDaysByEmployee.get(employeeId) || 0)).toFixed(1),
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
  const upsertWorkdayOverride = useUpsertCompanyWorkdayOverride();
  const createOtRecord = useCreateOtRecord();
  const updateOtRecord = useUpdateOtRecord();
  const deleteOtRecord = useDeleteOtRecord();

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
  const [otStatus, setOtStatus] = useState<OtStatus>('Đã hoàn thành');
  const [editingOt, setEditingOt] = useState<OtRecordRow | null>(null);
  const [deletingOt, setDeletingOt] = useState<OtRecordRow | null>(null);
  const [kpiDecision, setKpiDecision] = useState<'approve' | 'reject' | null>(null);
  const [kpiRejectionReason, setKpiRejectionReason] = useState('');
  const [isWorkdayEditorOpen, setIsWorkdayEditorOpen] = useState(false);
  const [editedStandardWorkDays, setEditedStandardWorkDays] = useState<number>(effectiveStandardWorkDays);

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
    if (minutes <= 0) return null;
    const hours = Math.floor(minutes / 60);
    return { text: t('adminKpi.lateBy', { hours, minutes: minutes % 60 }), late: true };
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

    groups.sort((a, b) => a.orderJob.localeCompare(b.orderJob, undefined, { numeric: true }));
    return groups;
  }, [currentMonthJobs]);

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const toggleGroupCollapsed = (orderJob: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(orderJob)) next.delete(orderJob); else next.add(orderJob);
      return next;
    });
  };

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

  const openWorkdayEditor = () => {
    if (hasPendingKpi || hasPublishedKpi) {
      showToast('KPI tháng đang chờ duyệt hoặc đã phát hành nên không thể đổi ngày công chuẩn.');
      return;
    }
    setEditedStandardWorkDays(effectiveStandardWorkDays);
    setIsWorkdayEditorOpen(true);
  };

  const handleResetWorkdayToCalendar = async () => {
    if (!profile?.companyId || hasPendingKpi || hasPublishedKpi) return;
    try {
      await upsertWorkdayOverride.mutateAsync({
        company_id: profile.companyId,
        month: selectedMonth,
        year: selectedYear,
        standard_work_days: monthWorkInfo.standardWorkDays,
      });
      showToast('Đã đặt lại ngày công chuẩn theo lịch (đã trừ lễ/Tết hiện tại). Hãy tạo lại bản nháp KPI để cập nhật chỉ tiêu và thưởng.');
    } catch (error) {
      showToast(await getUserFacingError(error, 'Không thể đặt lại ngày công chuẩn. Vui lòng thử lại.'));
    }
  };

  const handleSaveWorkdayOverride = async () => {
    if (!profile?.companyId) return;
    if (!Number.isFinite(editedStandardWorkDays) || editedStandardWorkDays <= 0 || editedStandardWorkDays > 31) {
      showToast('Ngày công chuẩn phải lớn hơn 0 và không vượt quá 31 công.');
      return;
    }
    try {
      await upsertWorkdayOverride.mutateAsync({
        company_id: profile.companyId,
        month: selectedMonth,
        year: selectedYear,
        standard_work_days: Number(editedStandardWorkDays.toFixed(1)),
      });
      setIsWorkdayEditorOpen(false);
      showToast('Đã lưu ngày công chuẩn của kỳ KPI. Hãy tạo lại bản nháp KPI để cập nhật chỉ tiêu và thưởng.');
    } catch (error) {
      showToast(await getUserFacingError(error, 'Không thể lưu ngày công chuẩn của kỳ KPI. Vui lòng thử lại.'));
    }
  };

  // Sync KPI points directly to employee records & payroll (kpi_monthly upsert)
  const handleToggleIncludeInKpi = async (emp: DbEmployeeRow) => {
    try {
      await updateEmployee.mutateAsync({ id: emp.id, updates: { include_in_kpi: !emp.include_in_kpi } });
    } catch (error) {
      showToast(await getUserFacingError(error, 'Không thể cập nhật danh sách nhận KPI. Vui lòng thử lại.'));
    }
  };

  const handleExcludeBackoffice = async () => {
    const toExclude = employeeList.filter(e => backofficeEmployeeIds.has(e.id) && e.include_in_kpi);
    if (!toExclude.length) {
      showToast('Không có tài khoản Admin/HR nào đang nằm trong danh sách nhận KPI.');
      return;
    }
    try {
      await Promise.all(toExclude.map(e => updateEmployee.mutateAsync({ id: e.id, updates: { include_in_kpi: false } })));
      showToast(`Đã loại ${toExclude.length} tài khoản Admin/HR khỏi bản nháp KPI tháng.`);
    } catch (error) {
      showToast(await getUserFacingError(error, 'Không thể cập nhật danh sách nhận KPI. Vui lòng thử lại.'));
    }
  };

  const handleSyncKpiToProfiles = async () => {
    if (!profile?.companyId) {
      showToast('Đang tải cấu hình công ty, vui lòng thử lại sau ít giây.');
      return;
    }
    if (hasPendingKpi || hasPublishedKpi) {
      showToast('KPI tháng đang chờ duyệt hoặc đã phát hành nên không thể đồng bộ lại.');
      return;
    }

    await Promise.all(kpiEligibleEmployees.map(async (emp) => {
      // Real employee_id FK match — no more fuzzy assigneeName string matching.
      const empJobs = currentMonthJobs.filter(j => j.employee_id === emp.id);

      const totalViews = empJobs.reduce((acc, curr) => acc + (curr.views_count || 0), 0);
      const totalKpiPoints = empJobs.reduce((acc, curr) => acc + (curr.converted_kpi || 0), 0);

      // Mỗi nhân viên có chỉ tiêu KPI/ngày riêng (Hồ sơ nhân viên), không
      // còn dùng chung 1 định mức công ty cho tất cả.
      const target = getEmployeeKpiTarget(emp);
      const completionPct = target ? Math.round((totalKpiPoints / target) * 100) : 0;

      // Money fields (commission, QC, guaranteed-income topup) are no longer
      // auto-calculated from rates/formulas — HR types them in directly on
      // the row below. Re-running the draft sync must not wipe out whatever
      // they already entered, so carry the existing record's values forward.
      const existingMonthly = monthlyKpi.find(record => record.employee_id === emp.id);

      // Real OT hours actually logged by this employee in the period — not a flat placeholder.
      const otHoursForEmp = allOtRecords
        .filter(ot => ot.employee_id === emp.id && isSameMonthYear(ot.date, selectedMonth, selectedYear))
        .reduce((sum, ot) => sum + (ot.hours || 0), 0);

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
        commission_rate_snapshot: existingMonthly?.commission_rate_snapshot || 0,
        performance_commission_amount: existingMonthly?.performance_commission_amount || 0,
        qc_views: existingMonthly?.qc_views || 0,
        qc_rate_snapshot: existingMonthly?.qc_rate_snapshot || 0,
        qc_commission_amount: existingMonthly?.qc_commission_amount || 0,
        guaranteed_income_topup: existingMonthly?.guaranteed_income_topup || 0,
        bonus_amount: existingMonthly?.bonus_amount || 0,
        publish_status: 'draft',
        benefit_amount: existingMonthly?.benefit_amount || 0,
        notes: `Ghi nhận từ ${empJobs.length} bài/dự án; chỉ tiêu ${emp.kpi_target_per_day || 0} view/ngày × ${getEmployeeWorkDays(emp.id)} công (quy chuẩn ${effectiveStandardWorkDays}, đã trừ ${approvedLeaveDaysByEmployee.get(emp.id) || 0} ngày phép đã duyệt) = ${target} view. Commission/thưởng do HR nhập tay ở bảng bên dưới.`,
      });
    }));

    showToast(`Đã tạo bản nháp KPI tháng ${selectedMonth}/${selectedYear}. Kiểm tra số liệu trước khi gửi Admin duyệt.`);
  };

  // Every money field on the monthly commission row is now a plain manual
  // entry — HR types the number, the system just records it. The total is
  // still auto-summed since it's trivial arithmetic of what was just typed,
  // not a derived formula from performance data.
  const handleMoneyFieldUpdate = async (
    record: KpiMonthlyRow,
    field: 'performance_commission_amount' | 'qc_views' | 'qc_commission_amount' | 'guaranteed_income_topup',
    rawValue: number,
  ) => {
    if (!['draft', 'rejected'].includes(record.publish_status)) return;
    const value = Number.isFinite(rawValue) ? Math.max(0, rawValue) : 0;
    if (value === Number(record[field] || 0)) return;
    const performanceCommission = field === 'performance_commission_amount' ? value : Number(record.performance_commission_amount || 0);
    const qcCommission = field === 'qc_commission_amount' ? value : Number(record.qc_commission_amount || 0);
    const guaranteedTopup = field === 'guaranteed_income_topup' ? value : Number(record.guaranteed_income_topup || 0);

    try {
      await updateKpiMonthly.mutateAsync({
        id: record.id,
        updates: {
          [field]: value,
          bonus_amount: performanceCommission + qcCommission + guaranteedTopup,
        },
      });
      showToast(`Đã cập nhật cho ${record.employees?.full_name || 'nhân viên'}.`);
    } catch (error) {
      showToast(await getUserFacingError(error, 'Không thể cập nhật. Vui lòng thử lại.'));
    }
  };

  const handleSubmitKpiApproval = async () => {
    try {
      await submitKpiMonth.mutateAsync({ month: selectedMonth, year: selectedYear });
      showToast(`Đã gửi KPI tháng ${selectedMonth}/${selectedYear} cho Admin duyệt.`);
    } catch (error) {
      showToast(await getUserFacingError(error, 'Không thể gửi duyệt KPI. Vui lòng thử lại.'));
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
      showToast(await getUserFacingError(error, 'Không thể xử lý KPI tháng. Vui lòng thử lại.'));
    }
  };

  const openNewOtModal = () => {
    setEditingOt(null);
    setOtEmpId(employeeList[0]?.id || '');
    setOtDate(new Date().toISOString().split('T')[0]);
    setOtHours(4);
    setOtViewsRender(0);
    setOtReason('');
    setOtStatus('Đã hoàn thành');
    setIsNewOtModalOpen(true);
  };

  const startEditOt = (ot: OtRecordRow) => {
    setEditingOt(ot);
    setOtEmpId(ot.employee_id);
    setOtDate(ot.date);
    setOtHours(ot.hours);
    setOtViewsRender(ot.views_render_count || 0);
    setOtReason(ot.reason || '');
    setOtStatus((OT_STATUS_OPTIONS.some(option => option.value === ot.status) ? ot.status : 'Chờ duyệt') as OtStatus);
    setIsNewOtModalOpen(true);
  };

  const resetOtForm = () => {
    setEditingOt(null);
    setOtEmpId('');
    setOtDate(new Date().toISOString().split('T')[0]);
    setOtHours(4);
    setOtViewsRender(0);
    setOtReason('');
    setOtStatus('Đã hoàn thành');
  };

  const handleAddOtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmp = employeeList.find(emp => emp.id === otEmpId);
    if (!targetEmp) {
      showToast('Vui lòng chọn nhân viên.');
      return;
    }
    if (!profile?.companyId) {
      showToast('Không xác định được công ty của tài khoản. Vui lòng thử lại.');
      return;
    }

    try {
      if (editingOt) {
        await updateOtRecord.mutateAsync({
          id: editingOt.id,
          updates: {
            employee_id: targetEmp.id,
            date: otDate,
            hours: otHours,
            views_render_count: otViewsRender,
            reason: otReason.trim() || null,
          },
        });
        showToast('Đã cập nhật thông tin OT.');
      } else {
        await createOtRecord.mutateAsync({
          company_id: profile.companyId,
          employee_id: targetEmp.id,
          date: otDate,
          hours: otHours,
          views_render_count: otViewsRender,
          reason: otReason.trim() || null,
          status: otStatus,
        });
        showToast('Đã tạo giờ OT thành công.');
      }
      resetOtForm();
      setIsNewOtModalOpen(false);
    } catch (error) {
      showToast(await getUserFacingError(error, editingOt ? 'Không thể cập nhật thông tin OT.' : 'Không thể tạo bản ghi OT.'));
    }
  };

  const handleOtStatusChange = async (id: string, status: string) => {
    try {
      await updateOtRecord.mutateAsync({
        id,
        updates: { status, approver_id: profile?.id },
      });
      showToast('Đã cập nhật trạng thái OT.');
    } catch (error) {
      showToast(await getUserFacingError(error, 'Không thể cập nhật trạng thái OT.'));
    }
  };

  const handleDeleteOt = async () => {
    if (!deletingOt) return;
    try {
      await deleteOtRecord.mutateAsync(deletingOt.id);
      showToast('Đã xóa bản ghi OT.');
      setDeletingOt(null);
    } catch (error) {
      showToast(await getUserFacingError(error, 'Không thể xóa bản ghi OT.'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t('adminKpi.title')}
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {t('adminKpi.description')}
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
            <span>{t('adminKpi.addJob')}</span>
          </button>

          {/* Download Excel & PDF Buttons */}
          <button
            onClick={handleDownloadExcel}
            className="px-3.5 py-2.5 bg-success-600 hover:bg-success-700 text-white rounded-xl font-semibold text-xs flex items-center space-x-1.5 shadow-md shadow-success-600/20 transition-all cursor-pointer"
            title={t('adminKpi.downloadExcelTitle')}
          >
            <Download className="w-4 h-4" />
            <span>{t('adminKpi.downloadExcel')}</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            className="px-3 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold text-xs flex items-center space-x-1.5 shadow-md shadow-slate-800/20 transition-all cursor-pointer"
            title={t('adminKpi.exportPdfTitle')}
          >
            <Printer className="w-4 h-4" />
            <span>{t('adminKpi.exportPdf')}</span>
          </button>

          <button
            onClick={() => setIsImportKpiModalOpen(true)}
            className="px-3 py-2.5 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-xl font-semibold text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t('adminKpi.importExcel')}</span>
          </button>
        </div>
      </div>

      {/* Selectors Bar: Month & Year */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-500">{t('adminKpi.periodLabel')}</span>
            <MonthYearFilter
              month={selectedMonth}
              year={selectedYear}
              onChange={(m, y) => { setSelectedMonth(m); setSelectedYear(y); }}
            />
          </div>

          <span className="text-xs text-slate-500">
            {t('adminKpi.jobsThisMonth')} <b>{currentMonthJobs.length}</b>
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
                <h3 className="text-sm font-extrabold text-white">{t('adminKpi.workdayTitle', { month: selectedMonth, year: selectedYear })}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-success-500/20 text-success-300 border border-success-400/30">
                  {t('adminKpi.workdaySchedule')}
                </span>
                {workdayOverride && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary-500/20 text-primary-200 border border-primary-400/30">
                    {t('adminKpi.workdayAdjusted')}
                  </span>
                )}
                {workdayOverride && workdayOverride.standard_work_days !== monthWorkInfo.standardWorkDays && (
                  <button
                    type="button"
                    onClick={handleResetWorkdayToCalendar}
                    disabled={hasPendingKpi || hasPublishedKpi}
                    className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-200 border border-rose-400/30 hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                    title={`Điều chỉnh đang lưu (${workdayOverride.standard_work_days} công) không khớp lịch hiện tại (${monthWorkInfo.standardWorkDays} công, đã trừ lễ/Tết). Bấm để đặt lại theo lịch.`}
                  >
                    ⚠ Lệch lịch — đặt lại {monthWorkInfo.standardWorkDays} công
                  </button>
                )}
                <button
                  type="button"
                  onClick={openWorkdayEditor}
                  disabled={hasPendingKpi || hasPublishedKpi}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-500/70 text-slate-200 transition hover:border-success-300 hover:bg-success-500/15 hover:text-success-200 disabled:cursor-not-allowed disabled:opacity-40"
                  title={hasPendingKpi || hasPublishedKpi ? t('adminKpi.workdayLockedTooltip') : t('adminKpi.workdayEditTooltip')}
                  aria-label={t('adminKpi.workdayEditTooltip')}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {t('adminKpi.workdayCycle', {
                  from: `01/${selectedMonth < 10 ? '0' + selectedMonth : selectedMonth}`,
                  to: `${monthWorkInfo.lastDayOfMonth}/${selectedMonth < 10 ? '0' + selectedMonth : selectedMonth}`,
                  days: monthWorkInfo.totalCalendarDays,
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-4 text-xs">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block">{t('adminKpi.weekdaysLabel')}</span>
            <p className="text-base font-bold text-white font-mono mt-0.5">
              {monthWorkInfo.fullWeekdaysCount} <span className="text-xs font-normal text-slate-400">{t('adminKpi.unitDaysAlt')}</span>
            </p>
            <span className="text-[10px] text-success-400">={monthWorkInfo.fullWeekdaysCount} {t('adminKpi.unitDays')}</span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block">{t('adminKpi.saturdaysLabel')}</span>
            <p className="text-base font-bold text-amber-300 font-mono mt-0.5">
              {monthWorkInfo.saturdaysCount} <span className="text-xs font-normal text-slate-400">{t('adminKpi.unitHalfDays')}</span>
            </p>
            <span className="text-[10px] text-amber-300">={monthWorkInfo.saturdaysCount * 0.5} {t('adminKpi.unitDays')}</span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block">{t('adminKpi.sundaysLabel')}</span>
            <p className="text-base font-bold text-slate-400 font-mono mt-0.5">
              {monthWorkInfo.sundaysCount} <span className="text-xs font-normal text-slate-500">{t('adminKpi.unitDaysAlt')}</span>
            </p>
            <span className="text-[10px] text-slate-500">{t('adminKpi.weeklyOff')}</span>
          </div>

          <div className="bg-rose-950/70 p-3 rounded-xl border border-rose-700/50">
            <span className="text-[11px] text-rose-300 block">{t('adminKpi.holidaysLabel')}</span>
            <p className="text-base font-bold text-rose-300 font-mono mt-0.5">
              -{monthWorkInfo.holidaysDeducted} <span className="text-xs font-normal text-rose-400">{t('adminKpi.unitDays')}</span>
            </p>
            <span className="text-[10px] text-rose-400">{t('adminKpi.holidaysInMonth', { count: holidayDatesInMonth.length })}</span>
          </div>

          <div className="bg-success-950/80 p-3 rounded-xl border border-success-600/40">
            <span className="text-[11px] text-success-300 font-bold block">{t('adminKpi.totalStandardDays')}</span>
            <p className="text-lg font-black text-success-300 font-mono mt-0.5">
              {effectiveStandardWorkDays} <span className="text-xs font-semibold text-success-400">{t('adminKpi.unitDays')}</span>
            </p>
            <span className="text-[10px] text-success-400 font-medium">{workdayOverride ? t('adminKpi.adjustedFrom', { days: monthWorkInfo.standardWorkDays }) : t('adminKpi.standardForMonth', { month: selectedMonth })}</span>
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
                {t('adminKpi.standardTitle', { month: selectedMonth < 10 ? '0' + selectedMonth : selectedMonth })}
              </h2>
              <p className="text-xs text-slate-500">
                {t('adminKpi.standardDesc')}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {backofficeEmployeeIds.size > 0 && (
              <button
                onClick={() => void handleExcludeBackoffice()}
                disabled={updateEmployee.isPending || hasPendingKpi || hasPublishedKpi}
                className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                title="Bỏ chọn các tài khoản Admin/HR khỏi bản nháp KPI tháng này"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Loại Admin/HR</span>
              </button>
            )}
            <button
              onClick={handleSyncKpiToProfiles}
              disabled={upsertKpiMonthly.isPending || hasPendingKpi || hasPublishedKpi || !kpiEligibleEmployees.length}
              className="px-4 py-2 bg-success-600 hover:bg-success-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-60 shadow-md shadow-success-600/20"
            >
              <Calculator className="w-4 h-4" />
              <span>{t('adminKpi.createDraft')} ({kpiEligibleEmployees.length})</span>
            </button>
            {hasEditableKpi && (
              <button onClick={() => void handleSubmitKpiApproval()} className="px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
                <Send className="w-4 h-4" /> {t('adminKpi.submitApproval')}
              </button>
            )}
            {isAdmin && hasPendingKpi && (
              <>
                <button onClick={() => setKpiDecision('reject')} className="px-4 py-2 border border-rose-300 bg-white text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4" /> {t('adminKpi.returnDraft')}
                </button>
                <button onClick={() => setKpiDecision('approve')} className="px-4 py-2 bg-success-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> {t('adminKpi.approvePublish')}
                </button>
              </>
            )}
            {hasPublishedKpi && <span className="rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-800">{t('adminKpi.published')}</span>}
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-slate-100 text-slate-800 uppercase text-[11px] font-bold border-b border-slate-300">
              <tr>
                <th className="py-3 px-3 text-center border-r border-slate-200 w-14" title="Có tính vào bản nháp KPI tháng khi bấm 'Tạo bản nháp'">Nhận KPI</th>
                <th className="py-3 px-4 min-w-[220px] border-r border-slate-200">{t('adminKpi.colEmployee')}</th>
                <th className="py-3 px-4 min-w-[180px] border-r border-slate-200">{t('adminKpi.colLevel')}</th>
                <th className="py-3 px-3 text-center border-r border-slate-200">{t('adminKpi.colTarget')}</th>
                <th className="py-3 px-3 text-center border-r border-slate-200">{t('adminKpi.colWorkdays')}</th>
                <th className="py-3 px-3 text-center">{t('adminKpi.colStandardKpi')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {employeeList.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400">{t('adminKpi.noEmployees')}</td></tr>
              ) : employeeList.map((emp) => (
                <tr key={emp.id} className={`hover:bg-slate-50 ${!emp.include_in_kpi ? 'opacity-50' : ''}`}>
                  <td className="py-3 px-3 text-center border-r border-slate-200">
                    <input
                      type="checkbox"
                      checked={emp.include_in_kpi}
                      onChange={() => void handleToggleIncludeInKpi(emp)}
                      disabled={updateEmployee.isPending || hasPendingKpi || hasPublishedKpi}
                      className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                      title={emp.include_in_kpi ? 'Bỏ khỏi bản nháp KPI tháng' : 'Đưa lại vào bản nháp KPI tháng'}
                    />
                  </td>
                  <td className="py-3 px-4 border-r border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <RowAvatar path={emp.avatar_url} />
                      <div>
                        <p className="font-bold text-slate-900">{emp.full_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{emp.employee_code} • {emp.department}</p>
                        {!emp.include_in_kpi && <p className="text-[10px] font-bold text-amber-600">Không tính vào KPI tháng</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 border-r border-slate-200">
                    {emp.kpi_level
                      ? <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-primary-50 text-primary-700 border border-primary-200">{emp.kpi_level}</span>
                      : <span className="text-slate-400 italic">{t('adminKpi.levelNotSet')}</span>}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-slate-800 border-r border-slate-200">
                    {emp.kpi_target_per_day != null ? t('adminKpi.viewsPerDay', { count: emp.kpi_target_per_day }) : '—'}
                  </td>
                  <td className="py-3 px-3 text-center text-slate-600 border-r border-slate-200">
                    <span>{getEmployeeWorkDays(emp.id)} {t('adminKpi.unitDays')}</span>
                    {(approvedLeaveDaysByEmployee.get(emp.id) || 0) > 0 && (
                      <span className="block text-[10px] text-amber-600">− {t('common.days', { count: approvedLeaveDaysByEmployee.get(emp.id) || 0 })}</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-base font-black text-success-700 font-mono">{getEmployeeKpiTarget(emp)}</span>
                    <span className="text-[10px] text-slate-400 block">{emp.kpi_target_per_day || 0} view/ngày × {getEmployeeWorkDays(emp.id)} {t('adminKpi.unitDays')}</span>
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
            <h2 className="font-bold text-slate-900 text-base">{t('adminKpi.commissionTitle', { month: selectedMonth, year: selectedYear })}</h2>
            <p className="mt-1 text-xs text-slate-500">
              {t('adminKpi.commissionDesc')}
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-[11px] uppercase text-slate-700">
                <tr>
                  <th className="p-3">{t('adminKpi.colEmployeeShort')}</th>
                  <th className="p-3 text-right">{t('adminKpi.colPerformanceCommission')}</th>
                  <th className="p-3 text-center">{t('adminKpi.colQcViews')}</th>
                  <th className="p-3 text-right">{t('adminKpi.colQcCommission')}</th>
                  <th className="p-3 text-right">{t('adminKpi.colGuaranteedTopup')}</th>
                  <th className="p-3 text-right">{t('adminKpi.colTotalBonus')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyKpi.map(record => {
                  const canEdit = ['draft', 'rejected'].includes(record.publish_status);
                  const moneyInput = (field: 'performance_commission_amount' | 'qc_views' | 'qc_commission_amount' | 'guaranteed_income_topup', value: number) => (
                    <input
                      key={`${record.id}-${field}-${value}`}
                      type="number"
                      min="0"
                      step={field === 'qc_views' ? 0.5 : 1000}
                      defaultValue={value}
                      disabled={!canEdit || updateKpiMonthly.isPending}
                      onBlur={event => void handleMoneyFieldUpdate(record, field, Number(event.target.value || 0))}
                      className="w-28 rounded-lg border border-slate-300 p-1.5 text-right font-mono disabled:bg-slate-100"
                    />
                  );
                  return (
                    <tr key={record.id}>
                      <td className="p-3 font-bold text-slate-900">
                        {record.employees?.full_name}
                        <span className="block font-mono text-[10px] font-normal text-slate-400">{record.employees?.employee_code}</span>
                      </td>
                      <td className="p-3 text-right">{moneyInput('performance_commission_amount', record.performance_commission_amount)}</td>
                      <td className="p-3 text-center">{moneyInput('qc_views', record.qc_views)}</td>
                      <td className="p-3 text-right">{moneyInput('qc_commission_amount', record.qc_commission_amount)}</td>
                      <td className="p-3 text-right">{moneyInput('guaranteed_income_topup', record.guaranteed_income_topup)}</td>
                      <td className="p-3 text-right font-mono font-bold text-success-700">{formatMoney(record.bonus_amount || 0)}</td>
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
                {t('adminKpi.entryToolTitle', { month: selectedMonth, year: selectedYear })}
              </h2>
              <p className="text-xs text-slate-500">
                {t('adminKpi.entryToolDesc')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                if (!selectedEmployeeIdForAdmin && employeeList[0]) {
                  setSelectedEmployeeIdForAdmin(employeeList[0].id);
                }
                setIsImportKpiModalOpen(true);
              }}
              className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer"
              title={t('adminKpi.linkKpiTableTitle')}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{t('adminKpi.linkKpiTable')}</span>
            </button>

            <button
              onClick={handleDownloadExcel}
              className="px-3 py-1.5 bg-success-50 hover:bg-success-100 text-success-700 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('adminKpi.exportExcel')}</span>
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
              <span>{t('adminKpi.addJob')}</span>
            </button>
          </div>
        </div>

        {/* Category stat cards: All / Project render / Reprocess */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl border-2 border-primary-300 bg-primary-50/60">
            <span className="text-[11px] font-bold text-primary-700 uppercase flex items-center justify-between">
              {t('adminKpi.allJobs')}
              <span className="px-2 py-0.5 rounded bg-primary-100 text-primary-800">{t('adminKpi.jobsUnit', { count: currentMonthJobs.length })}</span>
            </span>
            <p className="text-2xl font-black text-slate-900 mt-1">{currentMonthJobs.reduce((s, j) => s + (j.views_count || 0), 0)} <span className="text-xs font-semibold text-slate-500">views</span></p>
            <span className="text-xs text-success-700 font-bold">{t('adminKpi.kpiConverted', { count: currentMonthJobs.reduce((s, j) => s + (j.converted_kpi || 0), 0) })}</span>
          </div>
          <div className="p-4 rounded-xl border border-success-200 bg-success-50/60">
            <span className="text-[11px] font-bold text-success-700 uppercase flex items-center justify-between">
              {t('adminKpi.renderViews')}
              <span className="px-2 py-0.5 rounded bg-success-100 text-success-800">{t('adminKpi.jobsUnit', { count: currentMonthJobs.filter(j => j.category !== 'reprocess').length })}</span>
            </span>
            <p className="text-2xl font-black text-slate-900 mt-1">{currentMonthJobs.filter(j => j.category !== 'reprocess').reduce((s, j) => s + (j.views_count || 0), 0)} <span className="text-xs font-semibold text-slate-500">views</span></p>
            <span className="text-xs text-success-700 font-bold">{t('adminKpi.kpiConverted', { count: currentMonthJobs.filter(j => j.category !== 'reprocess').reduce((s, j) => s + (j.converted_kpi || 0), 0) })}</span>
          </div>
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60">
            <span className="text-[11px] font-bold text-amber-700 uppercase flex items-center justify-between">
              {t('adminKpi.reprocessViews')}
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800">{t('adminKpi.jobsUnit', { count: currentMonthJobs.filter(j => j.category === 'reprocess').length })}</span>
            </span>
            <p className="text-2xl font-black text-slate-900 mt-1">{currentMonthJobs.filter(j => j.category === 'reprocess').reduce((s, j) => s + (j.views_count || 0), 0)} <span className="text-xs font-semibold text-slate-500">views</span></p>
            <span className="text-xs text-amber-700 font-bold">{t('adminKpi.kpiConverted', { count: currentMonthJobs.filter(j => j.category === 'reprocess').reduce((s, j) => s + (j.converted_kpi || 0), 0) })}</span>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-300 rounded-xl">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-slate-100 text-slate-800 uppercase text-[11px] font-bold border-b border-slate-300">
              <tr>
                <th className="py-3 px-3 text-center w-12 border-r border-slate-300">{t('adminKpi.colStt')}</th>
                <th className="py-3 px-4 min-w-[320px] border-r border-slate-300">{t('adminKpi.colOrderJob')}</th>
                <th className="py-3 px-3 text-center border-r border-slate-300">{t('adminKpi.colCategory')}</th>
                <th className="py-3 px-4 min-w-[160px] border-r border-slate-300">{t('adminKpi.colAssignee')}</th>
                <th className="py-3 px-3 text-center border-r border-slate-300">{t('adminKpi.colViews')}</th>
                <th className="py-3 px-3 text-center border-r border-slate-300">{t('adminKpi.colConvertedKpi')}</th>
                <th className="py-3 px-3 text-center border-r border-slate-300">{t('adminKpi.colDuration')}</th>
                <th className="py-3 px-3 text-center border-r border-slate-300 min-w-[120px]">{t('adminKpi.colDeadline')}</th>
                <th className="py-3 px-3 text-center w-28">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {groupedJobs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    {t('adminKpi.emptyJobsMonth', { month: selectedMonth, year: selectedYear })}
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
                          {job.duration_days ? t('common.days', { count: job.duration_days }) : '—'}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-rose-700 bg-rose-50/40 border-r border-slate-300">
                          {job.deadline || '—'}
                          {delayLabel(job) && <span className="block text-[10px] text-rose-700">{delayLabel(job)?.text}</span>}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => startAddSubTask(job.order_job)}
                              className="p-1.5 hover:bg-primary-100 text-primary-600 rounded-lg cursor-pointer text-[10px] font-bold"
                              title={t('adminKpi.addSubtaskTooltip')}
                            >
                              {t('adminKpi.addSubtaskShort')}
                            </button>
                            <button
                              onClick={() => startEditJob(job)}
                              className="p-1.5 hover:bg-primary-100 text-primary-600 rounded-lg cursor-pointer"
                              title={t('adminKpi.editJobTooltip')}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteJob(job.id)}
                              className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer"
                              title={t('adminKpi.deleteJobTooltip')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  // CASE 2: Order has Sub-tasks (Parent Order header row + sub-task rows)
                  const isCollapsed = collapsedGroups.has(group.orderJob);
                  return (
                    <React.Fragment key={`group-${groupIdx}`}>
                      {/* Main Order Header Row */}
                      <tr className="bg-slate-50/90 font-bold border-b border-slate-300">
                        <td className="py-3 px-3 text-center font-black text-slate-900 border-r border-slate-300 bg-slate-100">
                          {groupIdx + 1}
                        </td>
                        <td className="py-3 px-4 font-black text-slate-900 text-sm border-r border-slate-300" colSpan={1}>
                          <button
                            type="button"
                            onClick={() => toggleGroupCollapsed(group.orderJob)}
                            className="flex items-center gap-1.5 cursor-pointer hover:text-primary-700"
                            title={isCollapsed ? t('adminKpi.expandGroup') : t('adminKpi.collapseGroup')}
                          >
                            <span className={`inline-block transition-transform ${isCollapsed ? '-rotate-90' : ''}`}>▾</span>
                            {group.orderJob}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-center border-r border-slate-300">
                          {new Set(group.items.map(i => i.category)).size === 1 ? categoryBadge(group.items[0].category) : <span className="text-[10px] text-slate-400 italic">{t('adminKpi.multipleCategories')}</span>}
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
                            title={t('adminKpi.addSubtaskToOrderTooltip')}
                          >
                            {t('adminKpi.addSubtaskBtn')}
                          </button>
                        </td>
                      </tr>

                      {/* Sub-task Rows */}
                      {!isCollapsed && group.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-200">
                          {/* Blank STT cell */}
                          <td className="py-2.5 px-3 border-r border-slate-300 bg-slate-50/40"></td>

                          {/* Sub-task rendered directly under Order in light gray block */}
                          <td className="py-2 px-4 border-r border-slate-300">
                            <div className="bg-slate-100/90 text-slate-800 px-3 py-1.5 rounded-md border-l-4 border-primary-500 font-semibold text-xs flex items-center justify-between">
                              <span>{t('adminKpi.subtaskPrefix', { name: item.sub_task || item.order_job })}</span>
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
                            {item.duration_days ? t('common.days', { count: item.duration_days }) : '—'}
                          </td>

                          <td className="py-2 px-3 text-center font-bold text-rose-700 border-r border-slate-300">
                            {item.deadline || '—'}
                            {delayLabel(item) && <span className="block text-[10px] text-rose-700">{delayLabel(item)?.text}</span>}
                          </td>

                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => startEditJob(item)}
                                className="p-1 hover:bg-primary-100 text-primary-600 rounded cursor-pointer"
                                title={t('adminKpi.editSubtaskTooltip')}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteJob(item.id)}
                                className="p-1 hover:bg-rose-100 text-rose-600 rounded cursor-pointer"
                                title={t('adminKpi.deleteSubtaskTooltip')}
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
                {t('adminKpi.progressTitle')}
              </h2>
              <p className="text-xs text-slate-500">
                {t('adminKpi.progressDesc')}
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
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${pct >= 100 ? 'bg-success-100 text-success-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                    {pct}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                    <span>{t('adminKpi.convertedLabel', { total: totalKpi, target })}</span>
                    <span>{t('adminKpi.subtasksCount', { count: empJobs.length })}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-success-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {t('adminKpi.targetLabel', { perDay: emp.kpi_target_per_day || 0, days: getEmployeeWorkDays(emp.id) })}
                    {(approvedLeaveDaysByEmployee.get(emp.id) || 0) > 0 && t('adminKpi.targetLeaveDeducted', { count: approvedLeaveDaysByEmployee.get(emp.id) || 0 })}
                  </span>
                </div>

                {/* Category breakdown */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="px-2 py-1.5 rounded-lg bg-success-50 border border-success-200 text-[10px]">
                    <span className="block text-success-700 font-bold">{t('adminKpi.renderViews')}</span>
                    <span className="text-slate-700">{sumViews(renderJobs)}v • {sumKpi(renderJobs)}đ</span>
                  </div>
                  <div className="px-2 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[10px]">
                    <span className="block text-amber-700 font-bold">{t('adminKpi.reprocessViews')}</span>
                    <span className="text-slate-700">{sumViews(reprocessJobs)}v • {sumKpi(reprocessJobs)}đ</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                  <span>{t('adminKpi.totalViewsLabel', { count: totalViews })}</span>
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
                {t('adminKpi.otTitle')}
              </h2>
              <p className="text-xs text-slate-500">
                {t('adminKpi.otDesc')}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-primary-700">
                {t('adminKpi.otPermissionsNote')}
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={openNewOtModal}
              className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-primary-500/20 transition-colors hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              {t('adminKpi.createOtForEmployee')}
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] tracking-wider border-y border-slate-200">
              <tr>
                <th className="py-3 px-4">{t('adminKpi.colOtEmployee')}</th>
                <th className="py-3 px-4">{t('adminKpi.colOtDate')}</th>
                <th className="py-3 px-4">{t('adminKpi.colOtHoursViews')}</th>
                <th className="py-3 px-4">{t('adminKpi.colOtReason')}</th>
                <th className="py-3 px-4 text-center">{t('adminKpi.colOtStatus')}</th>
                <th className="py-3 px-4 text-center">{t('adminKpi.colOtUpdate')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allOtRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    {t('adminKpi.noOtRecords')}
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
                    <td className="py-3 px-4 font-medium">{formatDate(ot.date)}</td>
                    <td className="py-3 px-4 font-black text-primary-700">
                      {t('common.hours', { count: ot.hours })} {ot.views_render_count ? t('adminKpi.viewsInParens', { count: ot.views_render_count }) : ''}
                    </td>
                    <td className="py-3 px-4 max-w-[200px] truncate">{ot.reason}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full font-extrabold text-[10px] ${ot.status === 'Đã hoàn thành' || ot.status === 'Đã duyệt'
                          ? 'bg-success-100 text-success-800 border border-success-300'
                          : ot.status === 'Đang thực hiện'
                            ? 'bg-primary-100 text-primary-800 border border-primary-300'
                            : ot.status === 'Upcoming'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-100 text-slate-700'
                        }`}>
                        {value(ot.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {isAdmin ? (
                          <>

                            <select
                              value={ot.status}
                              onChange={e => handleOtStatusChange(ot.id, e.target.value)}
                              className="p-1 bg-slate-50 border border-slate-200 rounded text-[11px] font-semibold text-slate-700 cursor-pointer"
                              aria-label={t('adminKpi.otStatusLabel')}
                            >
                              {OT_STATUS_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>{value(option.label)}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => startEditOt(ot)}
                              className="rounded-lg p-1.5 text-primary-600 transition-colors hover:bg-primary-100 focus-visible:outline-2 focus-visible:outline-primary-600"
                              title={t('adminKpi.editOtTooltip')}
                              aria-label={t('adminKpi.editOtTooltip')}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingOt(ot)}
                              className="rounded-lg p-1.5 text-rose-600 transition-colors hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-rose-600"
                              title={t('adminKpi.deleteOtTooltip')}
                              aria-label={t('adminKpi.deleteOtTooltip')}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : <span className="text-[11px] font-semibold text-slate-500">{t('adminKpi.adminApprovesStatus')}</span>}
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
        <ModalPanel size="xl">
          <h3 className="text-lg font-bold text-slate-900">
            {editingJob ? t('adminKpi.modalEditJobTitle') : t('adminKpi.modalNewJobTitle')}
          </h3>

          <form onSubmit={handleAddJobSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('adminKpi.orderJobLabel')}
              </label>
              <input
                type="text"
                placeholder={t('adminKpi.orderJobPlaceholder')}
                value={orderJob}
                onChange={e => setOrderJob(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('adminKpi.subtaskLabel')}
                </label>
                <input
                  type="text"
                  placeholder={t('adminKpi.subtaskPlaceholder')}
                  value={subTask}
                  onChange={e => setSubTask(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-primary-700"
                />
                <span className="text-[10px] text-slate-400 italic">{t('adminKpi.subtaskHint')}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('adminKpi.assigneeLabel')}</label>
                <SearchableSelect
                  value={jobEmployeeId}
                  onChange={setJobEmployeeId}
                  options={employeeList.map(emp => ({ value: emp.id, label: `${emp.full_name} (${emp.employee_code})` }))}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('adminKpi.categoryLabel')}</label>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('adminKpi.viewsLabel')}</label>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('adminKpi.convertedKpiLabel')}</label>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('adminKpi.durationLabel')}</label>
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
                  {t('adminKpi.deadlineLabel')}
                </label>
                <div className="space-y-1">
                  <input
                    type="text"
                    placeholder={t('adminKpi.deadlinePlaceholder')}
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-rose-700"
                  />
                  <div className="flex items-center space-x-1">
                    <span className="text-[10px] text-slate-400">{t('adminKpi.orChooseDate')}</span>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('adminKpi.completedDateLabel')}</label>
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
                {t('adminKpi.cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-md shadow-primary-500/20 cursor-pointer"
              >
                {editingJob ? t('adminKpi.updateJobBtn') : t('adminKpi.saveJobBtn')}
              </button>
            </div>
          </form>
        </ModalPanel>
      )}

      {/* Modal Add OT (Admin Direct Creation) */}
      {isNewOtModalOpen && (
        <ModalPanel size="xl">
          <h3 className="text-lg font-bold text-slate-900">
            {editingOt ? t('adminKpi.modalEditOtTitle') : t('adminKpi.modalNewOtTitle')}
          </h3>
          <p className="text-xs text-slate-500">{t('adminKpi.otManualPayHint')}</p>

          <form onSubmit={handleAddOtSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t('adminKpi.otEmployeeLabel')}</label>
              <SearchableSelect
                value={otEmpId}
                onChange={setOtEmpId}
                options={employeeList.map(emp => ({ value: emp.id, label: `${emp.full_name} (${emp.employee_code}) - ${emp.job_title}` }))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t('adminKpi.otDateLabel')}</label>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('adminKpi.otHoursLabel')}</label>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('adminKpi.otViewsLabel')}</label>
                <input
                  type="number"
                  min="0"
                  value={otViewsRender}
                  onChange={e => setOtViewsRender(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>
            </div>

            {!editingOt && <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t('adminKpi.otStatusLabel')}</label>
              <select
                value={otStatus}
                onChange={e => setOtStatus(e.target.value as OtStatus)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
              >
                {OT_STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{value(option.label)}</option>
                ))}
              </select>
            </div>}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t('adminKpi.otReasonLabel')}</label>
              <textarea
                rows={2}
                value={otReason}
                onChange={e => setOtReason(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                required
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewOtModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                {t('adminKpi.cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-md shadow-primary-500/20 cursor-pointer"
              >
                {editingOt ? t('adminKpi.updateOtBtn') : t('adminKpi.confirmOtBtn')}
              </button>
            </div>
          </form>
        </ModalPanel>
      )}

      <ConfirmationDialog
        open={isWorkdayEditorOpen}
        onOpenChange={setIsWorkdayEditorOpen}
        title={t('adminKpi.workdayEditorTitle', { month: selectedMonth, year: selectedYear })}
        description={t('adminKpi.workdayEditorDesc')}
        confirmLabel={t('adminKpi.saveWorkdayBtn')}
        onConfirm={() => void handleSaveWorkdayOverride()}
        isPending={upsertWorkdayOverride.isPending}
        isConfirmDisabled={!Number.isFinite(editedStandardWorkDays) || editedStandardWorkDays <= 0 || editedStandardWorkDays > 31}
      >
        <label className="block text-sm font-semibold text-slate-700">{t('adminKpi.workdayFieldLabel')}
          <input
            type="number"
            min="0.5"
            max="31"
            step="0.5"
            value={editedStandardWorkDays}
            onChange={(event) => setEditedStandardWorkDays(Number(event.target.value))}
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          />
        </label>
        <p className="mt-2 text-xs text-slate-500">{t('adminKpi.workdayCurrentCalendar', { days: monthWorkInfo.standardWorkDays })}</p>
      </ConfirmationDialog>

      <ConfirmationDialog
        open={deletingOt !== null}
        onOpenChange={(open) => {
          if (!open && !deleteOtRecord.isPending) setDeletingOt(null);
        }}
        title={t('adminKpi.deleteOtTitle')}
        description={t('adminKpi.deleteOtDescription', {
          employee: deletingOt?.employees?.full_name || 'nhân viên',
          date: deletingOt?.date || '',
        })}
        confirmLabel={t('adminKpi.deleteOtBtn')}
        onConfirm={() => void handleDeleteOt()}
        isPending={deleteOtRecord.isPending}
        variant="danger"
      />

      <ConfirmationDialog
        open={kpiDecision !== null}
        onOpenChange={(open) => {
          if (!open) {
            setKpiDecision(null);
            setKpiRejectionReason('');
          }
        }}
        title={kpiDecision === 'approve' ? t('adminKpi.approveKpiTitle') : t('adminKpi.rejectKpiTitle')}
        description={kpiDecision === 'approve'
          ? t('adminKpi.approveKpiDesc', { month: selectedMonth, year: selectedYear })
          : t('adminKpi.rejectKpiDesc', { month: selectedMonth, year: selectedYear })}
        confirmLabel={kpiDecision === 'approve' ? t('adminKpi.approvePublish') : t('adminKpi.returnDraft')}
        onConfirm={() => void handleKpiDecision()}
        isPending={approveKpiMonth.isPending || rejectKpiMonth.isPending}
        isConfirmDisabled={kpiDecision === 'reject' && kpiRejectionReason.trim().length < 3}
        variant={kpiDecision === 'reject' ? 'danger' : 'primary'}
      >
        {kpiDecision === 'reject' && (
          <label className="block text-sm font-semibold text-slate-700">{t('adminKpi.rejectReasonLabel')}
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
