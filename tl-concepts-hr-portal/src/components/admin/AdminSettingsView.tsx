import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Users,
  Check,
  X,
  Sliders,
} from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { useCompanySettings, useUpdateCompanySettings } from '../../hooks/useCompanySettings';
import { useAllProfiles, useUpdateProfileRole } from '../../hooks/useProfiles';
import { useSignedImageUrl } from '../../hooks/useFileUpload';

const RowAvatar: React.FC<{ path: string | null | undefined }> = ({ path }) => {
  const { data: url } = useSignedImageUrl(path);
  return url ? (
    <img src={url} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
  ) : (
    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200" />
  );
};

// The real system only implements two roles end-to-end (see `user_role` in
// supabase/migrations/20260822105256_foundation.sql and every `is_admin()`
// RLS check across the app) — not the four-tier Admin/HR/Manager/Employee
// RBAC the original prototype drew. The matrix below and the role dropdown
// are both trimmed to match what RLS actually enforces.
const permissionsMatrix = [
  { feature: 'Xem thông tin cá nhân & Phiếu lương cá nhân', admin: true, employee: true },
  { feature: 'Gửi yêu cầu Nghỉ phép & Đăng ký OT', admin: true, employee: true },
  { feature: 'Xem danh sách & Hồ sơ nhân sự toàn công ty', admin: true, employee: false },
  { feature: 'Phê duyệt Đơn nghỉ phép & Giờ làm OT', admin: true, employee: false },
  { feature: 'Quản lý Hợp đồng, Tăng lương & Cài đặt Bảo hiểm', admin: true, employee: false },
  { feature: 'Tính toán & Phê duyệt Payroll toàn Công ty', admin: true, employee: false },
  { feature: 'Cài đặt Phân quyền & Xóa dữ liệu NV', admin: true, employee: false },
];

export const AdminSettingsView: React.FC = () => {
  const { showToast } = useHR();

  const { data: companySettings } = useCompanySettings();
  const updateCompanySettings = useUpdateCompanySettings();

  const { data: profilesData } = useAllProfiles();
  const profiles = profilesData || [];
  const updateProfileRole = useUpdateProfileRole();

  // Company parameter form state — seeded from the real row once it loads.
  const [bhxhEmployeeRate, setBhxhEmployeeRate] = useState(8);
  const [bhytEmployeeRate, setBhytEmployeeRate] = useState(1.5);
  const [bhtnEmployeeRate, setBhtnEmployeeRate] = useState(1.0);
  const [standardDays, setStandardDays] = useState(22);

  useEffect(() => {
    if (companySettings) {
      setBhxhEmployeeRate(companySettings.bhxh_employee_rate);
      setBhytEmployeeRate(companySettings.bhyt_employee_rate);
      setBhtnEmployeeRate(companySettings.bhtn_employee_rate);
      setStandardDays(companySettings.standard_work_days);
    }
  }, [companySettings]);

  const handleRoleChange = (profileId: string, newRole: 'admin' | 'employee') => {
    updateProfileRole.mutate(
      { profileId, role: newRole },
      {
        onSuccess: () => showToast('Đã cập nhật vai trò phân quyền mới cho nhân viên.'),
      }
    );
  };

  const handleSaveParams = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companySettings) return;
    updateCompanySettings.mutate(
      {
        id: companySettings.id,
        updates: {
          bhxh_employee_rate: bhxhEmployeeRate,
          bhyt_employee_rate: bhytEmployeeRate,
          bhtn_employee_rate: bhtnEmployeeRate,
          standard_work_days: standardDays,
        },
      },
      {
        onSuccess: () => showToast('Đã lưu cài đặt thông số BHXH & Công chuẩn thành công!'),
      }
    );
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
            Phân quyền tài khoản (Admin, Employee) và cấu hình tỷ lệ BHXH, ngày công chuẩn.
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
                  <th className="py-3 px-2 text-center text-slate-600">Employee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {permissionsMatrix.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-medium text-slate-800">{item.feature}</td>
                    <td className="py-3 px-2 text-center">
                      <Check className="w-4 h-4 text-success-600 mx-auto font-bold" />
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
              <span>2. Thông số Bảo hiểm & Công chuẩn</span>
            </h2>
          </div>

          <form onSubmit={handleSaveParams} className="space-y-4 text-xs">
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

            <button
              type="submit"
              disabled={!companySettings || updateCompanySettings.isPending}
              className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-xs shadow-md shadow-primary-600/20 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {updateCompanySettings.isPending ? 'Đang lưu...' : 'Lưu cấu hình thông số'}
            </button>
          </form>
        </div>
      </div>

      {/* Role Assignment for Active Employees */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 text-base flex items-center space-x-2">
            <Users className="w-5 h-5 text-success-600" />
            <span>3. Quản lý Phân quyền theo Nhân viên</span>
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
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {profile.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <select
                        value={profile.role}
                        onChange={e => handleRoleChange(profile.id, e.target.value as 'admin' | 'employee')}
                        disabled={updateProfileRole.isPending}
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 disabled:opacity-60"
                      >
                        <option value="admin">Admin / Ban Giám Đốc</option>
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
