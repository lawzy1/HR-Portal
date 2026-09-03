import React, { useEffect, useState } from 'react';
import { FileUp, Plus, Trash2, X } from 'lucide-react';
import type { DbContract } from '../../hooks/useContracts';
import { useContracts, useCreateContract, useDeleteContract, useUpdateContract } from '../../hooks/useContracts';
import type { DbEmployee } from '../../hooks/useEmployees';
import { calculateFileSha256, useFileUpload } from '../../hooks/useFileUpload';
import { useHR } from '../../context/HRContext';
import { getUserFacingError } from '../../lib/userFacingError';
import { CurrencyInput } from '../CurrencyInput';
import { MoneyVisibilityToggle } from '../../context/MoneyVisibilityContext';
import { ConfirmationDialog } from '../ConfirmationDialog';
import { useEmployeeSensitiveInfo } from '../../hooks/useEmployees';
import { formatDate } from '../../utils/formatters';
import { getContractCustomFields } from '../../utils/contracts';
import { SearchableSelect } from '../ui/SearchableSelect';

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
const CUSTOM_FIELD_NAME_MAX_LENGTH = 80;
const CUSTOM_FIELD_VALUE_MAX_LENGTH = 2000;

type CustomFieldDraft = { id: string; name: string; value: string };

const createCustomFieldId = () => `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const toCustomFieldDrafts = (value: unknown): CustomFieldDraft[] =>
  Object.entries(getContractCustomFields(value)).map(([name, fieldValue]) => ({
    id: createCustomFieldId(),
    name,
    value: fieldValue,
  }));

export const ContractEditorModal: React.FC<{
  employee: DbEmployee | null;
  employees?: DbEmployee[];
  contract: DbContract | null;
  existingContracts?: DbContract[];
  onClose: () => void;
}> = ({ employee, employees = [], contract, existingContracts = [], onClose }) => {
  const { showToast } = useHR();
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();
  const deleteContract = useDeleteContract();
  const { uploadFile, isUploading } = useFileUpload();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(contract?.employee_id || employee?.id || employees[0]?.id || '');
  const activeEmployee = employees.find((item) => item.id === selectedEmployeeId) || (employee?.id === selectedEmployeeId ? employee : null);
  const { data: sensitiveInfo } = useEmployeeSensitiveInfo(activeEmployee?.id);
  const { data: employeeContracts } = useContracts(activeEmployee?.id);
  const [file, setFile] = useState<File | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
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
    custom_fields: [] as CustomFieldDraft[],
  });

  useEffect(() => {
    if (contract?.employee_id) {
      setSelectedEmployeeId(contract.employee_id);
    } else if (!selectedEmployeeId) {
      setSelectedEmployeeId(employee?.id || employees[0]?.id || '');
    }
  }, [contract?.employee_id, employee?.id, employees, selectedEmployeeId]);

  useEffect(() => {
    if (!activeEmployee) return;
    const useCurrentProfile = !contract
      || (contract.publish_status === 'published' && ['Đang hiệu lực', 'Sắp hết hạn'].includes(contract.status));
    const textValue = (profileValue: string | null, contractValue: string | null) =>
      useCurrentProfile ? profileValue || contractValue || '' : contractValue || profileValue || '';
    const numberValue = (profileValue: number | null, contractValue: number | null) =>
      String((useCurrentProfile ? profileValue ?? contractValue : contractValue ?? profileValue) ?? '');

    setForm({
      contract_code: contract?.contract_code || '',
      type: contract?.type || activeEmployee.contract_type || TYPES[1],
      signed_date: contract?.signed_date || '',
      start_date: contract?.start_date || activeEmployee.start_date || '',
      end_date: contract?.end_date || '',
      position: textValue(activeEmployee.job_title, contract?.position ?? null),
      salary: numberValue(activeEmployee.current_salary, contract?.salary ?? null),
      kpi_target_month: numberValue(activeEmployee.kpi_target_per_day, contract?.kpi_target_month ?? null),
      allowance_amount: contract?.allowance_amount?.toString() || '',
      phone_allowance: contract?.phone_allowance?.toString() || '',
      lunch_allowance: contract?.lunch_allowance?.toString() || '',
      commission_rate_per_view: numberValue(activeEmployee.performance_commission_rate, contract?.commission_rate_per_view ?? null),
      qc_commission_rate_per_view: numberValue(activeEmployee.qc_commission_rate, contract?.qc_commission_rate_per_view ?? null),
      guaranteed_income: numberValue(activeEmployee.guaranteed_income_amount, contract?.guaranteed_income ?? null),
      level_title: textValue(activeEmployee.kpi_level, contract?.level_title ?? null),
      work_location: contract?.work_location || '',
      working_schedule: contract?.working_schedule || '',
      adjustment_categories: contract?.adjustment_categories || [],
      status: contract?.status || STATUSES[0],
      note: contract?.note || '',
      parent_contract_id: contract?.parent_contract_id || '',
      custom_fields: toCustomFieldDrafts(contract?.custom_fields),
    });
    setFile(null);
  }, [contract, activeEmployee]);

  const contractsForEmployee = employeeContracts || (activeEmployee?.id === employee?.id ? existingContracts : []);
  const baseContracts = contractsForEmployee.filter(
    (c) => c.id !== contract?.id && !c.parent_contract_id && c.publish_status === 'published',
  );

  const set = (key: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const updateCustomField = (id: string, key: 'name' | 'value', value: string) => {
    setForm((prev) => ({
      ...prev,
      custom_fields: prev.custom_fields.map((field) => field.id === id ? { ...field, [key]: value } : field),
    }));
  };

  const addCustomField = () => {
    setForm((prev) => ({
      ...prev,
      custom_fields: [...prev.custom_fields, { id: createCustomFieldId(), name: '', value: '' }],
    }));
  };

  const removeCustomField = (id: string) => {
    setForm((prev) => ({
      ...prev,
      custom_fields: prev.custom_fields.filter((field) => field.id !== id),
    }));
  };

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
    if (!activeEmployee) {
      showToast('Vui lòng chọn nhân viên để tạo hợp đồng.');
      return;
    }
    if (form.type === 'Phụ lục hợp đồng' && form.adjustment_categories.length === 0) {
      showToast('Vui lòng chọn ít nhất một nội dung được điều chỉnh trong phụ lục.');
      return;
    }

    const customFields: Record<string, string> = {};
    const customFieldNames = new Set<string>();
    for (const field of form.custom_fields) {
      const name = field.name.trim();
      const value = field.value.trim();
      if (!name && !value) continue;
      if (!name) {
        showToast('Vui lòng đặt tên cho trường thông tin bổ sung hoặc xóa dòng trống.');
        return;
      }
      if (name.length > CUSTOM_FIELD_NAME_MAX_LENGTH) {
        showToast(`Tên trường bổ sung không được vượt quá ${CUSTOM_FIELD_NAME_MAX_LENGTH} ký tự.`);
        return;
      }
      if (value.length > CUSTOM_FIELD_VALUE_MAX_LENGTH) {
        showToast(`Giá trị trường bổ sung không được vượt quá ${CUSTOM_FIELD_VALUE_MAX_LENGTH} ký tự.`);
        return;
      }
      const normalizedName = name.toLocaleLowerCase();
      if (customFieldNames.has(normalizedName)) {
        showToast('Tên các trường bổ sung không được trùng nhau.');
        return;
      }
      customFieldNames.add(normalizedName);
      customFields[name] = value;
    }

    try {
      const dateStr = (form.start_date || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
      const prefix = form.type === 'Phụ lục hợp đồng' ? 'PLHD' : 'HDLD';
      const generatedCode = `${prefix}-${activeEmployee.employee_code || 'EMP'}-${dateStr}`;
      const finalContractCode = form.contract_code.trim() || generatedCode;

      let documentPath = contract?.document_path || null;
      let documentName = contract?.document_name || null;
      let documentSha256 = contract?.document_sha256 || null;
      if (file) {
        documentSha256 = await calculateFileSha256(file);
        documentPath = await uploadFile(file, activeEmployee.company_id, activeEmployee.id, `contract-${finalContractCode.replace(/[^a-zA-Z0-9_-]/g, '-')}`);
        documentName = file.name;
      }

      const values = {
        contract_code: finalContractCode,
        type: form.type,
        signed_date: form.signed_date || null,
        start_date: form.start_date,
        end_date: form.type === 'HĐ không xác định thời hạn' ? null : form.end_date || null,
        position: form.position.trim() || null,
        salary: form.salary ? Number(form.salary) : null,
        // ponytail: retain the legacy DB key until all deployed clients use the
        // daily name; the value and UI are already daily KPI.
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
        custom_fields: customFields,
        document_path: documentPath,
        document_name: documentName,
        document_sha256: documentSha256,
        // Published current contracts may be revised by Admin, then go through
        // the same approval flow again before the changes are applied.
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
          company_id: activeEmployee.company_id,
          employee_id: activeEmployee.id,
        });
      }

      showToast(contract?.publish_status === 'published' ? 'Đã chuyển hợp đồng hiện tại về nháp để duyệt lại.' : contract ? 'Đã cập nhật hợp đồng nháp.' : 'Đã tạo hợp đồng nháp. Hãy gửi Admin duyệt trước khi áp dụng.');
      onClose();
    } catch (error) {
      showToast(await getUserFacingError(error, 'Không thể lưu hợp đồng. Vui lòng thử lại.'));
    }
  };

  const handleDelete = async () => {
    if (!contract) return;
    try {
      await deleteContract.mutateAsync(contract.id);
      showToast(`Đã xóa hợp đồng ${contract.contract_code}.`);
      setIsDeleteOpen(false);
      onClose();
    } catch (error) {
      showToast(await getUserFacingError(error, 'Không thể xóa hợp đồng. Vui lòng thử lại.'));
    }
  };

  const isSaving = createContract.isPending || updateContract.isPending || deleteContract.isPending || isUploading;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200">
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h2 className="font-bold text-slate-900">{contract ? 'Chỉnh sửa hợp đồng' : 'Tạo hợp đồng mới'}</h2>
            {contract ? (
              <p className="text-xs text-slate-500 mt-0.5">{activeEmployee?.employee_code} — {activeEmployee?.full_name}</p>
            ) : (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500">Nhân viên tạo hợp đồng</span>
                <SearchableSelect
                  className="min-w-[260px]"
                  value={selectedEmployeeId}
                  onChange={setSelectedEmployeeId}
                  options={employees.map((item) => ({
                    value: item.id,
                    label: `${item.employee_code} - ${item.full_name} (${item.department})`,
                  }))}
                  placeholder="-- Chọn nhân viên --"
                  searchPlaceholder="Tìm theo mã hoặc tên nhân viên..."
                />
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="mx-5 mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
          <p className="mb-2 font-bold text-slate-600 uppercase tracking-wide text-[10px]">Thông tin cá nhân từ hồ sơ đã duyệt (tham khảo, không thuộc hợp đồng)</p>
          <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
            <p><span className="text-slate-500">Địa chỉ thường trú:</span> <span className="font-semibold text-slate-800">{activeEmployee?.permanent_address || '—'}</span></p>
            <p><span className="text-slate-500">Số CCCD:</span> <span className="font-semibold text-slate-800">{sensitiveInfo?.id_card_number || '—'}</span></p>
            <p><span className="text-slate-500">Ngày cấp CCCD:</span> <span className="font-semibold text-slate-800">{sensitiveInfo?.id_card_issue_date || '—'}</span></p>
            <p><span className="text-slate-500">Nơi cấp CCCD:</span> <span className="font-semibold text-slate-800">{sensitiveInfo?.id_card_issue_place || '—'}</span></p>
            <p><span className="text-slate-500">Ngân hàng:</span> <span className="font-semibold text-slate-800">{sensitiveInfo?.bank_name ? `${sensitiveInfo.bank_name} — ${sensitiveInfo.bank_account_number || '—'}` : '—'}</span></p>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 -mb-1 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-slate-500"><span className="text-rose-600">*</span> Trường bắt buộc</p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-semibold text-slate-600">
                Ẩn/hiện lương <MoneyVisibilityToggle />
              </span>
              {contract && (
                <button type="button" onClick={() => setIsDeleteOpen(true)} disabled={isSaving} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50">
                  <Trash2 className="h-3.5 w-3.5" /> Xóa hợp đồng
                </button>
              )}
            </div>
          </div>
          <label className="text-xs font-semibold text-slate-700">
            Mã hợp đồng <span className="text-slate-400 font-normal">(Tùy chọn - tự tạo nếu để trống)</span>
            <input
              value={form.contract_code}
              onChange={e => set('contract_code', e.target.value)}
              placeholder={form.type === 'Phụ lục hợp đồng' ? `VD: PLHD-${activeEmployee?.employee_code || 'EMP'}-20260904` : `VD: HDLD-${activeEmployee?.employee_code || 'EMP'}-20260904`}
              className={`${inputClass} mt-1`}
            />
          </label>
          <label className="text-xs font-semibold text-slate-700">Loại HĐ <span className="text-rose-600">*</span>
            <select required value={form.type} onChange={e => set('type', e.target.value)} className={`${inputClass} mt-1`}>{TYPES.map(value => <option key={value}>{value}</option>)}</select>
          </label>
          {form.type === 'Phụ lục hợp đồng' && (
            <label className="text-xs font-semibold text-slate-700">Phụ lục của hợp đồng gốc <span className="text-rose-600">*</span>
              <select required value={form.parent_contract_id} onChange={e => set('parent_contract_id', e.target.value)} className={`${inputClass} mt-1`}>
                <option value="">-- Chọn hợp đồng gốc --</option>
                {baseContracts.map(c => <option key={c.id} value={c.id}>{c.contract_code} ({c.type} - {formatDate(c.start_date)})</option>)}
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
          <label className="text-xs font-semibold text-slate-700">KPI/ngày (view/ngày)
            <input type="number" min="0" step="0.01" value={form.kpi_target_month} onChange={e => set('kpi_target_month', e.target.value)} className={`${inputClass} mt-1`} />
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

          <section className="sm:col-span-2 rounded-2xl border border-primary-200 bg-primary-50/40 p-4" aria-labelledby="custom-contract-fields-title">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 id="custom-contract-fields-title" className="text-xs font-extrabold uppercase tracking-wide text-primary-800">Thông tin bổ sung</h3>
                <p className="mt-1 text-[11px] font-normal leading-5 text-slate-500">Thêm các trường chỉ áp dụng cho hợp đồng này, ví dụ: Thời lượng báo trước, Người phụ trách, Điều khoản riêng.</p>
              </div>
              <button type="button" onClick={addCustomField} disabled={isSaving} className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-primary-300 bg-white px-2.5 py-2 text-[11px] font-bold text-primary-700 transition hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-50">
                <Plus className="h-3.5 w-3.5" /> Thêm trường
              </button>
            </div>

            {form.custom_fields.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-primary-200 bg-white/70 px-3 py-3 text-center text-[11px] text-slate-400">Chưa có trường bổ sung nào.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {form.custom_fields.map((field) => (
                  <div key={field.id} className="grid grid-cols-1 items-end gap-2 rounded-xl border border-primary-100 bg-white p-2.5 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)_auto]">
                    <label className="text-[11px] font-bold text-slate-600">
                      Tên trường / cột
                      <input
                        value={field.name}
                        maxLength={CUSTOM_FIELD_NAME_MAX_LENGTH}
                        onChange={(event) => updateCustomField(field.id, 'name', event.target.value)}
                        placeholder="VD: Thời lượng báo trước"
                        className={`${inputClass} mt-1 px-2.5 py-2 text-xs`}
                      />
                    </label>
                    <label className="text-[11px] font-bold text-slate-600">
                      Giá trị
                      <input
                        value={field.value}
                        maxLength={CUSTOM_FIELD_VALUE_MAX_LENGTH}
                        onChange={(event) => updateCustomField(field.id, 'value', event.target.value)}
                        placeholder="Nhập giá trị"
                        className={`${inputClass} mt-1 px-2.5 py-2 text-xs`}
                      />
                    </label>
                    <button type="button" onClick={() => removeCustomField(field.id)} disabled={isSaving} aria-label={`Xóa trường ${field.name || 'chưa đặt tên'}`} title="Xóa trường này" className="mb-0.5 rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="sticky bottom-0 bg-white p-5 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 cursor-pointer">Huỷ</button>
          <button disabled={isSaving} className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary-600 text-white disabled:opacity-50 cursor-pointer">
            {isSaving ? 'Đang lưu...' : 'Lưu hợp đồng'}
          </button>
        </div>
      </form>

      <ConfirmationDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Xóa hợp đồng?"
        description={`Hợp đồng ${contract?.contract_code || ''} sẽ bị xóa vĩnh viễn. Các phụ lục liên kết sẽ được giữ lại và tách khỏi hợp đồng gốc.`}
        confirmLabel="Xóa hợp đồng"
        onConfirm={() => void handleDelete()}
        isPending={deleteContract.isPending}
        variant="danger"
      />
    </div>
  );
};
