import React, { useEffect, useState } from 'react';
import { FileUp, X } from 'lucide-react';
import type { DbContract } from '../../hooks/useContracts';
import { useCreateContract, useUpdateContract } from '../../hooks/useContracts';
import type { DbEmployee } from '../../hooks/useEmployees';
import { useUpdateEmployee } from '../../hooks/useEmployees';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useHR } from '../../context/HRContext';

const TYPES = ['Thử việc', 'HĐ xác định thời hạn (1 năm)', 'HĐ xác định thời hạn (2 năm)', 'HĐ không xác định thời hạn'];
const STATUSES = ['Đang hiệu lực', 'Sắp hết hạn', 'Hết hạn', 'Đã gia hạn'];
const inputClass = 'w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30';

export const ContractEditorModal: React.FC<{
  employee: DbEmployee;
  contract: DbContract | null;
  onClose: () => void;
}> = ({ employee, contract, onClose }) => {
  const { showToast } = useHR();
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();
  const updateEmployee = useUpdateEmployee();
  const { uploadFile, isUploading } = useFileUpload();
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    contract_code: '',
    type: TYPES[1],
    start_date: '',
    end_date: '',
    position: '',
    salary: '',
    status: STATUSES[0],
    note: '',
  });

  useEffect(() => {
    setForm({
      contract_code: contract?.contract_code || '',
      type: contract?.type || TYPES[1],
      start_date: contract?.start_date || '',
      end_date: contract?.end_date || '',
      position: contract?.position || employee.job_title || '',
      salary: contract?.salary?.toString() || employee.current_salary?.toString() || '',
      status: contract?.status || STATUSES[0],
      note: contract?.note || '',
    });
    setFile(null);
  }, [contract, employee]);

  const set = (key: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleFile = (nextFile: File | undefined) => {
    if (!nextFile) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(nextFile.type) || nextFile.size > 10 * 1024 * 1024) {
      showToast('File hợp đồng phải là PDF/JPG/PNG và không vượt quá 10MB.');
      return;
    }
    setFile(nextFile);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      let documentPath = contract?.document_path || null;
      let documentName = contract?.document_name || null;
      if (file) {
        documentPath = await uploadFile(file, employee.company_id, employee.id, `contract-${form.contract_code.replace(/[^a-zA-Z0-9_-]/g, '-')}`);
        documentName = file.name;
      }

      const values = {
        contract_code: form.contract_code.trim(),
        type: form.type,
        start_date: form.start_date,
        end_date: form.type === 'HĐ không xác định thời hạn' ? null : form.end_date || null,
        position: form.position.trim() || null,
        salary: form.salary ? Number(form.salary) : null,
        status: form.status,
        note: form.note.trim() || null,
        document_path: documentPath,
        document_name: documentName,
      };

      if (contract) {
        await updateContract.mutateAsync({ id: contract.id, updates: values });
      } else {
        await createContract.mutateAsync({
          ...values,
          company_id: employee.company_id,
          employee_id: employee.id,
        });
      }

      if (form.status === 'Đang hiệu lực') {
        await updateEmployee.mutateAsync({
          id: employee.id,
          updates: { contract_type: form.type, current_salary: form.salary ? Number(form.salary) : null },
        });
      }

      showToast(contract ? 'Đã cập nhật hợp đồng.' : 'Đã tạo hợp đồng mới.');
      onClose();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể lưu hợp đồng.');
    }
  };

  const isSaving = createContract.isPending || updateContract.isPending || updateEmployee.isPending || isUploading;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200">
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h2 className="font-bold text-slate-900">{contract ? 'Chỉnh sửa hợp đồng' : 'Tạo hợp đồng mới'}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{employee.employee_code} — {employee.full_name}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="text-xs font-semibold text-slate-700">Mã hợp đồng
            <input required value={form.contract_code} onChange={e => set('contract_code', e.target.value)} className={`${inputClass} mt-1`} />
          </label>
          <label className="text-xs font-semibold text-slate-700">Loại hợp đồng
            <select value={form.type} onChange={e => set('type', e.target.value)} className={`${inputClass} mt-1`}>{TYPES.map(value => <option key={value}>{value}</option>)}</select>
          </label>
          <label className="text-xs font-semibold text-slate-700">Ngày bắt đầu
            <input required type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={`${inputClass} mt-1`} />
          </label>
          <label className="text-xs font-semibold text-slate-700">Ngày kết thúc
            <input type="date" disabled={form.type === 'HĐ không xác định thời hạn'} value={form.end_date} onChange={e => set('end_date', e.target.value)} className={`${inputClass} mt-1 disabled:bg-slate-100`} />
          </label>
          <label className="text-xs font-semibold text-slate-700">Vị trí
            <input value={form.position} onChange={e => set('position', e.target.value)} className={`${inputClass} mt-1`} />
          </label>
          <label className="text-xs font-semibold text-slate-700">Mức lương
            <input type="number" min="0" value={form.salary} onChange={e => set('salary', e.target.value)} className={`${inputClass} mt-1`} />
          </label>
          <label className="text-xs font-semibold text-slate-700">Trạng thái
            <select value={form.status} onChange={e => set('status', e.target.value)} className={`${inputClass} mt-1`}>{STATUSES.map(value => <option key={value}>{value}</option>)}</select>
          </label>
          <label className="text-xs font-semibold text-slate-700">File hợp đồng
            <span className="mt-1 flex items-center gap-2 px-3 py-2.5 border border-dashed border-primary-300 bg-primary-50 rounded-xl cursor-pointer">
              <FileUp className="w-4 h-4 text-primary-600" />
              <span className="truncate">{file?.name || contract?.document_name || 'Chọn PDF/JPG/PNG'}</span>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
            </span>
          </label>
          <label className="sm:col-span-2 text-xs font-semibold text-slate-700">Ghi chú
            <textarea rows={3} value={form.note} onChange={e => set('note', e.target.value)} className={`${inputClass} mt-1 resize-none`} />
          </label>
        </div>

        <div className="sticky bottom-0 bg-white p-5 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 cursor-pointer">Huỷ</button>
          <button disabled={isSaving} className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary-600 text-white disabled:opacity-50 cursor-pointer">
            {isSaving ? 'Đang lưu...' : 'Lưu hợp đồng'}
          </button>
        </div>
      </form>
    </div>
  );
};
