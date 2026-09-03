import React, { useState } from 'react';
import { Loader2, Mail, UserPlus, X } from 'lucide-react';
import { useHR } from '../context/HRContext';
import { useCreateEmployee } from '../hooks/useEmployees';
import { JOB_TITLES } from '../types';
import { getUserFacingError } from '../lib/userFacingError';

const DEPARTMENTS = [
  'Phòng Thiết kế Nội thất',
  'Phòng Thiết kế Kiến trúc',
  'Ban Quản trị & Admin Văn phòng',
  'Phòng Thiết kế & Quản lý Chất lượng',
];

export const NewEmployeeModal: React.FC = () => {
  const { isNewEmployeeModalOpen, setIsNewEmployeeModalOpen, showToast } = useHR();
  const createEmployee = useCreateEmployee();
  const [employeeCode, setEmployeeCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setEmployeeCode(''); setFullName(''); setEmail(''); setDepartment(''); setJobTitle(''); setStartDate(''); setError(null);
  };
  const close = () => { reset(); setIsNewEmployeeModalOpen(false); };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const result = await createEmployee.mutateAsync({ employeeCode, fullName, email, department, jobTitle, startDate });
      showToast(result.emailDelivered
        ? `Đã gửi lời mời kích hoạt tới ${email.trim().toLowerCase()}.`
        : 'Đã tạo nhân viên nhưng email chưa được Resend chấp nhận. Hãy mở hồ sơ và bấm gửi lại link.');
      close();
    } catch (caught) {
      setError(await getUserFacingError(caught, 'Không thể gửi lời mời kích hoạt. Vui lòng thử lại.'));
    }
  };

  if (!isNewEmployeeModalOpen) return null;
  const inputClass = 'w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700"><UserPlus className="h-5 w-5" /></div><div><h2 className="text-lg font-black text-slate-900">Thêm nhân viên & gửi lời mời</h2><p className="mt-1 text-xs leading-5 text-slate-500">Chỉ nhập thông tin công việc. Nhân viên sẽ tự đặt mật khẩu và hoàn thiện hồ sơ.</p></div></div>
          <button type="button" onClick={close} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Mã nhân viên *"><input value={employeeCode} onChange={(event) => setEmployeeCode(event.target.value)} placeholder="VD: NV-2026-001" className={inputClass} required /></Field>
          <Field label="Họ và tên *"><input value={fullName} onChange={(event) => setFullName(event.target.value)} className={inputClass} required /></Field>
          <Field label="Email nhân viên *"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ten.nhanvien@example.com" className={inputClass} required /></Field>
          <Field label="Ngày vào làm *"><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={inputClass} required /></Field>
          <Field label="Phòng ban *"><select value={department} onChange={(event) => setDepartment(event.target.value)} className={inputClass} required><option value="">— Chọn phòng ban —</option>{DEPARTMENTS.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Chức danh *"><select value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} className={inputClass} required><option value="">— Chọn chức danh —</option>{JOB_TITLES.map((item) => <option key={item}>{item}</option>)}</select></Field>
        </div>

        <div className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><Mail className="mt-0.5 h-4 w-4 shrink-0" /><p>Email sẽ chứa link một lần để nhân viên tự đặt mật khẩu. Tài khoản chỉ mở toàn bộ HR Portal sau khi Admin duyệt hồ sơ.</p></div>
        {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">{error}</p>}
        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={close} className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700">Hủy</button><button type="submit" disabled={createEmployee.isPending} className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white shadow-md disabled:opacity-60">{createEmployee.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Gửi lời mời kích hoạt</button></div>
      </form>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => <label className="block text-xs font-bold text-slate-700"><span className="mb-1.5 block">{label}</span>{children}</label>;
