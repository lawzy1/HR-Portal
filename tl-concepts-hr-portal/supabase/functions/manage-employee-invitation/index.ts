// Trusted boundary for reissuing or revoking employee activation links. The
// browser supplies only an employee id and action; all company/role checks,
// Auth link generation, and email delivery happen server-side.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
  if (request.method !== "POST") return jsonResponse(request, { error: "Method not allowed" }, 405);
  if (!APP_URL) return jsonResponse(request, { error: "Server chưa cấu hình APP_URL cho link kích hoạt" }, 500);

  const authorization = request.headers.get("Authorization");
  if (!authorization) return jsonResponse(request, { error: "Missing Authorization header" }, 401);
  const body = await request.json().catch(() => null) as Body | null;
  const action = body?.action === "resend" || body?.action === "revoke" ? body.action : null;
  const employeeId = typeof body?.employeeId === "string" ? body.employeeId : null;
  if (!action || !employeeId) return jsonResponse(request, { error: "Yêu cầu không hợp lệ" }, 400);

  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !caller) return jsonResponse(request, { error: "Phiên đăng nhập không hợp lệ" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: adminProfile, error: adminError } = await admin
    .from("profiles")
    .select("company_id, role, is_active")
    .eq("id", caller.id)
    .maybeSingle();
  if (adminError || !adminProfile || adminProfile.role !== "admin" || !adminProfile.is_active) {
    return jsonResponse(request, { error: "Chỉ Admin đang hoạt động mới quản lý được lời mời" }, 403);
  }

  const { data: invitation, error: invitationError } = await admin
    .from("employee_invitations")
    .select("id, auth_user_id, email, employee_id, resend_count, employees(full_name, status)")
    .eq("company_id", adminProfile.company_id)
    .eq("employee_id", employeeId)
    .maybeSingle();
  if (invitationError || !invitation) return jsonResponse(request, { error: "Không tìm thấy lời mời của nhân viên này" }, 404);

  const employee = invitation.employees as { full_name?: string; status?: string } | null;
  if (employee?.status !== "Chờ kích hoạt") {
    return jsonResponse(request, { error: "Chỉ có thể quản lý lời mời khi nhân viên đang chờ kích hoạt" }, 409);
  }

  if (action === "revoke") {
    const { error } = await admin
      .from("employee_invitations")
      .update({ revoked_at: new Date().toISOString(), revoked_by: caller.id })
      .eq("id", invitation.id);
    if (error) return jsonResponse(request, { error: error.message }, 500);
    const { error: profileUpdateError } = await admin.from("profiles").update({ onboarding_status: "revoked" }).eq("id", invitation.auth_user_id);
    if (profileUpdateError) return jsonResponse(request, { error: profileUpdateError.message }, 500);
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
    return jsonResponse(request, { error: linkError?.message ?? "Không thể tạo link kích hoạt mới" }, 400);
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
  if (updateError) return jsonResponse(request, { error: updateError.message }, 500);
  const { error: profileUpdateError } = await admin.from("profiles").update({ onboarding_status: "invited" }).eq("id", invitation.auth_user_id);
  if (profileUpdateError) return jsonResponse(request, { error: profileUpdateError.message }, 500);

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
