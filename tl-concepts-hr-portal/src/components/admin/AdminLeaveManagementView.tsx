import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Calendar,
  Plus,
} from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { useAuth } from '../../context/AuthContext';
import { useEmployees } from '../../hooks/useEmployees';
import { useSignedImageUrl } from '../../hooks/useFileUpload';
import {
  useAllLeaveRequests,
  useUpdateLeaveStatus,
  useCompanyHolidays,
  useAddCompanyHoliday,
  useAllLeaveBalances,
  useAddLeaveAdjustment,
  useAllWorkEvents,
  useUpdateWorkEvent,
  useUpdateLeaveEntitlement,
} from '../../hooks/useLeave';
import { formatDate } from '../../utils/formatters';

const RowAvatar: React.FC<{ path: string | null | undefined }> = ({ path }) => {
  const { data: url } = useSignedImageUrl(path);
  return url ? (
    <img src={url} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" />
  ) : (
    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 shrink-0" />
  );
};

type PendingAction = { requestId: string; employeeId: string; action: 'Đã duyệt' | 'Từ chối'; employeeName: string };
type AdjustmentTarget = { employeeId: string; companyId: string; employeeName: string };

export const AdminLeaveManagementView: React.FC = () => {
  const { showToast } = useHR();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;

  const { data: allRequests } = useAllLeaveRequests();
  const { data: employees } = useEmployees();
  const { data: holidays } = useCompanyHolidays();
  const { data: allBalances } = useAllLeaveBalances(year);
  const { data: allWorkEvents } = useAllWorkEvents();
  const updateLeaveStatus = useUpdateLeaveStatus();
  const updateWorkEvent = useUpdateWorkEvent();
  const addLeaveAdjustment = useAddLeaveAdjustment();
  const updateLeaveEntitlement = useUpdateLeaveEntitlement();
  const addHoliday = useAddCompanyHoliday();

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDepartment, setFilterDepartment] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [approverComment, setApproverComment] = useState<string>('');
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [adjustmentTarget, setAdjustmentTarget] = useState<AdjustmentTarget | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');

  const requests = allRequests || [];
  const departments = Array.from(new Set((employees || []).map((e) => e.department).filter(Boolean)));

  const filteredRequests = requests.filter((req) => {
    const matchStatus = filterStatus === 'ALL' || req.status === filterStatus;
    const matchDept = filterDepartment === 'ALL' || req.employees?.department === filterDepartment;
    const term = searchTerm.toLowerCase();
    const matchSearch =
      (req.employees?.full_name || '').toLowerCase().includes(term) ||
      (req.employees?.employee_code || '').toLowerCase().includes(term) ||
      (req.reason || '').toLowerCase().includes(term);
    return matchStatus && matchDept && matchSearch;
  });

  const pendingRequests = requests.filter((r) => r.status === 'Chờ duyệt');
  const workEvents = allWorkEvents || [];
  const pendingWorkEvents = workEvents.filter((event) => event.status === 'Chờ duyệt');
  const approvedLateMinutes = workEvents
    .filter((event) =>
      event.status === 'Đã duyệt' &&
      event.event_type === 'late_arrival' &&
      Number(event.event_date.slice(0, 4)) === year &&
      Number(event.event_date.slice(5, 7)) === month
    )
    .reduce((sum, event) => sum + (event.minutes || 0), 0);

  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    await updateLeaveStatus.mutateAsync({
      id: pendingAction.requestId,
      employeeId: pendingAction.employeeId,
      updates: {
        status: pendingAction.action,
        approver_comment: approverComment || null,
        approver_id: profile?.id,
      },
    });
    showToast(`Đã ${pendingAction.action.toLowerCase()} đơn nghỉ phép của ${pendingAction.employeeName}.`);
    setPendingAction(null);
    setApproverComment('');
  };

  const handleAddHoliday = async () => {
    if (!newHolidayDate || !newHolidayName.trim() || !profile?.companyId) return;
    await addHoliday.mutateAsync({ companyId: profile.companyId, date: newHolidayDate, name: newHolidayName });
    showToast('Đã thêm ngày nghỉ lễ công ty.');
    setNewHolidayDate('');
    setNewHolidayName('');
  };

  const handleWorkEventStatus = async (id: string, status: 'Đã duyệt' | 'Từ chối') => {
    await updateWorkEvent.mutateAsync({ id, updates: { status, approver_id: profile?.id } });
    showToast(`Đã ${status.toLowerCase()} yêu cầu.`);
  };

  const handleAddAdjustment = async () => {
    if (!adjustmentTarget || !profile?.id || !adjustmentAmount || !adjustmentReason.trim()) return;
    await addLeaveAdjustment.mutateAsync({
      company_id: adjustmentTarget.companyId,
      employee_id: adjustmentTarget.employeeId,
      year,
      amount: adjustmentAmount,
      reason: adjustmentReason.trim(),
      created_by: profile.id,
    });
    showToast(`Đã điều chỉnh ${adjustmentAmount > 0 ? '+' : ''}${adjustmentAmount} ngày phép cho ${adjustmentTarget.employeeName}.`);
    setAdjustmentTarget(null);
    setAdjustmentAmount(0);
    setAdjustmentReason('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quản lý Ngày phép & Lịch Nghỉ toàn Công ty</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Duyệt yêu cầu xin nghỉ phép, quản lý lịch nghỉ lễ công ty và quỹ phép nhân sự.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="font-bold text-slate-900 text-base">WFH thêm & đi trễ cần xác nhận ({pendingWorkEvents.length})</h2>
          <p className="text-xs text-slate-500">Tổng đi trễ đã duyệt Tháng {month}/{year}: {approvedLateMinutes} phút.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-2.5">Nhân viên</th>
                <th className="p-2.5">Ngày</th>
                <th className="p-2.5">Loại</th>
                <th className="p-2.5">Thời lượng</th>
                <th className="p-2.5">Lý do</th>
                <th className="p-2.5">Xử lý</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingWorkEvents.length === 0 ? (
                <tr><td colSpan={6} className="p-5 text-center text-slate-400">Không có yêu cầu đang chờ.</td></tr>
              ) : pendingWorkEvents.map((event) => (
                <tr key={event.id}>
                  <td className="p-2.5 font-bold">{event.employees?.full_name}</td>
                  <td className="p-2.5">{formatDate(event.event_date)}</td>
                  <td className="p-2.5">{event.event_type === 'extra_wfh' ? 'WFH thêm' : 'Đi trễ'}</td>
                  <td className="p-2.5">{event.minutes ? `${event.minutes} phút` : '—'}</td>
                  <td className="p-2.5">{event.reason}</td>
                  <td className="p-2.5 space-x-1">
                    {isAdmin ? <>
                      <button onClick={() => handleWorkEventStatus(event.id, 'Đã duyệt')} className="px-2 py-1 rounded bg-success-600 text-white font-bold cursor-pointer">Duyệt</button>
                      <button onClick={() => handleWorkEventStatus(event.id, 'Từ chối')} className="px-2 py-1 rounded bg-rose-100 text-rose-800 font-bold cursor-pointer">Từ chối</button>
                    </> : <span className="text-[11px] font-semibold text-amber-700">Chờ Admin xử lý</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending requests */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-base">Yêu cầu Xin nghỉ phép cần Phê duyệt ({pendingRequests.length})</h2>
            <p className="text-xs text-slate-500">Xem xét và phản hồi trực tiếp các đơn xin nghỉ phép gửi từ nhân viên</p>
          </div>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <CheckCircle2 className="w-8 h-8 text-success-500 mx-auto mb-2" />
            <p className="font-medium text-slate-700 text-sm">Hiện tại không có đơn xin nghỉ phép nào đang chờ duyệt.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <div key={req.id} className="relative pl-5 p-4 bg-white rounded-xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-full bg-amber-500" />
                <div className="flex items-start space-x-3">
                  <RowAvatar path={req.employees?.avatar_url} />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-sm">{req.employees?.full_name}</span>
                      <span className="text-xs font-mono text-slate-500">({req.employees?.employee_code})</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-primary-100 text-primary-800">{req.leave_type}</span>
                    </div>
                    <p className="text-xs text-slate-700 mt-1">
                      Thời gian: <b>{req.start_date}</b> đến <b>{req.end_date}</b> ({req.total_days} ngày - {req.half_day_option})
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5 italic">Lý do: "{req.reason}"</p>
                  </div>
                </div>

                {isAdmin ? <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => setPendingAction({ requestId: req.id, employeeId: req.employee_id, action: 'Đã duyệt', employeeName: req.employees?.full_name || '' })}
                    className="px-4 py-2 bg-success-600 hover:bg-success-700 text-white rounded-xl text-xs font-bold shadow-md shadow-success-600/20 flex items-center space-x-1 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Duyệt đơn</span>
                  </button>
                  <button
                    onClick={() => setPendingAction({ requestId: req.id, employeeId: req.employee_id, action: 'Từ chối', employeeName: req.employees?.full_name || '' })}
                    className="px-3.5 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Từ chối</span>
                  </button>
                </div> : <span className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">Chờ Admin phê duyệt</span>}
              </div>
            ))}
          </div>
        )}

        {/* Full log */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="font-bold text-slate-800 text-sm">Lịch sử Đơn nghỉ phép toàn công ty</h3>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input type="text" placeholder="Tìm theo tên, mã NV, lý do..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
              </div>
              <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
                <option value="ALL">Tất cả Phòng ban</option>
                {departments.map((d) => <option key={d} value={d!}>{d}</option>)}
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
                <option value="ALL">Tất cả Trạng thái</option>
                <option value="Chờ duyệt">Chờ duyệt</option>
                <option value="Đã duyệt">Đã duyệt</option>
                <option value="Từ chối">Từ chối</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] tracking-wider border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Nhân viên</th>
                  <th className="py-2.5 px-4">Loại nghỉ</th>
                  <th className="py-2.5 px-4">Thời gian</th>
                  <th className="py-2.5 px-4">Số ngày</th>
                  <th className="py-2.5 px-4">Lý do</th>
                  <th className="py-2.5 px-4">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.length === 0 ? (
                  <tr><td colSpan={6} className="py-6 text-center text-slate-400">Không có đơn nghỉ phép nào phù hợp bộ lọc.</td></tr>
                ) : (
                  filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{req.employees?.full_name}</td>
                      <td className="py-3 px-4 font-medium text-primary-700">{req.leave_type}</td>
                      <td className="py-3 px-4">{req.start_date} ~ {req.end_date}</td>
                      <td className="py-3 px-4 font-semibold">{req.total_days} ngày ({req.half_day_option})</td>
                      <td className="py-3 px-4 max-w-[200px] truncate">{req.reason}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          req.status === 'Đã duyệt' ? 'bg-success-100 text-success-800' :
                          req.status === 'Từ chối' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Company holidays */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-800 flex items-center justify-center font-bold">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-base">Lịch nghỉ Lễ & Chế độ Công ty</h2>
            <p className="text-xs text-slate-500">Tự quản lý — thay cho danh sách cứng của bản demo</p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Ngày</label>
            <input type="date" value={newHolidayDate} onChange={(e) => setNewHolidayDate(e.target.value)} className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs" />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Tên ngày nghỉ</label>
            <input type="text" value={newHolidayName} onChange={(e) => setNewHolidayName(e.target.value)} placeholder="VD: Tết Dương Lịch" className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs" />
          </div>
          <button onClick={handleAddHoliday} className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] tracking-wider border-y border-slate-200">
              <tr>
                <th className="py-3 px-4">Ngày</th>
                <th className="py-3 px-4">Tên Lễ / Sự kiện</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!holidays || holidays.length === 0 ? (
                <tr><td colSpan={2} className="py-6 text-center text-slate-400">Chưa có ngày nghỉ lễ nào — thêm ở form phía trên.</td></tr>
              ) : (
                holidays.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{formatDate(h.date)}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{h.name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Company-wide leave balance table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 text-base">Bảng Quỹ phép Nhân sự toàn Công ty ({(allBalances || []).length} nhân viên)</h2>
          <span className="text-xs text-slate-500 font-medium">Năm {year}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] tracking-wider border-y border-slate-200">
              <tr>
                <th className="py-3 px-4">Mã & Nhân viên</th>
                <th className="py-3 px-4">Phòng ban</th>
                <th className="py-3 px-4">Hạn mức năm</th>
                <th className="py-3 px-4">Tổng quỹ</th>
                <th className="py-3 px-4">Đã sử dụng</th>
                <th className="py-3 px-4">Đang chờ duyệt</th>
                <th className="py-3 px-4">Khả dụng còn lại</th>
                <th className="py-3 px-4">Điều chỉnh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(allBalances || []).map((bal) => (
                <tr key={bal.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900 flex items-center space-x-2.5">
                    <RowAvatar path={bal.employees?.avatar_url} />
                    <div>
                      <span>{bal.employees?.full_name}</span>
                      <span className="block text-[10px] text-slate-400 font-mono">{bal.employees?.employee_code}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">{bal.employees?.department}</td>
                  <td className="py-3 px-4">
                    <select
                      value={bal.annual_entitlement}
                      onChange={(e) => updateLeaveEntitlement.mutate({
                        employeeId: bal.employee_id,
                        year,
                        entitlement: Number(e.target.value),
                      })}
                      className="p-1.5 bg-white border border-slate-300 rounded-lg font-bold"
                    >
                      <option value={12}>12 ngày</option>
                      <option value={13}>13 ngày</option>
                      <option value={14}>14 ngày</option>
                    </select>
                  </td>
                  <td className="py-3 px-4 font-semibold">{bal.total_accumulated} ngày</td>
                  <td className="py-3 px-4 text-success-600 font-bold">{bal.used_days} ngày</td>
                  <td className="py-3 px-4 text-amber-600 font-bold">{bal.pending_days} ngày</td>
                  <td className="py-3 px-4 font-extrabold text-primary-700 text-sm">{bal.remaining_days} ngày</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => setAdjustmentTarget({
                        employeeId: bal.employee_id,
                        companyId: bal.company_id,
                        employeeName: bal.employees?.full_name || '',
                      })}
                      className="px-2.5 py-1 bg-primary-50 text-primary-700 rounded-lg font-bold cursor-pointer"
                    >
                      +/- ngày
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval comment modal */}
      {pendingAction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Xác nhận {pendingAction.action} đơn nghỉ của {pendingAction.employeeName}</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú / Nhận xét của Admin (Không bắt buộc):</label>
              <textarea rows={3} value={approverComment} onChange={(e) => setApproverComment(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-primary-500" />
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button onClick={() => setPendingAction(null)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer">Hủy bỏ</button>
              <button
                onClick={handleConfirmAction}
                disabled={updateLeaveStatus.isPending}
                className={`px-4 py-2 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-60 ${pendingAction.action === 'Đã duyệt' ? 'bg-success-600 hover:bg-success-700' : 'bg-rose-600 hover:bg-rose-700'}`}
              >
                Xác nhận {pendingAction.action}
              </button>
            </div>
          </div>
        </div>
      )}

      {adjustmentTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Điều chỉnh phép: {adjustmentTarget.employeeName}</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Số ngày (+ thưởng, - thu hồi)</label>
              <input type="number" step="0.5" value={adjustmentAmount} onChange={(e) => setAdjustmentAmount(Number(e.target.value))} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lý do bắt buộc</label>
              <textarea rows={3} value={adjustmentReason} onChange={(e) => setAdjustmentReason(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setAdjustmentTarget(null)} className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer">Hủy</button>
              <button onClick={handleAddAdjustment} disabled={addLeaveAdjustment.isPending || !adjustmentAmount || !adjustmentReason.trim()} className="px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer">Lưu điều chỉnh</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
