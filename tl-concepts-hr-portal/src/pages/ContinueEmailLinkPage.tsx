import React, { useEffect, useMemo } from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

type EmailAction = 'recovery' | 'invite';

const allowedRedirectPaths: Record<EmailAction, string> = {
  recovery: '/auth/reset-password',
  invite: '/auth/activate',
};

export const ContinueEmailLinkPage: React.FC = () => {
  const location = useLocation();
  const confirmation = useMemo(() => getConfirmation(location.search), [location.search]);

  useEffect(() => {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
  }, []);

  const continueLabel = confirmation?.action === 'recovery' ? 'Tiếp tục đặt lại mật khẩu' : 'Tiếp tục kích hoạt tài khoản';
  const title = confirmation?.action === 'recovery' ? 'Xác nhận đặt lại mật khẩu' : 'Xác nhận lời mời';

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <ShieldCheck className="h-9 w-9 text-emerald-700" />
        <h1 className="mt-4 text-2xl font-black text-slate-900">{confirmation ? title : 'Liên kết không hợp lệ'}</h1>
        {confirmation ? (
          <>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Bấm nút bên dưới để tiếp tục trên TL Concepts HR Portal. Liên kết xác nhận chỉ được sử dụng một lần.
            </p>
            <button
              type="button"
              onClick={() => window.location.assign(confirmation.url)}
              className="mt-6 flex w-full items-center justify-center rounded-xl bg-[#173f37] px-4 py-3 text-sm font-bold text-white hover:bg-[#0f302a]"
            >
              {continueLabel}
            </button>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Liên kết email không hợp lệ hoặc đã thiếu thông tin. Hãy yêu cầu gửi lại email hoặc liên hệ Admin.
            </p>
            <Link to="/login" className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-[#173f37] px-4 py-3 text-sm font-bold text-white hover:bg-[#0f302a]">
              <ArrowLeft className="h-4 w-4" />
              Về trang đăng nhập
            </Link>
          </>
        )}
        <p className="mt-6 text-[11px] text-slate-500">TL Concepts HR Portal</p>
      </section>
    </main>
  );
};

function getConfirmation(search: string): { action: EmailAction; url: string } | null {
  const params = new URLSearchParams(search);
  const rawUrl = params.get('confirmation_url');
  const action = params.get('type');
  if (!rawUrl || (action !== 'recovery' && action !== 'invite')) return null;

  try {
    const confirmationUrl = new URL(rawUrl);
    const supabaseUrl = new URL(import.meta.env.VITE_SUPABASE_URL);
    const expectedAppUrl = new URL(import.meta.env.VITE_APP_URL || window.location.origin);

    if (
      confirmationUrl.protocol !== 'https:' ||
      confirmationUrl.origin !== supabaseUrl.origin ||
      confirmationUrl.pathname !== '/auth/v1/verify'
    ) return null;

    for (const key of ['token', 'token_hash', 'type', 'redirect_to']) {
      if (!confirmationUrl.searchParams.has(key) && params.has(key)) {
        confirmationUrl.searchParams.set(key, params.get(key)!);
      }
    }

    const redirectTo = confirmationUrl.searchParams.get('redirect_to');
    if (!confirmationUrl.searchParams.has('token') && !confirmationUrl.searchParams.has('token_hash')) return null;
    if (confirmationUrl.searchParams.get('type') !== action || !redirectTo) return null;

    const destination = new URL(redirectTo);
    if (destination.origin !== expectedAppUrl.origin || destination.pathname !== allowedRedirectPaths[action]) return null;

    return { action, url: confirmationUrl.toString() };
  } catch {
    return null;
  }
}
