import React, { useState } from 'react';
import { 
  CalendarDays, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Calendar,
  Building,
  Check
} from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { LeaveStatus } from '../../types';

interface CompanyHoliday {
  month: number;
  date: string;
  name: string;
  daysCount: number;
  type: 'Nghỉ lễ Quốc gia' | 'Nghỉ chế độ TL CONCEPTS';
  note: string;
}

const COMPANY_HOLIDAYS_2026: CompanyHoliday[] = [
  { month: 1, date: '01/01/2026', name: 'Tết Dương Lịch 2026', daysCount: 1, type: 'Nghỉ lễ Quốc gia', note: 'Nghỉ hưởng nguyên lương theo Luật Lao động' },
  { month: 2, date: '14/02/2026 ~ 20/02/2026', name: 'Kỳ nghỉ Tết Nguyên Đán Bính Ngọ', daysCount: 7, type: 'Nghỉ lễ Quốc gia', note: 'Toàn bộ công ty tạm ngưng giao dịch' },
  { month: 4, date: '26/04/2026', name: 'Giỗ Tổ Hùng Vương (10/3 ÂL)', daysCount: 1, type: 'Nghỉ lễ Quốc gia', note: 'Nghỉ 01 ngày' },
  { month: 4, date: '30/04/2026', name: 'Ngày Giải phóng Miền Nam 30/4', daysCount: 1, type: 'Nghỉ lễ Quốc gia', note: 'Nghỉ 01 ngày' },
  { month: 5, date: '01/05/2026', name: 'Ngày Quốc tế Lao động 1/5', daysCount: 1, type: 'Nghỉ lễ Quốc gia', note: 'Nghỉ 01 ngày' },
  { month: 7, date: '18/07/2026 ~ 20/07/2026', name: 'Kỳ nghỉ Du lịch Hè / Company Retreat', daysCount: 3, type: 'Nghỉ chế độ TL CONCEPTS', note: 'Công ty đài thọ 100% chi phí teambuilding' },
  { month: 9, date: '02/09/2026 ~ 03/09/2026', name: 'Ngày Quốc khánh 2/9', daysCount: 2, type: 'Nghỉ lễ Quốc gia', note: 'Nghỉ 02 ngày theo quy định' },
  { month: 12, date: '25/12/2026', name: 'Ngày hội gia đình & Giáng Sinh TL CONCEPTS', daysCount: 1, type: 'Nghỉ chế độ TL CONCEPTS', note: 'Sự kiện Year-End chuẩn bị tổng kết năm' },
];

export const AdminLeaveManagementView: React.FC = () => {
  const { employees, updateLeaveStatus } = useHR();

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDepartment, setFilterDepartment] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedHolidayMonth, setSelectedHolidayMonth] = useState<number | 'ALL'>('ALL');

  // Comment modal
  const [selectedReqForComment, setSelectedReqForComment] = useState<{ empId: string; reqId: string; action: LeaveStatus; empName: string } | null>(null);
  const [approverComment, setApproverComment] = useState<string>('');

  // Collect all leave requests across company
  const allLeaveRequests = employees.flatMap(emp => 
    emp.leaveRequests.map(lr => ({
      ...lr,
      employeeId: emp.id,
      employeeName: emp.fullName,
      employeeCode: emp.employeeCode,
      department: emp.department,
      avatar: emp.avatar,
    }))
  );

  // Filtered requests
  const filteredRequests = allLeaveRequests.filter(lr => {
    const matchStatus = filterStatus === 'ALL' || lr.status === filterStatus;
    const matchDept = filterDepartment === 'ALL' || lr.department === filterDepartment;
    const matchSearch = lr.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        lr.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        lr.reason.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchDept && matchSearch;
  });

  const pendingRequests = allLeaveRequests.filter(lr => lr.status === 'Chờ duyệt');

  const filteredHolidays = COMPANY_HOLIDAYS_2026.filter(h => 
    selectedHolidayMonth === 'ALL' || h.month === selectedHolidayMonth
  );

  const handleConfirmAction = () => {
    if (selectedReqForComment) {
      updateLeaveStatus(
        selectedReqForComment.empId, 
        selectedReqForComment.reqId, 
        selectedReqForComment.action, 
        approverComment
      );
      setSelectedReqForComment(null);
      setApproverComment('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Quản lý Ngày phép & Lịch Nghỉ toàn Công ty
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Duyệt các yêu cầu xin nghỉ phép từ nhân viên, danh sách ngày nghỉ lễ công ty qua từng tháng và Quỹ phép nhân sự.
          </p>
        </div>
      </div>

      {/* 1. SECTION: Employee Leave Requests (Yêu cầu xin nghỉ phép của nhân viên) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                Yêu cầu Xin nghỉ phép cần Phê duyệt ({pendingRequests.length})
              </h2>
              <p className="text-xs text-slate-500">Xem xét và phản hồi trực tiếp các đơn xin nghỉ phép gửi từ ứng dụng User</p>
            </div>
          </div>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-medium text-slate-700 text-sm">Hiện tại không có đơn xin nghỉ phép nào đang chờ duyệt.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map(req => (
              <div key={req.id} className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start space-x-3">
                  <img 
                    src={req.avatar} 
                    alt={req.employeeName} 
                    className="w-10 h-10 rounded-full object-cover border border-amber-300 shrink-0"
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-sm">{req.employeeName}</span>
                      <span className="text-xs font-mono text-slate-500">({req.employeeCode})</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-800">
                        {req.leaveType}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mt-1">
                      Thời gian: <b>{req.startDate}</b> đến <b>{req.endDate}</b> ({req.totalDays} ngày - {req.halfDayOption})
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5 italic">
                      Lý do: "{req.reason}"
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">Gửi ngày: {req.createdAt}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => setSelectedReqForComment({
                      empId: req.employeeId!,
                      reqId: req.id,
                      action: 'Đã duyệt',
                      empName: req.employeeName!
                    })}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center space-x-1 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Duyệt đơn</span>
                  </button>

                  <button
                    onClick={() => setSelectedReqForComment({
                      empId: req.employeeId!,
                      reqId: req.id,
                      action: 'Từ chối',
                      empName: req.employeeName!
                    })}
                    className="px-3.5 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Từ chối</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Full Leave Requests Search & Log Table */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="font-bold text-slate-800 text-sm">Lịch sử Đơn nghỉ phép toàn công ty</h3>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input 
                  type="text"
                  placeholder="Tìm theo tên, mã NV, lý do..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
              >
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
                  <th className="py-2.5 px-4">Người duyệt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400">Không có đơn nghỉ phép nào phù hợp bộ lọc.</td>
                  </tr>
                ) : (
                  filteredRequests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{req.employeeName}</td>
                      <td className="py-3 px-4 font-medium text-blue-700">{req.leaveType}</td>
                      <td className="py-3 px-4">{req.startDate} ~ {req.endDate}</td>
                      <td className="py-3 px-4 font-semibold">{req.totalDays} ngày ({req.halfDayOption})</td>
                      <td className="py-3 px-4 max-w-[200px] truncate">{req.reason}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          req.status === 'Đã duyệt'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'Từ chối'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{req.approverName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 2. SECTION: Danh sách Ngày nghỉ phép của Công ty qua từng tháng */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                Danh sách Ngày nghỉ Lễ & Chế độ Công ty qua từng Tháng (2026)
              </h2>
              <p className="text-xs text-slate-500">Lịch nghỉ lễ chính thức áp dụng toàn công ty TL CONCEPTS</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-500">Lọc Tháng:</span>
            <select
              value={selectedHolidayMonth}
              onChange={e => setSelectedHolidayMonth(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
            >
              <option value="ALL">Tất cả các tháng</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] tracking-wider border-y border-slate-200">
              <tr>
                <th className="py-3 px-4">Tháng</th>
                <th className="py-3 px-4">Thời gian nghỉ</th>
                <th className="py-3 px-4">Tên Lễ / Sự kiện</th>
                <th className="py-3 px-4">Số ngày nghỉ</th>
                <th className="py-3 px-4">Phân loại</th>
                <th className="py-3 px-4">Ghi chú chính sách</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHolidays.map((h, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-black text-blue-700 text-sm">Tháng {h.month}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{h.date}</td>
                  <td className="py-3 px-4 font-bold text-slate-800">{h.name}</td>
                  <td className="py-3 px-4 font-extrabold text-emerald-600">{h.daysCount} ngày</td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                      h.type === 'Nghỉ lễ Quốc gia' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {h.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 italic">{h.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. SECTION: Bảng Quỹ phép Nhân sự toàn Công ty (giữ nguyên) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 text-base">
            Bảng Quỹ phép Nhân sự toàn Công ty ({employees.length} nhân viên)
          </h2>
          <span className="text-xs text-slate-500 font-medium">Cập nhật thời gian thực theo số ngày nghỉ đã duyệt</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] tracking-wider border-y border-slate-200">
              <tr>
                <th className="py-3 px-4">Mã & Nhân viên</th>
                <th className="py-3 px-4">Phòng ban</th>
                <th className="py-3 px-4">Tích lũy năm</th>
                <th className="py-3 px-4">Đã sử dụng</th>
                <th className="py-3 px-4">Đang chờ duyệt</th>
                <th className="py-3 px-4">Khả dụng còn lại</th>
                <th className="py-3 px-4">Hạn sử dụng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900 flex items-center space-x-2.5">
                    <img src={emp.avatar} alt="" className="w-7 h-7 rounded-full object-cover border border-slate-200" />
                    <div>
                      <span>{emp.fullName}</span>
                      <span className="block text-[10px] text-slate-400 font-mono">{emp.employeeCode}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">{emp.department}</td>
                  <td className="py-3 px-4 font-semibold">{emp.leaveBalance.totalAccumulated} ngày</td>
                  <td className="py-3 px-4 text-emerald-600 font-bold">{emp.leaveBalance.usedDays} ngày</td>
                  <td className="py-3 px-4 text-amber-600 font-bold">{emp.leaveBalance.pendingDays} ngày</td>
                  <td className="py-3 px-4 font-extrabold text-blue-700 text-sm">{emp.leaveBalance.remainingDays} ngày</td>
                  <td className="py-3 px-4 text-slate-500">{emp.leaveBalance.expiryDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval / Rejection Comment Modal */}
      {selectedReqForComment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Xác nhận {selectedReqForComment.action} đơn nghỉ của {selectedReqForComment.empName}
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ghi chú / Nhận xét của Admin (Không bắt buộc):
              </label>
              <textarea
                rows={3}
                placeholder="Ví dụ: Đồng ý duyệt, chúc làm việc tốt / Từ chối do trùng lịch tiến độ dự án..."
                value={approverComment}
                onChange={e => setApproverComment(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setSelectedReqForComment(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmAction}
                className={`px-4 py-2 text-white rounded-xl text-xs font-bold cursor-pointer ${
                  selectedReqForComment.action === 'Đã duyệt' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Xác nhận {selectedReqForComment.action}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
