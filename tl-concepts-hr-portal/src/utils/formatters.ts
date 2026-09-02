export function formatVND(amount: number): string {
  if (isNaN(amount)) return '0';
  return new Intl.NumberFormat('vi-VN').format(amount);
}

/** Single reusable date format for the whole app: dd/mm/yyyy. */
export const DATE_DISPLAY_FORMAT = 'dd/mm/yyyy';

/** Formats an ISO date (yyyy-mm-dd) or timestamp string as dd/mm/yyyy. */
export function formatDate(dateString: string): string {
  if (!dateString || dateString === 'N/A') return 'N/A';
  const parts = dateString.slice(0, 10).split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
}

/** Formats an ISO timestamp as dd/mm/yyyy, HH:mm (Vietnam time). */
export function formatDateTime(dateString: string): string {
  if (!dateString) return 'N/A';
  const time = new Date(dateString).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return `${formatDate(dateString)}, ${time}`;
}

export function formatMonthYear(month: number, year: number): string {
  return `Tháng ${month < 10 ? '0' + month : month}/${year}`;
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Đã duyệt':
    case 'Đang hiệu lực':
    case 'Đã thanh toán':
      return 'bg-success-50 text-success-700 border-success-200 font-medium';
    case 'Chờ duyệt':
    case 'Sắp hết hạn':
    case 'Chờ thanh toán':
      return 'bg-amber-50 text-amber-700 border-amber-200 font-medium';
    case 'Từ chối':
    case 'Hết hạn':
      return 'bg-rose-50 text-rose-700 border-rose-200 font-medium';
    case 'Đã gia hạn':
      return 'bg-primary-50 text-primary-700 border-primary-200 font-medium';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}
