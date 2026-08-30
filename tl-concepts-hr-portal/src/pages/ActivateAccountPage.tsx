import React, { useEffect, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { getUserFacingError } from '../lib/userFacingError';

export const ActivateAccountPage: React.FC = () => {
  const { session, loading, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingInvitation, setIsCheckingInvitation] = useState(true);

  useEffect(() => {
    if (!session || !profile?.employeeId || profile.onboardingStatus !== 'invited') {
      setIsCheckingInvitation(false);
      return;
    }
    let isMounted = true;
    supabase.rpc('mark_own_invitation_opened').then(async ({ error: invitationError }) => {
      if (!isMounted) return;
      setError(invitationError ? await getUserFacingError(invitationError, 'Không thể kiểm tra lời mời. Vui lòng thử lại.') : null);
      setIsCheckingInvitation(false);
    });
    return () => { isMounted = false; };
  }, [profile?.onboardingStatus, session]);

  if (loading) return <Loading />;
  if (!session) {
    return <ActivateFrame title="Link kích hoạt chưa hợp lệ">
      <p>Link có thể đã hết hạn hoặc đã được sử dụng. Hãy liên hệ Admin để gửi lại lời mời.</p>
      <button type="button" onClick={() => navigate('/login', { replace: true })} className="mt-5 rounded-xl bg-[#173f37] px-4 py-2.5 text-sm font-bold text-white">Về trang đăng nhập</button>
    </ActivateFrame>;
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < 8) return setError('Mật khẩu cần ít nhất 8 ký tự.');
    if (password !== confirmPassword) return setError('Mật khẩu xác nhận chưa khớp.');

    if (isCheckingInvitation || error) return;
    setIsSaving(true);
    try {
      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) throw passwordError;
      if (profile?.employeeId) {
        const { error: onboardingError } = await supabase.rpc('start_own_onboarding');
        if (onboardingError) throw onboardingError;
      } else {
        const { error: activationError } = await supabase.rpc('activate_own_backoffice_account');
        if (activationError) throw activationError;
      }
      await refreshProfile();
      navigate('/', { replace: true });
    } catch (caught) {
      setError(await getUserFacingError(caught, 'Không thể kích hoạt tài khoản. Vui lòng thử lại.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ActivateFrame title="Thiết lập mật khẩu lần đầu">
      <p className="text-sm leading-6 text-slate-600">
        Bạn đã xác nhận lời mời. Hãy đặt mật khẩu để {profile?.employeeId ? 'tiếp tục hoàn thiện hồ sơ nhân viên.' : 'kích hoạt tài khoản quản trị.'}
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <PasswordField label="Mật khẩu mới" value={password} show={showPassword} onToggle={() => setShowPassword((value) => !value)} onChange={setPassword} />
        <PasswordField label="Xác nhận mật khẩu" value={confirmPassword} show={showPassword} onToggle={() => setShowPassword((value) => !value)} onChange={setConfirmPassword} />
        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">{error}</p>}
        <button type="submit" disabled={isSaving || isCheckingInvitation || !!error} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#173f37] px-4 py-3 text-sm font-bold text-white hover:bg-[#0f302a] disabled:opacity-60">
          {(isSaving || isCheckingInvitation) && <Loader2 className="h-4 w-4 animate-spin" />} {isCheckingInvitation ? 'Đang kiểm tra lời mời...' : profile?.employeeId ? 'Kích hoạt và điền hồ sơ' : 'Kích hoạt tài khoản'}
        </button>
      </form>
    </ActivateFrame>
  );
};

const PasswordField: React.FC<{ label: string; value: string; show: boolean; onChange: (value: string) => void; onToggle: () => void }> = ({ label, value, show, onChange, onToggle }) => (
  <label className="block text-xs font-bold text-slate-700"><span className="mb-1.5 block">{label}</span><span className="relative block"><input value={value} onChange={(event) => onChange(event.target.value)} type={show ? 'text' : 'password'} autoComplete="new-password" className="w-full rounded-xl border border-slate-300 px-3 py-3 pr-11 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15" /><button type="button" onClick={onToggle} aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>
);

const ActivateFrame: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4"><section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8"><ShieldCheck className="h-9 w-9 text-emerald-700" /><h1 className="mt-4 text-2xl font-black text-slate-900">{title}</h1><div className="mt-3 text-slate-600">{children}</div><p className="mt-6 flex items-center gap-2 text-[11px] text-slate-500"><CheckCircle2 className="h-4 w-4 text-emerald-700" />TL Concepts HR Portal</p></section></main>
);

const Loading = () => <main className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">Đang xác thực lời mời...</main>;
