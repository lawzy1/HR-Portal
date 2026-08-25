import React, { useState } from 'react';
import { useHR } from '../context/HRContext';
import { useAuth } from '../context/AuthContext';
import { useEmployee, useEmployeeSensitiveInfo, useEmployeeRelatives } from '../hooks/useEmployees';
import { useSignedImageUrl } from '../hooks/useFileUpload';
import { formatDate } from '../utils/formatters';
import {
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Landmark,
  Users,
  Edit3,
  ShieldCheck,
  Calendar,
  Star,
  Eye,
  HelpCircle,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { VneidGuideModal } from './VneidGuideModal';
import { VNEID_SAMPLE_IMAGE } from '../constants/vneidSample';

const DocPhoto: React.FC<{ path: string | null | undefined; alt: string; label: string; onView: (src: string, title: string) => void }> = ({
  path,
  alt,
  label,
  onView,
}) => {
  const { data: signedUrl } = useSignedImageUrl(path);
  return (
    <div
      onClick={() => signedUrl && onView(signedUrl, alt)}
      className="relative bg-slate-100 rounded-xl overflow-hidden border border-slate-200 h-28 cursor-pointer group"
    >
      {signedUrl ? (
        <>
          <img src={signedUrl} alt={alt} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
            <Eye className="w-4 h-4" />
            <span>Xem phóng to</span>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
          <span>Chưa có ảnh</span>
        </div>
      )}
      <span className="absolute bottom-1.5 left-1.5 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">{label}</span>
    </div>
  );
};

export const ProfileView: React.FC = () => {
  const { setIsEditProfileModalOpen } = useHR();
  const { profile } = useAuth();
  const [selectedImage, setSelectedImage] = useState<{ src: string; title: string } | null>(null);
  const [isVneidGuideOpen, setIsVneidGuideOpen] = useState<boolean>(false);

  const { data: employee } = useEmployee(profile?.employeeId ?? undefined);
  const { data: sensitiveInfo } = useEmployeeSensitiveInfo(profile?.employeeId ?? undefined);
  const { data: relatives } = useEmployeeRelatives(profile?.employeeId ?? undefined);
  const { data: avatarUrl } = useSignedImageUrl(employee?.avatar_url);
  const { data: vneidUrl } = useSignedImageUrl(sensitiveInfo?.vneid_residency_url);

  if (!employee) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-sm text-slate-500">
        Đang tải hồ sơ...
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {avatarUrl ? (
            <img src={avatarUrl} alt={employee.full_name} className="w-20 h-20 rounded-2xl object-cover ring-4 ring-success-500/30 shadow-md" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center ring-4 ring-success-500/30">
              <User className="w-8 h-8 text-slate-400" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900">{employee.full_name}</h1>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-success-100 text-success-800 rounded-lg border border-success-200">
                {employee.employee_code}
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium mt-1">
              {employee.job_title} • <strong className="text-success-700">{employee.department}</strong>
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-2 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Ngày sinh: {employee.dob ? formatDate(employee.dob) : '—'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Giới tính: {employee.gender || '—'}
              </span>
              <span>•</span>
              <span>Hôn nhân: {employee.marital_status || '—'}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsEditProfileModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-success-600 hover:bg-success-700 rounded-xl transition-all shadow-md shadow-success-900/10 cursor-pointer"
        >
          <Edit3 className="w-4 h-4" />
          <span>Yêu cầu thay đổi</span>
        </button>
      </div>

      {/* Grid Section 1: Personal Info & Address */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Contact & Address Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Phone className="w-4 h-4 text-success-600" />
              <span>Thông tin liên hệ & Địa chỉ</span>
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
              <span className="text-slate-500 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Số điện thoại di động:
              </span>
              <strong className="text-slate-900 font-mono">{employee.phone || '—'}</strong>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
              <span className="text-slate-500 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Email công ty:
              </span>
              <strong className="text-slate-900">{employee.email || '—'}</strong>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="text-slate-500 text-[11px] block font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Địa chỉ thường trú (trên CCCD):
              </span>
              <p className="text-slate-800 font-semibold">{employee.permanent_address || '—'}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="text-slate-500 text-[11px] block font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Địa chỉ tạm trú hiện tại:
              </span>
              <p className="text-slate-800 font-semibold">{employee.temporary_address || '—'}</p>
            </div>
          </div>
        </div>

        {/* CCCD / Tax / Social Insurance Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-success-600" />
              <span>CCCD / Hộ chiếu & Giấy tờ pháp lý</span>
            </h3>
            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">Bảo mật HR</span>
          </div>
          <div className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            Trạng thái đối chiếu CCCD:{' '}
            <strong className={sensitiveInfo?.identity_verification_status === 'mismatch' ? 'text-rose-700' : 'text-success-700'}>
              {{
                matched: 'Dữ liệu khớp ảnh',
                mismatch: 'Không khớp — cần bổ sung',
                manual_verified: 'HR đã xác nhận thủ công',
                not_checked: 'Chưa kiểm tra',
              }[sensitiveInfo?.identity_verification_status || 'not_checked']}
            </strong>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="text-slate-500 text-[11px]">Số CCCD / Hộ chiếu</span>
              <p className="font-bold text-slate-900 font-mono text-sm">{sensitiveInfo?.id_card_number || '—'}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="text-slate-500 text-[11px]">Ngày cấp</span>
              <p className="font-bold text-slate-900">{sensitiveInfo?.id_card_issue_date ? formatDate(sensitiveInfo.id_card_issue_date) : '—'}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl space-y-1 col-span-2">
              <span className="text-slate-500 text-[11px]">Nơi cấp</span>
              <p className="font-bold text-slate-900">{sensitiveInfo?.id_card_issue_place || '—'}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="text-slate-500 text-[11px]">Mã số thuế cá nhân (MST)</span>
              <p className="font-bold text-success-800 font-mono">{sensitiveInfo?.tax_code || '—'}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="text-slate-500 text-[11px]">Mã số BHXH</span>
              <p className="font-bold text-success-800 font-mono">{sensitiveInfo?.social_insurance_code || '—'}</p>
            </div>
          </div>

          <div className="pt-2 space-y-4">
            <div>
              <p className="text-xs font-bold text-slate-700 mb-2">Hình ảnh CCCD / Hộ chiếu 2 mặt:</p>
              <div className="grid grid-cols-2 gap-3">
                <DocPhoto path={sensitiveInfo?.id_card_front_url} alt="CCCD Mặt trước" label="Mặt trước" onView={(src, title) => setSelectedImage({ src, title })} />
                <DocPhoto path={sensitiveInfo?.id_card_back_url} alt="CCCD Mặt sau" label="Mặt sau" onView={(src, title) => setSelectedImage({ src, title })} />
              </div>
            </div>

            <div className="p-3.5 bg-gradient-to-r from-red-50/70 via-rose-50/50 to-orange-50/40 rounded-2xl border border-red-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-red-600 text-white flex items-center justify-center shadow-xs">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-red-950 block">Ảnh chụp "Thông tin cư trú" (VNeID):</span>
                    <span className="text-[10px] text-red-700">Xác thực nơi thường trú & tạm trú</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsVneidGuideOpen(true)}
                  className="px-2.5 py-1 bg-white hover:bg-red-100/60 text-red-700 border border-red-300 rounded-lg text-[11px] font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-red-600" />
                  <span>Xem ảnh mẫu hướng dẫn</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div
                  onClick={() => vneidUrl && setSelectedImage({ src: vneidUrl, title: 'Ảnh chụp Thông tin cư trú (VNeID)' })}
                  className="relative bg-white rounded-xl overflow-hidden border border-red-200 h-28 cursor-pointer group shadow-2xs"
                >
                  {vneidUrl ? (
                    <>
                      <img src={vneidUrl} alt="Thông tin cư trú VNeID" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                        <Eye className="w-4 h-4" />
                        <span>Xem phóng to</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs px-2 text-center">
                      <Smartphone className="w-5 h-5 text-red-400 mb-1" />
                      <span className="font-semibold text-slate-600">Chưa tải ảnh VNeID</span>
                      <span className="text-[10px] text-slate-400">Bấm nút Sửa hồ sơ để tải lên</span>
                    </div>
                  )}
                </div>

                <div
                  onClick={() => setIsVneidGuideOpen(true)}
                  className="relative bg-slate-900 rounded-xl overflow-hidden border border-slate-700 h-28 cursor-pointer group flex items-center p-2 gap-3"
                >
                  <div className="w-16 h-full rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                    <img src={VNEID_SAMPLE_IMAGE} alt="Ảnh mẫu VNeID" className="w-full h-full object-cover object-top opacity-90 group-hover:scale-105 transition-transform" />
                  </div>
                  <div className="text-left text-white text-xs space-y-1">
                    <span className="bg-yellow-400 text-red-950 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase">ẢNH MẪU CHUẨN</span>
                    <p className="font-bold text-[11px] text-slate-200 leading-tight">Màn hình VNeID Thông tin cư trú</p>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-yellow-400" /> Bấm để xem chi tiết
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Section 2: Banking & Emergency Relatives */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-success-600" />
              <span>Tài khoản Ngân hàng nhận lương</span>
            </h3>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl space-y-3 shadow-md relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] uppercase font-bold text-success-400 tracking-wider">NGÂN HÀNG NHẬN LƯƠNG</p>
                <h4 className="font-extrabold text-sm mt-0.5">{sensitiveInfo?.bank_name || '—'}</h4>
              </div>
              <Landmark className="w-7 h-7 text-success-400/80" />
            </div>
            <div className="pt-2">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">SỐ TÀI KHOẢN</p>
              <p className="text-xl font-black font-mono tracking-wider text-success-300">{sensitiveInfo?.bank_account_number || '—'}</p>
            </div>
            <div className="flex justify-between items-end pt-1 text-xs">
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase">CHỦ TÀI KHOẢN</p>
                <p className="font-bold uppercase tracking-wider font-mono">{sensitiveInfo?.bank_account_holder || '—'}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">CHI NHÁNH</p>
                <p className="font-medium text-slate-200">{sensitiveInfo?.bank_branch || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-success-600" />
              <span>Người thân & Liên hệ khẩn cấp</span>
            </h3>
            <button onClick={() => setIsEditProfileModalOpen(true)} className="text-xs font-bold text-success-700 hover:underline cursor-pointer">
              Yêu cầu thay đổi
            </button>
          </div>

          {!relatives || relatives.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4">Chưa cập nhật thông tin người thân.</p>
          ) : (
            <div className="space-y-3">
              {relatives.map((rel) => (
                <div key={rel.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">{rel.full_name}</span>
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-semibold">{rel.relationship}</span>
                    </div>
                    {rel.is_emergency_contact && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                        <Star className="w-3 h-3 text-amber-600 fill-amber-600" />
                        <span>Liên hệ khẩn cấp</span>
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 text-xs text-slate-600 pt-1">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Số điện thoại:</span>
                      <strong className="text-slate-800 font-mono">{rel.phone}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Địa chỉ:</span>
                      <span className="text-slate-700 text-[11px] truncate block">{rel.address || 'Giống địa chỉ cá nhân'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-2xl w-full bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-2xl">
            <button onClick={() => setSelectedImage(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full cursor-pointer transition-colors">
              ✕
            </button>
            <p className="text-xs font-bold text-slate-200 mb-3">{selectedImage.title || 'Xem chi tiết hình ảnh'}</p>
            <div className="max-h-[75vh] overflow-auto rounded-2xl bg-black/40 flex items-center justify-center p-2">
              <img src={selectedImage.src} alt={selectedImage.title} className="w-full h-auto max-h-[70vh] object-contain mx-auto rounded-xl" />
            </div>
          </div>
        </div>
      )}

      <VneidGuideModal isOpen={isVneidGuideOpen} onClose={() => setIsVneidGuideOpen(false)} />
    </div>
  );
};
