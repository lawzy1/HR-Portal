import React from 'react';
import { X, ShieldCheck, Smartphone, CheckCircle2, Info, Eye, Download, Sparkles } from 'lucide-react';
import { VNEID_SAMPLE_IMAGE, VNEID_GUIDE_STEPS } from '../constants/vneidSample';

interface VneidGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VneidGuideModal: React.FC<VneidGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-red-700 via-red-600 to-rose-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20">
              <ShieldCheck className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white">Hướng Dẫn Chụp Ảnh "Thông Tin Cư Trú" Từ VNeID</h3>
                <span className="bg-yellow-400 text-red-900 font-black text-[10px] px-2 py-0.5 rounded-full uppercase">
                  Mức 2
                </span>
              </div>
              <p className="text-xs text-red-100 mt-0.5">
                Quy chuẩn giấy tờ xác thực nơi cư trú phục vụ ký kết HĐLĐ & Đăng ký BHXH
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* Left: Step by Step Guide (7 cols) */}
            <div className="md:col-span-7 space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Smartphone className="w-4 h-4 text-red-600" />
                <span>5 Bước lấy ảnh Thông tin cư trú trên VNeID:</span>
              </div>

              <div className="space-y-3">
                {VNEID_GUIDE_STEPS.map((step) => (
                  <div key={step.step} className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="w-6 h-6 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                      {step.step}
                    </div>
                    <div className="text-xs space-y-0.5">
                      <p className="font-bold text-slate-800">{step.title}</p>
                      <p className="text-slate-600 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Requirement Notes */}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>Lưu ý quan trọng khi chụp màn hình:</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-[11px] text-amber-800">
                  <li>Ảnh chụp phải <strong>rõ nét</strong>, không bị mờ, lóa sáng hay che khuất chữ.</li>
                  <li>Phải thấy rõ họ tên, số CCCD, <strong>Nơi thường trú</strong> và <strong>Nơi tạm trú / Nơi ở hiện tại</strong>.</li>
                  <li>Nếu có thông tin thành viên gia đình hoặc chủ hộ, vui lòng chụp đầy đủ.</li>
                </ul>
              </div>
            </div>

            {/* Right: Sample Guide Image Mockup (5 cols) */}
            <div className="md:col-span-5 flex flex-col items-center">
              <div className="w-full bg-slate-900 p-2.5 rounded-3xl shadow-xl border-4 border-slate-800 relative group">
                <div className="bg-slate-800 rounded-2xl overflow-hidden relative aspect-[9/16] flex items-center justify-center">
                  <img
                    src={VNEID_SAMPLE_IMAGE}
                    alt="Ảnh mẫu thông tin cư trú VNeID"
                    className="w-full h-full object-cover object-top"
                  />
                  <div className="absolute top-3 left-3 right-3 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center justify-between border border-white/10">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Ảnh Mẫu Hướng Dẫn</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">VNeID</span>
                  </div>
                </div>

                <div className="text-center mt-2.5">
                  <span className="text-[11px] text-slate-300 font-medium">
                    Mẫu màn hình "Thông tin cư trú" chuẩn trên VNeID
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Hỗ trợ tư vấn HR: Ban Quản lý Nhân sự TL CONCEPTS
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Đã hiểu, đóng hướng dẫn
          </button>
        </div>

      </div>
    </div>
  );
};
