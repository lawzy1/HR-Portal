import React, { useEffect, useState } from 'react';
import {
  Search,
  UserPlus,
  ChevronRight,
  FileText,
  ShieldCheck,
  CreditCard,
  MapPin,
  Edit,
  UserMinus,
  Trash2,
  User,
  ExternalLink,
  HelpCircle,
  Eye,
  Send,
  Ban,
  Clock3,
  Copy,
  AlertTriangle,
  CheckCircle2,
  MessageSquareWarning,
} from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { getUserFacingError } from '../../lib/userFacingError';
import { useEmployees, useEmployee, useEmployeeInvitations, useManageEmployeeInvitation, useOffboardEmployee, useDeleteOffboardedEmployee, type DbEmployee, type DbEmployeeInvitation } from '../../hooks/useEmployees';
import { useEmployeeSensitiveInfo, useEmployeeRelatives, useUpsertEmployeeSensitiveInfo } from '../../hooks/useEmployees';
import { useAuth } from '../../context/AuthContext';
import { useSignedImageUrl } from '../../hooks/useFileUpload';
import { VneidGuideModal } from '../VneidGuideModal';
import { ConfirmationDialog } from '../ConfirmationDialog';
import { VNEID_SAMPLE_IMAGE } from '../../constants/vneidSample';
import { useRecordAuditEvent } from '../../hooks/useAuditLogs';
import { useAllProfiles, useReviewEmployeeOnboarding } from '../../hooks/useProfiles';

const Avatar: React.FC<{ path: string | null; alt: string; className: string }> = ({ path, alt, className }) => {
  const { data: url } = useSignedImageUrl(path);
  return url ? (
    <img src={url} alt={alt} className={className} />
  ) : (
    <div className={`${className} bg-slate-100 flex items-center justify-center`}>
      <User className="w-1/2 h-1/2 text-slate-400" />
    </div>
  );
};

const DocPreview: React.FC<{ path: string | null | undefined; label: string; emptyHint: string }> = ({ path, label, emptyHint }) => {
  const { data: url } = useSignedImageUrl(path);
  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold text-slate-700 block">{label}:</span>
      {url ? (
        <div className="relative rounded-lg overflow-hidden border border-slate-200 group h-36">
          <img src={url} alt={label} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <a href={url} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-white text-slate-900 rounded-lg text-xs font-bold flex items-center space-x-1">
              <span>Xem ảnh gốc</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      ) : (
        <div className="h-36 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center p-4 text-center">
          <span className="text-xs font-semibold text-slate-500">{emptyHint}</span>
        </div>
      )}
    </div>
  );
};

function invitationState(invitation: DbEmployeeInvitation) {
  if (invitation.revoked_at) return { label: 'Đã thu hồi', className: 'bg-slate-200 text-slate-700' };
  if (invitation.completed_at) return { label: 'Đã gửi hồ sơ', className: 'bg-success-100 text-success-800' };
  if (new Date(invitation.expires_at).getTime() <= Date.now()) return { label: 'Link đã hết hạn', className: 'bg-rose-100 text-rose-700' };
  if (invitation.accepted_at) return { label: 'Đã mở link · đang kích hoạt', className: 'bg-amber-100 text-amber-800' };
  return { label: 'Đã gửi link · chờ kích hoạt', className: 'bg-primary-100 text-primary-800' };
}

function formatInvitationTime(value: string | null) {
  return value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—';
}

type PendingConfirmation = 'revoke_invitation' | 'approve_onboarding' | 'needs_changes' | null;

export const AdminEmployeeListView: React.FC = () => {
  const {
    selectedEmployeeIdForAdmin,
    setSelectedEmployeeIdForAdmin,
    setIsNewEmployeeModalOpen,
    setIsEditProfileModalOpen,
    showToast,
  } = useHR();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const { data: employees } = useEmployees();
  const { data: invitations } = useEmployeeInvitations();
  const { data: profiles } = useAllProfiles();
  const offboardEmployee = useOffboardEmployee();
  const deleteOffboardedEmployee = useDeleteOffboardedEmployee();
  const manageInvitation = useManageEmployeeInvitation();
  const reviewOnboarding = useReviewEmployeeOnboarding();
  const updateSensitiveInfo = useUpsertEmployeeSensitiveInfo();
  const { mutate: recordAuditEvent } = useRecordAuditEvent();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [employeeToOffboard, setEmployeeToOffboard] = useState<DbEmployee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<DbEmployee | null>(null);
  const [deleteConfirmationCode, setDeleteConfirmationCode] = useState('');
  const [isVneidGuideOpen, setIsVneidGuideOpen] = useState(false);
  const [manualActivationLink, setManualActivationLink] = useState<string | null>(null);
  const [invitationActionError, setInvitationActionError] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewNoteError, setReviewNoteError] = useState('');

  const allEmployees = employees || [];
  const departments = Array.from(new Set(allEmployees.map((e) => e.department).filter(Boolean)));

  const filteredEmployees = allEmployees.filter((emp) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      emp.full_name.toLowerCase().includes(term) ||
      emp.employee_code.toLowerCase().includes(term) ||
      (emp.email || '').toLowerCase().includes(term) ||
      (emp.phone || '').includes(searchTerm);
    const matchDept = selectedDepartment === 'ALL' || emp.department === selectedDepartment;
    const matchStatus = selectedStatus === 'ALL' || emp.status === selectedStatus;
    return matchSearch && matchDept && matchStatus;
  });

  const selectedId = selectedEmployeeIdForAdmin || filteredEmployees[0]?.id;
  const { data: selectedEmp } = useEmployee(selectedId);
  const { data: sensitiveInfo } = useEmployeeSensitiveInfo(selectedId);
  const { data: relatives } = useEmployeeRelatives(selectedId);
  const invitationsByEmployee = new Map((invitations || []).map((invitation) => [invitation.employee_id, invitation]));
  const selectedInvitation = selectedEmp ? invitationsByEmployee.get(selectedEmp.id) : undefined;
  const canManageSelectedInvitation = isAdmin && !!selectedInvitation && selectedEmp?.status === 'Chờ kích hoạt';
  const selectedOnboardingProfile = isAdmin && selectedEmp
    ? (profiles || []).find((candidate) => candidate.employee_id === selectedEmp.id && candidate.onboarding_status === 'submitted')
    : undefined;

  useEffect(() => {
    if (!sensitiveInfo?.employee_id) return;
    recordAuditEvent({ action: 'VIEW', entityType: 'employee_sensitive_info', entityId: sensitiveInfo.employee_id });
  }, [sensitiveInfo?.employee_id, recordAuditEvent]);

  const handleVerificationStatus = async (status: string) => {
    if (!selectedEmp || !profile) return;
    await updateSensitiveInfo.mutateAsync({
      employeeId: selectedEmp.id,
      companyId: selectedEmp.company_id,
      updates: {
        identity_verification_status: status,
        identity_verified_at: status === 'not_checked' ? null : new Date().toISOString(),
        identity_verified_by: status === 'not_checked' ? null : profile.id,
      },
    });
    showToast('Đã cập nhật trạng thái đối chiếu CCCD.');
  };

  const openSelectedEmployeeEditor = () => {
    if (!selectedEmp) return;
    setSelectedEmployeeIdForAdmin(selectedEmp.id);
    setIsEditProfileModalOpen(true);
  };

  const handleInvitationAction = async (action: 'resend' | 'revoke') => {
    if (!selectedEmp) return;

    setInvitationActionError(null);
    setManualActivationLink(null);
    try {
      const result = await manageInvitation.mutateAsync({ action, employeeId: selectedEmp.id });
      if (action === 'revoke') {
        showToast('Đã thu hồi lời mời kích hoạt.');
        setPendingConfirmation(null);
        return;
      }
      if (result.actionLink) setManualActivationLink(result.actionLink);
      showToast(result.emailDelivered ? `Đã gửi link kích hoạt mới tới ${selectedEmp.email}.` : 'Đã tạo link mới nhưng email chưa gửi được.');
    } catch (caught) {
      setInvitationActionError(await getUserFacingError(caught, 'Không thể cập nhật lời mời kích hoạt. Vui lòng thử lại.'));
    }
  };

  const copyManualActivationLink = async () => {
    if (!manualActivationLink) return;
    try {
      await navigator.clipboard.writeText(manualActivationLink);
      showToast('Đã sao chép link kích hoạt mới.');
    } catch {
      setInvitationActionError('Không thể sao chép tự động. Vui lòng thử lại trên trình duyệt có quyền clipboard.');
    }
  };

  const requestOnboardingReview = (decision: 'approved' | 'needs_changes') => {
    if (!selectedOnboardingProfile || !selectedEmp) return;
    setReviewNote('');
    setReviewNoteError('');
    setPendingConfirmation(decision === 'approved' ? 'approve_onboarding' : 'needs_changes');
  };

  const reviewSelectedOnboarding = () => {
    if (!selectedOnboardingProfile || !selectedEmp || !pendingConfirmation) return;
    const decision = pendingConfirmation === 'approve_onboarding' ? 'approved' : 'needs_changes';
    const note = decision === 'needs_changes' ? reviewNote.trim() : undefined;
    if (decision === 'needs_changes' && !note) {
      setReviewNoteError('Vui lòng nêu rõ nội dung nhân viên cần bổ sung.');
      return;
    }

    reviewOnboarding.mutate({ profileId: selectedOnboardingProfile.id, decision, note }, {
      onSuccess: () => {
        setPendingConfirmation(null);
        showToast(decision === 'approved' ? 'Đã duyệt hồ sơ và mở quyền truy cập HR Portal.' : 'Đã yêu cầu nhân viên bổ sung hồ sơ.');
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Quản lý Hồ sơ Nhân viên toàn Công ty
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Tra cứu, cập nhật thông tin cá nhân, CCCD, MST, BHXH, tài khoản ngân hàng và hợp đồng.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsNewEmployeeModalOpen(true)}
            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-sm flex items-center space-x-2 shadow-md shadow-primary-500/20 transition-all cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Thêm nhân viên</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: List & Filters */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col space-y-4">

          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Tìm tên, mã NV, email, SĐT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-primary-500"
              >
                <option value="ALL">Tất cả Phòng ban</option>
                {departments.map((d) => (
                  <option key={d} value={d!}>{d}</option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-primary-500"
              >
                <option value="ALL">Tất cả Trạng thái</option>
                <option value="Chính thức">Chính thức</option>
                <option value="Thử việc">Thử việc</option>
                <option value="Mới tiếp nhận">Mới tiếp nhận</option>
                <option value="Chờ kích hoạt">Chờ kích hoạt</option>
                <option value="Chờ duyệt hồ sơ">Chờ duyệt hồ sơ</option>
                <option value="Chờ duyệt">Chờ duyệt đăng ký</option>
                <option value="Đã nghỉ việc">Đã nghỉ việc</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-medium">
            <span>Danh sách ({filteredEmployees.length} nhân sự)</span>
            <span className="text-[11px] text-slate-400">Chọn người để xem hồ sơ</span>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[620px] pr-1">
            {filteredEmployees.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                {allEmployees.length === 0 ? 'Chưa có nhân viên nào — nhân viên có thể tự đăng ký tại trang đăng nhập.' : 'Không tìm thấy nhân viên thỏa điều kiện.'}
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const isSelected = selectedId === emp.id;
                return (
                  <div
                    key={emp.id}
                    onClick={() => setSelectedEmployeeIdForAdmin(emp.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected ? 'bg-primary-50/80 border-primary-500 shadow-sm' : 'bg-white hover:bg-slate-50 border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar path={emp.avatar_url} alt={emp.full_name} className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-bold text-slate-900 text-xs">{emp.full_name}</h3>
                            <span className="text-[10px] font-mono font-semibold text-slate-400">{emp.employee_code}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium">{emp.job_title}</p>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-primary-600' : 'text-slate-300'}`} />
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="truncate max-w-[140px]">{emp.department}</span>
                      <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                        emp.status === 'Chính thức'
                          ? 'bg-success-100 text-success-800'
                          : emp.status === 'Thử việc'
                            ? 'bg-amber-100 text-amber-800'
                            : emp.status === 'Đã nghỉ việc'
                              ? 'bg-slate-200 text-slate-600'
                              : 'bg-primary-100 text-primary-800'
                      }`}>
                        {emp.status === 'Chờ kích hoạt' && invitationsByEmployee.get(emp.id) ? invitationState(invitationsByEmployee.get(emp.id)!).label : emp.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Profile View */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          {!selectedEmp ? (
            <div className="p-12 text-center text-slate-400">
              Vui lòng chọn nhân viên ở danh sách bên trái để mở hồ sơ.
            </div>
          ) : (
            <>
              {/* Profile Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
                <div className="flex items-center space-x-4">
                  <Avatar path={selectedEmp.avatar_url} alt={selectedEmp.full_name} className="w-16 h-16 rounded-2xl object-cover border-2 border-primary-500/20 shadow-md" />
                  <div>
                    <div className="flex items-center space-x-3">
                      <h2 className="text-xl font-bold text-slate-900">{selectedEmp.full_name}</h2>
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 font-mono text-xs font-bold rounded-md">{selectedEmp.employee_code}</span>
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                        selectedEmp.status === 'Chính thức' ? 'bg-success-100 text-success-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {selectedEmp.status === 'Chờ kích hoạt' && selectedInvitation ? invitationState(selectedInvitation).label : selectedEmp.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 font-medium mt-0.5">{selectedEmp.job_title} • {selectedEmp.department}</p>
                    <p className="text-xs text-slate-400 mt-1">Ngày bắt đầu làm việc: {selectedEmp.start_date || '—'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={openSelectedEmployeeEditor}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Chỉnh sửa hồ sơ</span>
                  </button>

                  {isAdmin && selectedEmp.status !== 'Đã nghỉ việc' && (
                    <button
                      onClick={() => setEmployeeToOffboard(selectedEmp)}
                      className="px-3.5 py-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer border border-rose-200"
                      title="Đánh dấu nghỉ việc"
                    >
                      <UserMinus className="w-4 h-4" />
                      <span>Nghỉ việc</span>
                    </button>
                  )}
                  {isAdmin && selectedEmp.status === 'Đã nghỉ việc' && (
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteConfirmationCode('');
                        setEmployeeToDelete(selectedEmp);
                      }}
                      className="px-3.5 py-2 text-white bg-rose-600 hover:bg-rose-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm shadow-rose-600/20"
                      title="Xóa vĩnh viễn hồ sơ và tài khoản"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Xóa vĩnh viễn</span>
                    </button>
                  )}
                </div>
              </div>

              {isAdmin && selectedInvitation && (
                <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-lg bg-white p-2 text-primary-700 shadow-sm"><Clock3 className="h-4 w-4" /></div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Lời mời kích hoạt</p>
                        <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${invitationState(selectedInvitation).className}`}>{invitationState(selectedInvitation).label}</span>
                        <p className="mt-2 text-xs leading-5 text-slate-600">
                          Gửi lần gần nhất: <b>{formatInvitationTime(selectedInvitation.last_sent_at)}</b> · Hết hạn: <b>{formatInvitationTime(selectedInvitation.expires_at)}</b>
                          {selectedInvitation.last_opened_at ? <> · Mở gần nhất: <b>{formatInvitationTime(selectedInvitation.last_opened_at)}</b></> : null}
                        </p>
                      </div>
                    </div>
                    {canManageSelectedInvitation && (
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => void handleInvitationAction('resend')} disabled={manageInvitation.isPending} className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60">
                          <Send className="h-3.5 w-3.5" /> {selectedInvitation.revoked_at ? 'Gửi lời mời mới' : 'Gửi lại link'}
                        </button>
                        {!selectedInvitation.revoked_at && <button type="button" onClick={() => setPendingConfirmation('revoke_invitation')} disabled={manageInvitation.isPending} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"><Ban className="h-3.5 w-3.5" /> Thu hồi</button>}
                      </div>
                    )}
                  </div>
                  {invitationActionError && <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{invitationActionError}</p>}
                  {manualActivationLink && <div className="mt-3 flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 sm:flex-row sm:items-center sm:justify-between"><span className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Email chưa gửi được. Sao chép link mới để gửi thủ công qua kênh an toàn.</span><button type="button" onClick={() => void copyManualActivationLink()} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 font-bold text-amber-900 shadow-sm"><Copy className="h-3.5 w-3.5" /> Sao chép link</button></div>}
                </section>
              )}

              {selectedOnboardingProfile && (
                <section className="rounded-xl border border-primary-200 bg-primary-50/60 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-lg bg-white p-2 text-primary-700 shadow-sm"><CheckCircle2 className="h-4 w-4" /></div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-primary-800">Hồ sơ đang chờ duyệt</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">Nhân viên đã gửi đủ hồ sơ onboarding.</p>
                        <p className="mt-1 text-xs leading-5 text-slate-600">Kiểm tra CCCD, ngân hàng và người liên hệ bên dưới trước khi duyệt. Khi duyệt, nhân viên có thể vào HR Portal ngay.</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => requestOnboardingReview('approved')} disabled={reviewOnboarding.isPending} className="inline-flex items-center gap-1.5 rounded-xl bg-success-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-success-700 disabled:opacity-60"><CheckCircle2 className="h-3.5 w-3.5" /> Duyệt hồ sơ</button>
                      <button type="button" onClick={() => requestOnboardingReview('needs_changes')} disabled={reviewOnboarding.isPending} className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-800 transition hover:bg-amber-50 disabled:opacity-60"><MessageSquareWarning className="h-3.5 w-3.5" /> Yêu cầu bổ sung</button>
                    </div>
                  </div>
                </section>
              )}

              {/* Personal & Contact / Addresses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
                    <User className="w-4 h-4 text-primary-600" />
                    <span>1. Thông tin Cá nhân & Liên hệ</span>
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">Ngày sinh:</span><span className="font-semibold text-slate-800">{selectedEmp.dob || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Giới tính:</span><span className="font-semibold text-slate-800">{selectedEmp.gender || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Tình trạng hôn nhân:</span><span className="font-semibold text-slate-800">{selectedEmp.marital_status || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Số điện thoại:</span><span className="font-semibold text-primary-600">{selectedEmp.phone || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Email công việc:</span><span className="font-semibold text-primary-600">{selectedEmp.email || '—'}</span></div>
                  </div>
                </div>

                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-primary-600" />
                    <span>2. Địa chỉ Thường trú & Tạm trú</span>
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-500 block mb-0.5">Địa chỉ thường trú (Hộ khẩu):</span>
                      <p className="font-medium text-slate-800 bg-white p-2 rounded border border-slate-200">{selectedEmp.permanent_address || '—'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Địa chỉ tạm trú hiện tại:</span>
                      <p className="font-medium text-slate-800 bg-white p-2 rounded border border-slate-200">{selectedEmp.temporary_address || '—'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CCCD/MST/BHXH / Bank */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-primary-600" />
                    <span>3. CCCD, MST & BHXH</span>
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">Số CCCD / Hộ chiếu:</span><span className="font-bold text-slate-900 font-mono">{sensitiveInfo?.id_card_number || 'Chưa cập nhật'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Ngày cấp:</span><span className="font-medium text-slate-800">{sensitiveInfo?.id_card_issue_date || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Nơi cấp:</span><span className="font-medium text-slate-800 truncate max-w-[180px]">{sensitiveInfo?.id_card_issue_place || '—'}</span></div>
                    <div className="flex justify-between pt-1 border-t border-slate-200"><span className="text-slate-500">Mã số thuế cá nhân:</span><span className="font-bold text-primary-600 font-mono">{sensitiveInfo?.tax_code || 'Chưa cập nhật'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Mã số BHXH:</span><span className="font-bold text-success-600 font-mono">{sensitiveInfo?.social_insurance_code || 'Chưa cập nhật'}</span></div>
                    <div className="pt-2 border-t border-slate-200">
                      <label className="text-slate-500 block mb-1">Trạng thái đối chiếu ảnh/dữ liệu:</label>
                      <select
                        value={sensitiveInfo?.identity_verification_status || 'not_checked'}
                        onChange={(e) => handleVerificationStatus(e.target.value)}
                        className="w-full p-1.5 bg-white border border-slate-300 rounded-lg font-semibold"
                      >
                        <option value="not_checked">Chưa kiểm tra</option>
                        <option value="matched">Dữ liệu khớp ảnh</option>
                        <option value="mismatch">Không khớp — cần bổ sung</option>
                        <option value="manual_verified">HR đã xác nhận thủ công</option>
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1">Chỉ đối chiếu hồ sơ nội bộ, không xác minh giấy tờ thật/giả.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-primary-600" />
                    <span>4. Tài khoản Ngân hàng Nhận lương</span>
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">Tên ngân hàng:</span><span className="font-semibold text-slate-800 text-right max-w-[200px]">{sensitiveInfo?.bank_name || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Số tài khoản:</span><span className="font-extrabold text-primary-600 font-mono text-sm">{sensitiveInfo?.bank_account_number || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Chủ tài khoản:</span><span className="font-bold text-slate-900 uppercase">{sensitiveInfo?.bank_account_holder || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Chi nhánh:</span><span className="font-medium text-slate-700">{sensitiveInfo?.bank_branch || '—'}</span></div>
                  </div>
                </div>
              </div>

              {/* Relatives */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-primary-600" />
                  <span>5. Người thân & Người liên hệ khẩn cấp</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {!relatives || relatives.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Chưa đăng ký thông tin người thân.</p>
                  ) : (
                    relatives.map((rel) => (
                      <div key={rel.id} className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{rel.full_name} ({rel.relationship})</span>
                          {rel.is_emergency_contact && (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-700 font-bold text-[10px] rounded">Khẩn cấp</span>
                          )}
                        </div>
                        <p className="text-slate-600">SĐT: <b className="text-slate-800">{rel.phone}</b></p>
                        <p className="text-slate-500 text-[11px] truncate">{rel.address}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Documents (read-only preview — upload happens in Chỉnh sửa hồ sơ) */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
                    <Eye className="w-4 h-4 text-primary-600" />
                    <span>6. Ảnh CCCD 2 mặt & Tài liệu đính kèm</span>
                  </h3>
                  <button onClick={openSelectedEmployeeEditor} className="text-xs font-bold text-primary-600 hover:underline cursor-pointer">
                    Chỉnh sửa / Tải ảnh mới
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DocPreview path={sensitiveInfo?.id_card_front_url} label="Mặt trước CCCD" emptyHint="Chưa có ảnh mặt trước" />
                  <DocPreview path={sensitiveInfo?.id_card_back_url} label="Mặt sau CCCD" emptyHint="Chưa có ảnh mặt sau" />
                </div>

                <div className="mt-3 p-3.5 bg-gradient-to-r from-red-50/80 via-rose-50/50 to-orange-50/40 rounded-xl border border-red-200/90 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-red-600 text-white flex items-center justify-center shadow-xs">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-red-950 block">Ảnh chụp "Thông tin cư trú" (VNeID):</span>
                        <span className="text-[10px] text-red-700">Xác thực hộ khẩu, nơi thường trú/tạm trú</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsVneidGuideOpen(true)}
                      className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-700 border border-red-300 rounded-lg text-[11px] font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-red-600" />
                      <span>Xem ảnh mẫu hướng dẫn</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <DocPreview path={sensitiveInfo?.vneid_residency_url} label="Ảnh VNeID cư trú" emptyHint="Chưa tải ảnh VNeID" />

                    <div onClick={() => setIsVneidGuideOpen(true)} className="bg-slate-900 rounded-lg p-2 flex items-center gap-3 border border-slate-700 cursor-pointer group h-36">
                      <div className="w-16 h-full rounded overflow-hidden bg-slate-800 shrink-0">
                        <img src={VNEID_SAMPLE_IMAGE} alt="Ảnh mẫu VNeID" className="w-full h-full object-cover object-top opacity-90 group-hover:scale-105 transition-transform" />
                      </div>
                      <div className="text-white space-y-1">
                        <span className="bg-yellow-400 text-red-950 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase">ẢNH MẪU CHUẨN</span>
                        <p className="text-[11px] font-bold text-slate-200 leading-tight">Mẫu chụp VNeID Cư trú</p>
                        <p className="text-[10px] text-slate-400">Bấm để xem 5 bước hướng dẫn</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmationDialog
        open={pendingConfirmation === 'revoke_invitation'}
        onOpenChange={(open) => !open && setPendingConfirmation(null)}
        title="Thu hồi lời mời kích hoạt?"
        description={`Sau khi thu hồi, ${selectedEmp?.full_name || 'nhân viên này'} sẽ không thể tiếp tục onboarding cho tới khi Admin gửi lại link mới.`}
        confirmLabel="Thu hồi lời mời"
        variant="danger"
        isPending={manageInvitation.isPending}
        onConfirm={() => void handleInvitationAction('revoke')}
      />

      <ConfirmationDialog
        open={pendingConfirmation === 'approve_onboarding'}
        onOpenChange={(open) => !open && setPendingConfirmation(null)}
        title="Duyệt hồ sơ nhân viên?"
        description={`Duyệt hồ sơ của ${selectedEmp?.full_name || 'nhân viên này'} sẽ mở quyền truy cập HR Portal ngay.`}
        confirmLabel="Duyệt hồ sơ"
        isPending={reviewOnboarding.isPending}
        onConfirm={reviewSelectedOnboarding}
      />

      <ConfirmationDialog
        open={pendingConfirmation === 'needs_changes'}
        onOpenChange={(open) => !open && setPendingConfirmation(null)}
        title="Yêu cầu bổ sung hồ sơ"
        description={`Nội dung này sẽ hiển thị cho ${selectedEmp?.full_name || 'nhân viên'} khi họ quay lại onboarding.`}
        confirmLabel="Gửi yêu cầu"
        isPending={reviewOnboarding.isPending}
        onConfirm={reviewSelectedOnboarding}
      >
        <label htmlFor="onboarding-review-note" className="mb-2 block text-sm font-semibold text-slate-700">Nội dung cần bổ sung</label>
        <textarea
          id="onboarding-review-note"
          value={reviewNote}
          onChange={(event) => {
            setReviewNote(event.target.value);
            if (reviewNoteError) setReviewNoteError('');
          }}
          rows={4}
          placeholder="Ví dụ: Vui lòng tải lại ảnh mặt trước CCCD rõ nét hơn."
          className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          aria-invalid={Boolean(reviewNoteError)}
          aria-describedby={reviewNoteError ? 'onboarding-review-note-error' : undefined}
        />
        {reviewNoteError && <p id="onboarding-review-note-error" className="mt-1.5 text-xs font-medium text-rose-600">{reviewNoteError}</p>}
      </ConfirmationDialog>

      <ConfirmationDialog
        open={Boolean(employeeToOffboard)}
        onOpenChange={(open) => !open && setEmployeeToOffboard(null)}
        title="Xác nhận đánh dấu nghỉ việc"
        description={`Chuyển trạng thái của ${employeeToOffboard?.full_name || 'nhân viên'} thành “Đã nghỉ việc”. Hồ sơ vẫn được lưu trữ để tra cứu bảo hiểm và lịch sử sau này.`}
        confirmLabel="Xác nhận nghỉ việc"
        variant="danger"
        isPending={offboardEmployee.isPending}
        onConfirm={async () => {
          if (!employeeToOffboard) return;
          await offboardEmployee.mutateAsync(employeeToOffboard.id);
          showToast(`Đã đánh dấu ${employeeToOffboard.full_name} nghỉ việc.`);
          setEmployeeToOffboard(null);
        }}
      />

      <ConfirmationDialog
        open={Boolean(employeeToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setEmployeeToDelete(null);
            setDeleteConfirmationCode('');
          }
        }}
        title="Xóa vĩnh viễn nhân viên?"
        description={`Hành động này xóa tài khoản đăng nhập, hồ sơ và các tài liệu của ${employeeToDelete?.full_name || 'nhân viên'} khỏi hệ thống. Không thể khôi phục.`}
        confirmLabel="Xóa vĩnh viễn"
        variant="danger"
        isPending={deleteOffboardedEmployee.isPending}
        isConfirmDisabled={deleteConfirmationCode.trim() !== employeeToDelete?.employee_code}
        onConfirm={async () => {
          if (!employeeToDelete) return;
          try {
            await deleteOffboardedEmployee.mutateAsync(employeeToDelete.id);
            showToast(`Đã xóa vĩnh viễn ${employeeToDelete.full_name} khỏi hệ thống.`);
            setSelectedEmployeeIdForAdmin('');
            setEmployeeToDelete(null);
            setDeleteConfirmationCode('');
          } catch (error) {
            showToast(await getUserFacingError(error, 'Không thể xóa nhân viên. Vui lòng thử lại sau.'));
          }
        }}
      >
        <label htmlFor="permanent-delete-code" className="mb-2 block text-sm font-semibold text-slate-700">Nhập mã nhân viên để xác nhận</label>
        <input
          id="permanent-delete-code"
          type="text"
          value={deleteConfirmationCode}
          onChange={(event) => setDeleteConfirmationCode(event.target.value)}
          placeholder={employeeToDelete?.employee_code || 'Mã nhân viên'}
          autoComplete="off"
          className="w-full rounded-xl border border-rose-300 px-3 py-2.5 font-mono text-sm text-slate-800 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
        />
        <p className="mt-2 text-xs leading-5 text-rose-700">Mã cần nhập: <strong className="font-mono">{employeeToDelete?.employee_code}</strong>. Audit log chỉ giữ lại dấu vết thao tác xóa.</p>
      </ConfirmationDialog>

      <VneidGuideModal isOpen={isVneidGuideOpen} onClose={() => setIsVneidGuideOpen(false)} />
    </div>
  );
};
