import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navigate, useNavigate } from 'react-router-dom';
import { Building2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const loginSchema = z.object({
  email: z.string().min(1, 'Vui lòng nhập email').email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { session, signIn } = useAuth();
  const navigate = useNavigate();
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  if (session) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (values: LoginFormValues) => {
    setAuthError(null);
    const { error } = await signIn(values.email, values.password);
    if (error) {
      setAuthError('Email hoặc mật khẩu không đúng.');
      return;
    }
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl space-y-6 border border-slate-100">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">TL CONCEPTS HR Portal</h1>
            <p className="text-xs text-slate-500 mt-1">Đăng nhập bằng tài khoản được Admin cấp</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              autoComplete="email"
              {...register('email')}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mật khẩu</label>
            <input
              type="password"
              autoComplete="current-password"
              {...register('password')}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
          </div>

          {authError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{authError}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Đăng nhập</span>
          </button>
        </form>
      </div>
    </div>
  );
};
