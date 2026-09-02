import React, { useState } from 'react';
import { 
  BellRing, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { formatDate } from '../../utils/formatters';

export const AdminRemindersView: React.FC = () => {
  const { 
    reminders, 
    resolveReminder, 
    setAdminTab, 
    setSelectedEmployeeIdForAdmin,
    pendingOnboardingCount,
  } = useHR();

  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  const filteredReminders = reminders.filter(rem => {
    const matchCat = filterCategory === 'ALL' || rem.category === filterCategory;
    const matchSev = filterSeverity === 'ALL' || rem.severity === filterSeverity;
    return matchCat && matchSev;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Trung tâm Cảnh báo & Nhắc nhở HR Tự động
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Xử lý hồ sơ nhân viên chờ duyệt cùng các nhắc nhở hợp đồng, lương, giấy tờ và đơn từ tồn đọng.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {pendingOnboardingCount > 0 && <span className="px-3 py-1.5 bg-primary-100 text-primary-800 rounded-xl font-bold text-xs">{pendingOnboardingCount} hồ sơ chờ duyệt</span>}
          <span className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-xl font-bold text-xs">{reminders.length} Cảnh báo đang hoạt động</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Danh mục:</span>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
            >
              <option value="ALL">Tất cả Cảnh báo</option>
              <option value="onboarding_review">Hồ sơ nhân viên chờ duyệt</option>
              <option value="contract">Hợp đồng lao động</option>
              <option value="contract_missing">Nhân viên chưa có hợp đồng</option>
              <option value="salary_review">Kỳ xét lương</option>
              <option value="missing_doc">Thiếu hồ sơ CCCD/MST</option>
              <option value="leave_request">Đơn xin nghỉ phép</option>
              <option value="ot_request">Yêu cầu OT</option>
              <option value="work_event">WFH / Đi muộn</option>
              <option value="payroll">Lương & Payroll</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Mức độ:</span>
            <select
              value={filterSeverity}
              onChange={e => setFilterSeverity(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
            >
              <option value="ALL">Tất cả Mức độ</option>
              <option value="high">Khẩn cấp / Mức cao</option>
              <option value="medium">Mức Trung bình</option>
              <option value="low">Mức Nhẹ / Nhắc nhở</option>
            </select>
          </div>
        </div>

        <span className="text-xs font-medium text-slate-500">
          Hiển thị {filteredReminders.length} nhắc nhở
        </span>
      </div>

      {/* Reminders List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        {filteredReminders.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <CheckCircle2 className="w-10 h-10 text-success-500 mx-auto mb-2" />
            <p className="font-bold text-slate-800 text-base">Tuyệt vời! Không có cảnh báo nào trong danh mục này.</p>
            <p className="text-xs text-slate-500 mt-1">Hệ thống HR đang vận hành mượt mà.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReminders.map(rem => (
              <div
                key={rem.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  rem.severity === 'high'
                    ? 'bg-rose-50/60 border-rose-200 text-rose-900'
                    : rem.severity === 'medium'
                      ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-start space-x-3.5">
                  <div className="mt-1">
                    {rem.severity === 'high' ? (
                      <ShieldAlert className="w-6 h-6 text-rose-600" />
                    ) : rem.severity === 'medium' ? (
                      <AlertTriangle className="w-6 h-6 text-amber-600" />
                    ) : (
                      <BellRing className="w-6 h-6 text-primary-600" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm">{rem.title}</span>
                      {rem.employeeName && (
                        <span className="px-2.5 py-0.5 text-xs font-semibold bg-white border border-slate-200 rounded-md text-slate-800">
                          {rem.employeeName}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                        rem.severity === 'high' ? 'bg-rose-200 text-rose-800' : 'bg-amber-200 text-amber-800'
                      }`}>
                        {rem.severity === 'high' ? 'Khẩn cấp' : 'Trung bình'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">
                      {rem.message}
                    </p>

                    {rem.dueDate && (
                      <p className="text-[11px] font-medium text-slate-500 mt-1 flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>Mốc thời hạn: {formatDate(rem.dueDate)}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {rem.employeeId && (
                    <button
                      onClick={() => {
                        setSelectedEmployeeIdForAdmin(rem.employeeId!);
                        if (rem.category === 'contract' || rem.category === 'contract_missing' || rem.category === 'salary_review') {
                          setAdminTab('admin-contracts');
                        } else if (rem.category === 'leave_request') {
                          setAdminTab('admin-leaves');
                        } else if (rem.category === 'ot_request' || rem.category === 'work_event') {
                          setAdminTab('admin-kpi');
                        } else if (rem.category === 'payroll') {
                          setAdminTab('admin-payroll');
                        } else {
                          setAdminTab('admin-employees');
                        }
                      }}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1 shadow-md shadow-primary-500/20 cursor-pointer"
                    >
                      <span>Xử lý ngay</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => resolveReminder(rem.id)}
                    className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer"
                  >
                    Đã đọc
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
