import React, { useState } from 'react';
import { useHR } from '../context/HRContext';
import { useAuth } from '../context/AuthContext';
import { useLeaveBalance, useCompanyHolidays, useCreateLeaveRequest, useCreateWorkEvent } from '../hooks/useLeave';
import { useCreateOtRecord } from '../hooks/useOt';
import { LeaveType, HalfDayOption } from '../types';
import { X, Calendar, Clock, AlertCircle, Send, Loader2 } from 'lucide-react';

export const NewLeaveModal: React.FC = () => {
  const { isNewLeaveModalOpen, setIsNewLeaveModalOpen, showToast } = useHR();
  const { profile } = useAuth();
  const employeeId = profile?.employeeId ?? undefined;

  const { data: leaveBalance } = useLeaveBalance(employeeId, new Date().getFullYear());
  const { data: holidays } = useCompanyHolidays();
  const createLeaveRequest = useCreateLeaveRequest();
  const createWorkEvent = useCreateWorkEvent();
  const createOtRecord = useCreateOtRecord();

  const [requestCategory, setRequestCategory] = useState<'leave' | 'ot' | 'extra_wfh' | 'late_arrival'>('leave');
  const [leaveType, setLeaveType] = useState<LeaveType>('Nghỉ phép năm');
  const [startDate, setStartDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [halfDayOption, setHalfDayOption] = useState<HalfDayOption>('Cả ngày');
  const [reason, setReason] = useState('');
  const [lateMinutes, setLateMinutes] = useState(0);
  const [otHours, setOtHours] = useState(0);
  const [error, setError] = useState<string | null>(null);

  if (!isNewLeaveModalOpen) return null;

  const calculateDays = () => {
    if (!startDate || !endDate) return 1;
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (end < start) return 0;
    const holidayDates = new Set((holidays || []).map((holiday) => holiday.date));
    if (halfDayOption !== 'Cả ngày' && startDate === endDate) {
      return start.getDay() !== 0 && start.getDay() !== 6 && !holidayDates.has(startDate) ? 0.5 : 0;
    }
    let days = 0;
    for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const iso = date.toISOString().slice(0, 10);
      if (date.getDay() !== 0 && date.getDay() !== 6 && !holidayDates.has(iso)) days++;
    }
    return days;
  };

  const totalDays = calculateDays();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reason.trim()) {
      setError('Vui lòng nhập lý do xin nghỉ phép!');
      return;
    }
    if (requestCategory === 'leave' && totalDays <= 0) {
      setError('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu!');
      return;
    }
    if (requestCategory === 'late_arrival' && lateMinutes <= 0) {
      setError('Vui lòng nhập số phút đi trễ.');
      return;
    }
    if (requestCategory === 'ot' && otHours <= 0) {
      setError('Vui lòng nhập số giờ OT.');
      return;
    }
    if (!employeeId || !profile?.companyId) return;

    try {
      if (requestCategory === 'leave') {
        await createLeaveRequest.mutateAsync({
          employeeId,
          leaveType,
          startDate,
          endDate,
          totalDays,
          halfDayOption,
          reason,
        });
      } else if (requestCategory === 'ot') {
        await createOtRecord.mutateAsync({
          company_id: profile.companyId,
          employee_id: employeeId,
          date: startDate,
          hours: otHours,
          reason,
        });
      } else {
        await createWorkEvent.mutateAsync({
          company_id: profile.companyId,
          employee_id: employeeId,
          event_type: requestCategory,
          event_date: startDate,
          minutes: requestCategory === 'late_arrival' ? lateMinutes : null,
          reason,
        });
      }
      showToast('Đã gửi yêu cầu thành công! Đang chờ Admin duyệt.');
      setIsNewLeaveModalOpen(false);
      setReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gửi yêu cầu. Vui lòng thử lại.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">

        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success-600 rounded-lg text-white">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Tạo yêu cầu nhân sự</h2>
              <p className="text-xs text-slate-300">Nghỉ phép, OT, WFH thêm hoặc ghi nhận đi trễ</p>
            </div>
          </div>
          <button onClick={() => setIsNewLeaveModalOpen(false)} className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Loại yêu cầu</label>
            <select
              value={requestCategory}
              onChange={(e) => setRequestCategory(e.target.value as typeof requestCategory)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium"
            >
              <option value="leave">Nghỉ phép</option>
              <option value="ot">Đăng ký OT</option>
              <option value="extra_wfh">WFH thêm ngoài lịch</option>
              <option value="late_arrival">Đi trễ</option>
            </select>
          </div>

          {requestCategory === 'leave' && (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Loại hình nghỉ phép <span className="text-rose-500">*</span>
            </label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-success-500 text-slate-800 font-medium"
            >
              <option value="Nghỉ phép năm">Nghỉ phép năm (Trừ vào quỹ phép năm)</option>
              <option value="Nghỉ ốm / BHXH">Nghỉ ốm / Khám bệnh (Hưởng chế độ BHXH)</option>
              <option value="Nghỉ không lương">Nghỉ không hưởng lương</option>
              <option value="Nghỉ thai sản">Nghỉ thai sản / Chế độ nam giới</option>
              <option value="Nghỉ việc riêng (kết hôn, tang lễ)">Nghỉ việc riêng (Kết hôn, tang lễ - Hưởng lương)</option>
            </select>
          </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{requestCategory === 'leave' ? 'Từ ngày' : 'Ngày'} <span className="text-rose-500">*</span></label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-success-500 text-slate-800 font-medium" required />
            </div>
            {requestCategory === 'leave' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Đến ngày <span className="text-rose-500">*</span></label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-success-500 text-slate-800 font-medium" required />
            </div>
            )}
            {requestCategory === 'late_arrival' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Số phút đi trễ <span className="text-rose-500">*</span></label>
                <input type="number" min="1" value={lateMinutes} onChange={(e) => setLateMinutes(Number(e.target.value))} className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl" required />
              </div>
            )}
            {requestCategory === 'ot' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Số giờ OT <span className="text-rose-500">*</span></label>
                <input type="number" min="0.5" step="0.5" value={otHours || ''} onChange={(e) => setOtHours(Number(e.target.value))} className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl" required />
              </div>
            )}
          </div>

          {requestCategory === 'leave' && (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Buổi nghỉ</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Cả ngày', 'Buổi sáng', 'Buổi chiều'] as HalfDayOption[]).map((option) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => setHalfDayOption(option)}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                    halfDayOption === option ? 'bg-success-50 border-success-500 text-success-800 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          )}

          {requestCategory === 'leave' && (
          <div className="bg-success-50/80 p-3.5 rounded-xl border border-success-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-success-600" />
              <span className="text-xs text-success-900 font-medium">Tổng số ngày đăng ký nghỉ:</span>
            </div>
            <span className="text-sm font-extrabold text-success-700 bg-white px-2.5 py-1 rounded-lg border border-success-300 shadow-xs">{totalDays} ngày</span>
          </div>
          )}

          {requestCategory === 'leave' && (
          <div className="flex items-start gap-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p>
              Số phép còn lại hiện tại của bạn: <strong className="text-slate-800">{leaveBalance?.remaining_days ?? '—'} ngày</strong>.
              {leaveType === 'Nghỉ phép năm' && leaveBalance && totalDays > (leaveBalance.remaining_days ?? 0) && (
                <span className="text-rose-600 font-bold block mt-0.5">⚠️ Lưu ý: Số ngày xin vượt quá quỹ phép khả dụng!</span>
              )}
            </p>
          </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Lý do / ghi chú <span className="text-rose-500">*</span></label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập chi tiết lý do và phương án bàn giao công việc..."
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-success-500 text-slate-800 placeholder-slate-400"
              required
            ></textarea>
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button type="button" onClick={() => setIsNewLeaveModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={createLeaveRequest.isPending || createWorkEvent.isPending || createOtRecord.isPending}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-success-600 hover:bg-success-700 disabled:opacity-60 rounded-xl transition-colors shadow-md shadow-success-900/10 cursor-pointer"
            >
              {createLeaveRequest.isPending || createWorkEvent.isPending || createOtRecord.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Gửi yêu cầu duyệt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
