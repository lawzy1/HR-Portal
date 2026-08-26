// Trusted boundary for the invitation flow. The browser can ask to create an
// invitation, but only this function holds the Supabase secret key required to
// create an Auth invite and the database function re-validates the admin.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { logInternalError, publicError } from "../_shared/error-response.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const APP_URL = Deno.env.get("APP_URL")?.replace(/\/$/, "");
const FALLBACK_ORIGIN = "http://127.0.0.1:3000";
const ALLOWED_ORIGINS = new Set(
  (Deno.env.get("ALLOWED_ORIGINS") ?? [APP_URL, FALLBACK_ORIGIN].filter(Boolean).join(","))
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean),
);

function corsHeaders(request: Request) {
  const origin = request.headers.get("Origin")?.replace(/\/$/, "");
  const allowedOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : APP_URL ?? FALLBACK_ORIGIN;

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

interface CreateEmployeeBody {
  employeeCode: string;
  fullName: string;
  email: string;
  department: string;
  jobTitle: string;
  startDate: string;
}

function jsonResponse(request: Request, body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json" },
  });
}

function errorResponse(request: Request, options: Parameters<typeof publicError>[2]) {
  return publicError(request, corsHeaders(request), options);
}

function isDuplicateError(error: { code?: string | null; message?: string | null } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "23505" || message.includes("already been registered") || message.includes("already registered") || message.includes("duplicate");
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return errorResponse(req, { code: "INVALID_REQUEST", message: "Phương thức gửi yêu cầu không hợp lệ.", status: 405 });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return errorResponse(req, { code: "UNAUTHENTICATED", message: "Phiên đăng nhập đã hết hạn.", status: 401 });
  if (!APP_URL) {
    logInternalError("create-employee missing APP_URL", null);
    return errorResponse(req, { code: "INTERNAL_ERROR", message: "Chưa thể gửi lời mời. Vui lòng thử lại sau.", status: 500 });
  }

  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user: callerUser }, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerUser) return errorResponse(req, { code: "UNAUTHENTICATED", message: "Phiên đăng nhập đã hết hạn.", status: 401 });

  // Verify the caller at the trusted boundary before creating an Auth invite.
  // UI visibility is not an authorization control: any signed-in user can
  // otherwise call this public Edge endpoint directly.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: callerProfile, error: profileError } = await admin
    .from("profiles")
    .select("role, is_active")
    .eq("id", callerUser.id)
    .maybeSingle();
  if (profileError || !callerProfile || callerProfile.role !== "admin" || !callerProfile.is_active) {
    logInternalError("create-employee admin authorization failed", profileError);
    return errorResponse(req, { code: "FORBIDDEN", message: "Bạn không có quyền mời nhân viên.", status: 403 });
  }

  const body = (await req.json().catch(() => null)) as CreateEmployeeBody | null;
  const email = body?.email?.trim().toLowerCase();
  if (!body || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return errorResponse(req, { code: "INVALID_EMAIL", message: "Email không hợp lệ.", status: 400, field: "email" });
  }
  if (![body.employeeCode, body.fullName, body.department, body.jobTitle].every((value) => value?.trim())) {
    return errorResponse(req, { code: "VALIDATION_ERROR", message: "Vui lòng điền đủ các thông tin bắt buộc.", status: 400 });
  }
  if (!isValidDate(body.startDate)) return errorResponse(req, { code: "VALIDATION_ERROR", message: "Ngày vào làm không hợp lệ.", status: 400, field: "startDate" });

  // Auth owns the email and sends the invitation. No password is ever
  // generated or returned by this endpoint.
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${APP_URL}/auth/activate`,
    data: { invitation_source: "employee_admin_invite" },
  });
  if (inviteError || !invited.user) {
    logInternalError("create-employee invite failed", inviteError);
    if (isDuplicateError(inviteError)) {
      return errorResponse(req, { code: "EMPLOYEE_EMAIL_EXISTS", message: "Email này đã được đăng ký.", status: 409, field: "email" });
    }
    return errorResponse(req, { code: "INVITATION_SEND_FAILED", message: "Chưa thể gửi lời mời kích hoạt. Vui lòng thử lại sau.", status: 502 });
  }

  const { data: employee, error: createError } = await admin.rpc("create_employee_invitation", {
    p_actor_id: callerUser.id,
    p_auth_user_id: invited.user.id,
    p_employee_code: body.employeeCode.trim(),
    p_full_name: body.fullName.trim(),
    p_email: email,
    p_department: body.department.trim(),
    p_job_title: body.jobTitle.trim(),
    p_start_date: body.startDate,
  });

  if (createError || !employee) {
    // The Auth user was created only moments ago. Roll it back so the admin
    // can correct duplicate data and retry without leaving an orphan account.
    await admin.auth.admin.deleteUser(invited.user.id);
    logInternalError("create-employee profile creation failed", createError);
    if (isDuplicateError(createError)) {
      return errorResponse(req, { code: "EMPLOYEE_CODE_EXISTS", message: "Mã nhân viên hoặc email đã tồn tại.", status: 409 });
    }
    return errorResponse(req, { code: "INTERNAL_ERROR", message: "Chưa thể tạo hồ sơ nhân viên. Vui lòng thử lại sau.", status: 500 });
  }

  return jsonResponse(req, { employee }, 201);
});
