import React, { useEffect, useState } from 'react';
import { FileUp, X } from 'lucide-react';
import type { DbContract } from '../../hooks/useContracts';
import { useCreateContract, useUpdateContract } from '../../hooks/useContracts';
import type { DbEmployee } from '../../hooks/useEmployees';
import { useUpdateEmployee } from '../../hooks/useEmployees';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useHR } from '../../context/HRContext';

const TYPES = ['Thử việc', 'HĐ xác định thời hạn (1 năm)', 'HĐ xác định thời hạn (2 năm)', 'HĐ không xác định thời hạn', 'Phụ lục hợp đồng'];
const STATUSES = ['Đang hiệu lực', 'Sắp hết hạn', 'Hết hạn', 'Đã gia hạn'];
const inputClass = 'w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30';

export const ContractEditorModal: React.FC<{
  employee: DbEmployee;
  contract: DbContract | null;
  existingContracts?: DbContract[];
  onClose: () => void;
}> = ({ employee, contract, existingContracts = [], onClose }) => {
  const { showToast } = useHR();
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();
  const updateEmployee = useUpdateEmployee();
  const { uploadFile, isUploading } = useFileUpload();
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    contract_code: '',
    type: TYPES[1],
    signed_date: '',
    start_date: '',
    end_date: '',
    position: '',
    salary: '',
    kpi_target_month: '',
    allowance_amount: '',
    status: STATUSES[0],
    note: '',
    parent_contract_id: '',
  });

  useEffect(() => {
    setForm({
      contract_code: contract?.contract_code || '',
      type: contract?.type || TYPES[1],
      signed_date: contract?.signed_date || '',
      start_date: contract?.start_date || '',
      end_date: contract?.end_date || '',
      position: contract?.position || employee.job_title || '',
      salary: contract?.salary?.toString() || employee.current_salary?.toString() || '',
      kpi_target_month: contract?.kpi_target_month?.toString() || '',
      allowance_amount: contract?.allowance_amount?.toString() || '',
      status: contract?.status || STATUSES[0],
      note: contract?.note || '',
      parent_contract_id: contract?.parent_contract_id || '',
    });
    setFile(null);
  }, [contract, employee]);

  const baseContracts = existingContracts.filter((c) => c.id !== contract?.id && !c.parent_contract_id);

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
        signed_date: form.signed_date || null,
        start_date: form.start_date,
        end_date: form.type === 'HĐ không xác định thời hạn' ? null : form.end_date || null,
        position: form.position.trim() || null,
        salary: form.salary ? Number(form.salary) : null,
        kpi_target_month: form.kpi_target_month ? Number(form.kpi_target_month) : null,
        allowance_amount: form.allowance_amount ? Number(form.allowance_amount) : 0,
        status: form.status,
        note: form.note.trim() || null,
        parent_contract_id: form.parent_contract_id || null,
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
          <label className="text-xs font-semibold text-slate-700">Loại HĐ
            <select value={form.type} onChange={e => set('type', e.target.value)} className={`${inputClass} mt-1`}>{TYPES.map(value => <option key={value}>{value}</option>)}</select>
          </label>
          {form.type === 'Phụ lục hợp đồng' && (
            <label className="text-xs font-semibold text-slate-700">Phụ lục của hợp đồng gốc
              <select value={form.parent_contract_id} onChange={e => set('parent_contract_id', e.target.value)} className={`${inputClass} mt-1`}>
                <option value="">-- Chọn hợp đồng gốc --</option>
                {baseContracts.map(c => <option key={c.id} value={c.id}>{c.contract_code} ({c.type})</option>)}
              </select>
            </label>
          )}
          <label className="text-xs font-semibold text-slate-700">Ngày ký
            <input type="date" value={form.signed_date} onChange={e => set('signed_date', e.target.value)} className={`${inputClass} mt-1`} />
          </label>
          <label className="text-xs font-semibold text-slate-700">Thời hạn hợp đồng — bắt đầu
            <input required type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={`${inputClass} mt-1`} />
          </label>
          <label className="text-xs font-semibold text-slate-700">Thời hạn hợp đồng — kết thúc
            <input type="date" disabled={form.type === 'HĐ không xác định thời hạn'} value={form.end_date} onChange={e => set('end_date', e.target.value)} className={`${inputClass} mt-1 disabled:bg-slate-100`} />
          </label>
          <label className="text-xs font-semibold text-slate-700">Vị trí
            <input value={form.position} onChange={e => set('position', e.target.value)} className={`${inputClass} mt-1`} />
          </label>
          <label className="text-xs font-semibold text-slate-700">Mức lương
            <input type="number" min="0" value={form.salary} onChange={e => set('salary', e.target.value)} className={`${inputClass} mt-1`} />
          </label>
          <label className="text-xs font-semibold text-slate-700">KPI/tháng
            <input type="number" min="0" step="0.1" value={form.kpi_target_month} onChange={e => set('kpi_target_month', e.target.value)} className={`${inputClass} mt-1`} />
          </label>
          <label className="text-xs font-semibold text-slate-700">Phụ cấp
            <input type="number" min="0" value={form.allowance_amount} onChange={e => set('allowance_amount', e.target.value)} placeholder="0" className={`${inputClass} mt-1`} />
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
          <label className="sm:col-span-2 text-xs font-semibold text-slate-700">Ghi chú điều khoản
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
