import React, { useState } from 'react';
import { useHR } from '../context/HRContext';
import { LeaveType, HalfDayOption } from '../types';
import { X, Calendar, Clock, AlertCircle, Send } from 'lucide-react';

export const NewLeaveModal: React.FC = () => {
  const { 
    currentEmployee, 
    isNewLeaveModalOpen, 
    setIsNewLeaveModalOpen, 
    addLeaveRequest 
  } = useHR();

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

  if (!isNewLeaveModalOpen) return null;

  // Simple day count logic
  const calculateDays = () => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 0;
    
    if (halfDayOption !== 'Cả ngày' && startDate === endDate) {
      return 0.5;
    }
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const totalDays = calculateDays();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Vui lòng nhập lý do xin nghỉ phép!');
      return;
    }
    if (totalDays <= 0) {
      alert('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu!');
      return;
    }

    addLeaveRequest(currentEmployee.id, {
      leaveType,
      startDate,
      endDate,
      totalDays,
      halfDayOption,
      reason,
    });

    setIsNewLeaveModalOpen(false);
    setReason('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-lg text-white">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Tạo yêu cầu nghỉ phép</h2>
              <p className="text-xs text-slate-300">Gửi đơn nghỉ phép tới Trưởng phòng duyệt</p>
            </div>
          </div>
          <button 
            onClick={() => setIsNewLeaveModalOpen(false)}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Leave Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Loại hình nghỉ phép <span className="text-rose-500">*</span>
            </label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-medium"
            >
              <option value="Nghỉ phép năm">Nghỉ phép năm (Trừ vào quỹ phép năm)</option>
              <option value="Nghỉ ốm / BHXH">Nghỉ ốm / Khám bệnh (Hưởng chế độ BHXH)</option>
              <option value="Nghỉ không lương">Nghỉ không hưởng lương</option>
              <option value="Nghỉ thai sản">Nghỉ thai sản / Chế độ nam giới</option>
              <option value="Nghỉ việc riêng (kết hôn, tang lễ)">Nghỉ việc riêng (Kết hôn, tang lễ - Hưởng lương)</option>
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Từ ngày <span className="text-rose-500">*</span>
              </label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Đến ngày <span className="text-rose-500">*</span>
              </label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-medium"
                required
              />
            </div>
          </div>

          {/* Half day option */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Buổi nghỉ
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Cả ngày', 'Buổi sáng', 'Buổi chiều'] as HalfDayOption[]).map((option) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => setHalfDayOption(option)}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                    halfDayOption === option 
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold' 
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Days summary calculation badge */}
          <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-emerald-900 font-medium">Tổng số ngày đăng ký nghỉ:</span>
            </div>
            <span className="text-sm font-extrabold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-300 shadow-xs">
              {totalDays} ngày
            </span>
          </div>

          {/* Leave balance check note */}
          <div className="flex items-start gap-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p>
              Số phép còn lại hiện tại của bạn: <strong className="text-slate-800">{currentEmployee.leaveBalance.remainingDays} ngày</strong>. 
              {leaveType === 'Nghỉ phép năm' && totalDays > currentEmployee.leaveBalance.remainingDays && (
                <span className="text-rose-600 font-bold block mt-0.5">⚠️ Lưu ý: Số ngày xin vượt quá quỹ phép khả dụng!</span>
              )}
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Lý do xin nghỉ <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập chi tiết lý do và phương án bàn giao công việc..."
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 placeholder-slate-400"
              required
            ></textarea>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsNewLeaveModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-md shadow-emerald-900/10 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Gửi yêu cầu duyệt
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
