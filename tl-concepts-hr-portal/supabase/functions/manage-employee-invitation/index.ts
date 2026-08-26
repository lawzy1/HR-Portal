// Trusted boundary for reissuing or revoking employee activation links. The
// browser supplies only an employee id and action; all company/role checks,
// Auth link generation, and email delivery happen server-side.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { logInternalError, publicError } from "../_shared/error-response.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const APP_URL = Deno.env.get("APP_URL")?.replace(/\/$/, "");
const FALLBACK_ORIGIN = "http://127.0.0.1:3000";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const NOTIFICATION_FROM_EMAIL = Deno.env.get("NOTIFICATION_FROM_EMAIL");
const INVITATION_EXPIRY_MS = 60 * 60 * 1000;
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

function jsonResponse(request: Request, body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json" },
  });
}

function errorResponse(request: Request, options: Parameters<typeof publicError>[2]) {
  return publicError(request, corsHeaders(request), options);
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

async function sendEmail(to: string, employeeName: string, actionLink: string) {
  if (!RESEND_API_KEY || !NOTIFICATION_FROM_EMAIL) {
    return { delivered: false, error: "Chưa cấu hình RESEND_API_KEY hoặc NOTIFICATION_FROM_EMAIL" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: NOTIFICATION_FROM_EMAIL,
      to: [to],
      subject: "[TL Concepts HR] Link kích hoạt tài khoản mới",
      html: `<p>Chào ${escapeHtml(employeeName)},</p><p>Admin đã gửi lại link kích hoạt tài khoản HR Portal. Link có hiệu lực trong 1 giờ.</p><p><a href="${escapeHtml(actionLink)}">Kích hoạt tài khoản và tiếp tục hồ sơ</a></p><p>Nếu bạn đã đặt mật khẩu, bạn cũng có thể đăng nhập để tiếp tục hồ sơ đang dang dở.</p>`,
    }),
  });
  if (response.ok) return { delivered: true, error: null };
  const body = await response.text();
  return { delivered: false, error: `Resend trả về ${response.status}: ${body.slice(0, 500)}` };
}

interface Body {
  action?: unknown;
  employeeId?: unknown;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") return errorResponse(request, { code: "INVALID_REQUEST", message: "Phương thức gửi yêu cầu không hợp lệ.", status: 405 });
  if (!APP_URL) return errorResponse(request, { code: "INTERNAL_ERROR", message: "Chưa thể xử lý lời mời. Vui lòng thử lại sau.", status: 500 });

  const authorization = request.headers.get("Authorization");
  if (!authorization) return errorResponse(request, { code: "UNAUTHENTICATED", message: "Phiên đăng nhập đã hết hạn.", status: 401 });
  const body = await request.json().catch(() => null) as Body | null;
  const action = body?.action === "resend" || body?.action === "revoke" ? body.action : null;
  const employeeId = typeof body?.employeeId === "string" ? body.employeeId : null;
  if (!action || !employeeId) return errorResponse(request, { code: "INVALID_REQUEST", message: "Yêu cầu không hợp lệ.", status: 400 });

  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !caller) return errorResponse(request, { code: "UNAUTHENTICATED", message: "Phiên đăng nhập đã hết hạn.", status: 401 });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: adminProfile, error: adminError } = await admin
    .from("profiles")
    .select("company_id, role, is_active")
    .eq("id", caller.id)
    .maybeSingle();
  if (adminError || !adminProfile || adminProfile.role !== "admin" || !adminProfile.is_active) {
    logInternalError("manage invitation authorization failed", adminError);
    return errorResponse(request, { code: "FORBIDDEN", message: "Bạn không có quyền quản lý lời mời.", status: 403 });
  }

  const { data: invitation, error: invitationError } = await admin
    .from("employee_invitations")
    .select("id, auth_user_id, email, employee_id, resend_count, employees(full_name, status)")
    .eq("company_id", adminProfile.company_id)
    .eq("employee_id", employeeId)
    .maybeSingle();
  if (invitationError || !invitation) {
    logInternalError("manage invitation lookup failed", invitationError);
    return errorResponse(request, { code: "NOT_FOUND", message: "Không tìm thấy lời mời của nhân viên này.", status: 404 });
  }

  const employee = invitation.employees as { full_name?: string; status?: string } | null;
  if (employee?.status !== "Chờ kích hoạt") {
    return errorResponse(request, { code: "CONFLICT", message: "Lời mời này không còn ở trạng thái chờ kích hoạt.", status: 409 });
  }

  if (action === "revoke") {
    const { error } = await admin
      .from("employee_invitations")
      .update({ revoked_at: new Date().toISOString(), revoked_by: caller.id })
      .eq("id", invitation.id);
    if (error) {
      logInternalError("revoke invitation failed", error);
      return errorResponse(request, { code: "INTERNAL_ERROR", message: "Chưa thể thu hồi lời mời. Vui lòng thử lại sau.", status: 500 });
    }
    const { error: profileUpdateError } = await admin.from("profiles").update({ onboarding_status: "revoked" }).eq("id", invitation.auth_user_id);
    if (profileUpdateError) {
      logInternalError("revoke invitation profile update failed", profileUpdateError);
      return errorResponse(request, { code: "INTERNAL_ERROR", message: "Chưa thể thu hồi lời mời. Vui lòng thử lại sau.", status: 500 });
    }
    await admin.from("audit_logs").insert({
      company_id: adminProfile.company_id,
      actor_profile_id: caller.id,
      action: "UPDATE",
      entity_type: "employee_invitation",
      entity_id: invitation.id,
      details: { operation: "revoke", employee_id: employeeId },
    });
    return jsonResponse(request, { revoked: true }, 200);
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: invitation.email,
    options: { redirectTo: `${APP_URL}/auth/activate` },
  });
  if (linkError || !link.properties.action_link) {
    logInternalError("generate invitation link failed", linkError);
    return errorResponse(request, { code: "INVITATION_SEND_FAILED", message: "Chưa thể tạo link kích hoạt mới. Vui lòng thử lại sau.", status: 502 });
  }

  const now = new Date();
  const emailResult = await sendEmail(invitation.email, employee?.full_name ?? "bạn", link.properties.action_link);
  const { error: updateError } = await admin
    .from("employee_invitations")
    .update({
      last_sent_at: now.toISOString(),
      expires_at: new Date(now.getTime() + INVITATION_EXPIRY_MS).toISOString(),
      revoked_at: null,
      revoked_by: null,
      resend_count: invitation.resend_count + 1,
      last_email_error: emailResult.error,
    })
    .eq("id", invitation.id);
  if (updateError) {
    logInternalError("update invitation after resend failed", updateError);
    return errorResponse(request, { code: "INTERNAL_ERROR", message: "Chưa thể cập nhật lời mời. Vui lòng thử lại sau.", status: 500 });
  }
  const { error: profileUpdateError } = await admin.from("profiles").update({ onboarding_status: "invited" }).eq("id", invitation.auth_user_id);
  if (profileUpdateError) {
    logInternalError("update profile after resend failed", profileUpdateError);
    return errorResponse(request, { code: "INTERNAL_ERROR", message: "Chưa thể cập nhật lời mời. Vui lòng thử lại sau.", status: 500 });
  }

  await admin.from("audit_logs").insert({
    company_id: adminProfile.company_id,
    actor_profile_id: caller.id,
    action: "UPDATE",
    entity_type: "employee_invitation",
    entity_id: invitation.id,
    details: { operation: "resend", employee_id: employeeId, email_delivered: emailResult.delivered },
  });

  return jsonResponse(request, {
    emailDelivered: emailResult.delivered,
    actionLink: emailResult.delivered ? null : link.properties.action_link,
  }, emailResult.delivered ? 200 : 202);
});
