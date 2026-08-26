import React, { useState, useEffect, useMemo } from 'react';
import { useHR } from '../context/HRContext';
import { useAuth } from '../context/AuthContext';
import {
  useEmployee,
  useUpdateEmployee,
  useEmployeeSensitiveInfo,
  useUpsertEmployeeSensitiveInfo,
  useEmployeeRelatives,
  useSetEmployeeRelatives,
  type RelativeInput,
} from '../hooks/useEmployees';
import { useFileUpload, useSignedImageUrl } from '../hooks/useFileUpload';
import { useRequestOwnProfileChange } from '../hooks/useProfileChangeRequest';
import { CurrencyInput } from './CurrencyInput';
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
  Camera,
  MapPin,
  Briefcase,
  ShieldCheck,
  HelpCircle,
  Smartphone,
  Eye,
  Lock,
  Loader2,
  Award,
  Send,
} from 'lucide-react';
import { VneidGuideModal } from './VneidGuideModal';
import { VNEID_SAMPLE_IMAGE } from '../constants/vneidSample';

// Free-text + suggestions, not a rigid enum — studio can define new levels
// without a schema change or a level-management screen.
const KPI_LEVEL_SUGGESTIONS = [
  'Level 1: Junior 3D Artist',
  'Level 2: 3D Artist',
  'Level 3: 3D Artist - Interior',
  'Level 3: 3D Artist - Exterior',
  'Level 4: Mid-level 3D Artist - Interior',
  'Level 4: Mid-level 3D Artist - Exterior',
  'Level 5: Senior 3D Artist',
];

// Renders a stored Storage path as a signed preview, or a freshly-picked
// local file before it's uploaded — one component instead of repeating the
// "which URL do I show" logic for avatar / CCCD front / back / VNeID.
const ImageUploadSlot: React.FC<{
  label: string;
  path: string | null;
  pendingFile: File | null;
  onPick: (file: File) => void;
  onClear?: () => void;
  disabled?: boolean;
  heightClass?: string;
}> = ({ label, path, pendingFile, onPick, onClear, disabled, heightClass = 'h-40' }) => {
  const { data: signedUrl } = useSignedImageUrl(pendingFile ? null : path);
  const previewUrl = pendingFile ? URL.createObjectURL(pendingFile) : signedUrl;

  return (
    <div className="border-2 border-dashed border-slate-300 rounded-2xl p-3 bg-slate-50 text-center relative group">
      <p className="text-[11px] font-bold text-slate-700 mb-2">{label}</p>
      {previewUrl ? (
        <div className="relative">
          <img src={previewUrl} alt={label} className={`w-full ${heightClass} object-cover rounded-xl border border-slate-200`} />
          {!disabled && (
            <label className="absolute inset-0 bg-slate-900/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs font-bold cursor-pointer rounded-xl transition-opacity gap-1.5">
              <Upload className="w-6 h-6 text-success-400" />
              <span>Thay đổi ảnh</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
              />
              {onClear && (
                <button type="button" onClick={onClear} className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[11px]">
                  Xóa ảnh
                </button>
              )}
            </label>
          )}
        </div>
      ) : disabled ? (
        <div className="flex flex-col items-center justify-center h-36 text-slate-400 text-xs">
          <span>Chưa có ảnh</span>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center h-36 cursor-pointer text-slate-500 hover:text-primary-600 transition-colors">
          <Upload className="w-7 h-7 mb-1 text-slate-400" />
          <span className="text-xs font-bold">Chọn tệp ảnh</span>
          <span className="text-[10px] text-slate-400">PNG, JPG, WEBP từ máy tính</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
          />
        </label>
      )}
    </div>
  );
};

export const EditProfileModal: React.FC = () => {
  const { selectedEmployeeIdForAdmin, isEditProfileModalOpen, setIsEditProfileModalOpen, showToast } = useHR();
  const { profile } = useAuth();
  // Back-office screens are shared by Admin and HR/Kế toán. RLS still keeps
  // account management and final approvals Admin-only.
  const isAdmin = profile?.role === 'admin' || profile?.role === 'hr';

  // Which employee this modal is editing: an admin edits whoever they
  // selected in the employee list; a non-admin only ever edits themselves.
  const targetEmployeeId = isAdmin ? selectedEmployeeIdForAdmin : profile?.employeeId ?? undefined;

  const { data: employee } = useEmployee(targetEmployeeId);
  const { data: sensitiveInfo } = useEmployeeSensitiveInfo(targetEmployeeId);
  const { data: relativesData } = useEmployeeRelatives(targetEmployeeId);

  const updateEmployee = useUpdateEmployee();
  const upsertSensitiveInfo = useUpsertEmployeeSensitiveInfo();
  const setRelatives = useSetEmployeeRelatives();
  const { uploadFile } = useFileUpload();
  const requestProfileChange = useRequestOwnProfileChange();

  const [activeTab, setActiveTab] = useState<'general' | 'employment' | 'contact' | 'documents' | 'bank' | 'relatives'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [isVneidGuideOpen, setIsVneidGuideOpen] = useState(false);
  const [changeRequestMessage, setChangeRequestMessage] = useState('');

  // Tab 1: General (avatar/dob/gender/marital self-editable; the rest is
  // admin-only — see the enforce_employee_self_edit_columns trigger)
  const [fullName, setFullName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('Chính thức');
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'Nam' | 'Nữ' | 'Khác'>('Nam');
  const [maritalStatus, setMaritalStatus] = useState<'Độc thân' | 'Đã kết hôn'>('Độc thân');
  const [kpiLevel, setKpiLevel] = useState('');
  const [kpiTargetPerDay, setKpiTargetPerDay] = useState<number | ''>('');
  const [performanceCommissionRate, setPerformanceCommissionRate] = useState<number>(0);
  const [qcCommissionRate, setQcCommissionRate] = useState<number>(0);
  const [guaranteedIncomeAmount, setGuaranteedIncomeAmount] = useState<number>(0);

  // Tab 2: Employment snapshot (admin-only). Contract history itself lives
  // in the Contracts module (M3), not here.
  const [startDate, setStartDate] = useState('');
  const [contractType, setContractType] = useState('HĐ xác định thời hạn (1 năm)');
  const [currentSalary, setCurrentSalary] = useState<number>(0);
  const [lastSalaryReviewDate, setLastSalaryReviewDate] = useState('');

  // Tab 3: Contact & Address (self-editable)
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [temporaryAddress, setTemporaryAddress] = useState('');

  // Tab 4: Documents (employee_sensitive_info — self-editable)
  const [idCardNumber, setIdCardNumber] = useState('');
  const [idCardIssueDate, setIdCardIssueDate] = useState('');
  const [idCardIssuePlace, setIdCardIssuePlace] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [socialInsuranceCode, setSocialInsuranceCode] = useState('');
  const [idCardFrontPath, setIdCardFrontPath] = useState<string | null>(null);
  const [idCardFrontFile, setIdCardFrontFile] = useState<File | null>(null);
  const [idCardBackPath, setIdCardBackPath] = useState<string | null>(null);
  const [idCardBackFile, setIdCardBackFile] = useState<File | null>(null);
  const [vneidPath, setVneidPath] = useState<string | null>(null);
  const [vneidFile, setVneidFile] = useState<File | null>(null);

  // Tab 5: Bank (employee_sensitive_info — self-editable)
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [bankBranch, setBankBranch] = useState('');

  // Tab 6: Relatives (self-editable)
  const [relatives, setRelativesState] = useState<(RelativeInput & { id: string })[]>([]);

  useEffect(() => {
    if (!isEditProfileModalOpen || !employee) return;

    setFullName(employee.full_name || '');
    setEmployeeCode(employee.employee_code || '');
    setJobTitle(employee.job_title || '');
    setDepartment(employee.department || '');
    setStatus(employee.status || 'Chính thức');
    setAvatarPath(employee.avatar_url);
    setAvatarFile(null);
    setDob(employee.dob || '');
    setGender((employee.gender as 'Nam' | 'Nữ' | 'Khác') || 'Nam');
    setMaritalStatus((employee.marital_status as 'Độc thân' | 'Đã kết hôn') || 'Độc thân');
    setKpiLevel(employee.kpi_level || '');
    setKpiTargetPerDay(employee.kpi_target_per_day ?? '');
    setPerformanceCommissionRate(employee.performance_commission_rate || 0);
    setQcCommissionRate(employee.qc_commission_rate || 0);
    setGuaranteedIncomeAmount(employee.guaranteed_income_amount || 0);

    setStartDate(employee.start_date || '');
    setContractType(employee.contract_type || 'HĐ xác định thời hạn (1 năm)');
    setCurrentSalary(employee.current_salary || 0);
    setLastSalaryReviewDate(employee.last_salary_review_date || '');

    setPhone(employee.phone || '');
    setEmail(employee.email || '');
    setPermanentAddress(employee.permanent_address || '');
    setTemporaryAddress(employee.temporary_address || '');
  }, [employee, isEditProfileModalOpen]);

  useEffect(() => {
    if (!isEditProfileModalOpen) return;
    setIdCardNumber(sensitiveInfo?.id_card_number || '');
    setIdCardIssueDate(sensitiveInfo?.id_card_issue_date || '');
    setIdCardIssuePlace(sensitiveInfo?.id_card_issue_place || '');
    setTaxCode(sensitiveInfo?.tax_code || '');
    setSocialInsuranceCode(sensitiveInfo?.social_insurance_code || '');
    setIdCardFrontPath(sensitiveInfo?.id_card_front_url ?? null);
    setIdCardFrontFile(null);
    setIdCardBackPath(sensitiveInfo?.id_card_back_url ?? null);
    setIdCardBackFile(null);
    setVneidPath(sensitiveInfo?.vneid_residency_url ?? null);
    setVneidFile(null);
    setBankName(sensitiveInfo?.bank_name || '');
    setAccountNumber(sensitiveInfo?.bank_account_number || '');
    setAccountHolder(sensitiveInfo?.bank_account_holder || '');
    setBankBranch(sensitiveInfo?.bank_branch || '');
  }, [sensitiveInfo, isEditProfileModalOpen]);

  useEffect(() => {
    if (!isEditProfileModalOpen) return;
    setRelativesState(
      (relativesData || []).map((r) => ({
        id: r.id,
        fullName: r.full_name,
        relationship: r.relationship || '',
        phone: r.phone || '',
        address: r.address || '',
        isEmergencyContact: r.is_emergency_contact,
      }))
    );
  }, [relativesData, isEditProfileModalOpen]);

  const targetLabel = useMemo(() => employee?.full_name || '...', [employee]);

  if (!isEditProfileModalOpen) return null;

  if (!targetEmployeeId || !employee) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center border border-slate-200">
          <Loader2 className="w-7 h-7 mx-auto mb-3 text-primary-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-800">
            {targetEmployeeId ? 'Đang tải hồ sơ nhân viên...' : 'Không xác định được nhân viên cần chỉnh sửa.'}
          </p>
          {!targetEmployeeId && (
            <button
              type="button"
              onClick={() => setIsEditProfileModalOpen(false)}
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
            >
              Đóng
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    const submitChangeRequest = async (event: React.FormEvent) => {
      event.preventDefault();
      try {
        const result = await requestProfileChange.mutateAsync(changeRequestMessage);
        showToast(result?.notificationDelivered
          ? 'Đã gửi yêu cầu thay đổi tới Admin/HR qua email.'
          : 'Đã lưu yêu cầu, nhưng email thông báo chưa được cấu hình.');
        setChangeRequestMessage('');
        setIsEditProfileModalOpen(false);
      } catch (error) {
        showToast(error instanceof Error ? `Không thể gửi yêu cầu: ${error.message}` : 'Không thể gửi yêu cầu thay đổi.');
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
        <form onSubmit={submitChangeRequest} className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Yêu cầu thay đổi thông tin</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Hồ sơ đã hoàn tất onboarding nên chỉ Admin/HR mới có thể cập nhật. Hãy nêu thông tin cần đổi để gửi yêu cầu kèm email thông báo.</p>
            </div>
            <button type="button" onClick={() => setIsEditProfileModalOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Đóng"><X className="h-5 w-5" /></button>
          </div>
          <label className="mt-5 block text-xs font-bold text-slate-700">
            Nội dung cần thay đổi
            <textarea value={changeRequestMessage} onChange={(event) => setChangeRequestMessage(event.target.value)} minLength={5} maxLength={2000} required rows={6} placeholder="Ví dụ: Tôi cần đổi số tài khoản ngân hàng từ … sang … vì …" className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15" />
          </label>
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={() => setIsEditProfileModalOpen(false)} className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100">Hủy</button>
            <button type="submit" disabled={requestProfileChange.isPending} className="inline-flex items-center gap-2 rounded-xl bg-success-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-success-800 disabled:opacity-60">
              {requestProfileChange.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Gửi yêu cầu
            </button>
          </div>
        </form>
      </div>
    );
  }

  const handleAddRelative = () => {
    setRelativesState([
      ...relatives,
      { id: 'new-' + Date.now(), fullName: '', relationship: 'Người thân', phone: '', address: '', isEmergencyContact: relatives.length === 0 },
    ]);
  };

  const handleRemoveRelative = (id: string) => {
    setRelativesState(relatives.filter((r) => r.id !== id));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const companyId = employee.company_id;

      let resolvedAvatarPath = avatarPath;
      let resolvedFrontPath = idCardFrontPath;
      let resolvedBackPath = idCardBackPath;
      let resolvedVneidPath = vneidPath;

      if (avatarFile) resolvedAvatarPath = await uploadFile(avatarFile, companyId, targetEmployeeId, 'avatar');
      if (idCardFrontFile) resolvedFrontPath = await uploadFile(idCardFrontFile, companyId, targetEmployeeId, 'cccd-front');
      if (idCardBackFile) resolvedBackPath = await uploadFile(idCardBackFile, companyId, targetEmployeeId, 'cccd-back');
      if (vneidFile) resolvedVneidPath = await uploadFile(vneidFile, companyId, targetEmployeeId, 'vneid');

      const employeeUpdates: Record<string, unknown> = {
        avatar_url: resolvedAvatarPath,
        // PostgreSQL date columns accept NULL for an optional value, not an
        // empty string. Sending "" causes REST to reject the whole profile
        // update with SQLSTATE 22007.
        dob: dob || null,
        gender,
        marital_status: maritalStatus,
        phone,
        permanent_address: permanentAddress,
        temporary_address: temporaryAddress,
      };
      if (isAdmin) {
        Object.assign(employeeUpdates, {
          full_name: fullName,
          employee_code: employeeCode,
          job_title: jobTitle,
          department,
          status,
          email,
          start_date: startDate || null,
          contract_type: contractType,
          current_salary: currentSalary,
          last_salary_review_date: lastSalaryReviewDate || null,
          kpi_level: kpiLevel || null,
          kpi_target_per_day: kpiTargetPerDay === '' ? null : kpiTargetPerDay,
          performance_commission_rate: performanceCommissionRate,
          qc_commission_rate: qcCommissionRate,
          guaranteed_income_amount: guaranteedIncomeAmount,
        });
      }

      await Promise.all([
        updateEmployee.mutateAsync({ id: targetEmployeeId, updates: employeeUpdates }),
        upsertSensitiveInfo.mutateAsync({
          employeeId: targetEmployeeId,
          companyId,
          updates: {
            id_card_number: idCardNumber,
            id_card_issue_date: idCardIssueDate || null,
            id_card_issue_place: idCardIssuePlace,
            tax_code: taxCode,
            social_insurance_code: socialInsuranceCode,
            id_card_front_url: resolvedFrontPath,
            id_card_back_url: resolvedBackPath,
            vneid_residency_url: resolvedVneidPath,
            bank_name: bankName,
            bank_account_number: accountNumber,
            bank_account_holder: accountHolder.toUpperCase(),
            bank_branch: bankBranch,
          },
        }),
        setRelatives.mutateAsync({ employeeId: targetEmployeeId, companyId, relatives }),
      ]);

      showToast('Đã lưu hồ sơ nhân viên thành công!');
      setIsEditProfileModalOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? `Lỗi khi lưu: ${err.message}` : 'Không thể lưu hồ sơ. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs: { id: typeof activeTab; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: '1. Thông tin Chung', icon: <User className="w-4 h-4" /> },
    { id: 'employment', label: '2. Công việc & Lương', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'contact', label: '3. Liên hệ & Địa chỉ', icon: <MapPin className="w-4 h-4" /> },
    { id: 'documents', label: '4. CCCD & Upload Ảnh', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'bank', label: '5. Ngân hàng', icon: <Landmark className="w-4 h-4" /> },
    { id: 'relatives', label: '6. Người thân', icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">

        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <ImageAvatarPreview path={avatarFile ? null : avatarPath} file={avatarFile} />
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>{isAdmin ? 'Chỉnh sửa Hồ sơ Nhân viên' : 'Hồ sơ của tôi'}</span>
                <span className="text-xs bg-success-600/90 text-white font-mono font-bold px-2 py-0.5 rounded-md">
                  {employeeCode}
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Đang chỉnh sửa cho: <strong className="text-success-400">{targetLabel}</strong>
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
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-700 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-5">

          {!isAdmin && (activeTab === 'general' || activeTab === 'employment') && (
            <div className="flex items-center gap-2 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <Lock className="w-3.5 h-3.5" />
              <span>Các trường có khóa chỉ Admin/HR mới sửa được — theo đúng phân quyền hệ thống.</span>
            </div>
          )}

          {/* TAB 1: General */}
          {activeTab === 'general' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <LockableField label="Họ và tên *" locked={!isAdmin}>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={!isAdmin} className={inputClass} required />
                </LockableField>
                <LockableField label="Mã nhân viên (NV) *" locked={!isAdmin}>
                  <input type="text" value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} disabled={!isAdmin} className={`${inputClass} font-mono text-primary-700`} required />
                </LockableField>
                <LockableField label="Chức danh công việc *" locked={!isAdmin}>
                  <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} disabled={!isAdmin} className={inputClass} required />
                </LockableField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LockableField label="Phòng ban *" locked={!isAdmin}>
                  <select value={department} onChange={(e) => setDepartment(e.target.value)} disabled={!isAdmin} className={inputClass}>
                    <option value="Phòng Thiết kế Nội thất">Phòng Thiết kế Nội thất</option>
                    <option value="Phòng Thiết kế Kiến trúc">Phòng Thiết kế Kiến trúc</option>
                    <option value="Ban Quản trị & Admin Văn phòng">Ban Quản trị & Admin Văn phòng</option>
                    <option value="Phòng Thiết kế & Quản lý Chất lượng">Phòng Thiết kế & Quản lý Chất lượng</option>
                  </select>
                </LockableField>
                <LockableField label="Trạng thái làm việc *" locked={!isAdmin}>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={!isAdmin} className={inputClass}>
                    <option value="Chính thức">Chính thức</option>
                    <option value="Thử việc">Thử việc</option>
                    <option value="Mới tiếp nhận">Mới tiếp nhận</option>
                    <option value="Đã nghỉ việc">Đã nghỉ việc</option>
                  </select>
                </LockableField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày sinh:</label>
                  <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Giới tính:</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value as 'Nam' | 'Nữ' | 'Khác')} className={inputClass}>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tình trạng hôn nhân:</label>
                  <select value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value as 'Độc thân' | 'Đã kết hôn')} className={inputClass}>
                    <option value="Độc thân">Độc thân</option>
                    <option value="Đã kết hôn">Đã kết hôn</option>
                  </select>
                </div>
              </div>

              {isAdmin && (
                <div className="p-4 bg-primary-50/60 rounded-2xl border border-primary-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-primary-900 flex items-center gap-1.5">
                      <Award className="w-4 h-4" />
                      <span>Chỉ tiêu KPI & Level Vị trí công việc (Liên kết Bảng lương)</span>
                    </p>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-white border border-primary-300 rounded-lg text-primary-700">
                      Định dạng: x view / ngày
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Level vị trí công việc:</label>
                      <input
                        type="text"
                        list="kpi-level-options"
                        placeholder="VD: Level 5: Senior 3D Artist"
                        value={kpiLevel}
                        onChange={(e) => setKpiLevel(e.target.value)}
                        className={inputClass}
                      />
                      <datalist id="kpi-level-options">
                        {KPI_LEVEL_SUGGESTIONS.map((level) => (
                          <option key={level} value={level} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Chỉ tiêu KPI (x view / ngày):</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={kpiTargetPerDay}
                          onChange={(e) => setKpiTargetPerDay(e.target.value === '' ? '' : Number(e.target.value))}
                          className={`${inputClass} font-bold text-primary-700`}
                        />
                        <span className="text-[11px] text-slate-500 whitespace-nowrap">view / ngày</span>
                      </div>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Performance commission:</label>
                      <div className="flex items-center gap-2">
                        <CurrencyInput value={performanceCommissionRate} onValueChange={(value) => setPerformanceCommissionRate(Number(value || 0))} className={inputClass} />
                        <span className="text-[11px] text-slate-500 whitespace-nowrap">VNĐ / view</span>
                      </div>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">QC commission:</label>
                      <div className="flex items-center gap-2">
                        <CurrencyInput value={qcCommissionRate} onValueChange={(value) => setQcCommissionRate(Number(value || 0))} className={inputClass} />
                        <span className="text-[11px] text-slate-500 whitespace-nowrap">VNĐ / QC view</span>
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">Mức đảm bảo thu nhập (nếu áp dụng):</label>
                      <CurrencyInput value={guaranteedIncomeAmount} onValueChange={(value) => setGuaranteedIncomeAmount(Number(value || 0))} className={inputClass} />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Hệ thống tự động tính: <strong>{kpiTargetPerDay || 0} view/ngày × số ngày công chuẩn của tháng = Tổng chỉ tiêu KPI</strong> và đồng bộ sang Bảng lương.
                  </p>
                </div>
              )}

              <ImageUploadSlot
                label="Ảnh Avatar đại diện"
                path={avatarPath}
                pendingFile={avatarFile}
                onPick={setAvatarFile}
                heightClass="h-32"
              />
            </div>
          )}

          {/* TAB 2: Employment snapshot (admin-only) */}
          {activeTab === 'employment' && (
            <div className="space-y-4 text-xs">
              <p className="text-[11px] text-slate-500">
                Lịch sử hợp đồng chi tiết xem ở màn "Hợp đồng & Lương" — đây chỉ là thông tin hiện hành.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LockableField label="Ngày bắt đầu làm việc" locked={!isAdmin}>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={!isAdmin} className={inputClass} />
                </LockableField>
                <LockableField label="Loại hợp đồng hiện tại" locked={!isAdmin}>
                  <select value={contractType} onChange={(e) => setContractType(e.target.value)} disabled={!isAdmin} className={inputClass}>
                    <option value="Thử việc">Thử việc</option>
                    <option value="HĐ xác định thời hạn (1 năm)">HĐ xác định thời hạn (1 năm)</option>
                    <option value="HĐ xác định thời hạn (2 năm)">HĐ xác định thời hạn (2 năm)</option>
                    <option value="HĐ không xác định thời hạn">HĐ không xác định thời hạn</option>
                  </select>
                </LockableField>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LockableField label="Mức lương cơ bản (VND)" locked={!isAdmin}>
                  <CurrencyInput value={currentSalary} onValueChange={(value) => setCurrentSalary(Number(value || 0))} disabled={!isAdmin} className={`${inputClass} font-bold text-success-700`} />
                </LockableField>
                <LockableField label="Ngày review lương gần nhất" locked={!isAdmin}>
                  <input type="date" value={lastSalaryReviewDate} onChange={(e) => setLastSalaryReviewDate(e.target.value)} disabled={!isAdmin} className={inputClass} />
                </LockableField>
              </div>
            </div>
          )}

          {/* TAB 3: Contact & Address */}
          {activeTab === 'contact' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số điện thoại liên hệ *:</label>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className={`${inputClass} font-bold text-primary-700`} required />
                </div>
                <LockableField label="Email công ty *" locked={!isAdmin}>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!isAdmin} className={inputClass} required />
                </LockableField>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Địa chỉ thường trú (Hộ khẩu trên CCCD):</label>
                <textarea rows={2} value={permanentAddress} onChange={(e) => setPermanentAddress(e.target.value)} className={inputClass}></textarea>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Địa chỉ tạm trú hiện tại:</label>
                <textarea rows={2} value={temporaryAddress} onChange={(e) => setTemporaryAddress(e.target.value)} className={inputClass}></textarea>
              </div>
            </div>
          )}

          {/* TAB 4: Documents & CCCD Upload */}
          {activeTab === 'documents' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số CCCD / Hộ chiếu *:</label>
                  <input type="text" value={idCardNumber} onChange={(e) => setIdCardNumber(e.target.value)} className={`${inputClass} font-mono font-bold`} />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày cấp:</label>
                  <input type="date" value={idCardIssueDate} onChange={(e) => setIdCardIssueDate(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nơi cấp:</label>
                  <input type="text" value={idCardIssuePlace} onChange={(e) => setIdCardIssuePlace(e.target.value)} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã số thuế cá nhân (MST):</label>
                  <input type="text" value={taxCode} onChange={(e) => setTaxCode(e.target.value)} className={`${inputClass} font-mono text-primary-700`} />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã số Bảo hiểm xã hội (BHXH):</label>
                  <input type="text" value={socialInsuranceCode} onChange={(e) => setSocialInsuranceCode(e.target.value)} className={`${inputClass} font-mono text-success-700`} />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-2">Ảnh CCCD 2 mặt:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ImageUploadSlot label="Mặt trước CCCD" path={idCardFrontPath} pendingFile={idCardFrontFile} onPick={setIdCardFrontFile} />
                  <ImageUploadSlot label="Mặt sau CCCD" path={idCardBackPath} pendingFile={idCardBackFile} onPick={setIdCardBackFile} />
                </div>
              </div>

              <div className="p-4 bg-gradient-to-br from-red-50/80 via-rose-50/50 to-orange-50/40 rounded-2xl border-2 border-red-200/90 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-red-200/70">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-red-950">Ảnh chụp trang "Thông tin cư trú" (VNeID)</h4>
                      <p className="text-[11px] text-red-700">Xác thực địa chỉ thường trú, tạm trú</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setIsVneidGuideOpen(true)} className="self-start sm:self-auto px-3 py-1.5 bg-white hover:bg-red-50 text-red-700 border border-red-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                    <HelpCircle className="w-4 h-4 text-red-600" />
                    <span>Xem ảnh mẫu hướng dẫn</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pt-1">
                  <div className="md:col-span-7">
                    {vneidPath || vneidFile ? (
                      <ImageUploadSlot label="" path={vneidPath} pendingFile={vneidFile} onPick={setVneidFile} onClear={() => setVneidPath(null)} heightClass="h-48" />
                    ) : (
                      <label className="border-2 border-dashed border-red-300 rounded-2xl p-3 bg-white flex flex-col items-center justify-center py-6 cursor-pointer text-slate-600 hover:text-red-600 transition-colors min-h-[160px]">
                        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-2">
                          <Smartphone className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-slate-800">Tải lên ảnh chụp màn hình VNeID</span>
                        <span className="mt-2 px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold flex items-center gap-1">
                          <Upload className="w-3.5 h-3.5" /> Chọn ảnh tải lên
                        </span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && setVneidFile(e.target.files[0])} />
                      </label>
                    )}
                  </div>

                  <div className="md:col-span-5 bg-white p-3.5 rounded-2xl border border-red-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-red-900 uppercase tracking-wide">Ảnh Mẫu Hướng Dẫn</span>
                      <button type="button" onClick={() => setIsVneidGuideOpen(true)} className="text-[11px] text-red-600 font-bold hover:underline">
                        Phóng to
                      </button>
                    </div>
                    <div onClick={() => setIsVneidGuideOpen(true)} className="relative rounded-xl overflow-hidden bg-slate-900 h-32 border border-slate-700 cursor-pointer group flex items-center justify-center">
                      <img src={VNEID_SAMPLE_IMAGE} alt="Ảnh mẫu VNeID" className="w-full h-full object-cover object-top opacity-90 group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                        <Eye className="w-4 h-4" />
                        <span>Xem ảnh mẫu chi tiết</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Đăng nhập <strong>VNeID</strong> → <strong>Ví giấy tờ</strong> → <strong>Thông tin cư trú</strong> → Chụp toàn bộ màn hình.
                    </p>
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
                <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="VD: Vietcombank, Techcombank, MB Bank..." className={`${inputClass} font-bold`} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số tài khoản nhận lương *:</label>
                  <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className={`${inputClass} font-mono font-bold text-primary-700 text-sm`} />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên chủ tài khoản (Viết hoa không dấu) *:</label>
                  <input type="text" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value.toUpperCase())} className={`${inputClass} font-mono font-bold uppercase`} />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Chi nhánh ngân hàng mở thẻ:</label>
                <input type="text" value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} className={inputClass} />
              </div>
            </div>
          )}

          {/* TAB 6: Relatives */}
          {activeTab === 'relatives' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <p className="font-bold text-slate-800">Danh sách Người thân & Người liên hệ khẩn cấp</p>
                <button type="button" onClick={handleAddRelative} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary-800 bg-primary-50 hover:bg-primary-100 rounded-lg border border-primary-200 cursor-pointer">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm người thân mới</span>
                </button>
              </div>

              {relatives.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center border border-dashed border-slate-200 rounded-xl">
                  Chưa khai báo thông tin người thân.
                </p>
              ) : (
                <div className="space-y-3">
                  {relatives.map((rel, index) => (
                    <div key={rel.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-primary-900">Người thân #{index + 1}</span>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={rel.isEmergencyContact}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setRelativesState(relatives.map((r) => (r.id === rel.id ? { ...r, isEmergencyContact: checked } : r)));
                              }}
                            />
                            <span>Liên hệ khẩn cấp</span>
                          </label>
                          <button type="button" onClick={() => handleRemoveRelative(rel.id)} className="p-1 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <input type="text" placeholder="Họ và tên" value={rel.fullName} onChange={(e) => setRelativesState(relatives.map((r) => (r.id === rel.id ? { ...r, fullName: e.target.value } : r)))} className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold" />
                        <input type="text" placeholder="Mối quan hệ" value={rel.relationship} onChange={(e) => setRelativesState(relatives.map((r) => (r.id === rel.id ? { ...r, relationship: e.target.value } : r)))} className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg" />
                        <input type="text" placeholder="Số điện thoại" value={rel.phone} onChange={(e) => setRelativesState(relatives.map((r) => (r.id === rel.id ? { ...r, phone: e.target.value } : r)))} className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono" />
                        <input type="text" placeholder="Địa chỉ" value={rel.address} onChange={(e) => setRelativesState(relatives.map((r) => (r.id === rel.id ? { ...r, address: e.target.value } : r)))} className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button type="button" onClick={() => setIsEditProfileModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
              Hủy bỏ
            </button>
            <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 rounded-xl transition-colors shadow-md shadow-primary-600/20 cursor-pointer">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Lưu thay đổi hồ sơ</span>
            </button>
          </div>
        </form>
      </div>

      <VneidGuideModal isOpen={isVneidGuideOpen} onClose={() => setIsVneidGuideOpen(false)} />
    </div>
  );
};

const inputClass =
  'w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed';

const LockableField: React.FC<{ label: string; locked: boolean; children: React.ReactNode }> = ({ label, locked, children }) => (
  <div>
    <label className="flex items-center gap-1.5 font-bold text-slate-700 mb-1">
      <span>{label}</span>
      {locked && <Lock className="w-3 h-3 text-slate-400" />}
    </label>
    {children}
  </div>
);

const ImageAvatarPreview: React.FC<{ path: string | null; file: File | null }> = ({ path, file }) => {
  const { data: signedUrl } = useSignedImageUrl(file ? null : path);
  const src = file ? URL.createObjectURL(file) : signedUrl;
  return (
    <div className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-success-500 bg-slate-700 flex items-center justify-center">
      {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : <Camera className="w-4 h-4 text-slate-400" />}
    </div>
  );
};
