import type { InputHTMLAttributes } from 'react';

type CurrencyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value: number | string | null | undefined;
  onValueChange: (value: string) => void;
};

function normalizeCurrency(value: number | string | null | undefined) {
  const digits = String(value ?? '').replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Currency is entered as whole VND. The component exposes unformatted digits
// so callers keep storing numeric values, while the person typing sees groups.
export function CurrencyInput({ value, onValueChange, inputMode = 'numeric', ...props }: CurrencyInputProps) {
  return (
    <input
      {...props}
      type="text"
      inputMode={inputMode}
      value={normalizeCurrency(value)}
      onChange={(event) => onValueChange(event.target.value.replace(/\D/g, ''))}
    />
  );
}
