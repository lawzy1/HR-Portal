import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EmployeeOnboardingPage } from '../pages/EmployeeOnboardingPage';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
        Đang tải...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (profile && !profile.isActive && profile.employeeId) {
    return <EmployeeOnboardingPage />;
  }

  if (!profile || !profile.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-2">
          <p className="font-bold text-slate-900">Tài khoản chưa được cấp quyền truy cập</p>
          <p className="text-sm text-slate-500">
            Tài khoản của bạn đã đăng nhập nhưng chưa được Admin gán vào công ty/vai trò nào.
            Vui lòng liên hệ Admin để được cấp quyền sử dụng hệ thống.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
