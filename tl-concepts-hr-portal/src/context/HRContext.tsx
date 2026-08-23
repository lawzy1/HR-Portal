import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  Employee, 
  LeaveRequest, 
  LeaveStatus, 
  KpiMonthlyData, 
  ContractItem,
  SalaryHistoryItem,
  TabType,
  AdminTabType,
  OtRecord,
  HrReminder,
  KpiJobItem,
  Payslip
} from '../types';
import { INITIAL_EMPLOYEES } from '../data/initialData';

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

  // Employee CRUD & updates
  addEmployee: (newEmp: Partial<Employee>) => void;
  updateEmployeeProfile: (id: string, updatedFields: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;

  // Leave operations
  addLeaveRequest: (employeeId: string, request: {
    leaveType: LeaveRequest['leaveType'];
    startDate: string;
    endDate: string;
    totalDays: number;
    halfDayOption: LeaveRequest['halfDayOption'];
    reason: string;
  }) => void;
  updateLeaveStatus: (employeeId: string, requestId: string, status: LeaveStatus, approverComment?: string) => void;

  // KPI & OT operations
  kpiJobList: KpiJobItem[];
  addKpiJobItem: (item: Omit<KpiJobItem, 'id'>) => void;
  updateKpiJobItem: (id: string, item: Partial<KpiJobItem>) => void;
  deleteKpiJobItem: (id: string) => void;
  addOrUpdateKpi: (employeeId: string, kpiRecord: KpiMonthlyData) => void;
  importKpiRecords: (employeeId: string, kpiList: KpiMonthlyData[]) => void;
  addOtRecord: (employeeId: string, otData: Omit<OtRecord, 'id'>) => void;
  updateOtStatus: (employeeId: string, otId: string, status: 'Đã duyệt' | 'Từ chối') => void;

  // Payroll operations
  updatePayslipRecord: (employeeId: string, payslip: Payslip) => void;

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
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string>('emp-01');
  const [selectedEmployeeIdForAdmin, setSelectedEmployeeIdForAdmin] = useState<string>('emp-01');

  // Modals
  const [isNewLeaveModalOpen, setIsNewLeaveModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isImportKpiModalOpen, setIsImportKpiModalOpen] = useState(false);
  const [isNewEmployeeModalOpen, setIsNewEmployeeModalOpen] = useState(false);
  const [selectedPayslipId, setSelectedPayslipId] = useState<string | null>(null);

  // Reminders list state
  const [resolvedReminderIds, setResolvedReminderIds] = useState<string[]>([]);
  const [readReminderIds, setReadReminderIds] = useState<string[]>([]);

  // KPI Job Items for direct input
  const [kpiJobList, setKpiJobList] = useState<KpiJobItem[]>(() => {
    const saved = localStorage.getItem('tl_concepts_kpi_jobs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        id: 'job-01',
        orderJob: '22_Delphine Swe_4 interior modern: Schootstraat 128 - 3550 Heusden-Zolder',
        subTask: '',
        assigneeName: 'Bùi Ngọc Vy',
        viewsCount: 4,
        convertedKpi: 4.5,
        durationDays: 2.0,
        deadline: 'Thứ Ba, 14/07',
        month: 7,
        year: 2026,
      },
      {
        id: 'job-02-a',
        orderJob: '70_Remko_5 interior staging luxury; 4 impressions',
        subTask: '2 bedrooms',
        assigneeName: 'Bùi Ngọc Vy',
        viewsCount: 2,
        convertedKpi: 2.0,
        durationDays: 1.0,
        deadline: 'Thứ Bảy, 18/07',
        month: 7,
        year: 2026,
      },
      {
        id: 'job-02-b',
        orderJob: '70_Remko_5 interior staging luxury; 4 impressions',
        subTask: '2 living room kitchen',
        assigneeName: 'Nguyễn Văn An',
        viewsCount: 2,
        convertedKpi: 2.5,
        durationDays: 1.5,
        deadline: 'Thứ Bảy, 18/07',
        month: 7,
        year: 2026,
      },
      {
        id: 'job-03',
        orderJob: '69_Sophie_3 interior 1 garden: New request renders 2026-07-16 Matis-Riemst-Mennestraat 38',
        subTask: 'Render 3 view nội thất + 1 view sân vườn',
        assigneeName: 'Trần Thị Bình',
        viewsCount: 4,
        convertedKpi: 4.5,
        durationDays: 2.5,
        deadline: 'Thứ Tư, 22/07',
        month: 7,
        year: 2026,
      },
      {
        id: 'job-04',
        orderJob: '68_Sophie_4 interior: New request renders 2026-07-20 Matis-Bilzen-St Gertrudisplain 26',
        subTask: 'Phối cảnh góc rộng Showroom',
        assigneeName: 'Phạm Minh Đức',
        viewsCount: 4,
        convertedKpi: 4.0,
        durationDays: 2.0,
        deadline: 'Thứ Hai, 27/07',
        month: 7,
        year: 2026,
      },
    ];
  });

  useEffect(() => {
    localStorage.setItem('tl_concepts_kpi_jobs', JSON.stringify(kpiJobList));
  }, [kpiJobList]);

  const addKpiJobItem = (itemData: Omit<KpiJobItem, 'id'>) => {
    const newItem: KpiJobItem = {
      id: 'job-' + Date.now(),
      ...itemData,
    };
    setKpiJobList(prev => [newItem, ...prev]);
    showToast('Đã thêm bài / dự án KPI mới thành công!');
  };

  const updateKpiJobItem = (id: string, updatedFields: Partial<KpiJobItem>) => {
    setKpiJobList(prev => prev.map(item => item.id === id ? { ...item, ...updatedFields } : item));
    showToast('Đã cập nhật chi tiết KPI bài/dự án!');
  };

  const deleteKpiJobItem = (id: string) => {
    setKpiJobList(prev => prev.filter(item => item.id !== id));
    showToast('Đã xóa bài/dự án khỏi bảng KPI.');
  };

  const updatePayslipRecord = (employeeId: string, updatedPayslip: Payslip) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id === employeeId) {
        const existingIdx = emp.payslips.findIndex(
          p => p.month === updatedPayslip.month && p.year === updatedPayslip.year
        );
        let newPayslips = [...emp.payslips];
        if (existingIdx >= 0) {
          newPayslips[existingIdx] = updatedPayslip;
        } else {
          newPayslips.unshift(updatedPayslip);
        }
        return {
          ...emp,
          payslips: newPayslips
        };
      }
      return emp;
    }));
    showToast(`Đã lưu dữ liệu Bảng lương Tháng ${updatedPayslip.month}/${updatedPayslip.year}!`);
  };

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

  // Add Employee
  const addEmployee = (newEmpData: Partial<Employee>) => {
    const newId = 'emp-' + Date.now();
    const newCode = `NV-2026-${String(employees.length + 1).padStart(3, '0')}`;

    const newEmp: Employee = {
      id: newId,
      employeeCode: newCode,
      fullName: newEmpData.fullName || 'Nhân viên Mới',
      jobTitle: newEmpData.jobTitle || 'Chuyên viên',
      department: newEmpData.department || 'Phòng Nhân sự',
      avatar: newEmpData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
      dob: newEmpData.dob || '1995-01-01',
      gender: newEmpData.gender || 'Nam',
      maritalStatus: newEmpData.maritalStatus || 'Độc thân',
      phone: newEmpData.phone || '0900 000 000',
      email: newEmpData.email || 'employee@company.com.vn',
      permanentAddress: newEmpData.permanentAddress || 'TP. Hồ Chí Minh',
      temporaryAddress: newEmpData.temporaryAddress || 'TP. Hồ Chí Minh',
      documents: newEmpData.documents || {
        idCardNumber: '079095000000',
        idCardIssueDate: '2022-01-01',
        idCardIssuePlace: 'Cục Cảnh sát QLHC',
        taxCode: '800000000',
        socialInsuranceCode: '790000000',
      },
      bankInfo: newEmpData.bankInfo || {
        bankName: 'Vietcombank',
        accountNumber: '1000000000',
        accountHolder: (newEmpData.fullName || 'NHAN VIEN MOI').toUpperCase(),
        bankBranch: 'Chi nhánh TP.HCM',
      },
      relatives: newEmpData.relatives || [],
      startDate: newEmpData.startDate || '2026-08-01',
      contractType: newEmpData.contractType || 'HĐ xác định thời hạn (1 năm)',
      contractStartDate: '2026-08-01',
      contractEndDate: '2027-08-01',
      contractRenewalDate: '2027-07-15',
      currentSalary: newEmpData.currentSalary || 20000000,
      lastSalaryReviewDate: '2026-08-01',
      status: newEmpData.status || 'Chính thức',
      role: newEmpData.role || 'employee',
      contracts: [
        {
          id: 'ctr-' + Date.now(),
          contractCode: `HĐLĐ-2026/${String(employees.length + 1).padStart(3, '0')}`,
          type: newEmpData.contractType || 'HĐ xác định thời hạn (1 năm)',
          startDate: '2026-08-01',
          endDate: '2027-08-01',
          position: newEmpData.jobTitle || 'Chuyên viên',
          salary: newEmpData.currentSalary || 20000000,
          status: 'Đang hiệu lực',
          note: 'Hợp đồng mới tiếp nhận',
        }
      ],
      salaryHistory: [],
      payslips: [],
      leaveRequests: [],
      leaveBalance: {
        totalAccumulated: 12,
        usedDays: 0,
        pendingDays: 0,
        remainingDays: 12,
        expiryDate: '2026-12-31',
      },
      kpiData: [],
      otRecords: [],
    };

    setEmployees(prev => [newEmp, ...prev]);
    setSelectedEmployeeIdForAdmin(newId);
    showToast(`Đã thêm thành công nhân viên mới: ${newEmp.fullName} (${newEmp.employeeCode})`);
  };

  const updateEmployeeProfile = (id: string, updatedFields: Partial<Employee>) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id === id) {
        return {
          ...emp,
          ...updatedFields,
          documents: {
            ...emp.documents,
            ...(updatedFields.documents || {})
          },
          bankInfo: {
            ...emp.bankInfo,
            ...(updatedFields.bankInfo || {})
          }
        };
      }
      return emp;
    }));
    showToast('Cập nhật hồ sơ thành công!');
  };

  const deleteEmployee = (id: string) => {
    setEmployees(prev => {
      const nextList = prev.filter(e => e.id !== id);
      if (selectedEmployeeIdForAdmin === id) {
        if (nextList.length > 0) {
          setSelectedEmployeeIdForAdmin(nextList[0].id);
        } else {
          setSelectedEmployeeIdForAdmin('');
        }
      }
      if (currentEmployeeId === id) {
        if (nextList.length > 0) {
          setCurrentEmployeeId(nextList[0].id);
        }
      }
      return nextList;
    });
    showToast('Đã xóa thành công nhân viên khỏi hệ thống.');
  };

  const addLeaveRequest = (employeeId: string, requestData: {
    leaveType: LeaveRequest['leaveType'];
    startDate: string;
    endDate: string;
    totalDays: number;
    halfDayOption: LeaveRequest['halfDayOption'];
    reason: string;
  }) => {
    const empTarget = employees.find(e => e.id === employeeId);
    const newReq: LeaveRequest = {
      id: 'lr-' + Date.now(),
      employeeId,
      employeeName: empTarget?.fullName || 'Nhân viên',
      ...requestData,
      status: 'Chờ duyệt',
      createdAt: new Date().toISOString().split('T')[0],
      approverName: 'Lê Hoàng Nam (HR Manager)',
    };

    setEmployees(prev => prev.map(emp => {
      if (emp.id === employeeId) {
        const updatedRequests = [newReq, ...emp.leaveRequests];
        const totalPending = updatedRequests.filter(r => r.status === 'Chờ duyệt').reduce((acc, curr) => acc + curr.totalDays, 0);
        const totalUsed = updatedRequests.filter(r => r.status === 'Đã duyệt').reduce((acc, curr) => acc + curr.totalDays, 0);
        const remaining = Math.max(0, emp.leaveBalance.totalAccumulated - totalUsed - totalPending);

        return {
          ...emp,
          leaveRequests: updatedRequests,
          leaveBalance: {
            ...emp.leaveBalance,
            usedDays: totalUsed,
            pendingDays: totalPending,
            remainingDays: remaining,
          }
        };
      }
      return emp;
    }));

    showToast('Đã gửi yêu cầu nghỉ phép thành công! Đã gửi thông báo đến Admin.');
  };

  const updateLeaveStatus = (employeeId: string, requestId: string, status: LeaveStatus, approverComment?: string) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id === employeeId) {
        const updatedRequests = emp.leaveRequests.map(req => {
          if (req.id === requestId) {
            return {
              ...req,
              status,
              approverComment: approverComment || req.approverComment,
            };
          }
          return req;
        });

        const totalPending = updatedRequests.filter(r => r.status === 'Chờ duyệt').reduce((acc, curr) => acc + curr.totalDays, 0);
        const totalUsed = updatedRequests.filter(r => r.status === 'Đã duyệt').reduce((acc, curr) => acc + curr.totalDays, 0);
        const remaining = Math.max(0, emp.leaveBalance.totalAccumulated - totalUsed - totalPending);

        return {
          ...emp,
          leaveRequests: updatedRequests,
          leaveBalance: {
            ...emp.leaveBalance,
            usedDays: totalUsed,
            pendingDays: totalPending,
            remainingDays: remaining,
          }
        };
      }
      return emp;
    }));

    showToast(`Đã cập nhật trạng thái đơn nghỉ phép thành: ${status}`);
  };

  const addOrUpdateKpi = (employeeId: string, kpiRecord: KpiMonthlyData) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id === employeeId) {
        const existingIdx = emp.kpiData.findIndex(
          k => k.month === kpiRecord.month && k.year === kpiRecord.year
        );
        let updatedKpiList = [...emp.kpiData];
        if (existingIdx >= 0) {
          updatedKpiList[existingIdx] = kpiRecord;
        } else {
          updatedKpiList.unshift(kpiRecord);
        }
        return {
          ...emp,
          kpiData: updatedKpiList
        };
      }
      return emp;
    }));
    showToast(`Cập nhật thành công dữ liệu KPI Tháng ${kpiRecord.month}/${kpiRecord.year}`);
  };

  const importKpiRecords = (employeeId: string, kpiList: KpiMonthlyData[]) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id === employeeId) {
        const newKpiData = [...emp.kpiData];
        kpiList.forEach(imported => {
          const idx = newKpiData.findIndex(k => k.month === imported.month && k.year === imported.year);
          if (idx >= 0) {
            newKpiData[idx] = imported;
          } else {
            newKpiData.unshift(imported);
          }
        });
        return { ...emp, kpiData: newKpiData };
      }
      return emp;
    }));
    showToast(`Đã nhập thành công ${kpiList.length} bản ghi KPI tracking!`);
  };

  // OT Records
  const addOtRecord = (employeeId: string, otData: Omit<OtRecord, 'id'>) => {
    const newOt: OtRecord = {
      id: 'ot-' + Date.now(),
      ...otData,
    };
    setEmployees(prev => prev.map(emp => {
      if (emp.id === employeeId) {
        return {
          ...emp,
          otRecords: [newOt, ...(emp.otRecords || [])]
        };
      }
      return emp;
    }));
    showToast('Đã đăng ký giờ làm OT tăng ca thành công!');
  };

  const updateOtStatus = (employeeId: string, otId: string, status: 'Đã duyệt' | 'Từ chối') => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id === employeeId) {
        const updatedOt = (emp.otRecords || []).map(ot => {
          if (ot.id === otId) {
            return { ...ot, status };
          }
          return ot;
        });
        return { ...emp, otRecords: updatedOt };
      }
      return emp;
    }));
    showToast(`Đã cập nhật trạng thái OT: ${status}`);
  };

  // Dynamically generated Reminders
  const reminders = useMemo<HrReminder[]>(() => {
    const generated: HrReminder[] = [];

    employees.forEach(emp => {
      // 1. Contract expiry reminders (within 30/60 days of ~Aug 2026)
      if (emp.contractEndDate && emp.contractEndDate !== '2099-12-31') {
        generated.push({
          id: `rem-ctr-${emp.id}`,
          category: 'contract',
          title: 'Hợp đồng lao động sắp hết hạn',
          message: `Hợp đồng của ${emp.fullName} (${emp.employeeCode}) sẽ hết hạn ngày ${emp.contractEndDate}. Cần tiến hành tái ký hoặc làm thủ tục thanh lý.`,
          employeeId: emp.id,
          employeeName: emp.fullName,
          dueDate: emp.contractEndDate,
          isRead: readReminderIds.includes(`rem-ctr-${emp.id}`),
          createdAt: '2026-08-01',
          severity: 'high',
        });
      }

      // 2. Salary review due
      if (emp.lastSalaryReviewDate) {
        generated.push({
          id: `rem-sal-${emp.id}`,
          category: 'salary_review',
          title: 'Đến kỳ xét duyệt / tăng lương',
          message: `${emp.fullName} đến kỳ đánh giá hiệu suất & xem xét điều chỉnh lương vào ngày ${emp.lastSalaryReviewDate}.`,
          employeeId: emp.id,
          employeeName: emp.fullName,
          dueDate: emp.lastSalaryReviewDate,
          isRead: readReminderIds.includes(`rem-sal-${emp.id}`),
          createdAt: '2026-08-02',
          severity: 'medium',
        });
      }

      // 3. Missing documents
      if (!emp.documents.idCardFrontImage || !emp.documents.idCardBackImage || !emp.documents.taxCode) {
        generated.push({
          id: `rem-doc-${emp.id}`,
          category: 'missing_doc',
          title: 'Thiếu giấy tờ / hồ sơ cá nhân',
          message: `Nhân viên ${emp.fullName} chưa hoàn thiện upload CCCD 2 mặt hoặc mã số thuế cá nhân.`,
          employeeId: emp.id,
          employeeName: emp.fullName,
          isRead: readReminderIds.includes(`rem-doc-${emp.id}`),
          createdAt: '2026-08-05',
          severity: 'high',
        });
      }

      // 4. Leave requests pending
      emp.leaveRequests.forEach(lr => {
        if (lr.status === 'Chờ duyệt') {
          generated.push({
            id: `rem-lr-${lr.id}`,
            category: 'leave_request',
            title: 'Yêu cầu nghỉ phép chờ phê duyệt',
            message: `${emp.fullName} vừa gửi yêu cầu ${lr.leaveType} (${lr.totalDays} ngày từ ${lr.startDate}). Lý do: "${lr.reason}"`,
            employeeId: emp.id,
            employeeName: emp.fullName,
            dueDate: lr.startDate,
            isRead: readReminderIds.includes(`rem-lr-${lr.id}`),
            createdAt: lr.createdAt,
            severity: 'medium',
          });
        }
      });

      // 5. Payroll pending
      emp.payslips.forEach(ps => {
        if (ps.paymentStatus === 'Chờ thanh toán') {
          generated.push({
            id: `rem-pay-${ps.id}`,
            category: 'payroll',
            title: 'Bảng lương chưa hoàn tất thanh toán',
            message: `Payroll tháng ${ps.month}/${ps.year} của ${emp.fullName} chưa hoàn tất duyệt chi trả.`,
            employeeId: emp.id,
            employeeName: emp.fullName,
            isRead: readReminderIds.includes(`rem-pay-${ps.id}`),
            createdAt: '2026-08-08',
            severity: 'low',
          });
        }
      });
    });

    return generated.filter(r => !resolvedReminderIds.includes(r.id));
  }, [employees, readReminderIds, resolvedReminderIds]);

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
        addEmployee,
        updateEmployeeProfile,
        deleteEmployee,
        addLeaveRequest,
        updateLeaveStatus,
        kpiJobList,
        addKpiJobItem,
        updateKpiJobItem,
        deleteKpiJobItem,
        addOrUpdateKpi,
        importKpiRecords,
        addOtRecord,
        updateOtStatus,
        updatePayslipRecord,
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
