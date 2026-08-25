import React, { useState } from 'react';
import { X, UserPlus, Loader2 } from 'lucide-react';
import { useHR } from '../context/HRContext';
import { useCreateEmployee } from '../hooks/useEmployees';
import { ContractType, JOB_TITLES } from '../types';

export const NewEmployeeModal: React.FC = () => {
  const { isNewEmployeeModalOpen, setIsNewEmployeeModalOpen, showToast } = useHR();
  const createEmployee = useCreateEmployee();

  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState<string>('');
  const [department, setDepartment] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'Nam' | 'Nữ' | 'Khác' | ''>('');
  const [maritalStatus, setMaritalStatus] = useState<'Độc thân' | 'Đã kết hôn' | ''>('');
  const [startDate, setStartDate] = useState('');
  const [contractType, setContractType] = useState<ContractType | ''>('');
  const [currentSalary, setCurrentSalary] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isNewEmployeeModalOpen) return null;

  const resetForm = () => {
    setFullName('');
    setJobTitle('');
    setDepartment('');
    setEmail('');
    setPhone('');
    setDob('');
    setGender('');
    setMaritalStatus('');
    setStartDate('');
    setContractType('');
    setCurrentSalary('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) return;
    setError(null);

    try {
      await createEmployee.mutateAsync({
        fullName,
        email,
        jobTitle: jobTitle || undefined,
        department: department || undefined,
        phone: phone || undefined,
        dob: dob || undefined,
        gender: gender || undefined,
        maritalStatus: maritalStatus || undefined,
        startDate: startDate || undefined,
        contractType: contractType || undefined,
        currentSalary: currentSalary ? Number(currentSalary) : undefined,
      });
      showToast(`Đã tạo hồ sơ và gửi lời mời đăng nhập tới ${email}.`);
      resetForm();
      setIsNewEmployeeModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo nhân viên. Vui lòng thử lại.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8">

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Mời Nhân viên qua Email</h2>
              <p className="text-xs text-slate-500">
                Luồng ngoại lệ cho người chưa có email công ty. Nhân viên thông thường tự đăng ký tại trang đăng nhập.
              </p>
            </div>
          </div>

          <button
            onClick={() => { resetForm(); setIsNewEmployeeModalOpen(false); }}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">

          {/* Group 1: Basic Info */}
          <div className="space-y-2">
            <h3 className="font-bold text-primary-700 uppercase tracking-wider text-[11px]">1. Thông tin Cá nhân & Chức danh</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Họ và tên *:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Hoàng Nam"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email công việc *:</label>
                <input
                  type="email"
                  placeholder="nam.nguyen@tlconcepts.vn"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chức danh công việc:</label>
                <select
                  value={jobTitle}
                  onChange={e => setJobTitle(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">— Chưa chọn —</option>
                  {JOB_TITLES.map(title => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phòng ban:</label>
                <select
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">— Chưa chọn —</option>
                  <option value="Phòng Thiết kế Nội thất">Phòng Thiết kế Nội thất</option>
                  <option value="Phòng Thiết kế Kiến trúc">Phòng Thiết kế Kiến trúc</option>
                  <option value="Ban Quản trị & Admin Văn phòng">Ban Quản trị & Admin Văn phòng</option>
                  <option value="Phòng Thiết kế & Quản lý Chất lượng">Phòng Thiết kế & Quản lý Chất lượng</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Số điện thoại:</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ngày sinh:</label>
                <input
                  type="date"
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Giới tính:</label>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value as 'Nam' | 'Nữ' | 'Khác')}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">— Chưa chọn —</option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tình trạng hôn nhân:</label>
                <select
                  value={maritalStatus}
                  onChange={e => setMaritalStatus(e.target.value as 'Độc thân' | 'Đã kết hôn')}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">— Chưa chọn —</option>
                  <option value="Độc thân">Độc thân</option>
                  <option value="Đã kết hôn">Đã kết hôn</option>
                </select>
              </div>
            </div>
          </div>

          {/* Group 2: Dates, Contract & Salary */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h3 className="font-bold text-primary-700 uppercase tracking-wider text-[11px]">2. Hợp đồng & Lương thưởng</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ngày bắt đầu làm việc:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Loại hợp đồng:</label>
                <select
                  value={contractType}
                  onChange={e => setContractType(e.target.value as ContractType)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">— Chưa chọn —</option>
                  <option value="Thử việc">Thử việc (2 tháng)</option>
                  <option value="HĐ xác định thời hạn (1 năm)">HĐ xác định thời hạn (1 năm)</option>
                  <option value="HĐ xác định thời hạn (2 năm)">HĐ xác định thời hạn (2 năm)</option>
                  <option value="HĐ không xác định thời hạn">HĐ không xác định thời hạn</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lương thỏa thuận (VND):</label>
                <input
                  type="number"
                  step="1000000"
                  placeholder="VD: 18000000"
                  value={currentSalary}
                  onChange={e => setCurrentSalary(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-success-700 focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => { resetForm(); setIsNewEmployeeModalOpen(false); }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={createEmployee.isPending}
              className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-bold rounded-xl shadow-md shadow-primary-500/20 transition-all cursor-pointer flex items-center gap-2"
            >
              {createEmployee.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Lưu & Gửi lời mời đăng nhập</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
