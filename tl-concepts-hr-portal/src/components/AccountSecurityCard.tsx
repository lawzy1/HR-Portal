import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useHR } from '../context/HRContext';
import { getUserFacingError } from '../lib/userFacingError';
import { useI18n } from '../context/I18nContext';

/**
 * Self-service account security for every role. This component never accepts
 * a user id: AuthContext always updates the password belonging to the current
 * Supabase session after re-authentication.
 */
export const AccountSecurityCard: React.FC = () => {
  const { t } = useI18n();
  const { changePassword } = useAuth();
  const { showToast } = useHR();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError(t('security.errCurrentRequired'));
      return;
    }
    if (newPassword.length < 8) {
      setError(t('security.errMinLength'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('security.errMismatch'));
      return;
    }
    if (newPassword === currentPassword) {
      setError(t('security.errSamePassword'));
      return;
    }

    setIsSaving(true);
    try {
      const result = await changePassword(currentPassword, newPassword);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast(t('security.successToast'));
    } catch (caught) {
      setError(await getUserFacingError(caught, t('security.genericError')));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
      <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary-600" />
            <span>{t('security.title')}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">{t('security.subtitle')}</p>
        </div>
        <ShieldCheck className="w-5 h-5 text-success-600 shrink-0" />
      </div>

      <form onSubmit={submit} className="space-y-3 max-w-xl">
        <PasswordField
          label={t('security.currentPassword')}
          value={currentPassword}
          show={showPasswords}
          autoComplete="current-password"
          onChange={setCurrentPassword}
          onToggle={() => setShowPasswords((value) => !value)}
          toggleAriaLabel={showPasswords ? t('security.hidePassword') : t('security.showPassword')}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <PasswordField
            label={t('security.newPassword')}
            value={newPassword}
            show={showPasswords}
            autoComplete="new-password"
            onChange={setNewPassword}
            onToggle={() => setShowPasswords((value) => !value)}
            toggleAriaLabel={showPasswords ? t('security.hidePassword') : t('security.showPassword')}
          />
          <PasswordField
            label={t('security.confirmNewPassword')}
            value={confirmPassword}
            show={showPasswords}
            autoComplete="new-password"
            onChange={setConfirmPassword}
            onToggle={() => setShowPasswords((value) => !value)}
            toggleAriaLabel={showPasswords ? t('security.hidePassword') : t('security.showPassword')}
          />
        </div>

        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">{error}</p>}

        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-[11px] text-slate-400">{t('security.helpText')}</p>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSaving ? t('security.saving') : t('security.changePasswordBtn')}
          </button>
        </div>
      </form>
    </section>
  );
};

const PasswordField: React.FC<{
  label: string;
  value: string;
  show: boolean;
  autoComplete: 'current-password' | 'new-password';
  onChange: (value: string) => void;
  onToggle: () => void;
  toggleAriaLabel?: string;
}> = ({ label, value, show, autoComplete, onChange, onToggle, toggleAriaLabel }) => (
  <label className="block text-xs font-bold text-slate-700">
    <span className="mb-1.5 block">{label}</span>
    <span className="relative block">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        required
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 pr-11 text-sm outline-none transition focus:border-primary-600 focus:ring-2 focus:ring-primary-600/15"
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={toggleAriaLabel || (show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu')}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </span>
  </label>
);
