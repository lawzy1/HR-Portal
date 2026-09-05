import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Users,
  Check,
  X,
  Sliders,
} from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { useAuth } from '../../context/AuthContext';
import { getUserFacingError } from '../../lib/userFacingError';
import { supabase } from '../../lib/supabaseClient';
import {
  useCompany,
  useCompanySettings,
  useUpdateCompany,
  useUpdateCompanySettings,
} from '../../hooks/useCompanySettings';
import { useAllProfiles, useUpdateProfileRole } from '../../hooks/useProfiles';
import { useSignedImageUrl, AVATAR_TRANSFORM } from '../../hooks/useFileUpload';
import { ConfirmationDialog } from '../ConfirmationDialog';

const RowAvatar: React.FC<{ path: string | null | undefined }> = ({ path }) => {
  const { data: url } = useSignedImageUrl(path, AVATAR_TRANSFORM);
  return url ? (
    <img src={url} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" loading="lazy" width={32} height={32} />
  ) : (
    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200" />
  );
};

const permissionsMatrix = [
  { feature: 'Xem thông tin cá nhân & Phiếu lương cá nhân', admin: true, hr: true, employee: true },
  { feature: 'Xem và cập nhật hồ sơ nhân sự toàn công ty', admin: true, hr: true, employee: false },
  { feature: 'Nhập HĐLĐ, KPI và dữ liệu payroll', admin: true, hr: true, employee: false },
  { feature: 'Tạo yêu cầu phép, OT, WFH/đi trễ của chính mình', admin: false, hr: false, employee: true },
  { feature: 'Quản lý OT toàn công ty (tạo/sửa/xóa/cập nhật trạng thái)', admin: true, hr: false, employee: false },
  { feature: 'Duyệt/từ chối yêu cầu phép, OT, WFH/đi trễ', admin: true, hr: false, employee: false },
  { feature: 'Gửi kỳ payroll sang chờ Admin duyệt', admin: true, hr: true, employee: false },
  { feature: 'Phê duyệt cuối cùng và phát hành phiếu lương', admin: true, hr: false, employee: false },
  { feature: 'Phê duyệt nghỉ phép, OT và onboarding', admin: true, hr: false, employee: false },
  { feature: 'Quản lý tài khoản, phân quyền và audit', admin: true, hr: false, employee: false },
];

const ROLE_LABEL: Record<'admin' | 'hr' | 'employee', string> = {
  admin: 'Admin / Ban Giám Đốc',
  hr: 'HR / Kế toán',
  employee: 'Employee / Nhân viên',
};

export const AdminSettingsView: React.FC = () => {
  const { showToast } = useHR();
  const { session } = useAuth();

  const { data: companySettings } = useCompanySettings();
  const { data: company } = useCompany();
  const updateCompanySettings = useUpdateCompanySettings();
  const updateCompany = useUpdateCompany();

  const { data: profilesData } = useAllProfiles();
  const profiles = profilesData || [];
  const updateProfileRole = useUpdateProfileRole();

  const [pendingRoleChange, setPendingRoleChange] = useState<{
    profileId: string;
    employeeName: string;
    fromRole: 'admin' | 'hr' | 'employee';
    toRole: 'admin' | 'hr' | 'employee';
  } | null>(null);
  const [roleChangePassword, setRoleChangePassword] = useState('');
  const [roleChangeError, setRoleChangeError] = useState('');
  const [isVerifyingRoleChange, setIsVerifyingRoleChange] = useState(false);

  const closeRoleChangeDialog = () => {
    setPendingRoleChange(null);
    setRoleChangePassword('');
    setRoleChangeError('');
  };

  const confirmRoleChange = async () => {
    if (!pendingRoleChange) return;
    const email = session?.user.email;
    if (!email) {
      setRoleChangeError('Không xác định được tài khoản hiện tại.');
      return;
    }
    if (!roleChangePassword) {
      setRoleChangeError('Vui lòng nhập mật khẩu để xác nhận.');
      return;
    }

    setIsVerifyingRoleChange(true);
    setRoleChangeError('');
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: roleChangePassword });
    setIsVerifyingRoleChange(false);
    if (reauthError) {
      setRoleChangeError(await getUserFacingError(reauthError, 'Mật khẩu không đúng.'));
      return;
    }

    updateProfileRole.mutate(
      { profileId: pendingRoleChange.profileId, role: pendingRoleChange.toRole },
      {
        onSuccess: () => {
          showToast('Đã cập nhật vai trò phân quyền mới cho nhân viên.');
          closeRoleChangeDialog();
        },
        onError: async (error) => setRoleChangeError(await getUserFacingError(error)),
      }
    );
  };

  // Company parameter form state — seeded from the real row once it loads.
  const [bhxhEmployeeRate, setBhxhEmployeeRate] = useState(8);
  const [bhytEmployeeRate, setBhytEmployeeRate] = useState(1.5);
  const [bhtnEmployeeRate, setBhtnEmployeeRate] = useState(1.0);
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyTaxCode, setCompanyTaxCode] = useState('');

  useEffect(() => {
    if (companySettings) {
      setBhxhEmployeeRate(companySettings.bhxh_employee_rate);
      setBhytEmployeeRate(companySettings.bhyt_employee_rate);
      setBhtnEmployeeRate(companySettings.bhtn_employee_rate);
    }
  }, [companySettings]);

  useEffect(() => {
    if (!company) return;
    setCompanyAddress(company.address || '');
    setCompanyTaxCode(company.tax_code || '');
  }, [company]);

  const handleRoleChange = (
    profileId: string,
    fromRole: 'admin' | 'hr' | 'employee',
    newRole: 'admin' | 'hr' | 'employee',
    employeeName: string
  ) => {
    if (newRole === fromRole) return;
    setPendingRoleChange({ profileId, fromRole, toRole: newRole, employeeName });
    setRoleChangePassword('');
    setRoleChangeError('');
  };

  const handleSaveParams = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companySettings || !company) return;
    try {
      await Promise.all([
        updateCompanySettings.mutateAsync({
        id: companySettings.id,
        updates: {
          bhxh_employee_rate: bhxhEmployeeRate,
          bhyt_employee_rate: bhytEmployeeRate,
          bhtn_employee_rate: bhtnEmployeeRate,
        },
        }),
        updateCompany.mutateAsync({
          id: company.id,
          updates: {
            address: companyAddress.trim() || null,
            tax_code: companyTaxCode.trim() || null,
          },
        }),
      ]);
      showToast('Đã lưu thông số doanh nghiệp và bảo hiểm.');
    } catch (error) {
      showToast(await getUserFacingError(error, 'Không thể lưu cấu hình doanh nghiệp. Vui lòng thử lại.'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Cài đặt Phân quyền & Cấu hình Doanh nghiệp
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Phân quyền tài khoản (Admin, HR/Kế toán, User) và cấu hình doanh nghiệp.
          </p>
        </div>
      </div>

      {/* Grid: Permissions Matrix & Company Parameters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column (7 cols): Permissions Matrix */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-base flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-primary-600" />
              <span>1. Ma trận Phân quyền Tài khoản</span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] tracking-wider border-y border-slate-200">
                <tr>
                  <th className="py-3 px-3">Quyền hạn / Chức năng</th>
                  <th className="py-3 px-2 text-center text-primary-700 font-bold">Admin</th>
                  <th className="py-3 px-2 text-center text-success-700 font-bold">HR/Kế toán</th>
                  <th className="py-3 px-2 text-center text-slate-600">Employee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {permissionsMatrix.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-medium text-slate-800">{item.feature}</td>
                    <td className="py-3 px-2 text-center">
                      {item.admin ? <Check className="w-4 h-4 text-success-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                    </td>
                    <td className="py-3 px-2 text-center">
                      {item.hr ? <Check className="w-4 h-4 text-success-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                    </td>
                    <td className="py-3 px-2 text-center">
                      {item.employee ? <Check className="w-4 h-4 text-success-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (5 cols): Company Parameters Config */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-base flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-primary-600" />
              <span>2. Thông số doanh nghiệp & Payroll</span>
            </h2>
          </div>

          <form onSubmit={handleSaveParams} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Địa chỉ hiển thị trên phiếu lương:</label>
              <textarea
                rows={2}
                value={companyAddress}
                onChange={e => setCompanyAddress(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mã số thuế:</label>
              <input
                value={companyTaxCode}
                onChange={e => setCompanyTaxCode(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tỷ lệ trích BHXH Người lao động (%):</label>
              <input
                type="number"
                step="0.1"
                value={bhxhEmployeeRate}
                onChange={e => setBhxhEmployeeRate(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Quy định nhà nước: 8%</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Trích BHYT (%):</label>
                <input
                  type="number"
                  step="0.1"
                  value={bhytEmployeeRate}
                  onChange={e => setBhytEmployeeRate(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Trích BHTN (%):</label>
                <input
                  type="number"
                  step="0.1"
                  value={bhtnEmployeeRate}
                  onChange={e => setBhtnEmployeeRate(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!companySettings || !company || updateCompanySettings.isPending || updateCompany.isPending}
              className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-xs shadow-md shadow-primary-600/20 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {updateCompanySettings.isPending || updateCompany.isPending ? 'Đang lưu...' : 'Lưu cấu hình thông số'}
            </button>
          </form>
        </div>
      </div>

      {/* Role assignment and approval for employee self-registration */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 text-base flex items-center space-x-2">
            <Users className="w-5 h-5 text-success-600" />
            <span>3. Tài khoản & Phân quyền Nhân viên</span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] tracking-wider border-y border-slate-200">
              <tr>
                <th className="py-3 px-4">Nhân viên</th>
                <th className="py-3 px-4">Chức danh & Phòng ban</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Vai trò Phân quyền hiện tại</th>
                <th className="py-3 px-4 text-center">Thay đổi Vai trò</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profiles.map(profile => {
                const emp = profile.employees;
                return (
                  <tr key={profile.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900 flex items-center space-x-2.5">
                      <RowAvatar path={emp?.avatar_url} />
                      <div>
                        <span>{emp?.full_name}</span>
                        <span className="block text-[10px] text-slate-400 font-mono">{emp?.employee_code}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium">{emp?.job_title} ({emp?.department})</td>
                    <td className="py-3 px-4 text-primary-600">{emp?.email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                        profile.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : profile.role === 'hr'
                            ? 'bg-success-100 text-success-800'
                            : 'bg-slate-100 text-slate-700'
                      }`}>
                        {profile.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center">
                        <select
                          value={profile.role}
                          onChange={e => handleRoleChange(profile.id, profile.role, e.target.value as 'admin' | 'hr' | 'employee', emp?.full_name || 'Nhân viên')}
                          disabled={updateProfileRole.isPending}
                          className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 disabled:opacity-60"
                        >
                          <option value="admin">Admin / Ban Giám Đốc</option>
                          <option value="hr">HR / Kế toán</option>
                          <option value="employee">Employee / Nhân viên</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationDialog
        open={!!pendingRoleChange}
        onOpenChange={(open) => !open && closeRoleChangeDialog()}
        title="Xác nhận đổi vai trò phân quyền"
        description={
          pendingRoleChange
            ? `Đổi vai trò của ${pendingRoleChange.employeeName} từ "${ROLE_LABEL[pendingRoleChange.fromRole]}" sang "${ROLE_LABEL[pendingRoleChange.toRole]}". Nhập mật khẩu tài khoản của bạn để xác nhận.`
            : ''
        }
        confirmLabel="Xác nhận đổi vai trò"
        variant="danger"
        isPending={isVerifyingRoleChange || updateProfileRole.isPending}
        isConfirmDisabled={!roleChangePassword}
        onConfirm={confirmRoleChange}
      >
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700">Mật khẩu của bạn</label>
          <input
            type="password"
            autoFocus
            value={roleChangePassword}
            onChange={(e) => { setRoleChangePassword(e.target.value); setRoleChangeError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && confirmRoleChange()}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            placeholder="••••••••"
          />
          {roleChangeError && <p className="text-xs font-semibold text-rose-600">{roleChangeError}</p>}
        </div>
      </ConfirmationDialog>
    </div>
  );
};
