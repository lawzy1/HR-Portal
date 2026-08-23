import React, { useState, useEffect, useMemo } from 'react';
import { useHR } from '../context/HRContext';
import { useAuth } from '../context/AuthContext';
import { Relative, ContractType, EmployeeStatus, UserRole, JOB_TITLES } from '../types';
import { 
  X, 
  User, 
  CreditCard, 
  Landmark, 
  Users, 
  Save, 
  Upload, 
  Plus, 
  Trash2, 
  FileText, 
  Calendar, 
  DollarSign, 
  Camera,
  MapPin,
  Briefcase,
  ShieldCheck,
  HelpCircle,
  Smartphone,
  Sparkles,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { VneidGuideModal } from './VneidGuideModal';
import { VNEID_SAMPLE_IMAGE } from '../constants/vneidSample';

export const EditProfileModal: React.FC = () => {
  const {
    employees,
    currentEmployee,
    selectedEmployeeIdForAdmin,
    isEditProfileModalOpen,
    setIsEditProfileModalOpen,
    updateEmployeeProfile
  } = useHR();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'general' | 'contract' | 'contact' | 'documents' | 'bank' | 'relatives'>('general');

  // Compute target employee to edit
  const targetEmployee = useMemo(() => {
    if (isAdmin && selectedEmployeeIdForAdmin) {
      return employees.find(e => e.id === selectedEmployeeIdForAdmin) || currentEmployee;
    }
    return currentEmployee;
  }, [isAdmin, selectedEmployeeIdForAdmin, employees, currentEmployee]);

  // Tab 1: General & Job Info
  const [fullName, setFullName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState<EmployeeStatus>('Chính thức');
  const [role, setRole] = useState<UserRole>('employee');
  const [avatar, setAvatar] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'Nam' | 'Nữ' | 'Khác'>('Nam');
  const [maritalStatus, setMaritalStatus] = useState<'Độc thân' | 'Đã kết hôn'>('Độc thân');

  // Tab 2: Contract & Salary
  const [startDate, setStartDate] = useState('');
  const [contractType, setContractType] = useState<ContractType>('HĐ xác định thời hạn (1 năm)');
  const [contractStartDate, setContractStartDate] = useState('');
  const [contractEndDate, setContractEndDate] = useState('');
  const [contractRenewalDate, setContractRenewalDate] = useState('');
  const [currentSalary, setCurrentSalary] = useState<number>(0);
  const [lastSalaryReviewDate, setLastSalaryReviewDate] = useState('');

  // Tab 3: Contact & Address
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [temporaryAddress, setTemporaryAddress] = useState('');

  // Tab 4: Documents & CCCD Upload & VNeID
  const [idCardNumber, setIdCardNumber] = useState('');
  const [idCardIssueDate, setIdCardIssueDate] = useState('');
  const [idCardIssuePlace, setIdCardIssuePlace] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [socialInsuranceCode, setSocialInsuranceCode] = useState('');
  const [idCardFrontImage, setIdCardFrontImage] = useState('');
  const [idCardBackImage, setIdCardBackImage] = useState('');
  const [vneidResidencyImage, setVneidResidencyImage] = useState('');
  const [isVneidGuideOpen, setIsVneidGuideOpen] = useState(false);

  // Tab 5: Bank Info
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [bankBranch, setBankBranch] = useState('');

  // Tab 6: Relatives
  const [relatives, setRelatives] = useState<Relative[]>([]);

  // Reset form values when modal opens or target employee changes
  useEffect(() => {
    if (targetEmployee && isEditProfileModalOpen) {
      setFullName(targetEmployee.fullName || '');
      setEmployeeCode(targetEmployee.employeeCode || '');
      setJobTitle(targetEmployee.jobTitle || '');
      setDepartment(targetEmployee.department || '');
      setStatus(targetEmployee.status || 'Chính thức');
      setRole(targetEmployee.role || 'employee');
      setAvatar(targetEmployee.avatar || '');
      setDob(targetEmployee.dob || '');
      setGender(targetEmployee.gender || 'Nam');
      setMaritalStatus(targetEmployee.maritalStatus || 'Độc thân');

      setStartDate(targetEmployee.startDate || '');
      setContractType(targetEmployee.contractType || 'HĐ xác định thời hạn (1 năm)');
      setContractStartDate(targetEmployee.contractStartDate || '');
      setContractEndDate(targetEmployee.contractEndDate || '');
      setContractRenewalDate(targetEmployee.contractRenewalDate || '');
      setCurrentSalary(targetEmployee.currentSalary || 0);
      setLastSalaryReviewDate(targetEmployee.lastSalaryReviewDate || '');

      setPhone(targetEmployee.phone || '');
      setEmail(targetEmployee.email || '');
      setPermanentAddress(targetEmployee.permanentAddress || '');
      setTemporaryAddress(targetEmployee.temporaryAddress || '');

      setIdCardNumber(targetEmployee.documents?.idCardNumber || '');
      setIdCardIssueDate(targetEmployee.documents?.idCardIssueDate || '');
      setIdCardIssuePlace(targetEmployee.documents?.idCardIssuePlace || '');
      setTaxCode(targetEmployee.documents?.taxCode || '');
      setSocialInsuranceCode(targetEmployee.documents?.socialInsuranceCode || '');
      setIdCardFrontImage(targetEmployee.documents?.idCardFrontImage || '');
      setIdCardBackImage(targetEmployee.documents?.idCardBackImage || '');
      setVneidResidencyImage(targetEmployee.documents?.vneidResidencyImage || '');

      setBankName(targetEmployee.bankInfo?.bankName || '');
      setAccountNumber(targetEmployee.bankInfo?.accountNumber || '');
      setAccountHolder(targetEmployee.bankInfo?.accountHolder || '');
      setBankBranch(targetEmployee.bankInfo?.bankBranch || targetEmployee.bankInfo?.branch || '');

      setRelatives(targetEmployee.relatives || []);
    }
  }, [targetEmployee, isEditProfileModalOpen]);

  if (!isEditProfileModalOpen || !targetEmployee) return null;

  // Image Upload Handler (Avatar, CCCD Front/Back & VNeID)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'avatar' | 'front' | 'back' | 'vneid') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (target === 'avatar') setAvatar(result);
        else if (target === 'front') setIdCardFrontImage(result);
        else if (target === 'back') setIdCardBackImage(result);
        else if (target === 'vneid') setVneidResidencyImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddRelative = () => {
    const newRel: Relative = {
      id: 'rel-' + Date.now(),
      name: '',
      relationship: 'Người thân',
      phone: '',
      address: '',
      isEmergencyContact: relatives.length === 0,
    };
    setRelatives([...relatives, newRel]);
  };

  const handleRemoveRelative = (id: string) => {
    setRelatives(relatives.filter(r => r.id !== id));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    updateEmployeeProfile(targetEmployee.id, {
      fullName,
      employeeCode,
      jobTitle,
      department,
      status,
      role,
      avatar,
      dob,
      gender,
      maritalStatus,
      startDate,
      contractType,
      contractStartDate,
      contractEndDate,
      contractRenewalDate,
      currentSalary,
      lastSalaryReviewDate,
      phone,
      email,
      permanentAddress,
      temporaryAddress,
      documents: {
        idCardNumber,
        idCardIssueDate,
        idCardIssuePlace,
        taxCode,
        socialInsuranceCode,
        idCardFrontImage,
        idCardBackImage,
        vneidResidencyImage,
      },
      bankInfo: {
        bankName,
        accountNumber,
        accountHolder: accountHolder.toUpperCase(),
        bankBranch,
        branch: bankBranch,
      },
      relatives,
    });

    setIsEditProfileModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="relative group cursor-pointer">
              <img src={avatar || targetEmployee.avatar} alt="" className="w-11 h-11 rounded-full object-cover border-2 border-emerald-500" />
              <label className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="w-4 h-4 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'avatar')} />
              </label>
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>Chỉnh sửa toàn bộ Hồ sơ Nhân viên</span>
                <span className="text-xs bg-emerald-600/90 text-white font-mono font-bold px-2 py-0.5 rounded-md">
                  {employeeCode || targetEmployee.employeeCode}
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Đang chỉnh sửa cho: <strong className="text-emerald-400">{fullName || targetEmployee.fullName}</strong> ({jobTitle || targetEmployee.jobTitle})
              </p>
            </div>
          </div>

          <button 
            onClick={() => setIsEditProfileModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'general'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>1. Thông tin Chung</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contract')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'contract'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>2. Hợp đồng & Lương</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contact')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'contact'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>3. Liên hệ & Địa chỉ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'documents'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>4. CCCD & Upload Ảnh</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bank')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'bank'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>5. Ngân hàng</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('relatives')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'relatives'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>6. Người thân</span>
          </button>
        </div>

        {/* Tab content area */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* TAB 1: General & Job Info */}
          {activeTab === 'general' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Họ và tên nhân viên *:</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã nhân viên (NV) *:</label>
                  <input
                    type="text"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chức danh công việc *:</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phòng ban *:</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Phòng Thiết kế Nội thất">Phòng Thiết kế Nội thất</option>
                    <option value="Phòng Thiết kế Kiến trúc">Phòng Thiết kế Kiến trúc</option>
                    <option value="Ban Quản trị & Admin Văn phòng">Ban Quản trị & Admin Văn phòng</option>
                    <option value="Phòng Thiết kế & Quản lý Chất lượng">Phòng Thiết kế & Quản lý Chất lượng</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Trạng thái làm việc *:</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as EmployeeStatus)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Chính thức">Chính thức</option>
                    <option value="Thử việc">Thử việc</option>
                    <option value="Mới tiếp nhận">Mới tiếp nhận</option>
                    <option value="Đã nghỉ việc">Đã nghỉ việc</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quyền hệ thống (Role):</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="employee">Nhân viên (Employee)</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                    <option value="hr">Quản lý HR</option>
                    <option value="manager">Quản lý Phòng ban</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày sinh:</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Giới tính:</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tình trạng hôn nhân:</label>
                  <select
                    value={maritalStatus}
                    onChange={(e) => setMaritalStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Độc thân">Độc thân</option>
                    <option value="Đã kết hôn">Đã kết hôn</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Link Ảnh Avatar đại diện:</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                  <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer flex items-center space-x-1 shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Ảnh</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'avatar')} />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Contract & Salary */}
          {activeTab === 'contract' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày bắt đầu vào làm việc *:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Loại hợp đồng hiện tại *:</label>
                  <select
                    value={contractType}
                    onChange={(e) => setContractType(e.target.value as ContractType)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-indigo-700 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Thử việc">Thử việc</option>
                    <option value="HĐ xác định thời hạn (1 năm)">HĐ xác định thời hạn (1 năm)</option>
                    <option value="HĐ xác định thời hạn (2 năm)">HĐ xác định thời hạn (2 năm)</option>
                    <option value="HĐ không xác định thời hạn">HĐ không xác định thời hạn</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày bắt đầu hợp đồng:</label>
                  <input
                    type="date"
                    value={contractStartDate}
                    onChange={(e) => setContractStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày hết hạn hợp đồng:</label>
                  <input
                    type="date"
                    value={contractEndDate}
                    onChange={(e) => setContractEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-rose-700 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày gia hạn hợp đồng dự kiến:</label>
                  <input
                    type="date"
                    value={contractRenewalDate}
                    onChange={(e) => setContractRenewalDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mức lương cơ bản thỏa thuận (VND) *:</label>
                  <input
                    type="number"
                    step="500000"
                    value={currentSalary}
                    onChange={(e) => setCurrentSalary(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-emerald-700 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày review xét tăng lương gần nhất:</label>
                  <input
                    type="date"
                    value={lastSalaryReviewDate}
                    onChange={(e) => setLastSalaryReviewDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Contact & Address */}
          {activeTab === 'contact' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số điện thoại liên hệ *:</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 font-bold text-blue-700 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email làm việc công ty *:</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Địa chỉ thường trú (Hộ khẩu trên CCCD):</label>
                <textarea
                  rows={2}
                  value={permanentAddress}
                  onChange={(e) => setPermanentAddress(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                ></textarea>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Địa chỉ tạm trú hiện tại:</label>
                <textarea
                  rows={2}
                  value={temporaryAddress}
                  onChange={(e) => setTemporaryAddress(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                ></textarea>
              </div>
            </div>
          )}

          {/* TAB 4: Documents & CCCD Upload */}
          {activeTab === 'documents' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số CCCD / Hộ chiếu *:</label>
                  <input
                    type="text"
                    value={idCardNumber}
                    onChange={(e) => setIdCardNumber(e.target.value)}
                    className="w-full px-3 py-2 font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày cấp:</label>
                  <input
                    type="date"
                    value={idCardIssueDate}
                    onChange={(e) => setIdCardIssueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nơi cấp:</label>
                  <input
                    type="text"
                    value={idCardIssuePlace}
                    onChange={(e) => setIdCardIssuePlace(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã số thuế cá nhân (MST):</label>
                  <input
                    type="text"
                    value={taxCode}
                    onChange={(e) => setTaxCode(e.target.value)}
                    className="w-full px-3.5 py-2 font-mono font-semibold text-indigo-700 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã số Bảo hiểm xã hội (BHXH):</label>
                  <input
                    type="text"
                    value={socialInsuranceCode}
                    onChange={(e) => setSocialInsuranceCode(e.target.value)}
                    className="w-full px-3.5 py-2 font-mono font-semibold text-emerald-700 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* ID Card Front / Back Upload Section */}
              <div className="pt-2 space-y-4">
                <div>
                  <label className="block font-bold text-slate-800 mb-2">Tải lên & Lưu trữ Ảnh CCCD 2 Mặt:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Front Upload */}
                    <div className="border-2 border-dashed border-slate-300 rounded-2xl p-3 bg-slate-50 text-center relative group">
                      <p className="text-[11px] font-bold text-slate-700 mb-2">Mặt trước CCCD</p>
                      {idCardFrontImage ? (
                        <div className="relative">
                          <img src={idCardFrontImage} alt="Mặt trước CCCD" className="w-full h-40 object-cover rounded-xl border border-slate-200" />
                          <label className="absolute inset-0 bg-slate-900/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs font-bold cursor-pointer rounded-xl transition-opacity">
                            <Upload className="w-6 h-6 mb-1 text-emerald-400" />
                            <span>Thay đổi ảnh mặt trước</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'front')} />
                          </label>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center h-36 cursor-pointer text-slate-500 hover:text-indigo-600 transition-colors">
                          <Upload className="w-7 h-7 mb-1 text-slate-400" />
                          <span className="text-xs font-bold">Chọn tệp ảnh mặt trước</span>
                          <span className="text-[10px] text-slate-400">PNG, JPG, WEBP từ máy tính</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'front')} />
                        </label>
                      )}
                    </div>

                    {/* Back Upload */}
                    <div className="border-2 border-dashed border-slate-300 rounded-2xl p-3 bg-slate-50 text-center relative group">
                      <p className="text-[11px] font-bold text-slate-700 mb-2">Mặt sau CCCD</p>
                      {idCardBackImage ? (
                        <div className="relative">
                          <img src={idCardBackImage} alt="Mặt sau CCCD" className="w-full h-40 object-cover rounded-xl border border-slate-200" />
                          <label className="absolute inset-0 bg-slate-900/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs font-bold cursor-pointer rounded-xl transition-opacity">
                            <Upload className="w-6 h-6 mb-1 text-emerald-400" />
                            <span>Thay đổi ảnh mặt sau</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'back')} />
                          </label>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center h-36 cursor-pointer text-slate-500 hover:text-indigo-600 transition-colors">
                          <Upload className="w-7 h-7 mb-1 text-slate-400" />
                          <span className="text-xs font-bold">Chọn tệp ảnh mặt sau</span>
                          <span className="text-[10px] text-slate-400">PNG, JPG, WEBP từ máy tính</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'back')} />
                        </label>
                      )}
                    </div>

                  </div>
                </div>

                {/* VNeID Residency Information Upload Box */}
                <div className="p-4 bg-gradient-to-br from-red-50/80 via-rose-50/50 to-orange-50/40 rounded-2xl border-2 border-red-200/90 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-red-200/70">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-xs text-red-950 flex items-center gap-2">
                          <span>Ảnh chụp trang "Thông tin cư trú" (Ứng dụng VNeID)</span>
                          <span className="text-[10px] bg-red-600 text-white px-2 py-0.2 rounded-full font-bold">
                            Mức 2
                          </span>
                        </h4>
                        <p className="text-[11px] text-red-700">Dùng xác thực địa chỉ thường trú, tạm trú và thông tin hộ gia đình</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsVneidGuideOpen(true)}
                      className="self-start sm:self-auto px-3 py-1.5 bg-white hover:bg-red-50 text-red-700 border border-red-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <HelpCircle className="w-4 h-4 text-red-600" />
                      <span>Xem ảnh mẫu hướng dẫn</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pt-1">
                    {/* Upload / Image Area (7 cols) */}
                    <div className="md:col-span-7">
                      <div className="border-2 border-dashed border-red-300 rounded-2xl p-3 bg-white text-center relative group min-h-[160px] flex flex-col justify-center">
                        {vneidResidencyImage ? (
                          <div className="relative">
                            <img
                              src={vneidResidencyImage}
                              alt="Ảnh chụp Thông tin cư trú VNeID"
                              className="w-full h-48 object-cover rounded-xl border border-red-200"
                            />
                            <div className="absolute inset-0 bg-slate-900/75 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs font-bold rounded-xl transition-opacity gap-2">
                              <label className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors">
                                <Upload className="w-4 h-4" />
                                <span>Thay ảnh khác</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleFileUpload(e, 'vneid')}
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => setVneidResidencyImage('')}
                                className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-[11px] cursor-pointer"
                              >
                                Xóa ảnh hiện tại
                              </button>
                            </div>
                            <span className="absolute bottom-2 left-2 bg-emerald-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Đã tải lên ảnh VNeID
                            </span>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center py-6 cursor-pointer text-slate-600 hover:text-red-600 transition-colors">
                            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-2">
                              <Smartphone className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold text-slate-800">Tải lên ảnh chụp màn hình VNeID</span>
                            <span className="text-[11px] text-slate-500 mt-0.5">Hỗ trợ định dạng JPG, PNG, WEBP từ điện thoại/máy tính</span>
                            <span className="mt-2 px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold flex items-center gap-1">
                              <Upload className="w-3.5 h-3.5" /> Chọn ảnh tải lên
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, 'vneid')}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Quick Guide Card + Sample Preview Thumbnail (5 cols) */}
                    <div className="md:col-span-5 bg-white p-3.5 rounded-2xl border border-red-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-red-900 uppercase tracking-wide">
                          Ảnh Mẫu Hướng Dẫn
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsVneidGuideOpen(true)}
                          className="text-[11px] text-red-600 font-bold hover:underline"
                        >
                          Phóng to
                        </button>
                      </div>

                      <div 
                        onClick={() => setIsVneidGuideOpen(true)}
                        className="relative rounded-xl overflow-hidden bg-slate-900 h-32 border border-slate-700 cursor-pointer group flex items-center justify-center"
                      >
                        <img
                          src={VNEID_SAMPLE_IMAGE}
                          alt="Ảnh mẫu VNeID Thông tin cư trú"
                          className="w-full h-full object-cover object-top opacity-90 group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                          <Eye className="w-4 h-4" />
                          <span>Xem ảnh mẫu chi tiết</span>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        Đăng nhập <strong>VNeID</strong> → <strong>Ví giấy tờ</strong> → <strong>Thông tin cư trú</strong> → Chụp toàn bộ màn hình nơi cư trú.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 5: Bank Info */}
          {activeTab === 'bank' && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên Ngân hàng nhận lương *:</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="VD: Vietcombank, Techcombank, MB Bank..."
                  className="w-full px-3.5 py-2 font-bold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số tài khoản nhận lương *:</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-3.5 py-2 font-mono font-bold text-blue-700 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên chủ tài khoản (Viết hoa không dấu) *:</label>
                  <input
                    type="text"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2 font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Chi nhánh ngân hàng mở thẻ:</label>
                <input
                  type="text"
                  value={bankBranch}
                  onChange={(e) => setBankBranch(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* TAB 6: Relatives */}
          {activeTab === 'relatives' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <p className="font-bold text-slate-800">Danh sách Người thân & Người liên hệ khẩn cấp</p>
                <button
                  type="button"
                  onClick={handleAddRelative}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm người thân mới</span>
                </button>
              </div>

              {relatives.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center border border-dashed border-slate-200 rounded-xl">
                  Chưa khai báo thông tin người thân. Bấm nút "Thêm người thân mới" ở trên.
                </p>
              ) : (
                <div className="space-y-3">
                  {relatives.map((rel, index) => (
                    <div key={rel.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-900">Người thân #{index + 1}</span>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={rel.isEmergencyContact}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setRelatives(relatives.map(r => r.id === rel.id ? { ...r, isEmergencyContact: checked } : r));
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>Liên hệ khẩn cấp</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveRelative(rel.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <input
                          type="text"
                          placeholder="Họ và tên"
                          value={rel.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRelatives(relatives.map(r => r.id === rel.id ? { ...r, name: val } : r));
                          }}
                          className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold"
                        />
                        <input
                          type="text"
                          placeholder="Mối quan hệ (Vợ/Chồng/Mẹ...)"
                          value={rel.relationship}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRelatives(relatives.map(r => r.id === rel.id ? { ...r, relationship: val } : r));
                          }}
                          className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                        <input
                          type="text"
                          placeholder="Số điện thoại"
                          value={rel.phone}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRelatives(relatives.map(r => r.id === rel.id ? { ...r, phone: val } : r));
                          }}
                          className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                        />
                        <input
                          type="text"
                          placeholder="Địa chỉ"
                          value={rel.address}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRelatives(relatives.map(r => r.id === rel.id ? { ...r, address: val } : r));
                          }}
                          className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsEditProfileModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Lưu thay đổi hồ sơ nhân viên</span>
            </button>
          </div>

        </form>

      </div>

      {/* VNeID Sample Guide Modal */}
      <VneidGuideModal
        isOpen={isVneidGuideOpen}
        onClose={() => setIsVneidGuideOpen(false)}
      />
    </div>
  );
};
