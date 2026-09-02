import React, { useMemo, useState } from 'react';
import { FileCheck, TrendingUp, Receipt, AlertTriangle, Plus, Pencil, Send, ShieldCheck, RotateCcw, Search, Eye, X, CalendarRange, Users, ChevronLeft, FileText } from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { MoneyVisibilityToggle, useMoneyVisibility } from '../../context/MoneyVisibilityContext';
import { getUserFacingError } from '../../lib/userFacingError';
import { useAuth } from '../../context/AuthContext';
import { useEmployees, useEmployee } from '../../hooks/useEmployees';
import { useAllContracts, useApproveContract, useContracts, useRejectContract, useSalaryHistory, useSubmitContract, useContractLegalWarnings, type DbContract } from '../../hooks/useContracts';
import { useEmployeePayrollHistory } from '../../hooks/usePayroll';
import { formatDate } from '../../utils/formatters';
import { ContractDocumentLink } from '../ContractDocumentLink';
import { ContractEditorModal } from './ContractEditorModal';
import { ConfirmationDialog } from '../ConfirmationDialog';
import { getContractLifecycleStatus, latestContractsByEmployee } from '../../utils/contracts';
import { SearchableSelect } from '../ui/SearchableSelect';

export const AdminContractSalaryView: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { selectedEmployeeIdForAdmin, setSelectedEmployeeIdForAdmin, setSelectedPayslipId, showToast } = useHR();
  const { formatMoney } = useMoneyVisibility();

  const { data: employees } = useEmployees();
  const allEmployees = employees || [];
  const { data: allContractsData } = useAllContracts();
  const selectedId = selectedEmployeeIdForAdmin || allEmployees[0]?.id;

  const { data: selectedEmp } = useEmployee(selectedId);
  const { data: contracts } = useContracts(selectedId);
  const { data: salaryHistory } = useSalaryHistory(selectedId);
  const { data: legalWarnings } = useContractLegalWarnings(selectedId);
  const { data: payslipsData } = useEmployeePayrollHistory(selectedId);
  const payslips = payslipsData || [];
  const [editingContract, setEditingContract] = useState<DbContract | null | undefined>(undefined);
  const [decision, setDecision] = useState<{ action: 'approve' | 'reject'; contract: DbContract } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const submitContract = useSubmitContract();
  const approveContract = useApproveContract();
  const rejectContract = useRejectContract();

  if (viewMode === 'list') {
    return (
      <ContractDirectory
        contracts={allContractsData || []}
        onOpen={(employeeId) => {
          setSelectedEmployeeIdForAdmin(employeeId);
          setViewMode('detail');
        }}
        onCreate={() => {
          if (allEmployees[0]) setSelectedEmployeeIdForAdmin(allEmployees[0].id);
          setViewMode('detail');
          setEditingContract(null);
        }}
      />
    );
  }

  const handleSubmitApproval = async (contract: DbContract) => {
    try {
      await submitContract.mutateAsync(contract.id);
      showToast(`Đã gửi ${contract.contract_code} cho Admin duyệt.`);
    } catch (error) {
      showToast(await getUserFacingError(error, 'Không thể gửi duyệt hợp đồng. Vui lòng thử lại.'));
    }
  };

  const handleDecision = async () => {
    if (!decision) return;
    try {
      if (decision.action === 'approve') {
        await approveContract.mutateAsync(decision.contract.id);
        showToast(`Đã duyệt và áp dụng ${decision.contract.contract_code}.`);
      } else {
        await rejectContract.mutateAsync({ contractId: decision.contract.id, reason: rejectionReason });
        showToast(`Đã trả lại ${decision.contract.contract_code}.`);
      }
      setDecision(null);
      setRejectionReason('');
    } catch (error) {
      showToast(await getUserFacingError(error, 'Không thể xử lý hợp đồng. Vui lòng thử lại.'));
    }
  };

  if (!selectedEmp) {
    return <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-sm text-slate-500">Chưa có nhân viên nào.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <button onClick={() => setViewMode('list')} className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-primary-700 hover:text-primary-800 cursor-pointer">
            <ChevronLeft className="w-3.5 h-3.5" /> Tất cả hợp đồng
          </button>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Quản lý Hợp đồng Lao động & Lương thưởng
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Xem thông tin hợp đồng hiện tại, lịch sử tái ký, tăng bậc lương và các phiếu lương từng tháng.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setEditingContract(null)}
            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Tạo hợp đồng
          </button>
          <div className="flex items-center space-x-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <span className="text-xs font-bold text-slate-500 uppercase px-1">Chọn nhân viên:</span>
          <SearchableSelect
            className="min-w-[220px]"
            value={selectedId}
            onChange={setSelectedEmployeeIdForAdmin}
            options={allEmployees.map((emp) => ({ value: emp.id, label: `${emp.employee_code} - ${emp.full_name} (${emp.department})` }))}
          />
          </div>
        </div>
      </div>

      {(legalWarnings || []).length > 0 && (
        <div className="space-y-2">
          {legalWarnings!.map((w, i) => (
            <div
              key={i}
              className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-xs font-semibold ${
                w.severity === 'high' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Selected Employee Summary Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-extrabold">{selectedEmp.full_name}</h2>
            <span className="px-2.5 py-0.5 bg-primary-500/30 text-primary-200 font-mono text-xs font-bold rounded-md border border-primary-400/30">
              {selectedEmp.employee_code}
            </span>
          </div>
          <p className="text-sm text-slate-300 mt-0.5">{selectedEmp.job_title} • {selectedEmp.department}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-left border-t md:border-t-0 md:border-l border-slate-700/80 pt-4 md:pt-0 md:pl-6">
          <div>
            <span className="text-[11px] uppercase font-bold text-slate-400 block">Lương cơ bản hiện tại</span>
            <span className="inline-flex items-center gap-1 text-lg font-black text-success-400">{formatMoney(selectedEmp.current_salary || 0)}<MoneyVisibilityToggle className="h-6 w-6" /></span>
          </div>
          <div>
            <span className="text-[11px] uppercase font-bold text-slate-400 block">Ngày bắt đầu làm việc</span>
            <span className="text-sm font-bold text-amber-300">{selectedEmp.start_date ? formatDate(selectedEmp.start_date) : '—'}</span>
          </div>
          <div>
            <span className="text-[11px] uppercase font-bold text-slate-400 block">Xét duyệt lương gần nhất</span>
            <span className="text-sm font-bold text-primary-300">{selectedEmp.last_salary_review_date ? formatDate(selectedEmp.last_salary_review_date) : '—'}</span>
          </div>
        </div>
      </div>

      {/* Contract & Salary History Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
              <FileCheck className="w-5 h-5 text-primary-600" />
              <span>1. Lịch sử Hợp đồng Lao động</span>
            </h3>
            <span className="text-xs text-slate-500">Loại: {selectedEmp.contract_type || '—'}</span>
          </div>

          <div className="space-y-3">
            {!contracts || contracts.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">Chưa có dữ liệu lịch sử hợp đồng.</div>
            ) : (
              contracts.filter((c) => !c.parent_contract_id).map((contract) => {
                const addenda = contracts.filter((c) => c.parent_contract_id === contract.id);
                return (
                  <div key={contract.id} className="space-y-2">
                    <ContractCard
                      contract={contract}
                      isAdmin={isAdmin}
                      onEdit={() => setEditingContract(contract)}
                      onSubmit={() => void handleSubmitApproval(contract)}
                      onApprove={() => setDecision({ action: 'approve', contract })}
                      onReject={() => setDecision({ action: 'reject', contract })}
                    />
                    {addenda.map((addendum) => (
                      <div key={addendum.id} className="ml-4 border-l-2 border-primary-200 pl-3">
                        <ContractCard
                          contract={addendum}
                          isAdmin={isAdmin}
                          onEdit={() => setEditingContract(addendum)}
                          onSubmit={() => void handleSubmitApproval(addendum)}
                          onApprove={() => setDecision({ action: 'approve', contract: addendum })}
                          onReject={() => setDecision({ action: 'reject', contract: addendum })}
                          isAddendum
                        />
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-success-600" />
              <span>2. Lịch sử Diễn biến Thu nhập & Tăng lương</span>
            </h3>
          </div>

          <div className="space-y-3">
            {!salaryHistory || salaryHistory.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">Chưa có ghi nhận điều chỉnh lương.</div>
            ) : (
              salaryHistory.map((sal) => (
                <div key={sal.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">{sal.change_type}</span>
                    <span className="text-xs text-slate-500 font-medium">Áp dụng: {sal.effective_date}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div>
                      <span className="text-slate-500 block">Lương cũ:</span>
                      <span className="line-through text-slate-400">{formatMoney(sal.old_salary || 0)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block">Lương mới:</span>
                      <span className="font-bold text-success-600 text-sm">{formatMoney(sal.new_salary)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 pt-1 border-t border-slate-200/60">
                    Lý do: <span className="italic">{sal.reason}</span> (Người duyệt: {sal.approved_by})
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Monthly Payslips Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-primary-600" />
            <span>3. Danh sách Phiếu lương từng tháng của {selectedEmp.full_name}</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] tracking-wider border-y border-slate-200">
              <tr>
                <th className="py-3 px-4">Kỳ lương</th>
                <th className="py-3 px-4">Lương cơ bản</th>
                <th className="py-3 px-4">KPI / Thưởng</th>
                <th className="py-3 px-4">Lương OT</th>
                <th className="py-3 px-4">Thu nhập Gross</th>
                <th className="py-3 px-4">BHXH & Thuế PIT</th>
                <th className="py-3 px-4">Lương Thực nhận (Net)</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payslips.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Chưa có phiếu lương được phát hành cho nhân viên này.
                  </td>
                </tr>
              ) : (
                payslips.map((ps) => (
                  <tr key={ps.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">Tháng {ps.month}/{ps.year}</td>
                    <td className="py-3 px-4">{formatMoney(ps.base_salary)}</td>
                    <td className="py-3 px-4 text-success-600 font-medium">+{formatMoney(ps.kpi_bonus)}</td>
                    <td className="py-3 px-4 text-primary-600 font-medium">+{formatMoney(ps.ot_pay)}</td>
                    <td className="py-3 px-4 font-semibold">{formatMoney(ps.gross_income)}</td>
                    <td className="py-3 px-4 text-rose-600">-{formatMoney(ps.bhxh_deduction + ps.personal_income_tax)}</td>
                    <td className="py-3 px-4 font-extrabold text-success-700 text-sm">{formatMoney(ps.net_salary)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        ps.payment_status === 'Đã thanh toán' ? 'bg-success-100 text-success-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {ps.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedPayslipId(ps.id)}
                        className="px-3 py-1 bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-200 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingContract !== undefined && (
        <ContractEditorModal
          employee={selectedEmp}
          contract={editingContract}
          existingContracts={contracts || []}
          onClose={() => setEditingContract(undefined)}
        />
      )}

      <ConfirmationDialog
        open={decision !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDecision(null);
            setRejectionReason('');
          }
        }}
        title={decision?.action === 'approve' ? 'Duyệt và áp dụng hợp đồng?' : 'Trả lại hợp đồng cho HR/Kế toán?'}
        description={decision?.action === 'approve'
          ? 'Thông tin lương, level và commission thuộc phạm vi hợp đồng sẽ được cập nhật vào hồ sơ nhân viên.'
          : 'Hợp đồng quay về trạng thái có thể chỉnh sửa và phải được gửi duyệt lại.'}
        confirmLabel={decision?.action === 'approve' ? 'Duyệt & áp dụng' : 'Trả lại'}
        onConfirm={() => void handleDecision()}
        isPending={approveContract.isPending || rejectContract.isPending}
        isConfirmDisabled={decision?.action === 'reject' && rejectionReason.trim().length < 3}
        variant={decision?.action === 'reject' ? 'danger' : 'primary'}
      >
        {decision?.action === 'reject' && (
          <label className="block text-sm font-semibold text-slate-700">Lý do trả lại
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm font-normal"
            />
          </label>
        )}
      </ConfirmationDialog>
    </div>
  );
};

const CONTRACT_APPROVAL_LABELS: Record<string, string> = {
  draft: 'Nháp',
  pending_approval: 'Chờ Admin duyệt',
  published: 'Đã phát hành',
  rejected: 'Bị trả lại',
};

type DirectoryContract = DbContract & {
  employees?: { full_name: string; employee_code: string; avatar_url: string | null } | null;
};

const ContractDirectory: React.FC<{
  contracts: DirectoryContract[];
  onOpen: (employeeId: string) => void;
  onCreate: () => void;
}> = ({ contracts, onOpen, onCreate }) => {
  const { formatMoney } = useMoneyVisibility();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [preview, setPreview] = useState<DirectoryContract | null>(null);

  const filteredContracts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return contracts.filter((contract) => {
      const person = contract.employees;
      const lifecycleStatus = getContractLifecycleStatus(contract);
      const matchesQuery = !normalizedQuery || [
        contract.contract_code,
        contract.type,
        contract.position,
        person?.full_name,
        person?.employee_code,
      ].some((value) => value?.toLowerCase().includes(normalizedQuery));
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'active' && ['Đang hiệu lực', 'Đã gia hạn'].includes(lifecycleStatus))
        || (statusFilter === 'expiring' && lifecycleStatus === 'Sắp hết hạn')
        || (statusFilter === 'pending' && contract.publish_status === 'pending_approval');
      return matchesQuery && matchesStatus;
    });
  }, [contracts, query, statusFilter]);

  const currentContracts = useMemo(() => latestContractsByEmployee(contracts), [contracts]);
  const activeCount = currentContracts.filter((contract) => ['Đang hiệu lực', 'Đã gia hạn'].includes(getContractLifecycleStatus(contract))).length;
  const expiringCount = currentContracts.filter((contract) => getContractLifecycleStatus(contract) === 'Sắp hết hạn').length;
  const pendingCount = contracts.filter((contract) => contract.publish_status === 'pending_approval').length;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-600">Hợp đồng</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Quản lý hợp đồng</h1>
            <p className="mt-1 text-sm text-slate-500">Theo dõi toàn bộ hợp đồng, tình trạng duyệt và thời hạn ở một nơi.</p>
          </div>
          <button onClick={onCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-primary-700 cursor-pointer">
            <Plus className="h-4 w-4" /> Tạo hợp đồng
          </button>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <SummaryPill icon={<FileCheck className="h-4 w-4" />} label="Đang hiệu lực" value={activeCount} tone="success" />
          <SummaryPill icon={<CalendarRange className="h-4 w-4" />} label="Sắp hết hạn" value={expiringCount} tone="amber" />
          <SummaryPill icon={<Users className="h-4 w-4" />} label="Chờ phê duyệt" value={pendingCount} tone="primary" />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm nhân viên, mã hoặc loại hợp đồng" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-primary-400 focus:bg-white focus:ring-4 focus:ring-primary-100" />
          </div>
          <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
            {[
              ['all', 'Tất cả'], ['active', 'Hiệu lực'], ['expiring', 'Sắp hết hạn'], ['pending', 'Chờ duyệt'],
            ].map(([value, label]) => (
              <button key={value} onClick={() => setStatusFilter(value)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition cursor-pointer ${statusFilter === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{label}</button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Nhân viên</th>
                <th className="px-4 py-3.5">Hợp đồng</th>
                <th className="px-4 py-3.5">Thời hạn</th>
                <th className="px-4 py-3.5">Lương cơ bản</th>
                <th className="px-4 py-3.5">Trạng thái</th>
                <th className="px-4 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredContracts.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-14 text-center text-sm text-slate-500">Không tìm thấy hợp đồng phù hợp.</td></tr>
              ) : filteredContracts.map((contract) => (
                <tr key={contract.id} className="group hover:bg-primary-50/35">
                  <td className="px-5 py-4">
                    <button onClick={() => onOpen(contract.employee_id)} className="flex items-center gap-3 text-left cursor-pointer">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-extrabold text-slate-600">{contract.employees?.full_name?.slice(0, 1) || '?'}</span>
                      <span><span className="block font-bold text-slate-900 group-hover:text-primary-700">{contract.employees?.full_name || 'Nhân viên'}</span><span className="mt-0.5 block text-xs text-slate-500">{contract.employees?.employee_code || '—'}</span></span>
                    </button>
                  </td>
                  <td className="px-4 py-4"><span className="block font-bold text-slate-900">{contract.contract_code}</span><span className="mt-0.5 block text-xs text-slate-500">{contract.parent_contract_id ? 'Phụ lục · ' : ''}{contract.type}</span></td>
                  <td className="px-4 py-4 text-xs text-slate-600"><span className="block">{formatDate(contract.start_date)}</span><span className="mt-0.5 block text-slate-400">đến {contract.end_date ? formatDate(contract.end_date) : 'Không xác định'}</span></td>
                  <td className="px-4 py-4 font-bold text-slate-800">{formatMoney(contract.salary || 0)}</td>
                  <td className="px-4 py-4"><div className="flex flex-wrap gap-1.5"><ContractStatusBadge contract={contract} /><ApprovalBadge status={contract.publish_status} /></div></td>
                  <td className="px-4 py-4"><div className="flex justify-end gap-2"><button onClick={() => setPreview(contract)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-600 hover:border-primary-200 hover:text-primary-700 cursor-pointer"><Eye className="h-3.5 w-3.5" /> Xem nhanh</button><button onClick={() => onOpen(contract.employee_id)} className="rounded-lg bg-slate-900 px-2.5 py-2 text-xs font-bold text-white hover:bg-slate-700 cursor-pointer">Chi tiết</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {preview && <ContractQuickPreview contract={preview} onClose={() => setPreview(null)} onOpen={() => onOpen(preview.employee_id)} />}
    </div>
  );
};

const SummaryPill: React.FC<{ icon: React.ReactNode; label: string; value: number; tone: 'success' | 'amber' | 'primary' }> = ({ icon, label, value, tone }) => {
  const colors = { success: 'bg-success-50 text-success-700 border-success-100', amber: 'bg-amber-50 text-amber-700 border-amber-100', primary: 'bg-primary-50 text-primary-700 border-primary-100' };
  return <div className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 ${colors[tone]}`}><span className="rounded-lg bg-white/75 p-2">{icon}</span><span className="text-xs font-semibold"><span className="mr-2 text-lg font-extrabold">{value}</span>{label}</span></div>;
};

const ApprovalBadge: React.FC<{ status: string }> = ({ status }) => <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${status === 'published' ? 'bg-primary-100 text-primary-800' : status === 'pending_approval' ? 'bg-amber-100 text-amber-800' : status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'}`}>{CONTRACT_APPROVAL_LABELS[status] || status}</span>;

const ContractStatusBadge: React.FC<{ contract: DbContract }> = ({ contract }) => {
  const status = getContractLifecycleStatus(contract);
  return <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${status === 'Đang hiệu lực' ? 'bg-success-100 text-success-800' : status === 'Sắp hết hạn' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{status}</span>;
};

const ContractQuickPreview: React.FC<{ contract: DirectoryContract; onClose: () => void; onOpen: () => void }> = ({ contract, onClose, onOpen }) => {
  const { formatMoney } = useMoneyVisibility();
  return <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/20 p-3 sm:p-5" onClick={onClose}>
    <aside className="flex h-full w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <div className="flex items-start justify-between border-b border-slate-100 p-5"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-600">Xem nhanh hợp đồng</p><h2 className="mt-1 text-lg font-bold text-slate-900">{contract.contract_code}</h2></div><button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800 cursor-pointer" aria-label="Đóng preview"><X className="h-5 w-5" /></button></div>
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <div className="rounded-xl bg-slate-50 p-4"><p className="font-bold text-slate-900">{contract.employees?.full_name || 'Nhân viên'}</p><p className="mt-0.5 text-xs text-slate-500">{contract.employees?.employee_code || '—'} · {contract.position || 'Chưa cập nhật vị trí'}</p></div>
        <div className="flex flex-wrap gap-2"><ContractStatusBadge contract={contract} /><ApprovalBadge status={contract.publish_status} /></div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm"><PreviewField label="Loại hợp đồng" value={contract.type} /><PreviewField label="Mức lương" value={formatMoney(contract.salary || 0)} /><PreviewField label="Bắt đầu" value={formatDate(contract.start_date)} /><PreviewField label="Kết thúc" value={contract.end_date ? formatDate(contract.end_date) : 'Không xác định'} /></dl>
        {contract.note && <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-600"><p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Ghi chú</p>{contract.note}</div>}
        <div className="rounded-xl border border-dashed border-slate-300 p-4"><div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800"><FileText className="h-4 w-4 text-primary-600" /> File hợp đồng</div><ContractDocumentLink path={contract.document_path} name={contract.document_name} /></div>
      </div>
      <div className="border-t border-slate-100 p-5"><button onClick={onOpen} className="w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-bold text-white hover:bg-primary-700 cursor-pointer">Mở hồ sơ nhân viên</button></div>
    </aside>
  </div>;
};

const PreviewField: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => <div><dt className="text-xs font-medium text-slate-500">{label}</dt><dd className="mt-1 font-bold text-slate-800">{value}</dd></div>;

const ContractCard: React.FC<{
  contract: DbContract;
  isAdmin: boolean;
  onEdit: () => void;
  onSubmit: () => void;
  onApprove: () => void;
  onReject: () => void;
  isAddendum?: boolean;
}> = ({ contract, isAdmin, onEdit, onSubmit, onApprove, onReject, isAddendum }) => {
  const { formatMoney } = useMoneyVisibility();
  const lifecycleStatus = getContractLifecycleStatus(contract);
  return <div className={`p-4 rounded-xl border space-y-2 ${isAddendum ? 'bg-primary-50/50 border-primary-200/80' : 'bg-slate-50 border-slate-200/80'}`}>
    <div className="flex items-center justify-between gap-2">
      <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
        {isAddendum && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded">Phụ lục</span>}
        {contract.contract_code}
      </span>
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
          contract.publish_status === 'published' ? 'bg-primary-100 text-primary-800' :
          contract.publish_status === 'pending_approval' ? 'bg-amber-100 text-amber-800' :
          contract.publish_status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
        }`}>
          {CONTRACT_APPROVAL_LABELS[contract.publish_status] || contract.publish_status}
        </span>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
          lifecycleStatus === 'Đang hiệu lực' ? 'bg-success-100 text-success-800' :
          lifecycleStatus === 'Sắp hết hạn' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
        }`}>
          {lifecycleStatus}
        </span>
        {(contract.publish_status === 'draft' || contract.publish_status === 'rejected' || (isAdmin && contract.publish_status === 'published' && ['Đang hiệu lực', 'Sắp hết hạn'].includes(lifecycleStatus))) && (
          <button onClick={onEdit} className="p-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 cursor-pointer" title="Chỉnh sửa hợp đồng">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        {(contract.publish_status === 'draft' || contract.publish_status === 'rejected') && (
            <button onClick={onSubmit} className="p-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 cursor-pointer" title="Gửi Admin duyệt">
              <Send className="w-3.5 h-3.5" />
            </button>
        )}
        {isAdmin && contract.publish_status === 'pending_approval' && (
          <>
            <button onClick={onReject} className="p-1.5 rounded-lg border border-rose-300 bg-white text-rose-700 hover:bg-rose-50" title="Trả lại">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button onClick={onApprove} className="p-1.5 rounded-lg bg-success-600 text-white hover:bg-success-700" title="Duyệt & áp dụng">
              <ShieldCheck className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
    <div className="text-xs text-slate-600 space-y-1">
      <p>Loại HĐ: <b>{contract.type}</b></p>
      <p>Vị trí chuyên môn: <b>{contract.position}</b></p>
      <p>Ngày ký: <b>{contract.signed_date || '—'}</b> • Thời hạn: <b>{contract.start_date}</b> đến <b>{contract.end_date || 'Không xác định'}</b></p>
      <p>Mức lương HĐ: <b className="text-success-700">{formatMoney(contract.salary || 0)}</b>
        {contract.allowance_amount > 0 && <> • Phụ cấp: <b className="text-success-700">{formatMoney(contract.allowance_amount)}</b></>}
        {contract.kpi_target_month != null && <> • KPI/ngày: <b className="text-primary-700">{contract.kpi_target_month} view/ngày</b></>}
      </p>
      {(contract.level_title || contract.commission_rate_per_view > 0 || contract.qc_commission_rate_per_view > 0) && (
        <p>
          {contract.level_title && <>Level: <b>{contract.level_title}</b></>}
          {contract.commission_rate_per_view > 0 && <> • Commission: <b className="text-primary-700">{formatMoney(contract.commission_rate_per_view)}/view</b></>}
          {contract.qc_commission_rate_per_view > 0 && <> • QC: <b className="text-primary-700">{formatMoney(contract.qc_commission_rate_per_view)}/view</b></>}
        </p>
      )}
      {(contract.phone_allowance > 0 || contract.lunch_allowance > 0 || contract.guaranteed_income > 0) && (
        <p>
          Điện thoại: <b>{formatMoney(contract.phone_allowance)}</b> • Ăn trưa: <b>{formatMoney(contract.lunch_allowance)}</b>
          {contract.guaranteed_income > 0 && <> • Đảm bảo thu nhập: <b>{formatMoney(contract.guaranteed_income)}</b></>}
        </p>
      )}
      {(contract.work_location || contract.working_schedule) && (
        <p>{contract.work_location || '—'}{contract.working_schedule ? ` • ${contract.working_schedule}` : ''}</p>
      )}
      {isAddendum && contract.adjustment_categories.length > 0 && (
        <p>Phạm vi điều chỉnh: <b>{contract.adjustment_categories.join(', ')}</b></p>
      )}
      <ContractDocumentLink path={contract.document_path} name={contract.document_name} />
      {contract.note && <p className="text-slate-500 italic mt-1">Ghi chú: {contract.note}</p>}
      {contract.rejection_reason && <p className="font-semibold text-rose-700">Lý do trả lại: {contract.rejection_reason}</p>}
    </div>
  </div>;
};
