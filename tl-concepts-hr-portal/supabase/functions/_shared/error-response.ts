export type PublicErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_EMAIL'
  | 'INVALID_REQUEST'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'EMPLOYEE_EMAIL_EXISTS'
  | 'ACCOUNT_EMAIL_EXISTS'
  | 'EMPLOYEE_CODE_EXISTS'
  | 'INVITATION_SEND_FAILED'
  | 'EMAIL_DELIVERY_FAILED'
  | 'INTERNAL_ERROR';

type ErrorOptions = {
  code: PublicErrorCode;
  message: string;
  status: number;
  field?: string;
};

export function publicError(
  request: Request,
  corsHeaders: Record<string, string>,
  { code, message, status, field }: ErrorOptions,
) {
  return new Response(JSON.stringify({
    error: { code, message, ...(field ? { field } : {}) },
  }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Keep diagnostics in Edge Function logs. Do not return provider, database, or
// Auth messages to browsers because they are unstable and can expose internals.
export function logInternalError(operation: string, error: unknown) {
  console.error(operation, error);
}
