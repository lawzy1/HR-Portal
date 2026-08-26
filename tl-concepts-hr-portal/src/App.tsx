import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HRProvider, useHR } from './context/HRContext';
import { MoneyVisibilityProvider } from './context/MoneyVisibilityContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { ActivateAccountPage } from './pages/ActivateAccountPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { AdminSidebar } from './components/admin/AdminSidebar';
import { Toast } from './components/Toast';

// User Views
import { DashboardView } from './components/DashboardView';
import { ProfileView } from './components/ProfileView';
import { ContractSalaryView } from './components/ContractSalaryView';
import { PayslipsView } from './components/PayslipsView';
import { LeaveManagementView } from './components/LeaveManagementView';
import { KpiRewardsView } from './components/KpiRewardsView';

// Admin Views
import { AdminDashboardView } from './components/admin/AdminDashboardView';
import { AdminProfileView } from './components/admin/AdminProfileView';
import { AdminEmployeeListView } from './components/admin/AdminEmployeeListView';
import { AdminContractSalaryView } from './components/admin/AdminContractSalaryView';
import { AdminLeaveManagementView } from './components/admin/AdminLeaveManagementView';
import { AdminKpiOtView } from './components/admin/AdminKpiOtView';
import { AdminPayrollView } from './components/admin/AdminPayrollView';
import { AdminRemindersView } from './components/admin/AdminRemindersView';
import { AdminReportsAuditView } from './components/admin/AdminReportsAuditView';
import { AdminSettingsView } from './components/admin/AdminSettingsView';

// Modals
import { NewLeaveModal } from './components/NewLeaveModal';
import { EditProfileModal } from './components/EditProfileModal';
import { ImportKpiModal } from './components/ImportKpiModal';
import { PayslipDetailModal } from './components/PayslipDetailModal';
import { NewEmployeeModal } from './components/NewEmployeeModal';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Always read the current server value when a view is mounted again or
      // the user returns to the portal. Cached data can still render while
      // the request is in flight, but it is never treated as authoritative.
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: 'always',
      refetchOnReconnect: 'always',
    },
  },
});

function MainContent() {
  const { profile } = useAuth();
  const { activeTab, adminTab } = useHR();
  const isAdmin = profile?.role === 'admin';
  const isBackoffice = isAdmin || profile?.role === 'hr';

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 grid grid-cols-1 md:grid-cols-[16rem_1fr] md:grid-rows-[auto_1fr] font-sans antialiased selection:bg-primary-500 selection:text-white">
      <Header />

      {/* Render Sidebar based on the authenticated user's role (Supabase profile, not client-toggleable). Spans the full height alongside the header on desktop. */}
      {isBackoffice ? <AdminSidebar /> : <Sidebar />}

      {/* Main Workspace Area */}
      <main className="md:col-start-2 md:row-start-2 p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
        {isBackoffice ? (
          <>
            {adminTab === 'admin-dashboard' && <AdminDashboardView />}
            {adminTab === 'admin-profile' && <AdminProfileView />}
            {adminTab === 'admin-employees' && <AdminEmployeeListView />}
            {adminTab === 'admin-contracts' && <AdminContractSalaryView />}
            {adminTab === 'admin-leaves' && <AdminLeaveManagementView />}
            {adminTab === 'admin-kpi' && <AdminKpiOtView />}
            {adminTab === 'admin-payroll' && <AdminPayrollView />}
            {adminTab === 'admin-reminders' && <AdminRemindersView />}
            {isAdmin && adminTab === 'admin-reports' && <AdminReportsAuditView />}
            {isAdmin && adminTab === 'admin-settings' && <AdminSettingsView />}
          </>
        ) : (
          <>
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'profile' && <ProfileView />}
            {activeTab === 'contracts' && <ContractSalaryView />}
            {activeTab === 'payslips' && <PayslipsView />}
            {activeTab === 'leaves' && <LeaveManagementView />}
            {activeTab === 'kpi' && <KpiRewardsView />}
          </>
        )}
      </main>

      {/* Global App Modals */}
      <NewLeaveModal />
      <EditProfileModal />
      <ImportKpiModal />
      <PayslipDetailModal />
      <NewEmployeeModal />

      {/* Toast Feedback */}
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth/activate" element={<ActivateAccountPage />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <MoneyVisibilityProvider>
                    <HRProvider>
                      <MainContent />
                    </HRProvider>
                  </MoneyVisibilityProvider>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
