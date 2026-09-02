import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { getUserFacingError } from '../lib/userFacingError';

export const ResetPasswordPage: React.FC = () => {
  const { session, loading, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Mật khẩu mới cần ít nhất 8 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận chưa khớp.');
      return;
    }
    if (!session) {
      setError('Liên kết đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu liên kết mới.');
      return;
    }

    setIsSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(await getUserFacingError(updateError, 'Không thể cập nhật mật khẩu. Liên kết có thể đã hết hạn, hãy yêu cầu liên kết mới.'));
        return;
      }
      // Do not leave the recovery session active after the password has been
      // changed. The user must sign in again with the new password.
      await signOut();
      setIsComplete(true);
    } catch (error) {
      setError(await getUserFacingError(error, 'Không thể cập nhật mật khẩu. Vui lòng thử lại.'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isComplete) {
    return (
      <AuthFrame title="Đã đổi mật khẩu">
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
              <p>Mật khẩu đã được cập nhật. Hãy đăng nhập lại bằng mật khẩu mới.</p>
            </div>
          </div>
          <Link to="/login" className="flex items-center justify-center gap-2 rounded-xl bg-[#173f37] px-4 py-3 text-sm font-bold text-white hover:bg-[#0f302a]">
            <ArrowLeft className="h-4 w-4" />
            Về trang đăng nhập
          </Link>
        </div>
      </AuthFrame>
    );
  }

  if (loading) return <Loading />;
  if (!session) {
    return (
      <AuthFrame title="Liên kết không hợp lệ">
        <p className="text-sm leading-6 text-slate-600">Liên kết đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng. Vui lòng yêu cầu một liên kết mới.</p>
        <Link to="/auth/forgot-password" className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-[#173f37] px-4 py-3 text-sm font-bold text-white hover:bg-[#0f302a]">
          Yêu cầu liên kết mới
        </Link>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="Đặt lại mật khẩu">
      <p className="text-sm leading-6 text-slate-600">Tạo mật khẩu mới cho tài khoản của bạn.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <PasswordField label="Mật khẩu mới" value={password} show={showPasswords} onChange={setPassword} onToggle={() => setShowPasswords((value) => !value)} />
        <PasswordField label="Xác nhận mật khẩu mới" value={confirmPassword} show={showPasswords} onChange={setConfirmPassword} onToggle={() => setShowPasswords((value) => !value)} />
        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">{error}</p>}
        <button type="submit" disabled={isSaving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#173f37] px-4 py-3 text-sm font-bold text-white hover:bg-[#0f302a] disabled:cursor-not-allowed disabled:opacity-60">
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSaving ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
        </button>
      </form>
    </AuthFrame>
  );
};

const PasswordField: React.FC<{ label: string; value: string; show: boolean; onChange: (value: string) => void; onToggle: () => void }> = ({ label, value, show, onChange, onToggle }) => (
  <label className="block text-xs font-bold text-slate-700">
    <span className="mb-1.5 block">{label}</span>
    <span className="relative block">
      <input value={value} onChange={(event) => onChange(event.target.value)} type={show ? 'text' : 'password'} autoComplete="new-password" required className="w-full rounded-xl border border-slate-300 px-3 py-3 pr-11 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15" />
      <button type="button" onClick={onToggle} aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </span>
  </label>
);

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

const Loading = () => <main className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">Đang xác thực liên kết...</main>;
