import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';

type FunctionErrorBody = {
  error?: {
    code?: unknown;
    message?: unknown;
    field?: unknown;
  } | unknown;
};

const ERROR_MESSAGES: Record<string, string> = {
  same_password: 'Mật khẩu mới phải khác mật khẩu hiện tại.',
  EMPLOYEE_EMAIL_EXISTS: 'Email này đã được đăng ký. Hãy dùng email khác hoặc gửi lại lời mời kích hoạt.',
  ACCOUNT_EMAIL_EXISTS: 'Email này đã được đăng ký. Hãy dùng email khác.',
  EMPLOYEE_CODE_EXISTS: 'Mã nhân viên đã tồn tại. Vui lòng kiểm tra lại.',
  INVALID_EMAIL: 'Email không hợp lệ.',
  VALIDATION_ERROR: 'Vui lòng kiểm tra lại các thông tin bắt buộc.',
  INVALID_REQUEST: 'Yêu cầu không hợp lệ. Vui lòng kiểm tra lại thông tin.',
  UNAUTHENTICATED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  NOT_FOUND: 'Không tìm thấy dữ liệu cần xử lý.',
  CONFLICT: 'Dữ liệu đã thay đổi hoặc không còn ở trạng thái phù hợp để xử lý.',
  INVITATION_SEND_FAILED: 'Chưa thể gửi lời mời kích hoạt. Vui lòng thử lại sau.',
  FILE_UPLOAD_FAILED: 'Không thể tải tệp lên. Vui lòng thử lại.',
  EMAIL_DELIVERY_FAILED: 'Chưa thể gửi email. Vui lòng thử lại sau.',
  SERVICE_UNAVAILABLE: 'Hệ thống đang tạm thời không phản hồi. Vui lòng thử lại sau.',
  INTERNAL_ERROR: 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.',
  '23505': 'Dữ liệu này đã tồn tại. Vui lòng kiểm tra lại.',
  '42501': 'Bạn không có quyền thực hiện thao tác này.',
};

export const SESSION_EXPIRED_EVENT = 'auth-session-expired';

function messageForCode(code: string | null, fallback: string): string {
  if (code === 'UNAUTHENTICATED' && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  return (code && ERROR_MESSAGES[code]) || fallback;
}

// Temporary compatibility for functions that have not yet been redeployed with
// the structured error contract. These strings are never displayed verbatim.
function legacyMessageToCode(message: string): string | null {
  const normalized = message.toLowerCase();
  if (normalized.includes('already been registered') || normalized.includes('already registered')) return 'EMPLOYEE_EMAIL_EXISTS';
  if (normalized.includes('duplicate') && normalized.includes('email')) return 'EMPLOYEE_EMAIL_EXISTS';
  if (normalized.includes('duplicate') || normalized.includes('unique')) return '23505';
  return null;
}

function readCode(body: FunctionErrorBody): string | null {
  if (!body || typeof body !== 'object') return null;
  const value = body.error;
  if (value && typeof value === 'object' && typeof (value as { code?: unknown }).code === 'string') {
    return (value as { code: string }).code;
  }
  if (typeof value === 'string') return legacyMessageToCode(value);
  return null;
}

function readErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

/**
 * Converts service errors into short Vietnamese copy suitable for UI. Detailed
 * error objects must be logged separately and are deliberately never rendered.
 */
export async function getUserFacingError(
  error: unknown,
  fallback = 'Không thể hoàn tất thao tác. Vui lòng thử lại.',
): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json() as FunctionErrorBody;
      const code = readCode(body);
      return messageForCode(code, fallback);
    } catch {
      return fallback;
    }
  }

  if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) {
    return 'Không thể kết nối đến hệ thống. Vui lòng kiểm tra mạng và thử lại.';
  }

  const code = readErrorCode(error);
  return messageForCode(code, fallback);
}
