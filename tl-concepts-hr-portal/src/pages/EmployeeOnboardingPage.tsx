import React, { useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, FileImage, Loader2, LogOut, ShieldCheck, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  useEmployee,
  useEmployeeSensitiveInfo,
  useEmployeeRelatives,
} from '../hooks/useEmployees';
import { useFileUpload, useSignedImageUrl } from '../hooks/useFileUpload';
import { supabase } from '../lib/supabaseClient';
import { getUserFacingError } from '../lib/userFacingError';

export const EmployeeOnboardingPage: React.FC = () => {
  const { profile, signOut, refreshProfile } = useAuth();
  const employeeId = profile?.employeeId ?? undefined;
  const editableEmployeeId = profile && ['in_progress', 'needs_changes'].includes(profile.onboardingStatus) ? employeeId : undefined;
  const { data: employee } = useEmployee(editableEmployeeId);
  const { data: sensitiveInfo } = useEmployeeSensitiveInfo(editableEmployeeId);
  const { data: relatives } = useEmployeeRelatives(editableEmployeeId);
  const { uploadFile } = useFileUpload();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [temporaryAddress, setTemporaryAddress] = useState('');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [idCardIssueDate, setIdCardIssueDate] = useState('');
  const [idCardIssuePlace, setIdCardIssuePlace] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [socialInsuranceCode, setSocialInsuranceCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyAddress, setEmergencyAddress] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [vneidFile, setVneidFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employee) return;
    setFullName(employee.full_name);
    setPhone(employee.phone || '');
    setDob(employee.dob || '');
    setGender(employee.gender || '');
    setMaritalStatus(employee.marital_status || '');
    setPermanentAddress(employee.permanent_address || '');
    setTemporaryAddress(employee.temporary_address || '');
  }, [employee]);

  useEffect(() => {
    if (!sensitiveInfo) return;
    setIdCardNumber(sensitiveInfo.id_card_number || '');
    setIdCardIssueDate(sensitiveInfo.id_card_issue_date || '');
    setIdCardIssuePlace(sensitiveInfo.id_card_issue_place || '');
    setTaxCode(sensitiveInfo.tax_code || '');
    setSocialInsuranceCode(sensitiveInfo.social_insurance_code || '');
    setBankName(sensitiveInfo.bank_name || '');
    setBankAccountNumber(sensitiveInfo.bank_account_number || '');
    setBankAccountHolder(sensitiveInfo.bank_account_holder || '');
    setBankBranch(sensitiveInfo.bank_branch || '');
  }, [sensitiveInfo]);

  useEffect(() => {
    const emergency = relatives?.find((relative) => relative.is_emergency_contact) ?? relatives?.[0];
    if (!emergency) return;
    setEmergencyName(emergency.full_name);
    setEmergencyRelationship(emergency.relationship || '');
    setEmergencyPhone(emergency.phone || '');
    setEmergencyAddress(emergency.address || '');
  }, [relatives]);

  if (profile?.onboardingStatus === 'submitted') {
    return <OnboardingStatus title="Hồ sơ đã gửi" description="HR đang kiểm tra thông tin và minh chứng của bạn. Toàn bộ HR Portal sẽ mở ngay sau khi hồ sơ được duyệt." onSignOut={signOut} />;
  }

  if (!employee || !employeeId || !profile) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">Đang tải hồ sơ đăng ký...</div>;
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!phone.trim() || !dob || !gender) {
      setError('Vui lòng nhập số điện thoại, ngày sinh và giới tính trước khi gửi HR duyệt.');
      return;
    }

    setIsSaving(true);
    try {
      const companyId = profile.companyId;
      const avatarPath = avatarFile
        ? await uploadFile(avatarFile, companyId, employeeId, 'avatar')
        : employee.avatar_url;
      const frontPath = frontFile
        ? await uploadFile(frontFile, companyId, employeeId, 'cccd-front')
        : sensitiveInfo?.id_card_front_url ?? null;
      const backPath = backFile
        ? await uploadFile(backFile, companyId, employeeId, 'cccd-back')
        : sensitiveInfo?.id_card_back_url ?? null;
      const vneidPath = vneidFile
        ? await uploadFile(vneidFile, companyId, employeeId, 'vneid')
        : sensitiveInfo?.vneid_residency_url ?? null;

      const { error: submitError } = await supabase.rpc('save_and_submit_own_onboarding', {
        p_employee: {
          full_name: fullName,
          avatar_url: avatarPath,
          phone,
          dob: dob || null,
          gender: gender || null,
          marital_status: maritalStatus || null,
          permanent_address: permanentAddress,
          temporary_address: temporaryAddress,
        },
        p_sensitive: {
          id_card_number: idCardNumber,
          id_card_issue_date: idCardIssueDate || null,
          id_card_issue_place: idCardIssuePlace,
          id_card_front_url: frontPath,
          id_card_back_url: backPath,
          vneid_residency_url: vneidPath,
          tax_code: taxCode,
          social_insurance_code: socialInsuranceCode,
          bank_name: bankName,
          bank_account_number: bankAccountNumber,
          bank_account_holder: bankAccountHolder.toUpperCase(),
          bank_branch: bankBranch,
        },
        p_relatives: emergencyName.trim() ? [{
          full_name: emergencyName,
          relationship: emergencyRelationship,
          phone: emergencyPhone,
          address: emergencyAddress,
          is_emergency_contact: true,
        }] : [],
      });
      if (submitError) throw submitError;
      const { error: lifecycleError } = await supabase.rpc('mark_own_invitation_completed');
      if (lifecycleError) throw lifecycleError;
      await refreshProfile();

      setMessage('Đã gửi hồ sơ. HR sẽ kiểm tra và kích hoạt tài khoản của bạn.');
      setAvatarFile(null);
      setFrontFile(null);
      setBackFile(null);
      setVneidFile(null);
    } catch (caught) {
      setError(await getUserFacingError(caught, 'Không thể lưu hồ sơ. Vui lòng thử lại.'));
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15';

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-2xl bg-[#173f37] p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-200">TL Concepts HR Portal</p>
            <h1 className="mt-2 text-2xl font-black">Hoàn thiện hồ sơ nhân viên</h1>
            <p className="mt-1 text-sm text-emerald-50/80">Xin chào {employee.full_name}. Tài khoản đang chờ HR kiểm tra và kích hoạt.</p>
          </div>
          <button type="button" onClick={signOut} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold hover:bg-white/20 cursor-pointer">
            <LogOut className="h-4 w-4" /> Đăng xuất
          </button>
        </header>

        <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm space-y-7">
          <Section title="1. Thông tin cá nhân">
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Họ và tên"><input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} /></Input>
              <ReadOnly label="Email" value={employee.email || '—'} />
              <Input label="Số điện thoại *"><input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} /></Input>
              <Input label="Ngày sinh *"><input required type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={inputClass} /></Input>
              <Input label="Giới tính *">
                <select required value={gender} onChange={(e) => setGender(e.target.value)} className={inputClass}>
                  <option value="">— Chọn —</option><option>Nam</option><option>Nữ</option><option>Khác</option>
                </select>
              </Input>
              <Input label="Tình trạng hôn nhân">
                <select value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)} className={inputClass}>
                  <option value="">— Chọn —</option><option>Độc thân</option><option>Đã kết hôn</option>
                </select>
              </Input>
              <Input label="Địa chỉ thường trú"><textarea value={permanentAddress} onChange={(e) => setPermanentAddress(e.target.value)} className={inputClass} rows={3} /></Input>
              <Input label="Địa chỉ tạm trú"><textarea value={temporaryAddress} onChange={(e) => setTemporaryAddress(e.target.value)} className={inputClass} rows={3} /></Input>
            </div>
            <FilePicker label="Ảnh đại diện" file={avatarFile} existingPath={employee.avatar_url} onChange={setAvatarFile} />
          </Section>

          <Section title="2. CCCD, MST và BHXH" collapsible>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Số CCCD"><input value={idCardNumber} onChange={(e) => setIdCardNumber(e.target.value)} className={inputClass} /></Input>
              <Input label="Ngày cấp"><input type="date" value={idCardIssueDate} onChange={(e) => setIdCardIssueDate(e.target.value)} className={inputClass} /></Input>
              <Input label="Nơi cấp"><input value={idCardIssuePlace} onChange={(e) => setIdCardIssuePlace(e.target.value)} className={inputClass} /></Input>
              <Input label="Mã số thuế"><input value={taxCode} onChange={(e) => setTaxCode(e.target.value)} className={inputClass} /></Input>
              <Input label="Mã số BHXH"><input value={socialInsuranceCode} onChange={(e) => setSocialInsuranceCode(e.target.value)} className={inputClass} /></Input>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <FilePicker label="CCCD mặt trước" file={frontFile} existingPath={sensitiveInfo?.id_card_front_url} onChange={setFrontFile} />
              <FilePicker label="CCCD mặt sau" file={backFile} existingPath={sensitiveInfo?.id_card_back_url} onChange={setBackFile} />
              <FilePicker label="Ảnh cư trú VNeID" file={vneidFile} existingPath={sensitiveInfo?.vneid_residency_url} onChange={setVneidFile} />
            </div>
          </Section>

          <Section title="3. Tài khoản nhận lương" collapsible>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Ngân hàng"><input value={bankName} onChange={(e) => setBankName(e.target.value)} className={inputClass} /></Input>
              <Input label="Số tài khoản"><input value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} className={inputClass} /></Input>
              <Input label="Chủ tài khoản"><input value={bankAccountHolder} onChange={(e) => setBankAccountHolder(e.target.value)} className={inputClass} /></Input>
              <Input label="Chi nhánh"><input value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} className={inputClass} /></Input>
            </div>
          </Section>

          <Section title="4. Người thân / liên hệ khẩn cấp" collapsible>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Họ và tên"><input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} className={inputClass} /></Input>
              <Input label="Mối quan hệ"><input value={emergencyRelationship} onChange={(e) => setEmergencyRelationship(e.target.value)} placeholder="Ví dụ: Mẹ" className={inputClass} /></Input>
              <Input label="Số điện thoại"><input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} className={inputClass} /></Input>
              <Input label="Địa chỉ"><input value={emergencyAddress} onChange={(e) => setEmergencyAddress(e.target.value)} className={inputClass} /></Input>
            </div>
          </Section>

          {profile.onboardingStatus === 'needs_changes' && profile.onboardingNote && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900"><strong>HR yêu cầu bổ sung:</strong> {profile.onboardingNote}</p>
          )}

          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</p>}
          {message && <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4" />{message}</p>}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <p className="flex items-center gap-2 text-[11px] text-slate-500"><ShieldCheck className="h-4 w-4 text-emerald-700" />Ảnh được lưu trong bucket riêng tư và chỉ bạn/Admin xem được.</p>
            <button type="submit" disabled={isSaving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#173f37] px-5 py-3 text-sm font-bold text-white hover:bg-[#0f302a] disabled:opacity-60 cursor-pointer">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Lưu và gửi HR duyệt
            </button>
          </div>
        </form>
      </div>
    </main>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode; collapsible?: boolean }> = ({ title, children, collapsible }) => collapsible ? (
  <details className="group border-t border-slate-100 pt-5">
    <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-black text-slate-900">
      {title}<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
    </summary>
    <div className="mt-4 space-y-4">{children}</div>
  </details>
) : (
  <section className="space-y-4"><h2 className="text-sm font-black text-slate-900">{title}</h2>{children}</section>
);

const Input: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block text-xs font-semibold text-slate-700"><span className="mb-1.5 block">{label}</span>{children}</label>
);

const ReadOnly: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{value}</p></div>
);

const FilePicker: React.FC<{
  label: string;
  file: File | null;
  existingPath?: string | null;
  onChange: (file: File | null) => void;
}> = ({ label, file, existingPath, onChange }) => {
  const { data: existingPreviewUrl, isLoading: isLoadingExistingPreview } = useSignedImageUrl(existingPath);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setLocalPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const previewUrl = localPreviewUrl ?? existingPreviewUrl;
  const status = file
    ? 'Đã chọn · sẽ tải lên khi gửi'
    : existingPath
      ? isLoadingExistingPreview
        ? 'Đang tải ảnh đã lưu...'
        : 'Đã tải lên · chọn để thay'
      : 'PNG, JPG hoặc WEBP';

  return (
    <label className="group flex min-h-24 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-2 text-center transition-colors hover:border-emerald-600 focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-700/15">
      {previewUrl ? (
        <span className="relative block h-36 w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
          <img src={previewUrl} alt={`Xem trước ${label}`} className="h-full w-full object-contain" />
          <span className="absolute right-2 top-2 rounded-full bg-emerald-700 px-2 py-1 text-[9px] font-bold text-white shadow-sm">
            {file ? 'Ảnh mới' : 'Đã lưu'}
          </span>
        </span>
      ) : (
        <FileImage className="h-5 w-5 text-emerald-700" />
      )}
      <span className="mt-2 text-xs font-bold text-slate-700">{label}</span>
      <span className={`mt-1 text-[10px] ${file || existingPath ? 'font-semibold text-emerald-700' : 'text-slate-500'}`}>{status}</span>
      {file ? <span className="mt-0.5 block max-w-full truncate text-[10px] text-slate-500">{file.name}</span> : null}
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label={`Chọn ${label}`}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
    </label>
  );
};

const OnboardingStatus: React.FC<{ title: string; description: string; onSignOut: () => Promise<void> }> = ({ title, description, onSignOut }) => (
  <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4"><section className="max-w-md rounded-2xl bg-white p-7 text-center shadow-xl"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-700" /><h1 className="mt-4 text-xl font-black text-slate-900">{title}</h1><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p><button type="button" onClick={() => void onSignOut()} className="mt-6 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700">Đăng xuất</button></section></main>
);
