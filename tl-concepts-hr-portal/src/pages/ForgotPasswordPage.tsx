import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ForgotPasswordPage: React.FC = () => {
  const { session, requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (session) return <Navigate to="/" replace />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError('Vui lòng nhập email hợp lệ.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await requestPasswordReset(normalizedEmail);
      if (result.error) {
        setError('Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau.');
        return;
      }
      // Keep the response deliberately generic so the UI does not reveal
      // whether an email belongs to an account in the system.
      setIsSent(true);
    } catch {
      setError('Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AuthFrame title="Quên mật khẩu">
      {isSent ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
              <p>Nếu email tồn tại trong hệ thống, một liên kết đặt lại mật khẩu đã được gửi. Hãy kiểm tra cả thư mục Spam/Junk.</p>
            </div>
          </div>
          <Link to="/login" className="flex items-center justify-center gap-2 rounded-xl bg-[#173f37] px-4 py-3 text-sm font-bold text-white hover:bg-[#0f302a]">
            <ArrowLeft className="h-4 w-4" />
            Về trang đăng nhập
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm leading-6 text-slate-600">Nhập email đăng nhập của bạn. Hệ thống sẽ gửi liên kết để thiết lập mật khẩu mới.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-xs font-bold text-slate-700">
              <span className="mb-1.5 block">Email đăng nhập</span>
              <span className="relative block">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="ban@example.com"
                  required
                  className="w-full rounded-xl border border-slate-300 px-3 py-3 pl-10 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                />
              </span>
            </label>
            {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">{error}</p>}
            <button type="submit" disabled={isSaving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#173f37] px-4 py-3 text-sm font-bold text-white hover:bg-[#0f302a] disabled:cursor-not-allowed disabled:opacity-60">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSaving ? 'Đang gửi...' : 'Gửi liên kết đặt lại'}
            </button>
          </form>
          <Link to="/login" className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-3.5 w-3.5" />
            Quay lại đăng nhập
          </Link>
        </>
      )}
    </AuthFrame>
  );
};

const AuthFrame: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
    <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
      <ShieldCheck className="h-9 w-9 text-emerald-700" />
      <h1 className="mt-4 text-2xl font-black text-slate-900">{title}</h1>
      <div className="mt-3 text-slate-600">{children}</div>
      <p className="mt-6 text-[11px] text-slate-500">TL Concepts HR Portal</p>
    </section>
  </main>
);
