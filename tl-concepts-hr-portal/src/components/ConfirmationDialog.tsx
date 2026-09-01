import * as Dialog from '@radix-ui/react-dialog';
import { LoaderCircle, X } from 'lucide-react';
import React from 'react';

type ConfirmationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  isPending?: boolean;
  isConfirmDisabled?: boolean;
  variant?: 'primary' | 'danger';
  showCancel?: boolean;
  children?: React.ReactNode;
};

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  isPending = false,
  isConfirmDisabled = false,
  variant = 'primary',
  showCancel = true,
  children,
}) => (
  <Dialog.Root open={open} onOpenChange={(nextOpen) => !isPending && (nextOpen || showCancel) && onOpenChange(nextOpen)}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Dialog.Title className="text-lg font-bold text-slate-900">{title}</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-6 text-slate-600">{description}</Dialog.Description>
          </div>
          {showCancel && <Dialog.Close asChild>
            <button type="button" aria-label="Đóng" disabled={isPending} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
              <X className="h-5 w-5" />
            </button>
          </Dialog.Close>}
        </div>

        {children && <div className="mt-5">{children}</div>}

        <div className="mt-6 flex justify-end gap-3">
          {showCancel && <Dialog.Close asChild>
            <button type="button" disabled={isPending} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
              Hủy
            </button>
          </Dialog.Close>}
          <button type="button" onClick={onConfirm} disabled={isPending || isConfirmDisabled} className={`inline-flex min-w-28 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variant === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-primary-600 hover:bg-primary-700'}`}>
            {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : confirmLabel}
          </button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);
