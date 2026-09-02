import React, { createContext, useCallback, useContext, useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  TabType,
  AdminTabType,
  HrReminder
} from '../types';
import { useEmployees, useAllEmployeeSensitiveInfo, type DbEmployee } from '../hooks/useEmployees';
import { useAllContracts } from '../hooks/useContracts';
import { useAllLeaveRequests, useAllWorkEvents } from '../hooks/useLeave';
import { useAllOtRecords } from '../hooks/useOt';
import { useAllPayrollHistory } from '../hooks/usePayroll';
import { useAllProfiles } from '../hooks/useProfiles';
import { CONTRACT_EXPIRING_WINDOW_DAYS, employeeNeedsContract } from '../utils/contracts';

const DAY_MS = 86_400_000;
const daysUntil = (date: string) => Math.ceil((new Date(`${date}T00:00:00`).getTime() - Date.now()) / DAY_MS);
const nextAnnualReview = (date: string) => {
  const next = new Date(`${date}T00:00:00`);
  next.setFullYear(next.getFullYear() + 1);
  return next.toISOString().slice(0, 10);
};

interface HRContextType {
  // Active navigation tabs
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  adminTab: AdminTabType;
  setAdminTab: (tab: AdminTabType) => void;

  // Employees state
  employees: DbEmployee[];
  currentEmployee?: DbEmployee;
  currentEmployeeId: string;
  setCurrentEmployeeId: (id: string) => void;
  
  // Admin selected employee for detailed views
  selectedEmployeeIdForAdmin: string;
  setSelectedEmployeeIdForAdmin: (id: string) => void;

  // Reminders & Alerts
  reminders: HrReminder[];
  pendingOnboardingCount: number;
  markReminderAsRead: (id: string) => void;
  resolveReminder: (id: string) => void;

  // Modal states
  isNewLeaveModalOpen: boolean;
  setIsNewLeaveModalOpen: (open: boolean) => void;
  isEditProfileModalOpen: boolean;
  setIsEditProfileModalOpen: (open: boolean) => void;
  isImportKpiModalOpen: boolean;
  setIsImportKpiModalOpen: (open: boolean) => void;
  isNewEmployeeModalOpen: boolean;
  setIsNewEmployeeModalOpen: (open: boolean) => void;
  selectedPayslipId: string | null;
  setSelectedPayslipId: (id: string | null) => void;
  
  // Toast
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const HRContext = createContext<HRContextType | undefined>(undefined);

const USER_TAB_VALUES: readonly TabType[] = ['dashboard', 'profile', 'contracts', 'payslips', 'leaves', 'kpi'];
const ADMIN_TAB_VALUES: readonly AdminTabType[] = [
  'admin-dashboard',
  'admin-profile',
  'admin-employees',
  'admin-contracts',
  'admin-leaves',
  'admin-kpi',
  'admin-payroll',
  'admin-reminders',
  'admin-reports',
  'admin-settings',
];

const isStoredTab = <T extends string>(value: string | null, allowed: readonly T[]): value is T =>
  value !== null && allowed.includes(value as T);

const readStoredTab = <T extends string>(queryKey: string, storageKey: string, fallback: T, allowed: readonly T[]): T => {
  if (typeof window === 'undefined') return fallback;

  const fromUrl = new URLSearchParams(window.location.search).get(queryKey);
  if (isStoredTab(fromUrl, allowed)) return fromUrl;

  try {
    const fromSession = window.sessionStorage.getItem(storageKey);
    if (isStoredTab(fromSession, allowed)) return fromSession;
  } catch {
    // Private browsing / storage-disabled environments should still be able
    // to use the portal; the in-memory default remains valid in that case.
  }
  return fallback;
};

const persistTab = (storageKey: string, value: string) => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(storageKey, value);
  } catch {
    // URL state below is still sufficient when sessionStorage is unavailable.
  }
};

export const HRProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: employeesData } = useEmployees();
  const employees = useMemo(() => employeesData || [], [employeesData]);

  // Active navigation
  // Keep the selected view in the URL as well as sessionStorage. Auth token
  // refreshes can briefly remount HRProvider; in-memory-only state then jumps
  // back to the first tab. A query-backed tab is also directly shareable and
  // survives switching browser windows/apps without creating separate bundles.
  const [activeTab, setActiveTabState] = useState<TabType>(() =>
    readStoredTab('tab', 'tl-hr-active-tab', 'dashboard', USER_TAB_VALUES),
  );
  const [adminTab, setAdminTabState] = useState<AdminTabType>(() =>
    readStoredTab('adminTab', 'tl-hr-active-admin-tab', 'admin-dashboard', ADMIN_TAB_VALUES),
  );

  useEffect(() => {
    const fromUrl = new URLSearchParams(location.search).get('tab');
    if (isStoredTab(fromUrl, USER_TAB_VALUES) && fromUrl !== activeTab) setActiveTabState(fromUrl);
  }, [activeTab, location.search]);

  useEffect(() => {
    const fromUrl = new URLSearchParams(location.search).get('adminTab');
    if (isStoredTab(fromUrl, ADMIN_TAB_VALUES) && fromUrl !== adminTab) setAdminTabState(fromUrl);
  }, [adminTab, location.search]);

  const setActiveTab = useCallback((tab: TabType) => {
    setActiveTabState(tab);
    persistTab('tl-hr-active-tab', tab);
    const params = new URLSearchParams(location.search);
    params.delete('adminTab');
    params.set('tab', tab);
    navigate({ pathname: location.pathname, search: `?${params.toString()}`, hash: location.hash }, { replace: true });
  }, [location.hash, location.pathname, location.search, navigate]);

  const setAdminTab = useCallback((tab: AdminTabType) => {
    setAdminTabState(tab);
    persistTab('tl-hr-active-admin-tab', tab);
    const params = new URLSearchParams(location.search);
    params.delete('tab');
    params.set('adminTab', tab);
    navigate({ pathname: location.pathname, search: `?${params.toString()}`, hash: location.hash }, { replace: true });
  }, [location.hash, location.pathname, location.search, navigate]);

  // Employee Selection
  // Empty until the real employee list loads; this avoids sending a mock id to
  // Supabase and keeps the selection stable across refetches.
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string>('');
  const [selectedEmployeeIdForAdmin, setSelectedEmployeeIdForAdmin] = useState<string>('');

  // Modals
  const [isNewLeaveModalOpen, setIsNewLeaveModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isImportKpiModalOpen, setIsImportKpiModalOpen] = useState(false);
  const [isNewEmployeeModalOpen, setIsNewEmployeeModalOpen] = useState(false);
  const [selectedPayslipId, setSelectedPayslipId] = useState<string | null>(null);

  // Reminders list state
  const [readReminderIds, setReadReminderIds] = useState<string[]>([]);

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const currentEmployee = useMemo(() => {
    return employees.find(e => e.id === currentEmployeeId) || employees[0];
  }, [employees, currentEmployeeId]);

  // Dynamically generated Reminders — sourced from real Supabase data
  // (employees, contracts, leave_requests, employee_sensitive_info). read/
  // resolved tracking stays local-only;
  // there's no reminders table, this is just dismissal state for the UI.
  const { data: allContractsData } = useAllContracts();
  const allContracts = useMemo(() => allContractsData || [], [allContractsData]);
  const { data: allLeaveRequestsData } = useAllLeaveRequests();
  const allLeaveRequests = useMemo(() => allLeaveRequestsData || [], [allLeaveRequestsData]);
  const { data: allSensitiveInfoData } = useAllEmployeeSensitiveInfo();
  const allSensitiveInfo = useMemo(() => allSensitiveInfoData || [], [allSensitiveInfoData]);
  const { data: allOtData } = useAllOtRecords();
  const allOt = useMemo(() => allOtData || [], [allOtData]);
  const { data: allWorkEventsData } = useAllWorkEvents();
  const allWorkEvents = useMemo(() => allWorkEventsData || [], [allWorkEventsData]);
  const { data: allPayrollData } = useAllPayrollHistory();
  const allPayroll = useMemo(() => allPayrollData || [], [allPayrollData]);
  const { data: allProfilesData } = useAllProfiles();
  const pendingOnboardingProfiles = useMemo(
    () => (allProfilesData || []).filter((profile) => profile.onboarding_status === 'submitted'),
    [allProfilesData],
  );

  const reminders = useMemo<HrReminder[]>(() => {
    const generated: HrReminder[] = [];

    pendingOnboardingProfiles.forEach((profile) => {
      const employee = profile.employees;
      if (!profile.employee_id || !employee) return;
      generated.push({
        id: `rem-onboarding-${profile.id}`,
        category: 'onboarding_review',
        title: 'Hồ sơ nhân viên chờ duyệt',
        message: `${employee.full_name} đã hoàn tất onboarding. Kiểm tra CCCD, thông tin ngân hàng và người liên hệ trước khi mở quyền truy cập.`,
        employeeId: profile.employee_id,
        employeeName: employee.full_name,
        isRead: readReminderIds.includes(`rem-onboarding-${profile.id}`),
        createdAt: profile.onboarding_submitted_at || profile.created_at,
        severity: 'high',
      });
    });

    // 1. Contract expiry — most recently started contract per employee, if
    // it has a finite end date (an indefinite contract has end_date null).
    const latestContractByEmployee = new Map<string, (typeof allContracts)[number]>();
    allContracts.forEach(c => {
      const existing = latestContractByEmployee.get(c.employee_id);
      if (!existing || c.start_date > existing.start_date) {
        latestContractByEmployee.set(c.employee_id, c);
      }
    });
    latestContractByEmployee.forEach(c => {
      if (!c.end_date) return;
      const remainingDays = daysUntil(c.end_date);
      if (remainingDays < 0 || remainingDays > CONTRACT_EXPIRING_WINDOW_DAYS) return;
      const empName = c.employees?.full_name || '';
      generated.push({
        id: `rem-ctr-${c.id}`,
        category: 'contract',
        title: 'Hợp đồng lao động sắp hết hạn',
        message: `Hợp đồng của ${empName} sẽ hết hạn ngày ${c.end_date}. Cần tiến hành tái ký hoặc làm thủ tục thanh lý.`,
        employeeId: c.employee_id,
        employeeName: empName,
        dueDate: c.end_date,
        isRead: readReminderIds.includes(`rem-ctr-${c.id}`),
        createdAt: c.created_at,
        severity: remainingDays <= 30 ? 'high' : 'medium',
      });
    });

    // 1b. Employee onboarded but no published contract yet.
    employees.forEach(emp => {
      if (!employeeNeedsContract(emp, allContracts)) return;
      generated.push({
        id: `rem-no-contract-${emp.id}`,
        category: 'contract_missing',
        title: 'Nhân viên chưa có hợp đồng',
        message: `${emp.full_name} đã duyệt hồ sơ nhưng chưa có hợp đồng lao động nào được phát hành.`,
        employeeId: emp.id,
        employeeName: emp.full_name,
        isRead: readReminderIds.includes(`rem-no-contract-${emp.id}`),
        createdAt: emp.created_at,
        severity: 'high',
      });
    });

    // 2. Salary review due
    employees.forEach(emp => {
      if (emp.last_salary_review_date) {
        const reviewDate = nextAnnualReview(emp.last_salary_review_date);
        const remainingDays = daysUntil(reviewDate);
        if (remainingDays > 30) return;
        generated.push({
          id: `rem-sal-${emp.id}`,
          category: 'salary_review',
          title: 'Đến kỳ xét duyệt / tăng lương',
          message: `${emp.full_name} ${remainingDays < 0 ? 'đã quá kỳ' : 'đến kỳ'} đánh giá hiệu suất và xem xét điều chỉnh lương.`,
          employeeId: emp.id,
          employeeName: emp.full_name,
          dueDate: reviewDate,
          isRead: readReminderIds.includes(`rem-sal-${emp.id}`),
          createdAt: emp.created_at,
          severity: remainingDays < 0 ? 'high' : 'medium',
        });
      }
    });

    // 3. Missing documents
    const sensitiveByEmployee = new Map(allSensitiveInfo.map(s => [s.employee_id, s]));
    employees.forEach(emp => {
      const info = sensitiveByEmployee.get(emp.id);
      if (!info || !info.id_card_front_url || !info.tax_code) {
        generated.push({
          id: `rem-doc-${emp.id}`,
          category: 'missing_doc',
          title: 'Thiếu giấy tờ / hồ sơ cá nhân',
          message: `Nhân viên ${emp.full_name} chưa hoàn thiện upload CCCD hoặc mã số thuế cá nhân.`,
          employeeId: emp.id,
          employeeName: emp.full_name,
          isRead: readReminderIds.includes(`rem-doc-${emp.id}`),
          createdAt: emp.created_at,
          severity: 'high',
        });
      }
    });

    // 4. Leave requests pending
    allLeaveRequests.forEach(lr => {
      if (lr.status === 'Chờ duyệt') {
        const empName = lr.employees?.full_name || '';
        generated.push({
          id: `rem-lr-${lr.id}`,
          category: 'leave_request',
          title: 'Yêu cầu nghỉ phép chờ phê duyệt',
          message: `${empName} vừa gửi yêu cầu ${lr.leave_type} (${lr.total_days} ngày từ ${lr.start_date}). Lý do: "${lr.reason || ''}"`,
          employeeId: lr.employee_id,
          employeeName: empName,
          dueDate: lr.start_date,
          isRead: readReminderIds.includes(`rem-lr-${lr.id}`),
          createdAt: lr.created_at,
          severity: 'medium',
        });
      }
    });

    // 5. Pending OT and WFH/late requests.
    allOt.forEach(record => {
      if (record.status !== 'Chờ duyệt') return;
      const empName = record.employees?.full_name || '';
      generated.push({
        id: `rem-ot-${record.id}`,
        category: 'ot_request',
        title: 'Yêu cầu OT chờ phê duyệt',
        message: `${empName} đăng ký ${record.hours} giờ OT ngày ${record.date}.`,
        employeeId: record.employee_id,
        employeeName: empName,
        dueDate: record.date,
        isRead: readReminderIds.includes(`rem-ot-${record.id}`),
        createdAt: record.created_at,
        severity: 'medium',
      });
    });

    allWorkEvents.forEach(record => {
      if (record.status !== 'pending') return;
      const empName = record.employees?.full_name || '';
      generated.push({
        id: `rem-work-${record.id}`,
        category: 'work_event',
        title: 'Yêu cầu WFH/đi muộn chờ duyệt',
        message: `${empName} gửi yêu cầu ${record.event_type} ngày ${record.event_date}.`,
        employeeId: record.employee_id,
        employeeName: empName,
        dueDate: record.event_date,
        isRead: readReminderIds.includes(`rem-work-${record.id}`),
        createdAt: record.created_at,
        severity: 'medium',
      });
    });

    // 6. Payroll not yet published or paid.
    allPayroll.forEach(record => {
      if (record.publish_status === 'published' && record.payment_status === 'Đã thanh toán') return;
      const empName = record.employees?.full_name || '';
      generated.push({
        id: `rem-pay-${record.id}`,
        category: 'payroll',
        title: record.publish_status === 'published' ? 'Phiếu lương chưa thanh toán' : 'Phiếu lương chưa phát hành',
        message: `Phiếu lương tháng ${record.month}/${record.year} của ${empName} đang ở trạng thái ${record.payment_status}.`,
        employeeId: record.employee_id,
        employeeName: empName,
        isRead: readReminderIds.includes(`rem-pay-${record.id}`),
        createdAt: record.created_at,
        severity: record.publish_status === 'published' ? 'high' : 'medium',
      });
    });

    return generated;
  }, [pendingOnboardingProfiles, employees, allContracts, allLeaveRequests, allSensitiveInfo, allOt, allWorkEvents, allPayroll, readReminderIds]);

  const markReminderAsRead = (id: string) => {
    setReadReminderIds(prev => prev.includes(id) ? prev : [...prev, id]);
  };

  const resolveReminder = (id: string) => {
    setReadReminderIds(prev => prev.includes(id) ? prev : [...prev, id]);
    showToast('Đã đánh dấu đã đọc. Cảnh báo sẽ tự mất khi dữ liệu gốc được xử lý.');
  };

  return (
    <HRContext.Provider
      value={{
        activeTab,
        setActiveTab,
        adminTab,
        setAdminTab,
        employees,
        currentEmployee,
        currentEmployeeId,
        setCurrentEmployeeId,
        selectedEmployeeIdForAdmin,
        setSelectedEmployeeIdForAdmin,
        reminders,
        pendingOnboardingCount: pendingOnboardingProfiles.length,
        markReminderAsRead,
        resolveReminder,
        isNewLeaveModalOpen,
        setIsNewLeaveModalOpen,
        isEditProfileModalOpen,
        setIsEditProfileModalOpen,
        isImportKpiModalOpen,
        setIsImportKpiModalOpen,
        isNewEmployeeModalOpen,
        setIsNewEmployeeModalOpen,
        selectedPayslipId,
        setSelectedPayslipId,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </HRContext.Provider>
  );
};

export const useHR = () => {
  const context = useContext(HRContext);
  if (!context) {
    throw new Error('useHR must be used within an HRProvider');
  }
  return context;
};
