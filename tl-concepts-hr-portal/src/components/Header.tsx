import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useHR } from '../context/HRContext';
import { supabase } from '../lib/supabaseClient';
import {
  PlusCircle,
  ShieldCheck,
  LogOut,
  Bell,
  Menu,
} from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { LanguageSwitcher } from './LanguageSwitcher';

interface HeaderProps {
  onMenuClick?: () => void;
}

// Short two-tone chime built at runtime — no audio asset to bundle/host.
function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    [880, 1320].forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      const startAt = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.2, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.25);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.3);
    });
    setTimeout(() => ctx.close(), 800);
  } catch {
    // Autoplay can be blocked before the first user gesture — silently skip.
  }
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { setIsNewLeaveModalOpen, setActiveTab, setAdminTab, reminders, showToast } = useHR();
  const { profile, session, signOut } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const isAdmin = profile?.role === 'admin';
  const isBackoffice = isAdmin || profile?.role === 'hr';
  const openAccountProfile = () => {
    if (isBackoffice) {
      setAdminTab('admin-profile');
      return;
    }

    setActiveTab('profile');
  };

  const unreadCount = reminders.filter(r => !r.isRead).length;

  // Realtime: notify Admin/HR the moment an employee submits a profile
  // change request, without waiting for a manual refresh.
  const companyId = profile?.companyId;
  useEffect(() => {
    if (!isBackoffice || !companyId) return;
    const channel = supabase
      .channel(`profile-change-requests-${companyId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'employee_profile_change_requests', filter: `company_id=eq.${companyId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['employee_profile_change_requests'] });
          showToast(t('header.newProfileChangeRequest'));
          playNotificationChime();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isBackoffice, companyId, queryClient, showToast, t]);

  return (
    <header className="md:col-start-2 md:row-start-1 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between md:justify-end h-16 gap-3">

          <button
            type="button"
            onClick={onMenuClick}
            className="md:hidden p-2 -ml-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors cursor-pointer"
            aria-label={t('sidebar.mainMenu')}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 md:contents">

          {!isBackoffice && (
            <button
              onClick={() => setIsNewLeaveModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-success-800 bg-success-50 hover:bg-success-100 border border-success-200 rounded-lg transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-success-600" />
              <span>{t('header.leaveRequest')}</span>
            </button>
          )}

          {isBackoffice && (
            <button
              type="button"
              onClick={() => setAdminTab('admin-reminders')}
              title={t('header.notifications')}
              className="relative p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors cursor-pointer"
            >
              <Bell className="w-4.5 h-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-rose-600 text-white text-[9px] font-bold leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          )}

          <LanguageSwitcher />

          <div className="h-6 w-px bg-slate-200"></div>

          {/* Authenticated user */}
          <button
            type="button"
            onClick={openAccountProfile}
            title={t('header.accountProfile')}
            className="flex items-center gap-2 bg-slate-50 p-1.5 pr-3 border border-slate-200 rounded-xl transition-colors hover:bg-primary-50 hover:border-primary-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs">
              {session?.user.email?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="text-left hidden lg:block">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-slate-800 truncate max-w-[140px]">{session?.user.email}</span>
                {isBackoffice && <ShieldCheck className="w-3.5 h-3.5 text-primary-600" />}
              </div>
              <span className="text-[11px] text-slate-500 font-medium block">
                {isAdmin ? 'Admin' : profile?.role === 'hr' ? t('role.hr') : t('role.employee')}
              </span>
            </div>
          </button>

          <button
            onClick={() => signOut()}
            title={t('header.logout')}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>

          </div>
        </div>
      </div>
    </header>
  );
};
