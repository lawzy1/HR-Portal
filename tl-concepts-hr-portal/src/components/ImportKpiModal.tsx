import React, { useState } from 'react';
import { useHR } from '../context/HRContext';
import { KpiMonthlyData } from '../types';
import { X, FileSpreadsheet, Download, Check, AlertCircle, Link } from 'lucide-react';

export const ImportKpiModal: React.FC = () => {
  const { currentEmployee, isImportKpiModalOpen, setIsImportKpiModalOpen, importKpiRecords } = useHR();

  const [rawText, setRawText] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<'sample1' | 'sample2' | 'custom'>('sample1');

  if (!isImportKpiModalOpen) return null;

  const sampleDataset1: KpiMonthlyData[] = [
    {
      id: 'kpi-imported-08',
      month: 8,
      year: 2026,
      renderedViewsActual: 42,
      kpiConvertedViews: 45,
      kpiTarget: 35,
      completionPercentage: 128,
      otHours: 14,
      otHourlyRate: 238636,
      bonusAmount: 4200000,
      benefitAmount: 2300000,
      additionsDeductions: [
        {
          id: 'ad-imp-1',
          type: 'plus',
          title: 'Thưởng liên kết bảng KPI Google Sheet Q3',
          amount: 1200000,
          reason: 'Vượt mốc KPI view render quy đổi 120%',
        }
      ],
      notes: 'Đồng bộ tự động từ Bảng KPI Tracking Google Sheet (T8/2026)',
    },
    {
      id: 'kpi-imported-09',
      month: 9,
      year: 2026,
      renderedViewsActual: 36,
      kpiConvertedViews: 38,
      kpiTarget: 35,
      completionPercentage: 108,
      otHours: 6,
      otHourlyRate: 238636,
      bonusAmount: 3200000,
      benefitAmount: 1800000,
      additionsDeductions: [],
      notes: 'Lịch dự kiến Tháng 9/2026 từ file Tracking',
    }
  ];

  const handleImportPreset = () => {
    if (selectedPreset === 'sample1' || selectedPreset === 'sample2') {
      importKpiRecords(currentEmployee.id, sampleDataset1);
      setIsImportKpiModalOpen(false);
    } else {
      // Parse custom text CSV/Tab delimited format
      if (!rawText.trim()) {
        alert('Vui lòng dán dữ liệu bảng từ Excel/Google Sheet vào ô nhập liệu!');
        return;
      }
      try {
        const lines = rawText.trim().split('\n');
        const parsedList: KpiMonthlyData[] = [];
        lines.forEach((line, idx) => {
          const cols = line.split('\t').length > 1 ? line.split('\t') : line.split(',');
          if (cols.length >= 4) {
            const m = parseInt(cols[0].trim()) || 8;
            const y = parseInt(cols[1].trim()) || 2026;
            const rendered = parseFloat(cols[2].trim()) || 35;
            const converted = parseFloat(cols[3].trim()) || rendered;
            const target = parseFloat(cols[4]?.trim() || '35') || 35;
            const pct = Math.round((converted / target) * 100);

            parsedList.push({
              id: `kpi-custom-${idx}-${Date.now()}`,
              month: m,
              year: y,
              renderedViewsActual: rendered,
              kpiConvertedViews: converted,
              kpiTarget: target,
              completionPercentage: pct,
              otHours: 8,
              otHourlyRate: 238636,
              bonusAmount: converted > target ? 3000000 : 0,
              benefitAmount: 1800000,
              additionsDeductions: [],
              notes: 'Imported từ Bảng KPI Tracking cá nhân',
            });
          }
        });

        if (parsedList.length === 0) {
          alert('Không thể nhận diện định dạng dòng dữ liệu. Vui lòng thử dùng mẫu có sẵn.');
          return;
        }

        importKpiRecords(currentEmployee.id, parsedList);
        setIsImportKpiModalOpen(false);
      } catch (e) {
        alert('Lỗi khi phân tích dữ liệu dán. Vui lòng kiểm tra lại định dạng!');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success-600 rounded-lg text-white">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Liên kết / Import Bảng KPI Tracking</h2>
              <p className="text-xs text-slate-300">Đồng bộ số view render & KPI thực tế từ file làm việc</p>
            </div>
          </div>
          <button 
            onClick={() => setIsImportKpiModalOpen(false)}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal content */}
        <div className="p-6 space-y-4">
          
          {/* Preset options */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">Chọn nguồn nhập dữ liệu:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedPreset('sample1')}
                className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                  selectedPreset === 'sample1'
                    ? 'border-success-500 bg-success-50 text-success-900 font-bold'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold mb-1">
                  <Link className="w-3.5 h-3.5 text-success-600" />
                  <span>Bảng KPI Q3/2026</span>
                </div>
                <p className="text-[11px] text-slate-500 font-normal">Dữ liệu mẫu chuẩn 42 view render quy đổi, +14h OT, Thưởng 4.2 triệu.</p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPreset('custom')}
                className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                  selectedPreset === 'custom'
                    ? 'border-success-500 bg-success-50 text-success-900 font-bold'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
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

          {/* Custom text area if custom chosen */}
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

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-success-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11px]">
              Dữ liệu sau khi đồng bộ sẽ được cập nhật ngay vào trang <strong>KPI / OT / Thưởng</strong> và đồng bộ sang phần tính toán phiếu lương của tháng tương ứng.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsImportKpiModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleImportPreset}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-success-600 hover:bg-success-700 rounded-xl transition-colors shadow-md shadow-success-900/10 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Xác nhận đồng bộ dữ liệu</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
