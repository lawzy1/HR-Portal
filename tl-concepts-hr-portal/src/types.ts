export type ContractType = 'Thử việc' | 'HĐ xác định thời hạn (1 năm)' | 'HĐ xác định thời hạn (2 năm)' | 'HĐ không xác định thời hạn';

export type ContractStatus = 'Đang hiệu lực' | 'Sắp hết hạn' | 'Hết hạn' | 'Đã gia hạn';

export type LeaveType = 'Nghỉ phép năm' | 'Nghỉ ốm / BHXH' | 'Nghỉ không lương' | 'Nghỉ thai sản' | 'Nghỉ việc riêng (kết hôn, tang lễ)';

export type LeaveStatus = 'Chờ duyệt' | 'Đã duyệt' | 'Từ chối';

export type HalfDayOption = 'Cả ngày' | 'Buổi sáng' | 'Buổi chiều';

export type EmployeeStatus = 'Chính thức' | 'Thử việc' | 'Mới tiếp nhận' | 'Đã nghỉ việc';

export const JOB_TITLES = [
  'Thiết kế nội thất',
  'Thiết kế kiến trúc',
  'Quản lý/Admin văn phòng',
  'Thiết kế nội thất kiêm QA/QC'
] as const;

export type JobTitleType = typeof JOB_TITLES[number] | string;

export type UserRole = 'admin' | 'hr' | 'manager' | 'employee';

export type AppMode = 'user' | 'admin';

export type TabType = 'dashboard' | 'profile' | 'contracts' | 'payslips' | 'leaves' | 'kpi';

export type AdminTabType = 
  | 'admin-dashboard' 
  | 'admin-profile'
  | 'admin-employees' 
  | 'admin-contracts' 
  | 'admin-leaves' 
  | 'admin-kpi' 
  | 'admin-payroll' 
  | 'admin-reminders' 
  | 'admin-reports'
  | 'admin-settings';

export interface Relative {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  address: string;
  isEmergencyContact: boolean;
}

export interface DocumentInfo {
  idCardNumber: string;
  idCardIssueDate: string;
  idCardIssuePlace: string;
  idCardFrontImage?: string;
  idCardBackImage?: string;
  vneidResidencyImage?: string;
  taxCode: string;
  socialInsuranceCode: string;
}

export interface BankInfo {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  branch?: string;
  bankBranch?: string;
}

export interface ContractItem {
  id: string;
  contractCode: string;
  type: ContractType;
  startDate: string;
  endDate: string;
  position: string;
  salary: number;
  status: ContractStatus;
  note?: string;
}

export interface SalaryHistoryItem {
  id: string;
  effectiveDate: string;
  oldSalary: number;
  newSalary: number;
  changeType: string;
  reason: string;
  approvedBy: string;
}

export interface KpiJobItem {
  id: string;
  orderJob: string;
  subTask?: string;
  parentTask?: string;
  assigneeName: string; // employee fullName or username
  employeeId?: string;
  viewsCount: number;
  convertedKpi: number;
  durationDays: number;
  deadline?: string; // Format: Thứ xx, dd/mm
  month: number;
  year: number;
}

export interface LeaveRequest {
  id: string;
  employeeId?: string;
  employeeName?: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  halfDayOption: HalfDayOption;
  reason: string;
  status: LeaveStatus;
  createdAt: string;
  approverName: string;
  approverComment?: string;
}

export interface LeaveBalance {
  totalAccumulated: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
  expiryDate: string;
}

export interface AdditionDeductionItem {
  id: string;
  type: 'plus' | 'minus';
  title: string;
  amount: number;
  reason: string;
}

export interface OtRecord {
  id: string;
  date: string;
  hours: number;
  viewsRenderCount?: number;
  reason: string;
  approverName: string;
  payType: 'Thanh toán 150%' | 'Thanh toán 200%' | 'Thanh toán 300%' | 'Nghỉ bù' | string;
  otPercentage?: number; // e.g. 150, 200, 300
  status: 'Đã hoàn thành' | 'Đang thực hiện' | 'Upcoming' | 'Chờ duyệt' | 'Đã duyệt' | 'Từ chối';
  amount: number;
}

export interface KpiMonthlyData {
  id: string;
  month: number;
  year: number;
  renderedViewsActual: number;
  kpiConvertedViews: number;
  kpiTarget: number;
  completionPercentage: number;
  otHours: number;
  otHourlyRate: number;
  bonusAmount: number;
  benefitAmount: number;
  additionsDeductions: AdditionDeductionItem[];
  notes: string;
}

export interface HrReminder {
  id: string;
  category: 'contract' | 'contract_missing' | 'salary_review' | 'missing_doc' | 'payroll' | 'leave_request' | 'ot_request' | 'work_event' | 'onboarding_review';
  title: string;
  message: string;
  employeeId?: string;
  employeeName?: string;
  dueDate?: string;
  isRead: boolean;
  createdAt: string;
  severity: 'high' | 'medium' | 'low';
}

export interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  jobTitle: string;
  department: string;
  avatar: string;
  dob: string;
  gender: 'Nam' | 'Nữ' | 'Khác';
  maritalStatus: 'Độc thân' | 'Đã kết hôn';
  phone: string;
  email: string;
  permanentAddress: string;
  temporaryAddress: string;
  documents: DocumentInfo;
  bankInfo: BankInfo;
  relatives: Relative[];
  
  startDate: string;
  contractType: ContractType;
  contractStartDate: string;
  contractEndDate: string;
  contractRenewalDate: string;
  currentSalary: number;
  lastSalaryReviewDate: string;
  
  status?: EmployeeStatus;
  role?: UserRole;

  contracts: ContractItem[];
  salaryHistory: SalaryHistoryItem[];
  leaveRequests: LeaveRequest[];
  leaveBalance: LeaveBalance;
  kpiData: KpiMonthlyData[];
  otRecords?: OtRecord[];
}
