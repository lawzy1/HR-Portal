import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Users,
  Check,
  X,
  Sliders,
} from 'lucide-react';
import { useHR } from '../../context/HRContext';
import {
  useCompany,
  useCompanySettings,
  useUpdateCompany,
  useUpdateCompanySettings,
} from '../../hooks/useCompanySettings';
import { useAllProfiles, useUpdateProfileAccess, useUpdateProfileRole } from '../../hooks/useProfiles';
import { useSignedImageUrl } from '../../hooks/useFileUpload';

const RowAvatar: React.FC<{ path: string | null | undefined }> = ({ path }) => {
  const { data: url } = useSignedImageUrl(path);
  return url ? (
    <img src={url} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
  ) : (
    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200" />
  );
};

const permissionsMatrix = [
  { feature: 'Xem thông tin cá nhân & Phiếu lương cá nhân', admin: true, hr: true, employee: true },
  { feature: 'Xem và cập nhật hồ sơ nhân sự toàn công ty', admin: true, hr: true, employee: false },
  { feature: 'Nhập HĐLĐ, KPI và dữ liệu payroll', admin: true, hr: true, employee: false },
  { feature: 'Tạo yêu cầu phép, OT, WFH/đi trễ của chính mình', admin: false, hr: false, employee: true },
  { feature: 'Duyệt/từ chối yêu cầu phép, OT, WFH/đi trễ', admin: true, hr: false, employee: false },
  { feature: 'Gửi kỳ payroll sang chờ Admin duyệt', admin: true, hr: true, employee: false },
  { feature: 'Phê duyệt cuối cùng và phát hành phiếu lương', admin: true, hr: false, employee: false },
  { feature: 'Phê duyệt nghỉ phép, OT và onboarding', admin: true, hr: false, employee: false },
  { feature: 'Quản lý tài khoản, phân quyền và audit', admin: true, hr: false, employee: false },
];

export const AdminSettingsView: React.FC = () => {
  const { showToast } = useHR();

  const { data: companySettings } = useCompanySettings();
  const { data: company } = useCompany();
  const updateCompanySettings = useUpdateCompanySettings();
  const updateCompany = useUpdateCompany();

  const { data: profilesData } = useAllProfiles();
  const profiles = profilesData || [];
  const updateProfileRole = useUpdateProfileRole();
  const updateProfileAccess = useUpdateProfileAccess();

  // Company parameter form state — seeded from the real row once it loads.
  const [bhxhEmployeeRate, setBhxhEmployeeRate] = useState(8);
  const [bhytEmployeeRate, setBhytEmployeeRate] = useState(1.5);
  const [bhtnEmployeeRate, setBhtnEmployeeRate] = useState(1.0);
  const [standardDays, setStandardDays] = useState(22);
  const [annualLeaveEntitlement, setAnnualLeaveEntitlement] = useState(12);
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyTaxCode, setCompanyTaxCode] = useState('');

  useEffect(() => {
    if (companySettings) {
      setBhxhEmployeeRate(companySettings.bhxh_employee_rate);
      setBhytEmployeeRate(companySettings.bhyt_employee_rate);
      setBhtnEmployeeRate(companySettings.bhtn_employee_rate);
      setStandardDays(companySettings.standard_work_days);
      setAnnualLeaveEntitlement(companySettings.annual_leave_entitlement);
    }
  }, [companySettings]);

  useEffect(() => {
    if (!company) return;
    setCompanyAddress(company.address || '');
    setCompanyTaxCode(company.tax_code || '');
  }, [company]);

  const handleRoleChange = (profileId: string, newRole: 'admin' | 'hr' | 'employee') => {
    updateProfileRole.mutate(
      { profileId, role: newRole },
      {
        onSuccess: () => showToast('Đã cập nhật vai trò phân quyền mới cho nhân viên.'),
      }
    );
  };

  const handleAccessChange = (profileId: string, isActive: boolean) => {
    updateProfileAccess.mutate(
      { profileId, isActive },
      { onSuccess: () => showToast(isActive ? 'Đã duyệt và kích hoạt tài khoản.' : 'Đã khóa quyền truy cập tài khoản.') }
    );
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
          standard_work_days: standardDays,
          annual_leave_entitlement: annualLeaveEntitlement,
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
      showToast('Đã lưu thông số doanh nghiệp, bảo hiểm, ngày công và ngày phép.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể lưu cấu hình doanh nghiệp.');
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

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Số ngày công chuẩn trong tháng:</label>
              <input
                type="number"
                value={standardDays}
                onChange={e => setStandardDays(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Nghỉ 2 ngày cuối tuần/tuần = 22 ngày công</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Hạn mức phép năm mặc định:</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={annualLeaveEntitlement}
                onChange={e => setAnnualLeaveEntitlement(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">TL Concepts mặc định 12 ngày; Admin có thể đổi và vẫn có thể thưởng riêng từng nhân viên.</span>
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
                <th className="py-3 px-4">Trạng thái onboarding</th>
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
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => profile.is_active && handleAccessChange(profile.id, false)}
                        disabled={updateProfileAccess.isPending || !profile.is_active}
                        className={`rounded-lg px-3 py-1.5 text-[10px] font-bold cursor-pointer disabled:opacity-60 ${
                          profile.is_active
                            ? 'bg-success-100 text-success-800 hover:bg-success-200'
                            : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        }`}
                      >
                        {profile.is_active ? 'Đang hoạt động · Khóa' : profile.onboarding_status === 'submitted' ? 'Đang chờ duyệt' : profile.onboarding_status === 'needs_changes' ? 'Cần bổ sung' : profile.onboarding_status === 'in_progress' ? 'Đang điền hồ sơ' : profile.onboarding_status === 'revoked' ? 'Lời mời đã thu hồi' : 'Đã gửi lời mời'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <select
                        value={profile.role}
                        onChange={e => handleRoleChange(profile.id, e.target.value as 'admin' | 'hr' | 'employee')}
                        disabled={updateProfileRole.isPending}
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 disabled:opacity-60"
                      >
                        <option value="admin">Admin / Ban Giám Đốc</option>
                        <option value="hr">HR / Kế toán</option>
                        <option value="employee">Employee / Nhân viên</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
