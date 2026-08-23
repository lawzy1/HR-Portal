export function formatVND(amount: number): string {
  if (isNaN(amount)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export function formatDate(dateString: string): string {
  if (!dateString || dateString === 'N/A') return 'N/A';
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
  } catch {
    return dateString;
  }
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
