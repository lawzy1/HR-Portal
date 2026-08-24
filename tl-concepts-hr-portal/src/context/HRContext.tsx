import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Employee,
  ContractItem,
  SalaryHistoryItem,
  TabType,
  AdminTabType,
  HrReminder
} from '../types';
import { INITIAL_EMPLOYEES } from '../data/initialData';
import { useEmployees, useAllEmployeeSensitiveInfo } from '../hooks/useEmployees';
import { useAllContracts } from '../hooks/useContracts';
import { useAllLeaveRequests } from '../hooks/useLeave';

interface HRContextType {
  // Active navigation tabs
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  adminTab: AdminTabType;
  setAdminTab: (tab: AdminTabType) => void;

  // Employees state
  employees: Employee[];
  currentEmployee: Employee;
  currentEmployeeId: string;
  setCurrentEmployeeId: (id: string) => void;
  
  // Admin selected employee for detailed views
  selectedEmployeeIdForAdmin: string;
  setSelectedEmployeeIdForAdmin: (id: string) => void;

  // Reminders & Alerts
  reminders: HrReminder[];
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

export const HRProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const local = localStorage.getItem('misa_bamboo_hr_employees_v2');
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        console.error('Failed to parse local employee storage', e);
      }
    }
    return INITIAL_EMPLOYEES;
  });

  // Active navigation
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [adminTab, setAdminTab] = useState<AdminTabType>('admin-dashboard');

  // Employee Selection
  // Empty, not a mock id like 'emp-01' — these now also feed real Supabase
  // queries (useEmployee, useContracts, ...) via hooks that key off this id,
  // and a non-UUID default there causes a 400 from PostgREST on every page
  // load. Falls back to employees[0] below for the still-mock-data views.
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string>('');
  const [selectedEmployeeIdForAdmin, setSelectedEmployeeIdForAdmin] = useState<string>('');

  // Modals
  const [isNewLeaveModalOpen, setIsNewLeaveModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isImportKpiModalOpen, setIsImportKpiModalOpen] = useState(false);
  const [isNewEmployeeModalOpen, setIsNewEmployeeModalOpen] = useState(false);
  const [selectedPayslipId, setSelectedPayslipId] = useState<string | null>(null);

  // Reminders list state
  const [resolvedReminderIds, setResolvedReminderIds] = useState<string[]>([]);
  const [readReminderIds, setReadReminderIds] = useState<string[]>([]);

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  useEffect(() => {
    localStorage.setItem('misa_bamboo_hr_employees_v2', JSON.stringify(employees));
  }, [employees]);

  const currentEmployee = useMemo(() => {
    return employees.find(e => e.id === currentEmployeeId) || employees[0];
  }, [employees, currentEmployeeId]);

  // Dynamically generated Reminders — sourced from real Supabase data
  // (employees, contracts, leave_requests, employee_sensitive_info), not the
  // mock `employees` state above. read/resolved tracking stays local-only;
  // there's no reminders table, this is just dismissal state for the UI.
  const { data: realEmployeesData } = useEmployees();
  const realEmployees = useMemo(() => realEmployeesData || [], [realEmployeesData]);
  const { data: allContractsData } = useAllContracts();
  const allContracts = useMemo(() => allContractsData || [], [allContractsData]);
  const { data: allLeaveRequestsData } = useAllLeaveRequests();
  const allLeaveRequests = useMemo(() => allLeaveRequestsData || [], [allLeaveRequestsData]);
  const { data: allSensitiveInfoData } = useAllEmployeeSensitiveInfo();
  const allSensitiveInfo = useMemo(() => allSensitiveInfoData || [], [allSensitiveInfoData]);

  const reminders = useMemo<HrReminder[]>(() => {
    const generated: HrReminder[] = [];

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
        severity: 'high',
      });
    });

    // 2. Salary review due
    realEmployees.forEach(emp => {
      if (emp.last_salary_review_date) {
        generated.push({
          id: `rem-sal-${emp.id}`,
          category: 'salary_review',
          title: 'Đến kỳ xét duyệt / tăng lương',
          message: `${emp.full_name} đến kỳ đánh giá hiệu suất & xem xét điều chỉnh lương vào ngày ${emp.last_salary_review_date}.`,
          employeeId: emp.id,
          employeeName: emp.full_name,
          dueDate: emp.last_salary_review_date,
          isRead: readReminderIds.includes(`rem-sal-${emp.id}`),
          createdAt: emp.created_at,
          severity: 'medium',
        });
      }
    });

    // 3. Missing documents
    const sensitiveByEmployee = new Map(allSensitiveInfo.map(s => [s.employee_id, s]));
    realEmployees.forEach(emp => {
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

    return generated.filter(r => !resolvedReminderIds.includes(r.id));
  }, [realEmployees, allContracts, allLeaveRequests, allSensitiveInfo, readReminderIds, resolvedReminderIds]);

  const markReminderAsRead = (id: string) => {
    setReadReminderIds(prev => [...prev, id]);
  };

  const resolveReminder = (id: string) => {
    setResolvedReminderIds(prev => [...prev, id]);
    showToast('Đã đánh dấu xử lý xong nhắc nhở.');
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
