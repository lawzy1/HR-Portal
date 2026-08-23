import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  UserPlus, 
  ChevronRight, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  FileText, 
  ShieldCheck, 
  Building2, 
  Calendar, 
  Edit, 
  Trash2, 
  User, 
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Upload,
  HelpCircle,
  Smartphone,
  Eye
} from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { Employee } from '../../types';
import { VneidGuideModal } from '../VneidGuideModal';
import { VNEID_SAMPLE_IMAGE } from '../../constants/vneidSample';

export const AdminEmployeeListView: React.FC = () => {
  const { 
    employees, 
    selectedEmployeeIdForAdmin, 
    setSelectedEmployeeIdForAdmin,
    setIsNewEmployeeModalOpen,
    setIsEditProfileModalOpen,
    updateEmployeeProfile,
    deleteEmployee
  } = useHR();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [isDetailMode, setIsDetailMode] = useState(true); // default: split or detailed view after picking
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isVneidGuideOpen, setIsVneidGuideOpen] = useState(false);

  // Department list
  const departments = Array.from(new Set(employees.map(e => e.department)));

  // Filtered employees
  const filteredEmployees = employees.filter(emp => {
    const matchSearch = emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        emp.phone.includes(searchTerm);
    const matchDept = selectedDepartment === 'ALL' || emp.department === selectedDepartment;
    const matchStatus = selectedStatus === 'ALL' || emp.status === selectedStatus;
    return matchSearch && matchDept && matchStatus;
  });

  const selectedEmp = employees.find(e => e.id === selectedEmployeeIdForAdmin) || filteredEmployees[0] || employees[0];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Quản lý Hồ sơ Nhân viên toàn Công ty
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Tra cứu, cập nhật thông tin cá nhân, CCCD, MST, BHXH, tài khoản ngân hàng và hợp đồng.
          </p>
        </div>

        <button
          onClick={() => setIsNewEmployeeModalOpen(true)}
          className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-sm flex items-center space-x-2 shadow-md shadow-primary-500/20 transition-all cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Thêm nhân viên mới</span>
        </button>
      </div>

      {/* Split Layout: Employee Selection List (Left 1/3) & Selected Profile Detail (Right 2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: List & Filters */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col space-y-4">
          
          {/* Search & Filters Header */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input 
                type="text"
                placeholder="Tìm tên, mã NV, email, SĐT..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={selectedDepartment}
                onChange={e => setSelectedDepartment(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-primary-500"
              >
                <option value="ALL">Tất cả Phòng ban</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-primary-500"
              >
                <option value="ALL">Tất cả Trạng thái</option>
                <option value="Chính thức">Chính thức</option>
                <option value="Thử việc">Thử việc</option>
                <option value="Mới tiếp nhận">Mới tiếp nhận</option>
                <option value="Đã nghỉ việc">Đã nghỉ việc</option>
              </select>
            </div>
          </div>

          {/* List count */}
          <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-medium">
            <span>Danh sách ({filteredEmployees.length} nhân sự)</span>
            <span className="text-[11px] text-slate-400">Chọn người để xem hồ sơ</span>
          </div>

          {/* Employee Cards List */}
          <div className="space-y-2 overflow-y-auto max-h-[620px] pr-1">
            {filteredEmployees.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Không tìm thấy nhân viên thỏa điều kiện.
              </div>
            ) : (
              filteredEmployees.map(emp => {
                const isSelected = selectedEmp && selectedEmp.id === emp.id;
                return (
                  <div
                    key={emp.id}
                    onClick={() => {
                      setSelectedEmployeeIdForAdmin(emp.id);
                      setIsDetailMode(true);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary-50/80 border-primary-500 shadow-sm'
                        : 'bg-white hover:bg-slate-50 border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <img 
                          src={emp.avatar} 
                          alt={emp.fullName}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" 
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-bold text-slate-900 text-xs">{emp.fullName}</h3>
                            <span className="text-[10px] font-mono font-semibold text-slate-400">{emp.employeeCode}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium">{emp.jobTitle}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEmployeeToDelete(emp);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Xóa nhân viên"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-primary-600' : 'text-slate-300'}`} />
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="truncate max-w-[140px]">{emp.department}</span>
                      <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                        emp.status === 'Chính thức'
                          ? 'bg-success-100 text-success-800'
                          : emp.status === 'Thử việc'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-primary-100 text-primary-800'
                      }`}>
                        {emp.status || 'Chính thức'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Profile View */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          {!selectedEmp ? (
            <div className="p-12 text-center text-slate-400">
              Vui lòng chọn nhân viên ở danh sách bên trái để mở hồ sơ.
            </div>
          ) : (
            <>
              {/* Profile Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
                <div className="flex items-center space-x-4">
                  <img 
                    src={selectedEmp.avatar} 
                    alt={selectedEmp.fullName} 
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-primary-500/20 shadow-md"
                  />
                  <div>
                    <div className="flex items-center space-x-3">
                      <h2 className="text-xl font-bold text-slate-900">{selectedEmp.fullName}</h2>
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 font-mono text-xs font-bold rounded-md">
                        {selectedEmp.employeeCode}
                      </span>
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                        selectedEmp.status === 'Chính thức' ? 'bg-success-100 text-success-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {selectedEmp.status || 'Chính thức'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 font-medium mt-0.5">{selectedEmp.jobTitle} • {selectedEmp.department}</p>
                    <p className="text-xs text-slate-400 mt-1">Ngày bắt đầu làm việc: {selectedEmp.startDate}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsEditProfileModalOpen(true)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Chỉnh sửa hồ sơ</span>
                  </button>

                  <button
                    onClick={() => setEmployeeToDelete(selectedEmp)}
                    className="px-3.5 py-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer border border-rose-200"
                    title="Xóa nhân viên"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Xóa NV</span>
                  </button>
                </div>
              </div>

              {/* Grid Section 1: Thông tin Cá nhân & Liên hệ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Personal & Contact */}
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
                    <User className="w-4 h-4 text-primary-600" />
                    <span>1. Thông tin Cá nhân & Liên hệ</span>
                  </h3>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Ngày sinh:</span>
                      <span className="font-semibold text-slate-800">{selectedEmp.dob}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Giới tính:</span>
                      <span className="font-semibold text-slate-800">{selectedEmp.gender}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tình trạng hôn nhân:</span>
                      <span className="font-semibold text-slate-800">{selectedEmp.maritalStatus}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Số điện thoại:</span>
                      <span className="font-semibold text-primary-600">{selectedEmp.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Email công việc:</span>
                      <span className="font-semibold text-primary-600">{selectedEmp.email}</span>
                    </div>
                  </div>
                </div>

                {/* Addresses */}
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-primary-600" />
                    <span>2. Địa chỉ Thường trú & Tạm trú</span>
                  </h3>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-500 block mb-0.5">Địa chỉ thường trú (Hộ khẩu):</span>
                      <p className="font-medium text-slate-800 bg-white p-2 rounded border border-slate-200">
                        {selectedEmp.permanentAddress}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Địa chỉ tạm trú hiện tại:</span>
                      <p className="font-medium text-slate-800 bg-white p-2 rounded border border-slate-200">
                        {selectedEmp.temporaryAddress}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid Section 2: CCCD, MST, BHXH & Ngân hàng */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* ID Card, Tax, Insurance */}
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-primary-600" />
                    <span>3. CCCD, MST & BHXH</span>
                  </h3>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Số CCCD / Hộ chiếu:</span>
                      <span className="font-bold text-slate-900 font-mono">{selectedEmp.documents.idCardNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Ngày cấp:</span>
                      <span className="font-medium text-slate-800">{selectedEmp.documents.idCardIssueDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Nơi cấp:</span>
                      <span className="font-medium text-slate-800 truncate max-w-[180px]">{selectedEmp.documents.idCardIssuePlace}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200">
                      <span className="text-slate-500">Mã số thuế cá nhân:</span>
                      <span className="font-bold text-primary-600 font-mono">{selectedEmp.documents.taxCode || 'Chưa cập nhật'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Mã số BHXH:</span>
                      <span className="font-bold text-success-600 font-mono">{selectedEmp.documents.socialInsuranceCode || 'Chưa cập nhật'}</span>
                    </div>
                  </div>
                </div>

                {/* Bank Account */}
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-primary-600" />
                    <span>4. Tài khoản Ngân hàng Nhận lương</span>
                  </h3>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tên ngân hàng:</span>
                      <span className="font-semibold text-slate-800 text-right max-w-[200px]">{selectedEmp.bankInfo.bankName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Số tài khoản:</span>
                      <span className="font-extrabold text-primary-600 font-mono text-sm">{selectedEmp.bankInfo.accountNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Chủ tài khoản:</span>
                      <span className="font-bold text-slate-900 uppercase">{selectedEmp.bankInfo.accountHolder}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Chi nhánh:</span>
                      <span className="font-medium text-slate-700">{selectedEmp.bankInfo.bankBranch || selectedEmp.bankInfo.branch || 'Chính'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Người thân & Khẩn cấp */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-primary-600" />
                  <span>5. Người thân & Người liên hệ khẩn cấp</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedEmp.relatives.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Chưa đăng ký thông tin người thân.</p>
                  ) : (
                    selectedEmp.relatives.map(rel => (
                      <div key={rel.id} className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{rel.name} ({rel.relationship})</span>
                          {rel.isEmergencyContact && (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-700 font-bold text-[10px] rounded">
                              Khẩn cấp
                            </span>
                          )}
                        </div>
                        <p className="text-slate-600">SĐT: <b className="text-slate-800">{rel.phone}</b></p>
                        <p className="text-slate-500 text-[11px] truncate">{rel.address}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Section 4: Ảnh CCCD 2 Mặt & Tài liệu Cá nhân */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
                    <Upload className="w-4 h-4 text-primary-600" />
                    <span>6. Ảnh CCCD 2 mặt & Tài liệu đính kèm</span>
                  </h3>
                  <button
                    onClick={() => setIsEditProfileModalOpen(true)}
                    className="text-xs font-bold text-primary-600 hover:underline cursor-pointer"
                  >
                    Chỉnh sửa chi tiết
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Front Image */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">Mặt trước CCCD:</span>
                      <label className="text-[11px] font-bold text-primary-600 hover:text-primary-800 cursor-pointer flex items-center gap-1">
                        <Upload className="w-3 h-3" />
                        <span>{selectedEmp.documents.idCardFrontImage ? 'Thay ảnh' : 'Upload ảnh'}</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                updateEmployeeProfile(selectedEmp.id, {
                                  documents: {
                                    ...selectedEmp.documents,
                                    idCardFrontImage: reader.result as string
                                  }
                                });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>

                    {selectedEmp.documents.idCardFrontImage ? (
                      <div className="relative rounded-lg overflow-hidden border border-slate-200 group">
                        <img 
                          src={selectedEmp.documents.idCardFrontImage} 
                          alt="CCCD Mặt Trước" 
                          className="w-full h-36 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <a 
                            href={selectedEmp.documents.idCardFrontImage} 
                            target="_blank" 
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-white text-slate-900 rounded-lg text-xs font-bold flex items-center space-x-1"
                          >
                            <span>Xem ảnh gốc</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ) : (
                      <label className="h-36 rounded-lg border-2 border-dashed border-rose-300 bg-rose-50/50 flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:bg-rose-100/50 transition-colors">
                        <AlertCircle className="w-6 h-6 text-rose-500 mb-1" />
                        <span className="text-xs font-semibold text-rose-700">Bấm vào đây để tải lên mặt trước</span>
                        <span className="text-[10px] text-rose-500">Chấp nhận JPG, PNG, WEBP</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                updateEmployeeProfile(selectedEmp.id, {
                                  documents: {
                                    ...selectedEmp.documents,
                                    idCardFrontImage: reader.result as string
                                  }
                                });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>

                  {/* Back Image */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">Mặt sau CCCD:</span>
                      <label className="text-[11px] font-bold text-primary-600 hover:text-primary-800 cursor-pointer flex items-center gap-1">
                        <Upload className="w-3 h-3" />
                        <span>{selectedEmp.documents.idCardBackImage ? 'Thay ảnh' : 'Upload ảnh'}</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                updateEmployeeProfile(selectedEmp.id, {
                                  documents: {
                                    ...selectedEmp.documents,
                                    idCardBackImage: reader.result as string
                                  }
                                });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>

                    {selectedEmp.documents.idCardBackImage ? (
                      <div className="relative rounded-lg overflow-hidden border border-slate-200 group">
                        <img 
                          src={selectedEmp.documents.idCardBackImage} 
                          alt="CCCD Mặt Sau" 
                          className="w-full h-36 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <a 
                            href={selectedEmp.documents.idCardBackImage} 
                            target="_blank" 
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-white text-slate-900 rounded-lg text-xs font-bold flex items-center space-x-1"
                          >
                            <span>Xem ảnh gốc</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ) : (
                      <label className="h-36 rounded-lg border-2 border-dashed border-rose-300 bg-rose-50/50 flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:bg-rose-100/50 transition-colors">
                        <AlertCircle className="w-6 h-6 text-rose-500 mb-1" />
                        <span className="text-xs font-semibold text-rose-700">Bấm vào đây để tải lên mặt sau</span>
                        <span className="text-[10px] text-rose-500">Chấp nhận JPG, PNG, WEBP</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                updateEmployeeProfile(selectedEmp.id, {
                                  documents: {
                                    ...selectedEmp.documents,
                                    idCardBackImage: reader.result as string
                                  }
                                });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* VNeID Residency Info Sub-section */}
                <div className="mt-3 p-3.5 bg-gradient-to-r from-red-50/80 via-rose-50/50 to-orange-50/40 rounded-xl border border-red-200/90 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-red-600 text-white flex items-center justify-center shadow-xs">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-red-950 block">Ảnh chụp "Thông tin cư trú" (VNeID):</span>
                        <span className="text-[10px] text-red-700">Xác thực hộ khẩu, nơi thường trú/tạm trú</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsVneidGuideOpen(true)}
                      className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-700 border border-red-300 rounded-lg text-[11px] font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-red-600" />
                      <span>Xem ảnh mẫu hướng dẫn</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    {/* Employee VNeID Image */}
                    <div>
                      {selectedEmp.documents.vneidResidencyImage ? (
                        <div className="relative rounded-lg overflow-hidden border border-red-200 group h-32">
                          <img 
                            src={selectedEmp.documents.vneidResidencyImage} 
                            alt="VNeID Thông tin cư trú" 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <a 
                              href={selectedEmp.documents.vneidResidencyImage} 
                              target="_blank" 
                              rel="noreferrer"
                              className="px-3 py-1 bg-white text-slate-900 rounded-lg text-xs font-bold flex items-center space-x-1"
                            >
                              <span>Xem ảnh gốc</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <label className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1">
                              <Upload className="w-3 h-3" />
                              <span>Thay ảnh</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      updateEmployeeProfile(selectedEmp.id, {
                                        documents: {
                                          ...selectedEmp.documents,
                                          vneidResidencyImage: reader.result as string
                                        }
                                      });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                          </div>
                          <span className="absolute bottom-1 left-1 bg-success-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                            ✓ Đã có ảnh VNeID
                          </span>
                        </div>
                      ) : (
                        <label className="h-32 rounded-lg border-2 border-dashed border-red-300 bg-white flex flex-col items-center justify-center p-3 text-center cursor-pointer hover:bg-red-50/50 transition-colors">
                          <Smartphone className="w-5 h-5 text-red-500 mb-1" />
                          <span className="text-xs font-semibold text-red-800">Tải lên ảnh chụp VNeID</span>
                          <span className="text-[10px] text-slate-400">Ảnh màn hình Thông tin cư trú</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  updateEmployeeProfile(selectedEmp.id, {
                                    documents: {
                                      ...selectedEmp.documents,
                                      vneidResidencyImage: reader.result as string
                                    }
                                  });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>

                    {/* Sample Guide thumbnail button */}
                    <div 
                      onClick={() => setIsVneidGuideOpen(true)}
                      className="bg-slate-900 rounded-lg p-2 flex items-center gap-3 border border-slate-700 cursor-pointer group h-32"
                    >
                      <div className="w-16 h-full rounded overflow-hidden bg-slate-800 shrink-0">
                        <img 
                          src={VNEID_SAMPLE_IMAGE} 
                          alt="Ảnh mẫu VNeID" 
                          className="w-full h-full object-cover object-top opacity-90 group-hover:scale-105 transition-transform" 
                        />
                      </div>
                      <div className="text-white space-y-1">
                        <span className="bg-yellow-400 text-red-950 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase">
                          ẢNH MẪU CHUẨN
                        </span>
                        <p className="text-[11px] font-bold text-slate-200 leading-tight">
                          Mẫu chụp VNeID Cư trú
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Bấm để xem 5 bước hướng dẫn
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Custom Delete Employee Confirmation Modal */}
      {employeeToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-rose-50">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-slate-900">Xác nhận xóa nhân viên</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Bạn có chắc chắn muốn xóa hồ sơ nhân viên <strong className="text-slate-900">{employeeToDelete.fullName}</strong> (<span className="font-mono text-primary-700 font-bold">{employeeToDelete.employeeCode}</span>) khỏi hệ thống?
              </p>
              <p className="text-[11px] text-rose-500 font-semibold bg-rose-50 p-2 rounded-lg border border-rose-100">
                ⚠️ Hành động này sẽ loại bỏ hoàn toàn thông tin nhân viên khỏi danh sách quản lý.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEmployeeToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteEmployee(employeeToDelete.id);
                  setEmployeeToDelete(null);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-600/20 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xác nhận Xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VNeID Sample Guide Modal */}
      <VneidGuideModal
        isOpen={isVneidGuideOpen}
        onClose={() => setIsVneidGuideOpen(false)}
      />
    </div>
  );
};
