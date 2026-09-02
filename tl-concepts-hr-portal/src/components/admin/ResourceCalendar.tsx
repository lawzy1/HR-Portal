import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { DbLeaveRequest, DbWorkEvent } from '../../hooks/useLeave';
import { SearchableSelect } from '../ui/SearchableSelect';

type Employee = { id: string; full_name: string; employee_code: string };
type CalendarItem = { id: string; date: string; employeeId: string; name: string; type: 'leave' | 'wfh' | 'late'; detail: string; tone: string };

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const iso = (date: Date) => date.toISOString().slice(0, 10);
const labelMonth = (date: Date) => `Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;

export const ResourceCalendar: React.FC<{ employees: Employee[]; leaveRequests: DbLeaveRequest[]; workEvents: DbWorkEvent[] }> = ({ employees, leaveRequests, workEvents }) => {
  const [cursor, setCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [employeeId, setEmployeeId] = useState('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const items = useMemo<CalendarItem[]>(() => {
    const leaveItems = leaveRequests
      .filter((request) => request.status !== 'Từ chối')
      .flatMap((request) => {
        const result: CalendarItem[] = [];
        for (let day = new Date(`${request.start_date}T00:00:00`); day <= new Date(`${request.end_date}T00:00:00`); day.setDate(day.getDate() + 1)) {
          result.push({ id: `${request.id}-${iso(day)}`, date: iso(day), employeeId: request.employee_id, name: (request as DbLeaveRequest & { employees?: { full_name?: string } }).employees?.full_name || employees.find((employee) => employee.id === request.employee_id)?.full_name || 'Nhân viên', type: 'leave', detail: request.leave_type, tone: request.status === 'Chờ duyệt' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800' });
        }
        return result;
      });
    const workItems = workEvents.filter((event) => event.status !== 'Từ chối').map((event) => ({
      id: event.id, date: event.event_date, employeeId: event.employee_id,
      name: (event as DbWorkEvent & { employees?: { full_name?: string } }).employees?.full_name || employees.find((employee) => employee.id === event.employee_id)?.full_name || 'Nhân viên',
      type: event.event_type === 'extra_wfh' ? 'wfh' as const : 'late' as const,
      detail: event.event_type === 'extra_wfh' ? 'WFH thêm' : `Đi trễ${event.minutes ? ` · ${event.minutes}p` : ''}`,
      tone: event.event_type === 'extra_wfh' ? 'bg-sky-100 text-sky-800' : 'bg-violet-100 text-violet-800',
    }));
    return [...leaveItems, ...workItems].filter((item) => employeeId === 'all' || item.employeeId === employeeId);
  }, [employeeId, employees, leaveRequests, workEvents]);

  const first = new Date(year, month, 1);
  const leading = (first.getDay() + 6) % 7;
  const totalDays = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((leading + totalDays) / 7) * 7 }, (_, index) => index - leading + 1);
  const dayItems = selectedDate ? items.filter((item) => item.date === selectedDate) : [];

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-600">Nguồn lực</p><h2 className="mt-1 text-lg font-bold text-slate-900">Lịch nghỉ, WFH & đi trễ</h2><p className="mt-1 text-xs text-slate-500">Chọn một ngày để xem chi tiết; lịch mặc định hiển thị toàn công ty.</p></div>
      <div className="flex flex-wrap items-center gap-2"><SearchableSelect value={employeeId} onChange={setEmployeeId} className="w-56" options={[{ value: 'all', label: 'Toàn bộ nhân viên' }, ...employees.map((employee) => ({ value: employee.id, label: `${employee.full_name} · ${employee.employee_code}` }))]} /><div className="flex items-center rounded-xl border border-slate-200"><button onClick={() => setCursor(new Date(year, month - 1, 1))} className="p-2 text-slate-500 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button><span className="min-w-28 text-center text-xs font-bold text-slate-800">{labelMonth(cursor)}</span><button onClick={() => setCursor(new Date(year, month + 1, 1))} className="p-2 text-slate-500 hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button></div></div>
    </div>
    <div className="mb-3 flex flex-wrap gap-3 text-[11px] font-medium text-slate-600"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-400" />Nghỉ phép</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-sky-400" />WFH</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-violet-400" />Đi trễ</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" />Chờ duyệt</span></div>
    <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-slate-200">{DAYS.map((day) => <div key={day} className="border-b border-slate-200 bg-slate-50 px-2 py-2 text-center text-[10px] font-bold text-slate-500">{day}</div>)}{cells.map((value, index) => { const inMonth = value > 0 && value <= totalDays; const date = inMonth ? iso(new Date(year, month, value)) : ''; const entries = inMonth ? items.filter((item) => item.date === date) : []; return <button key={`${value}-${index}`} disabled={!inMonth} onClick={() => setSelectedDate(date)} className={`min-h-24 border-b border-r border-slate-100 p-1.5 text-left transition ${inMonth ? 'bg-white hover:bg-primary-50/40' : 'bg-slate-50/60'} ${index % 7 === 6 ? 'border-r-0' : ''}`}><span className={`mb-1 block text-xs font-bold ${inMonth ? 'text-slate-700' : 'text-slate-300'}`}>{inMonth ? value : ''}</span>{entries.slice(0, 3).map((entry) => <span key={entry.id} className={`mb-1 block truncate rounded px-1.5 py-1 text-[10px] font-semibold ${entry.tone}`}>{entry.name.split(' ').slice(-2).join(' ')} · {entry.detail}</span>)}{entries.length > 3 && <span className="text-[10px] font-bold text-primary-600">+{entries.length - 3} khác</span>}</button>; })}</div>
    {selectedDate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4" onClick={() => setSelectedDate(null)}><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-primary-600">Chi tiết lịch</p><h3 className="mt-1 text-lg font-bold text-slate-900">{new Date(`${selectedDate}T00:00:00`).toLocaleDateString('vi-VN')}</h3></div><button onClick={() => setSelectedDate(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><div className="mt-4 space-y-2">{dayItems.length ? dayItems.map((item) => <div key={item.id} className={`rounded-xl px-3 py-2 text-sm ${item.tone}`}><strong>{item.name}</strong><span className="ml-2 text-xs">{item.detail}</span></div>) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Không có hoạt động nhân sự.</p>}</div></div></div>}
  </section>;
};
