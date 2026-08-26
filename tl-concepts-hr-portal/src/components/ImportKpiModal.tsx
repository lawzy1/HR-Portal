import React, { useState } from 'react';
import { useHR } from '../context/HRContext';
import { useAuth } from '../context/AuthContext';
import { useEmployees } from '../hooks/useEmployees';
import { useUpsertKpiMonthly } from '../hooks/useKpi';
import { getUserFacingError } from '../lib/userFacingError';
import { X, FileSpreadsheet, Check, AlertCircle, Link, Loader2 } from 'lucide-react';

interface ParsedKpiRow {
  month: number;
  year: number;
  renderedViewsActual: number;
  kpiConvertedViews: number;
  kpiTarget: number;
  otHours: number;
  bonusAmount: number;
  benefitAmount: number;
  notes: string;
}

// Admin-only in the real schema (kpi_monthly_write_admin_only RLS policy) —
// per the client meeting notes, employees only view their own KPI to
// double-check ("double check để user cũng tự xem được"), they don't
// self-report it. This modal now writes to whichever employee Admin has
// selected (selectedEmployeeIdForAdmin), not "the current logged-in user".
export const ImportKpiModal: React.FC = () => {
  const { selectedEmployeeIdForAdmin, isImportKpiModalOpen, setIsImportKpiModalOpen, showToast } = useHR();
  const { profile } = useAuth();
  const { data: employees } = useEmployees();
  const upsertKpiMonthly = useUpsertKpiMonthly();

  const [rawText, setRawText] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<'sample1' | 'custom'>('sample1');
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  if (!isImportKpiModalOpen) return null;

  const targetEmployee = (employees || []).find((e) => e.id === selectedEmployeeIdForAdmin);

  const sampleRows: ParsedKpiRow[] = [
    {
      month: 8,
      year: 2026,
      renderedViewsActual: 42,
      kpiConvertedViews: 45,
      kpiTarget: 35,
      otHours: 14,
      bonusAmount: 4200000,
      benefitAmount: 2300000,
      notes: 'Đồng bộ từ Bảng KPI Tracking Google Sheet (T8/2026)',
    },
    {
      month: 9,
      year: 2026,
      renderedViewsActual: 36,
      kpiConvertedViews: 38,
      kpiTarget: 35,
      otHours: 6,
      bonusAmount: 3200000,
      benefitAmount: 1800000,
      notes: 'Lịch dự kiến Tháng 9/2026 từ file Tracking',
    },
  ];

  const parseCustomRows = (): ParsedKpiRow[] => {
    const lines = rawText.trim().split('\n');
    const parsed: ParsedKpiRow[] = [];
    for (const line of lines) {
      const cols = line.split('\t').length > 1 ? line.split('\t') : line.split(',');
      if (cols.length < 4) continue;
      const month = parseInt(cols[0].trim()) || 8;
      const year = parseInt(cols[1].trim()) || 2026;
      const rendered = parseFloat(cols[2].trim()) || 0;
      const converted = parseFloat(cols[3].trim()) || rendered;
      const target = parseFloat(cols[4]?.trim() || '0') || rendered;
      parsed.push({
        month,
        year,
        renderedViewsActual: rendered,
        kpiConvertedViews: converted,
        kpiTarget: target,
        otHours: 0,
        bonusAmount: 0,
        benefitAmount: 0,
        notes: 'Imported từ dữ liệu dán thủ công',
      });
    }
    return parsed;
  };

  const handleImport = async () => {
    setError(null);

    if (!targetEmployee || !profile?.companyId) {
      setError('Vui lòng chọn nhân viên ở danh sách trước khi import KPI.');
      return;
    }

    const rows = selectedPreset === 'sample1' ? sampleRows : parseCustomRows();
    if (rows.length === 0) {
      setError('Không nhận diện được dòng dữ liệu nào. Định dạng: Tháng, Năm, View Thực tế, View Quy đổi, Target.');
      return;
    }

    setIsImporting(true);
    try {
      await Promise.all(
        rows.map((row) =>
          upsertKpiMonthly.mutateAsync({
            company_id: profile.companyId,
            employee_id: targetEmployee.id,
            month: row.month,
            year: row.year,
            rendered_views_actual: row.renderedViewsActual,
            kpi_converted_views: row.kpiConvertedViews,
            kpi_target: row.kpiTarget,
            completion_percentage: row.kpiTarget > 0 ? Math.round((row.kpiConvertedViews / row.kpiTarget) * 100) : 0,
            ot_hours: row.otHours,
            bonus_amount: row.bonusAmount,
            benefit_amount: row.benefitAmount,
            notes: row.notes,
          })
        )
      );
      showToast(`Đã nhập thành công ${rows.length} bản ghi KPI cho ${targetEmployee.full_name}!`);
      setIsImportKpiModalOpen(false);
      setRawText('');
    } catch (err) {
      setError(await getUserFacingError(err, 'Import KPI thất bại. Vui lòng thử lại.'));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">

        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success-600 rounded-lg text-white">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Liên kết / Import Bảng KPI Tracking</h2>
              <p className="text-xs text-slate-300">
                {targetEmployee ? `Nhập cho: ${targetEmployee.full_name} (${targetEmployee.employee_code})` : 'Chưa chọn nhân viên'}
              </p>
            </div>
          </div>
          <button onClick={() => setIsImportKpiModalOpen(false)} className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">Chọn nguồn nhập dữ liệu:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedPreset('sample1')}
                className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                  selectedPreset === 'sample1' ? 'border-success-500 bg-success-50 text-success-900 font-bold' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold mb-1">
                  <Link className="w-3.5 h-3.5 text-success-600" />
                  <span>Dữ liệu mẫu (2 tháng)</span>
                </div>
                <p className="text-[11px] text-slate-500 font-normal">Dữ liệu minh họa để test nhanh luồng import.</p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPreset('custom')}
                className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                  selectedPreset === 'custom' ? 'border-success-500 bg-success-50 text-success-900 font-bold' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold mb-1">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-success-600" />
                  <span>Dán dữ liệu Excel/CSV</span>
                </div>
                <p className="text-[11px] text-slate-500 font-normal">Dán thủ công các cột: Tháng, Năm, View Thực Tế, View Quy Đổi, Target.</p>
              </button>
            </div>
          </div>

          {selectedPreset === 'custom' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Dán các dòng dữ liệu (Định dạng: Tháng, Năm, View Thực tế, View Quy đổi, Target)
              </label>
              <textarea
                rows={4}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="VD:&#10;8, 2026, 40, 44, 35&#10;9, 2026, 38, 40, 35"
                className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-success-500 text-slate-800"
              ></textarea>
            </div>
          )}

          {!targetEmployee && (
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p>Chưa chọn nhân viên — chọn 1 nhân viên ở danh sách "Hồ sơ Nhân viên" hoặc "KPI, OT & Thưởng" trước.</p>
            </div>
          )}

          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button type="button" onClick={() => setIsImportKpiModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
              Hủy
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={isImporting || !targetEmployee}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-success-600 hover:bg-success-700 disabled:opacity-60 rounded-xl transition-colors shadow-md shadow-success-900/10 cursor-pointer"
            >
              {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Xác nhận đồng bộ dữ liệu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
