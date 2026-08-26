import React from 'react';
import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Mail,
  Phone,
  ShieldCheck,
  UserCircle,
  WalletCards,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useEmployee } from '../../hooks/useEmployees';
import { useSignedImageUrl } from '../../hooks/useFileUpload';
import { formatDate, formatVND } from '../../utils/formatters';
import { AccountSecurityCard } from '../AccountSecurityCard';

const roleLabels = {
  admin: 'Admin',
  hr: 'HR / Kế toán',
  employee: 'User',
} as const;

export const AdminProfileView: React.FC = () => {
  const { profile, session } = useAuth();
  const { data: employee } = useEmployee(profile?.employeeId ?? undefined);
  const { data: avatarUrl } = useSignedImageUrl(employee?.avatar_url);
  const roleLabel = profile?.role ? roleLabels[profile.role] : 'Chưa xác định';

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
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <BriefcaseBusiness className="w-4 h-4 text-primary-600" />
            <h2 className="text-sm font-bold text-slate-900">Thông tin nhân sự liên kết</h2>
          </div>
          {employee ? (
            <div className="space-y-3">
              <InfoRow icon={<UserCircle className="w-4 h-4" />} label="Mã nhân viên" value={employee.employee_code} />
              <InfoRow icon={<BriefcaseBusiness className="w-4 h-4" />} label="Chức danh / phòng ban" value={`${employee.job_title || '—'} • ${employee.department || '—'}`} />
              <InfoRow icon={<Phone className="w-4 h-4" />} label="Số điện thoại" value={employee.phone || '—'} />
              <InfoRow icon={<CalendarDays className="w-4 h-4" />} label="Ngày bắt đầu" value={employee.start_date ? formatDate(employee.start_date) : '—'} />
              <InfoRow icon={<WalletCards className="w-4 h-4" />} label="Mức lương hiện tại" value={employee.current_salary == null ? '—' : formatVND(employee.current_salary)} />
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs leading-5 text-slate-500">
              Tài khoản này chưa liên kết với hồ sơ nhân viên. Bạn vẫn có thể xem thông tin tài khoản và đổi mật khẩu ở bên dưới.
            </div>
          )}
        </section>
      </div>

      <AccountSecurityCard />
    </div>
  );
};

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-start justify-between gap-4 p-3 bg-slate-50 rounded-xl text-xs">
    <span className="flex items-center gap-2 text-slate-500 shrink-0">
      <span className="text-slate-400">{icon}</span>
      {label}
    </span>
    <strong className="text-slate-900 text-right break-words">{value}</strong>
  </div>
);
