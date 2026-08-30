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

type BackofficeRole = "admin" | "hr";

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

function response(request: Request, body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(request), "Content-Type": "application/json" } });
}

function isDuplicate(error: { code?: string | null; message?: string | null } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "23505" || message.includes("already been registered") || message.includes("already registered") || message.includes("duplicate");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") return publicError(request, corsHeaders(request), { code: "INVALID_REQUEST", message: "Phương thức gửi yêu cầu không hợp lệ.", status: 405 });
  if (!APP_URL) return publicError(request, corsHeaders(request), { code: "INTERNAL_ERROR", message: "Chưa cấu hình đường dẫn kích hoạt tài khoản.", status: 500 });

  const authorization = request.headers.get("Authorization");
  if (!authorization) return publicError(request, corsHeaders(request), { code: "UNAUTHENTICATED", message: "Phiên đăng nhập đã hết hạn.", status: 401 });
  const body = await request.json().catch(() => null) as { email?: unknown; role?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const role: BackofficeRole | null = body?.role === "admin" || body?.role === "hr" ? body.role : null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return publicError(request, corsHeaders(request), { code: "INVALID_EMAIL", message: "Email không hợp lệ.", status: 400, field: "email" });
  if (!role) return publicError(request, corsHeaders(request), { code: "VALIDATION_ERROR", message: "Vai trò tài khoản không hợp lệ.", status: 400, field: "role" });

  const callerClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authorization } }, auth: { autoRefreshToken: false, persistSession: false } });
  const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !caller) return publicError(request, corsHeaders(request), { code: "UNAUTHENTICATED", message: "Phiên đăng nhập đã hết hạn.", status: 401 });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: callerProfile, error: callerProfileError } = await admin.from("profiles").select("company_id, role, is_active").eq("id", caller.id).maybeSingle();
  if (callerProfileError || !callerProfile || callerProfile.role !== "admin" || !callerProfile.is_active) {
    logInternalError("create backoffice account authorization failed", callerProfileError);
    return publicError(request, corsHeaders(request), { code: "FORBIDDEN", message: "Bạn không có quyền tạo tài khoản quản trị.", status: 403 });
  }

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${APP_URL}/auth/activate`,
    data: { invitation_source: "backoffice_admin_invite" },
  });
  if (inviteError || !invited.user) {
    logInternalError("create backoffice account invite failed", inviteError);
    return publicError(request, corsHeaders(request), { code: isDuplicate(inviteError) ? "ACCOUNT_EMAIL_EXISTS" : "INVITATION_SEND_FAILED", message: "Chưa thể gửi lời mời tạo tài khoản.", status: isDuplicate(inviteError) ? 409 : 502, field: "email" });
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: invited.user.id,
    company_id: callerProfile.company_id,
    employee_id: null,
    role,
    is_active: false,
    onboarding_status: "invited",
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(invited.user.id);
    logInternalError("create backoffice profile failed", profileError);
    return publicError(request, corsHeaders(request), { code: isDuplicate(profileError) ? "ACCOUNT_EMAIL_EXISTS" : "INTERNAL_ERROR", message: "Chưa thể tạo tài khoản quản trị.", status: isDuplicate(profileError) ? 409 : 500, field: "email" });
  }

  await admin.from("audit_logs").insert({ company_id: callerProfile.company_id, actor_profile_id: caller.id, action: "CREATE", entity_type: "backoffice_account", entity_id: invited.user.id, details: { email, role } });
  return response(request, { email, role }, 201);
});
