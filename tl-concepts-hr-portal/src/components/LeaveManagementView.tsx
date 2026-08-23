import React, { useState } from 'react';
import { useHR } from '../context/HRContext';
import { formatDate } from '../utils/formatters';
import { LeaveStatus } from '../types';
import { 
  CalendarDays, 
  Clock, 
  PlusCircle, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Sparkles, 
  Filter, 
  Check, 
  X,
  Info,
  ShieldCheck
} from 'lucide-react';

export const LeaveManagementView: React.FC = () => {
  const { currentEmployee, setIsNewLeaveModalOpen, updateLeaveStatus } = useHR();
  const [filterStatus, setFilterStatus] = useState<string>('Tất cả');

  const { leaveBalance, leaveRequests } = currentEmployee;

  // Filter requests
  const filteredRequests = leaveRequests.filter(req => {
    if (filterStatus === 'Tất cả') return true;
    return req.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-extrabold text-slate-900">Quản lý Ngày phép Cá nhân</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi quỹ phép năm, đăng ký nghỉ phép & kiểm tra tiến độ phê duyệt từ Trưởng phòng
          </p>
        </div>

        <button
          onClick={() => setIsNewLeaveModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md shadow-emerald-900/10 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Tạo yêu cầu nghỉ phép mới</span>
        </button>
      </div>

      {/* Automatic Balance Accumulation Rule Highlight Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-4 rounded-2xl border border-emerald-800/80 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-400/30">
            <Sparkles className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase text-emerald-300 tracking-wider">Quy tắc tích lũy phép BambooHR & MISA</h3>
            <p className="text-xs text-slate-100 font-medium mt-0.5">
              <strong>Mỗi tháng làm việc hoàn thành → Tự động cộng +1 ngày phép vào quỹ phép năm.</strong>
            </p>
          </div>
        </div>
        <span className="text-[11px] bg-emerald-950/80 text-emerald-300 font-mono font-bold px-3 py-1 rounded-lg border border-emerald-700">
          Hạn dùng: {formatDate(leaveBalance.expiryDate)}
        </span>
      </div>

      {/* 5 Leave Metrics Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        
        {/* Total Accumulated */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 block">Tổng tích lũy</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">{leaveBalance.totalAccumulated}</span>
            <span className="text-xs font-semibold text-slate-500">ngày</span>
          </div>
          <span className="text-[10px] text-slate-400 block">+1 ngày/tháng</span>
        </div>

        {/* Used Days */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 block">Đã sử dụng</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-700">{leaveBalance.usedDays}</span>
            <span className="text-xs font-semibold text-slate-500">ngày</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold block">Đã duyệt chính thức</span>
        </div>

        {/* Pending Days */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-amber-700 block">Đang chờ duyệt</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-amber-700">{leaveBalance.pendingDays}</span>
            <span className="text-xs font-semibold text-slate-500">ngày</span>
          </div>
          <span className="text-[10px] text-amber-600 block">Chờ Manager phản hồi</span>
        </div>

        {/* Remaining Days (Core) */}
        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-300 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-emerald-900 block">Số phép còn lại</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-emerald-700">{leaveBalance.remainingDays}</span>
            <span className="text-xs font-semibold text-emerald-800">ngày</span>
          </div>
          <span className="text-[10px] text-emerald-800 font-bold block">Khả dụng đăng ký</span>
        </div>

        {/* Expiry Date */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 block">Ngày hết hạn</span>
          <div className="text-xs font-extrabold text-slate-800 pt-1">
            {formatDate(leaveBalance.expiryDate)}
          </div>
          <span className="text-[10px] text-slate-400 block">Xóa sổ phép cuối năm</span>
        </div>

      </div>

      {/* Leave Requests List Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        
        {/* Table Header & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Lịch sử Yêu cầu nghỉ phép</h3>
            <p className="text-xs text-slate-500">Tất cả đơn xin nghỉ đã khởi tạo từ hệ thống</p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 border border-slate-200 rounded-xl">
            {['Tất cả', 'Chờ duyệt', 'Đã duyệt', 'Từ chối'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  filterStatus === st 
                    ? 'bg-emerald-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-600">Không có đơn xin nghỉ phép nào theo bộ lọc [{filterStatus}]</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-3.5 rounded-l-lg">Loại phép</th>
                  <th className="py-3 px-3.5">Thời gian nghỉ</th>
                  <th className="py-3 px-3.5">Số ngày</th>
                  <th className="py-3 px-3.5">Lý do xin nghỉ</th>
                  <th className="py-3 px-3.5">Người duyệt</th>
                  <th className="py-3 px-3.5">Trạng thái</th>
                  <th className="py-3 px-3.5 rounded-r-lg text-right">Mô phỏng Duyệt (Demo)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3.5 font-bold text-slate-900">{req.leaveType}</td>
                    <td className="py-3.5 px-3.5 text-slate-700">
                      <div>
                        <strong>{formatDate(req.startDate)} - {formatDate(req.endDate)}</strong>
                        <span className="text-[11px] text-slate-500 block">({req.halfDayOption})</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3.5 font-extrabold text-emerald-800">{req.totalDays} ngày</td>
                    <td className="py-3.5 px-3.5 text-slate-600 max-w-xs">
                      <p className="truncate">{req.reason}</p>
                      {req.approverComment && (
                        <p className="text-[10px] text-slate-500 italic mt-0.5">Note Manager: "{req.approverComment}"</p>
                      )}
                    </td>
                    <td className="py-3.5 px-3.5 text-slate-600 font-medium">{req.approverName}</td>
                    <td className="py-3.5 px-3.5">
                      <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border inline-block ${
                        req.status === 'Đã duyệt' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        req.status === 'Chờ duyệt' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {req.status}
                      </span>
                    </td>

                    {/* Manager approval interactive quick test buttons */}
                    <td className="py-3.5 px-3.5 text-right">
                      {req.status === 'Chờ duyệt' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => updateLeaveStatus(currentEmployee.id, req.id, 'Đã duyệt', 'Đã phê duyệt đơn nghỉ phép')}
                            className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Mô phỏng Manager bấm Duyệt đơn này"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Duyệt</span>
                          </button>
                          <button
                            onClick={() => updateLeaveStatus(currentEmployee.id, req.id, 'Từ chối', 'Từ chối do kẹt tiến độ dự án')}
                            className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Mô phỏng Manager Từ chối đơn"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Từ chối</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Đã xử lý</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
