import type { InputHTMLAttributes } from 'react';
import { useMoneyVisibility } from '../context/MoneyVisibilityContext';

type CurrencyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value: number | string | null | undefined;
  onValueChange: (value: string) => void;
};

function normalizeCurrency(value: number | string | null | undefined) {
  const digits = (typeof value === 'number' ? (Number.isFinite(value) ? String(Math.round(value)) : '') : String(value ?? '').replace(/\D/g, '')).replace(/^0+(?=\d)/, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

if (import.meta.env.DEV) {
  console.assert(normalizeCurrency(817021.277) === '817,021', 'Currency input rounding self-check failed');
}

// Currency is entered as whole VND. The component exposes unformatted digits
// so callers keep storing numeric values, while the person typing sees groups.
export function CurrencyInput({ value, onValueChange, inputMode = 'numeric', ...props }: CurrencyInputProps) {
  const { isMoneyHidden } = useMoneyVisibility();
  return (
    <input
      {...props}
      type={isMoneyHidden ? 'password' : 'text'}
      inputMode={inputMode}
      value={normalizeCurrency(value)}
      onChange={(event) => onValueChange(event.target.value.replace(/\D/g, ''))}
    />
  );
}
