import { commonMessages } from './common';
import { loginMessages } from './login';
import { onboardingMessages } from './onboarding';
import { dashboardMessages } from './dashboard';
import { payslipsMessages } from './payslips';
import { leaveMessages } from './leave';
import { contractMessages } from './contract';
import { payrollMessages } from './payroll';
import { adminEmployeesMessages } from './adminEmployees';
import { adminKpiMessages } from './adminKpi';
import { adminDashboardMessages } from './adminDashboard';
import { adminRemindersMessages } from './adminReminders';
import { adminProfileMessages } from './adminProfile';
export { englishValues } from './englishValues';

export const messages = {
  vi: {
    ...commonMessages.vi,
    ...loginMessages.vi,
    ...onboardingMessages.vi,
    ...dashboardMessages.vi,
    ...payslipsMessages.vi,
    ...leaveMessages.vi,
    ...contractMessages.vi,
    ...payrollMessages.vi,
    ...adminEmployeesMessages.vi,
    ...adminKpiMessages.vi,
    ...adminDashboardMessages.vi,
    ...adminRemindersMessages.vi,
    ...adminProfileMessages.vi,
  },
  en: {
    ...commonMessages.en,
    ...loginMessages.en,
    ...onboardingMessages.en,
    ...dashboardMessages.en,
    ...payslipsMessages.en,
    ...leaveMessages.en,
    ...contractMessages.en,
    ...payrollMessages.en,
    ...adminEmployeesMessages.en,
    ...adminKpiMessages.en,
    ...adminDashboardMessages.en,
    ...adminRemindersMessages.en,
    ...adminProfileMessages.en,
  },
} as const;

export type Locale = keyof typeof messages;
export type TranslationKey = keyof typeof messages.vi;

export const translate = (locale: Locale, key: TranslationKey, params: Record<string, string | number> = {}) =>
  Object.entries(params).reduce<string>(
    (text, [name, replacement]) => text.replaceAll(`{{${name}}}`, String(replacement)),
    messages[locale][key] as string,
  );

if (import.meta.env.DEV) {
  console.assert(translate('en', 'common.days', { count: 2 }) === '2 days', 'i18n interpolation self-check failed');
}
