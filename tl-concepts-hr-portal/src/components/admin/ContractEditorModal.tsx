import React, { useEffect, useState } from 'react';
import { FileUp, X } from 'lucide-react';
import type { DbContract } from '../../hooks/useContracts';
import { useCreateContract, useUpdateContract } from '../../hooks/useContracts';
import type { DbEmployee } from '../../hooks/useEmployees';
import { calculateFileSha256, useFileUpload } from '../../hooks/useFileUpload';
import { useHR } from '../../context/HRContext';
import { CurrencyInput } from '../CurrencyInput';

const TYPES = ['Thử việc', 'HĐ xác định thời hạn (1 năm)', 'HĐ xác định thời hạn (2 năm)', 'HĐ không xác định thời hạn', 'Phụ lục hợp đồng'];
const STATUSES = ['Đang hiệu lực', 'Sắp hết hạn', 'Hết hạn', 'Đã gia hạn'];
const ADJUSTMENT_CATEGORIES = [
  ['position', 'Chức danh / vị trí'],
  ['level', 'Level / cấp bậc'],
  ['salary', 'Mức lương'],
  ['allowance', 'Phụ cấp / hỗ trợ'],
  ['commission', 'Commission / KPI'],
  ['working_time', 'Thời gian làm việc'],
  ['work_location', 'Địa điểm làm việc'],
  ['other', 'Nội dung khác'],
] as const;
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
    phone_allowance: '',
    lunch_allowance: '',
    commission_rate_per_view: '',
    qc_commission_rate_per_view: '',
    guaranteed_income: '',
    level_title: '',
    work_location: '',
    working_schedule: '',
    adjustment_categories: [] as string[],
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
      phone_allowance: contract?.phone_allowance?.toString() || '',
      lunch_allowance: contract?.lunch_allowance?.toString() || '',
      commission_rate_per_view: contract?.commission_rate_per_view?.toString() || '',
      qc_commission_rate_per_view: contract?.qc_commission_rate_per_view?.toString() || '',
      guaranteed_income: contract?.guaranteed_income?.toString() || '',
      level_title: contract?.level_title || employee.kpi_level || '',
      work_location: contract?.work_location || '',
      working_schedule: contract?.working_schedule || '',
      adjustment_categories: contract?.adjustment_categories || [],
      status: contract?.status || STATUSES[0],
      note: contract?.note || '',
      parent_contract_id: contract?.parent_contract_id || '',
    });
    setFile(null);
  }, [contract, employee]);

  const baseContracts = existingContracts.filter(
    (c) => c.id !== contract?.id && !c.parent_contract_id && c.publish_status === 'published',
  );

  const set = (key: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleFile = (nextFile: File | undefined) => {
    if (!nextFile) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(nextFile.type) || nextFile.size > 10 * 1024 * 1024) {
      showToast('File hợp đồng phải là DOCX/PDF/JPG/PNG và không vượt quá 10MB.');
      return;
    }
    setFile(nextFile);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.type === 'Phụ lục hợp đồng' && form.adjustment_categories.length === 0) {
      showToast('Vui lòng chọn ít nhất một nội dung được điều chỉnh trong phụ lục.');
      return;
    }
    try {
      let documentPath = contract?.document_path || null;
      let documentName = contract?.document_name || null;
      let documentSha256 = contract?.document_sha256 || null;
      if (file) {
        documentSha256 = await calculateFileSha256(file);
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
        phone_allowance: form.phone_allowance ? Number(form.phone_allowance) : 0,
        lunch_allowance: form.lunch_allowance ? Number(form.lunch_allowance) : 0,
        commission_rate_per_view: form.commission_rate_per_view ? Number(form.commission_rate_per_view) : 0,
        qc_commission_rate_per_view: form.qc_commission_rate_per_view ? Number(form.qc_commission_rate_per_view) : 0,
        guaranteed_income: form.guaranteed_income ? Number(form.guaranteed_income) : 0,
        level_title: form.level_title.trim() || null,
        work_location: form.work_location.trim() || null,
        working_schedule: form.working_schedule.trim() || null,
        adjustment_categories: form.type === 'Phụ lục hợp đồng' ? form.adjustment_categories : [],
        status: form.status,
        note: form.note.trim() || null,
        parent_contract_id: form.parent_contract_id || null,
        document_path: documentPath,
        document_name: documentName,
        document_sha256: documentSha256,
        // A rejected contract becomes a fresh draft when edited. Pending and
        // published contracts are read-only in the parent view.
        publish_status: 'draft',
        approval_requested_at: null,
        approval_requested_by: null,
        approved_at: null,
        approved_by: null,
        rejection_reason: null,
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

      showToast(contract ? 'Đã cập nhật hợp đồng nháp.' : 'Đã tạo hợp đồng nháp. Hãy gửi Admin duyệt trước khi áp dụng.');
      onClose();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể lưu hợp đồng.');
    }
  };

  const isSaving = createContract.isPending || updateContract.isPending || isUploading;

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
          <p className="sm:col-span-2 -mb-1 text-[11px] text-slate-500"><span className="text-rose-600">*</span> Trường bắt buộc</p>
          <label className="text-xs font-semibold text-slate-700">Mã hợp đồng <span className="text-rose-600">*</span>
            <input required value={form.contract_code} onChange={e => set('contract_code', e.target.value)} className={`${inputClass} mt-1`} />
          </label>
          <label className="text-xs font-semibold text-slate-700">Loại HĐ <span className="text-rose-600">*</span>
            <select required value={form.type} onChange={e => set('type', e.target.value)} className={`${inputClass} mt-1`}>{TYPES.map(value => <option key={value}>{value}</option>)}</select>
          </label>
          {form.type === 'Phụ lục hợp đồng' && (
            <label className="text-xs font-semibold text-slate-700">Phụ lục của hợp đồng gốc <span className="text-rose-600">*</span>
              <select required value={form.parent_contract_id} onChange={e => set('parent_contract_id', e.target.value)} className={`${inputClass} mt-1`}>
                <option value="">-- Chọn hợp đồng gốc --</option>
                {baseContracts.map(c => <option key={c.id} value={c.id}>{c.contract_code} ({c.type})</option>)}
              </select>
            </label>
          )}
          {form.type === 'Phụ lục hợp đồng' && (
            <fieldset className="sm:col-span-2 rounded-xl border border-primary-200 bg-primary-50/50 p-3">
              <legend className="px-1 text-xs font-bold text-primary-800">Nội dung phụ lục điều chỉnh <span className="text-rose-600">*</span></legend>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {ADJUSTMENT_CATEGORIES.map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.adjustment_categories.includes(value)}
                      onChange={(event) => setForm((prev) => ({
                        ...prev,
                        adjustment_categories: event.target.checked
                          ? [...prev.adjustment_categories, value]
                          : prev.adjustment_categories.filter((item) => item !== value),
                      }))}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <label className="text-xs font-semibold text-slate-700">Ngày ký
            <input type="date" value={form.signed_date} onChange={e => set('signed_date', e.target.value)} className={`${inputClass} mt-1`} />
          </label>
          <label className="text-xs font-semibold text-slate-700">Thời hạn hợp đồng — bắt đầu <span className="text-rose-600">*</span>
            <input required type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={`${inputClass} mt-1`} />
          </label>
          <label className="text-xs font-semibold text-slate-700">Thời hạn hợp đồng — kết thúc
            <input type="date" disabled={form.type === 'HĐ không xác định thời hạn'} value={form.end_date} onChange={e => set('end_date', e.target.value)} className={`${inputClass} mt-1 disabled:bg-slate-100`} />
          </label>
          <label className="text-xs font-semibold text-slate-700">Vị trí
            <input value={form.position} onChange={e => set('position', e.target.value)} className={`${inputClass} mt-1`} />
          </label>
          <label className="text-xs font-semibold text-slate-700">Level / cấp bậc
            <input value={form.level_title} onChange={e => set('level_title', e.target.value)} className={`${inputClass} mt-1`} placeholder="L3 3D Artist" />
          </label>
          <label className="text-xs font-semibold text-slate-700">Mức lương
            <CurrencyInput value={form.salary} onValueChange={value => set('salary', value)} className={`${inputClass} mt-1`} />
          </label>
          <label className="text-xs font-semibold text-slate-700">KPI/tháng
            <input type="number" min="0" step="0.1" value={form.kpi_target_month} onChange={e => set('kpi_target_month', e.target.value)} className={`${inputClass} mt-1`} />
          </label>
          <label className="text-xs font-semibold text-slate-700">Phụ cấp
            <CurrencyInput value={form.allowance_amount} onValueChange={value => set('allowance_amount', value)} placeholder="0" className={`${inputClass} mt-1`} />
          </label>
          <label className="text-xs font-semibold text-slate-700">Phụ cấp điện thoại
            <CurrencyInput value={form.phone_allowance} onValueChange={value => set('phone_allowance', value)} className={`${inputClass} mt-1`} />
          </label>
          <label className="text-xs font-semibold text-slate-700">Phụ cấp ăn trưa
            <CurrencyInput value={form.lunch_allowance} onValueChange={value => set('lunch_allowance', value)} className={`${inputClass} mt-1`} />
          </label>
          <label className="text-xs font-semibold text-slate-700">Commission / KPI view
            <CurrencyInput value={form.commission_rate_per_view} onValueChange={value => set('commission_rate_per_view', value)} className={`${inputClass} mt-1`} placeholder="VNĐ / view" />
          </label>
          <label className="text-xs font-semibold text-slate-700">QC commission / view
            <CurrencyInput value={form.qc_commission_rate_per_view} onValueChange={value => set('qc_commission_rate_per_view', value)} className={`${inputClass} mt-1`} placeholder="VNĐ / QC view" />
          </label>
          <label className="text-xs font-semibold text-slate-700">Mức đảm bảo thu nhập
            <CurrencyInput value={form.guaranteed_income} onValueChange={value => set('guaranteed_income', value)} className={`${inputClass} mt-1`} placeholder="0 nếu không áp dụng" />
          </label>
          <label className="text-xs font-semibold text-slate-700">Địa điểm làm việc
            <input value={form.work_location} onChange={e => set('work_location', e.target.value)} className={`${inputClass} mt-1`} placeholder="Văn phòng / địa điểm thỏa thuận" />
          </label>
          <label className="sm:col-span-2 text-xs font-semibold text-slate-700">Thời gian làm việc
            <input value={form.working_schedule} onChange={e => set('working_schedule', e.target.value)} className={`${inputClass} mt-1`} placeholder="Thứ Hai–Thứ Sáu 9:00–18:00; Thứ Bảy 9:00–13:00" />
          </label>
          <label className="text-xs font-semibold text-slate-700">Trạng thái
            <select value={form.status} onChange={e => set('status', e.target.value)} className={`${inputClass} mt-1`}>{STATUSES.map(value => <option key={value}>{value}</option>)}</select>
          </label>
          <label className="text-xs font-semibold text-slate-700">File hợp đồng
            <span className="mt-1 flex items-center gap-2 px-3 py-2.5 border border-dashed border-primary-300 bg-primary-50 rounded-xl cursor-pointer">
              <FileUp className="w-4 h-4 text-primary-600" />
              <span className="truncate">{file?.name || contract?.document_name || 'Chọn DOCX/PDF/JPG/PNG'}</span>
              <input type="file" accept=".docx,.pdf,.jpg,.jpeg,.png,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,image/jpeg,image/png" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
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
