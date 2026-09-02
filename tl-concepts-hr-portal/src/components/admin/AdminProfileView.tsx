import React, { useState } from 'react';
import {
  Award,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Edit,
  Mail,
  ShieldCheck,
  UserCircle,
  UserPlus,
  Send,
  Loader2,
  WalletCards,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useMoneyVisibility } from '../../context/MoneyVisibilityContext';
import { useEmployee } from '../../hooks/useEmployees';
import { useSignedImageUrl } from '../../hooks/useFileUpload';
import { AccountSecurityCard } from '../AccountSecurityCard';
import { CurrencyInput } from '../CurrencyInput';
import { KPI_LEVEL_SUGGESTIONS } from '../../constants/kpiLevels';
import { useCreateBackofficeAccount, useLinkSelfEmployeeProfile } from '../../hooks/useProfiles';
import { getUserFacingError } from '../../lib/userFacingError';
import { useHR } from '../../context/HRContext';

const roleLabels = {
  admin: 'Admin',
  hr: 'HR / Kế toán',
  employee: 'User',
} as const;

export const AdminProfileView: React.FC = () => {
  const { profile, session } = useAuth();
  const { showToast } = useHR();
  const { formatMoney } = useMoneyVisibility();
  const { data: employee } = useEmployee(profile?.employeeId ?? undefined);
  const { data: avatarUrl } = useSignedImageUrl(employee?.avatar_url);
  const roleLabel = profile?.role ? roleLabels[profile.role] : 'Chưa xác định';
  const createBackofficeAccount = useCreateBackofficeAccount();
  const [accountEmail, setAccountEmail] = useState('');
  const [accountRole, setAccountRole] = useState<'admin' | 'hr'>('admin');
  const linkSelfEmployee = useLinkSelfEmployeeProfile();
  const [isEditingSelfEmployee, setIsEditingSelfEmployee] = useState(false);
  const [selfFullName, setSelfFullName] = useState('');
  const [selfJobTitle, setSelfJobTitle] = useState('');
  const [selfDepartment, setSelfDepartment] = useState('');
  const [selfKpiLevel, setSelfKpiLevel] = useState('');
  const [selfKpiTargetPerDay, setSelfKpiTargetPerDay] = useState<number | ''>('');
  const [selfPerformanceCommissionRate, setSelfPerformanceCommissionRate] = useState(0);
  const [selfQcCommissionRate, setSelfQcCommissionRate] = useState(0);
  const [selfGuaranteedIncomeAmount, setSelfGuaranteedIncomeAmount] = useState(0);

  const startEditingSelfEmployee = () => {
    setSelfFullName(employee?.full_name || '');
    setSelfJobTitle(employee?.job_title || '');
    setSelfDepartment(employee?.department || '');
    setSelfKpiLevel(employee?.kpi_level || '');
    setSelfKpiTargetPerDay(employee?.kpi_target_per_day ?? '');
    setSelfPerformanceCommissionRate(employee?.performance_commission_rate || 0);
    setSelfQcCommissionRate(employee?.qc_commission_rate || 0);
    setSelfGuaranteedIncomeAmount(employee?.guaranteed_income_amount || 0);
    setIsEditingSelfEmployee(true);
  };

  const handleLinkSelfEmployee = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selfFullName.trim()) return;
    try {
      await linkSelfEmployee.mutateAsync({
        fullName: selfFullName,
        jobTitle: selfJobTitle,
        department: selfDepartment,
        kpiLevel: selfKpiLevel,
        kpiTargetPerDay: selfKpiTargetPerDay,
        performanceCommissionRate: selfPerformanceCommissionRate,
        qcCommissionRate: selfQcCommissionRate,
        guaranteedIncomeAmount: selfGuaranteedIncomeAmount,
      });
      showToast('Đã lưu thông tin. Bạn sẽ xuất hiện trong danh sách gán KPI.');
      setIsEditingSelfEmployee(false);
    } catch (error) {
      showToast(await getUserFacingError(error, 'Không thể lưu thông tin. Vui lòng thử lại.'));
    }
  };

  const handleCreateAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    const email = accountEmail.trim().toLowerCase();
    if (!email) return;
    try {
      await createBackofficeAccount.mutateAsync({ email, role: accountRole });
      setAccountEmail('');
      showToast(`Đã gửi email kích hoạt tài khoản ${accountRole === 'admin' ? 'Admin' : 'HR / Kế toán'}.`);
    } catch (error) {
      showToast(await getUserFacingError(error, 'Không thể tạo tài khoản. Vui lòng thử lại.'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img src={avatarUrl} alt={employee?.full_name || 'Ảnh đại diện'} className="w-20 h-20 rounded-2xl object-cover ring-4 ring-primary-500/20 shadow-md" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-primary-50 flex items-center justify-center ring-4 ring-primary-500/20">
              <UserCircle className="w-10 h-10 text-primary-600" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-slate-900">{employee?.full_name || 'Hồ sơ tài khoản'}</h1>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-primary-50 text-primary-700 rounded-lg border border-primary-200">{roleLabel}</span>
            </div>
            <p className="text-sm text-slate-600 font-medium mt-1">Thông tin tài khoản và bảo mật cá nhân</p>
            <p className="text-xs text-slate-500 mt-2">{session?.user.email || '—'}</p>
          </div>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${profile?.isActive ? 'bg-success-50 border border-success-200 text-success-700' : 'bg-rose-50 border border-rose-200 text-rose-700'}`}>
          <CheckCircle2 className="w-4 h-4" />
          {profile?.isActive ? 'Tài khoản đang hoạt động' : 'Tài khoản đã khóa'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ShieldCheck className="w-4 h-4 text-primary-600" />
            <h2 className="text-sm font-bold text-slate-900">Thông tin tài khoản</h2>
          </div>
          <InfoRow icon={<Mail className="w-4 h-4" />} label="Email đăng nhập" value={session?.user.email || '—'} />
          <InfoRow icon={<ShieldCheck className="w-4 h-4" />} label="Vai trò" value={roleLabel} />
          <InfoRow icon={<CheckCircle2 className="w-4 h-4" />} label="Trạng thái truy cập" value={profile?.isActive ? 'Đang hoạt động' : 'Đã khóa'} />
          <InfoRow icon={<Clock3 className="w-4 h-4" />} label="Trạng thái hồ sơ" value={profile?.onboardingStatus === 'approved' ? 'Đã hoàn tất' : profile?.onboardingStatus || '—'} />
        </section>

        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BriefcaseBusiness className="w-4 h-4 text-primary-600" />
              <h2 className="text-sm font-bold text-slate-900">Thông tin nhân sự liên kết</h2>
            </div>
            {employee && !isEditingSelfEmployee && (
              <button type="button" onClick={startEditingSelfEmployee} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-primary-600 hover:bg-primary-50">
                <Edit className="w-3.5 h-3.5" /> Chỉnh sửa
              </button>
            )}
          </div>
          {employee && !isEditingSelfEmployee ? (
            <div className="space-y-3">
              <InfoRow icon={<UserCircle className="w-4 h-4" />} label="Họ tên" value={employee.full_name} />
              <InfoRow icon={<UserCircle className="w-4 h-4" />} label="Mã nhân viên" value={employee.employee_code} />
              <InfoRow icon={<BriefcaseBusiness className="w-4 h-4" />} label="Chức danh / phòng ban" value={`${employee.job_title || '—'} • ${employee.department || '—'}`} />
              <InfoRow icon={<Award className="w-4 h-4" />} label="Level KPI" value={employee.kpi_level || '—'} />
              <InfoRow icon={<Award className="w-4 h-4" />} label="Chỉ tiêu KPI" value={employee.kpi_target_per_day != null ? `${employee.kpi_target_per_day} view/ngày` : '—'} />
              <InfoRow icon={<WalletCards className="w-4 h-4" />} label="Performance commission" value={`${formatMoney(employee.performance_commission_rate || 0)} / view`} />
              <InfoRow icon={<WalletCards className="w-4 h-4" />} label="QC commission" value={`${formatMoney(employee.qc_commission_rate || 0)} / QC view`} />
              <InfoRow icon={<WalletCards className="w-4 h-4" />} label="Mức đảm bảo thu nhập" value={employee.guaranteed_income_amount ? formatMoney(employee.guaranteed_income_amount) : '—'} />
            </div>
          ) : (
            <form onSubmit={handleLinkSelfEmployee} className="space-y-3">
              <p className="text-xs leading-5 text-slate-500">
                {employee
                  ? 'Cập nhật tên và chức vụ hiển thị trong danh sách gán KPI.'
                  : 'Tài khoản này chưa có hồ sơ nhân viên. Điền tên và chức vụ để bạn xuất hiện trong danh sách gán KPI (không cần thông tin nghỉ phép/lương).'}
              </p>
              <label className="block text-xs font-semibold text-slate-700">
                <span className="mb-1.5 block">Họ tên</span>
                <input required value={selfFullName} onChange={(event) => setSelfFullName(event.target.value)} placeholder="Nguyễn Văn A" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15" />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                <span className="mb-1.5 block">Chức vụ</span>
                <input value={selfJobTitle} onChange={(event) => setSelfJobTitle(event.target.value)} placeholder="Giám đốc" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15" />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                <span className="mb-1.5 block">Phòng ban</span>
                <input value={selfDepartment} onChange={(event) => setSelfDepartment(event.target.value)} placeholder="Ban giám đốc" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15" />
              </label>

              <div className="pt-2 border-t border-slate-100 space-y-3">
                <p className="text-xs font-bold text-slate-700">Thông tin cho KPI, OT</p>
                <label className="block text-xs font-semibold text-slate-700">
                  <span className="mb-1.5 block">Level vị trí công việc</span>
                  <input
                    type="text"
                    list="self-kpi-level-options"
                    value={selfKpiLevel}
                    onChange={(event) => setSelfKpiLevel(event.target.value)}
                    placeholder="VD: Level 5: Senior 3D Artist"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15"
                  />
                  <datalist id="self-kpi-level-options">
                    {KPI_LEVEL_SUGGESTIONS.map((level) => (
                      <option key={level} value={level} />
                    ))}
                  </datalist>
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  <span className="mb-1.5 block">Chỉ tiêu KPI (view/ngày)</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={selfKpiTargetPerDay}
                    onChange={(event) => setSelfKpiTargetPerDay(event.target.value === '' ? '' : Number(event.target.value))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  <span className="mb-1.5 block">Performance commission (VNĐ/view)</span>
                  <CurrencyInput value={selfPerformanceCommissionRate} onValueChange={(value) => setSelfPerformanceCommissionRate(Number(value || 0))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15" />
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  <span className="mb-1.5 block">QC commission (VNĐ/QC view)</span>
                  <CurrencyInput value={selfQcCommissionRate} onValueChange={(value) => setSelfQcCommissionRate(Number(value || 0))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15" />
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  <span className="mb-1.5 block">Mức đảm bảo thu nhập (nếu áp dụng)</span>
                  <CurrencyInput value={selfGuaranteedIncomeAmount} onValueChange={(value) => setSelfGuaranteedIncomeAmount(Number(value || 0))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15" />
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button type="submit" disabled={linkSelfEmployee.isPending} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-primary-600/20 hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {linkSelfEmployee.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Lưu thông tin
                </button>
                {employee && (
                  <button type="button" onClick={() => setIsEditingSelfEmployee(false)} className="inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100">
                    Hủy
                  </button>
                )}
              </div>
            </form>
          )}
        </section>
      </div>

      <AccountSecurityCard />

      {profile?.role === 'admin' && (
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-start gap-3 pb-4 border-b border-slate-100">
            <span className="mt-0.5 rounded-xl bg-primary-50 p-2 text-primary-600"><UserPlus className="w-5 h-5" /></span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Tạo tài khoản quản trị</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">Tạo tài khoản Admin hoặc HR/Kế toán độc lập. Tài khoản này không có hồ sơ nhân viên, không xuất hiện trong danh sách nhân sự, KPI hay payroll.</p>
            </div>
          </div>
          <form onSubmit={handleCreateAccount} className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_12rem_auto] md:items-end">
            <label className="block text-xs font-semibold text-slate-700">
              <span className="mb-1.5 block">Email đăng nhập</span>
              <input type="email" required autoComplete="email" value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} placeholder="admin@congty.com" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15" />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              <span className="mb-1.5 block">Vai trò</span>
              <select value={accountRole} onChange={(event) => setAccountRole(event.target.value as 'admin' | 'hr')} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15">
                <option value="admin">Admin</option>
                <option value="hr">HR / Kế toán</option>
              </select>
            </label>
            <button type="submit" disabled={createBackofficeAccount.isPending} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-primary-600/20 hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60">
              {createBackofficeAccount.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Gửi lời mời
            </button>
          </form>
        </section>
      )}
    </div>
  );
};

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
  <div className="flex items-start justify-between gap-4 p-3 bg-slate-50 rounded-xl text-xs">
    <span className="flex items-center gap-2 text-slate-500 shrink-0">
      <span className="text-slate-400">{icon}</span>
      {label}
    </span>
    <strong className="text-slate-900 text-right break-words">{value}</strong>
  </div>
);
