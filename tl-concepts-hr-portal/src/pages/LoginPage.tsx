import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const loginSchema = z.object({
  email: z.string().min(1, 'Vui lòng nhập email').email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const showcaseImages = [
  'https://tlconceptsltd.com/assets/images/our-works/1.jpg',
  'https://tlconceptsltd.com/assets/images/our-works/8.jpg',
  'https://tlconceptsltd.com/assets/images/our-works/15.jpg',
];

export const LoginPage: React.FC = () => {
  const { session, signIn } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const loginForm = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  if (session) return <Navigate to="/" replace />;

  const onLogin = async (values: LoginFormValues) => {
    setAuthError(null);
    const { error } = await signIn(values.email, values.password);
    if (error) return setAuthError('Email hoặc mật khẩu không đúng.');
    navigate('/', { replace: true });
  };

  const inputClass = 'w-full rounded-xl border border-stone-300 bg-white/80 px-3.5 py-3 text-sm text-stone-900 outline-none transition focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/15';

  return (
    <main className="min-h-screen bg-[#e9eee8] p-3 sm:p-6 lg:p-10 flex items-center justify-center">
      <div className="w-full max-w-7xl overflow-hidden rounded-[2rem] bg-[#fbf7ef] shadow-[0_30px_90px_rgba(20,47,40,0.18)] grid lg:grid-cols-[0.82fr_1.18fr] min-h-[760px]">
        <section className="flex flex-col justify-between p-7 sm:p-10 lg:p-14">
          <div>
            <a href="https://tlconceptsltd.com/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-3">
              <img src="https://tlconceptsltd.com/assets/images/logo.svg" alt="TL Concepts" className="h-10 w-auto" />
              <span className="border-l border-stone-300 pl-3 text-[11px] font-bold uppercase tracking-[0.24em] text-stone-500">HR Portal</span>
            </a>

            <div className="mt-12 max-w-md">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-800">Visualizing your dream</p>
              <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-stone-900">
                Chào mừng bạn trở lại.
              </h1>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                Đăng nhập để quản lý hồ sơ, hợp đồng, ngày phép và phiếu lương của bạn.
              </p>
            </div>

            <p className="mt-8 rounded-xl border border-emerald-900/10 bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-950">
              Tài khoản nhân viên được Admin tạo và gửi email kích hoạt. Hãy dùng email và mật khẩu bạn đã thiết lập từ lời mời.
            </p>

            <form onSubmit={loginForm.handleSubmit(onLogin)} className="mt-6 space-y-4">
                <Field label="Email" error={loginForm.formState.errors.email?.message}>
                  <input type="email" autoComplete="email" placeholder="ban@example.com" {...loginForm.register('email')} className={inputClass} />
                </Field>
                <Field label="Mật khẩu" error={loginForm.formState.errors.password?.message}>
                  <span className="relative block">
                    <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" {...loginForm.register('password')} className={`${inputClass} pr-11`} />
                    <PasswordToggle show={showPassword} toggle={() => setShowPassword((value) => !value)} />
                  </span>
                </Field>
                <SubmitButton loading={loginForm.formState.isSubmitting}>Đăng nhập</SubmitButton>
            </form>

            {authError && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">{authError}</p>}
          </div>

          <p className="mt-10 flex items-center gap-2 text-[11px] text-stone-500">
            <ShieldCheck className="h-4 w-4 text-emerald-800" />
            Hồ sơ cá nhân được bảo vệ bằng Supabase Auth, Storage và Row Level Security.
          </p>
        </section>

        <section className="relative hidden lg:grid grid-cols-2 grid-rows-2 gap-1.5 bg-stone-900 p-1.5">
          <img src={showcaseImages[0]} alt="Tác phẩm kiến trúc TL Concepts" className="row-span-2 h-full w-full object-cover" />
          <img src={showcaseImages[1]} alt="Không gian nội thất TL Concepts" className="h-full w-full object-cover" />
          <img src={showcaseImages[2]} alt="Thiết kế 3D TL Concepts" className="h-full w-full object-cover" />
          <div className="absolute inset-x-8 bottom-8 rounded-2xl border border-white/20 bg-stone-950/55 p-5 text-white backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-200">TL Concepts Studio</p>
            <p className="mt-2 text-2xl font-black">Ideas made visible.</p>
            <a href="https://tlconceptsltd.com/our-works" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-white hover:text-emerald-200">
              Khám phá các dự án <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>
      </div>
    </main>
  );
};

const Field: React.FC<{ label: string; error?: string; children: React.ReactNode }> = ({ label, error, children }) => (
  <label className="block text-xs font-semibold text-stone-700">
    <span className="mb-1.5 block">{label}</span>
    {children}
    {error && <span className="mt-1 block text-[11px] text-red-600">{error}</span>}
  </label>
);

const PasswordToggle: React.FC<{ show: boolean; toggle: () => void }> = ({ show, toggle }) => (
  <button type="button" onClick={toggle} aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer">
    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
  </button>
);

const SubmitButton: React.FC<{ loading: boolean; children: React.ReactNode }> = ({ loading, children }) => (
  <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#173f37] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/15 transition hover:bg-[#0f302a] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer">
    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
    {children}
  </button>
);
