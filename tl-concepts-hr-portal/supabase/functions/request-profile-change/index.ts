import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { logInternalError, publicError } from "../_shared/error-response.ts";
import { brandedButton, brandedEmailHtml, escapeHtml } from "../_shared/email-template.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const APP_URL = Deno.env.get("APP_URL")?.replace(/\/$/, "");
const FALLBACK_ORIGIN = "http://127.0.0.1:3000";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const NOTIFICATION_FROM_EMAIL = Deno.env.get("NOTIFICATION_FROM_EMAIL");
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

async function sendEmail(recipient: string, subject: string, html: string, text: string) {
  if (!RESEND_API_KEY || !NOTIFICATION_FROM_EMAIL) {
    return { delivered: false, error: "Chưa cấu hình RESEND_API_KEY hoặc NOTIFICATION_FROM_EMAIL" };
  }

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: NOTIFICATION_FROM_EMAIL, to: [recipient], subject, html, text }),
    });
  } catch (error) {
    return { delivered: false, error: `Không kết nối được Resend: ${error instanceof Error ? error.message : "Lỗi không xác định"}` };
  }
  if (response.ok) return { delivered: true, error: null };
  const responseBody = await response.text();
  return { delivered: false, error: `Resend trả về ${response.status}: ${responseBody.slice(0, 500)}` };
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") return errorResponse(request, { code: "INVALID_REQUEST", message: "Phương thức gửi yêu cầu không hợp lệ.", status: 405 });

  const authorization = request.headers.get("Authorization");
  if (!authorization) return errorResponse(request, { code: "UNAUTHENTICATED", message: "Phiên đăng nhập đã hết hạn.", status: 401 });

  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error: userError } = await callerClient.auth.getUser();
  if (userError || !user) return errorResponse(request, { code: "UNAUTHENTICATED", message: "Phiên đăng nhập đã hết hạn.", status: 401 });

  const body = await request.json().catch(() => null) as { message?: unknown } | null;
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (message.length < 5 || message.length > 2000) {
    return errorResponse(request, { code: "VALIDATION_ERROR", message: "Nội dung yêu cầu phải từ 5 đến 2.000 ký tự.", status: 400, field: "message" });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("company_id, employee_id, role, is_active, onboarding_status, employees(full_name, employee_code)")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "employee" || !profile.is_active || profile.onboarding_status !== "approved" || !profile.employee_id) {
    logInternalError("profile change authorization failed", profileError);
    return errorResponse(request, { code: "FORBIDDEN", message: "Bạn chưa thể gửi yêu cầu thay đổi thông tin.", status: 403 });
  }

  const { data: changeRequest, error: insertError } = await admin
    .from("employee_profile_change_requests")
    .insert({ company_id: profile.company_id, employee_id: profile.employee_id, requested_by: user.id, message })
    .select("id")
    .single();
  if (insertError || !changeRequest) {
    logInternalError("profile change request insert failed", insertError);
    return errorResponse(request, { code: "INTERNAL_ERROR", message: "Chưa thể lưu yêu cầu thay đổi. Vui lòng thử lại sau.", status: 500 });
  }

  const { data: adminProfiles, error: adminsError } = await admin
    .from("profiles")
    .select("id")
    .eq("company_id", profile.company_id)
    .in("role", ["admin", "hr"])
    .eq("is_active", true);

  if (adminsError || !adminProfiles?.length) {
    const notificationError = adminsError?.message ?? "Không tìm thấy Admin/HR nhận thông báo";
    await admin.from("employee_profile_change_requests").update({ notification_error: notificationError }).eq("id", changeRequest.id);
    return jsonResponse(request, { notificationDelivered: false }, 202);
  }

  const userLookups = await Promise.all(adminProfiles.map(({ id }) => admin.auth.admin.getUserById(id)));
  const recipients = [...new Set(userLookups.flatMap(({ data }) => data.user?.email ? [data.user.email] : []))];
  if (!recipients.length) {
    await admin.from("employee_profile_change_requests").update({ notification_error: "Admin/HR chưa có email đăng nhập hợp lệ" }).eq("id", changeRequest.id);
    return jsonResponse(request, { notificationDelivered: false }, 202);
  }

  const employee = profile.employees as { full_name?: string; employee_code?: string } | null;
  const employeeName = employee?.full_name ?? "Nhân viên";
  const employeeCode = employee?.employee_code ?? "—";
  const safeEmployeeName = escapeHtml(employeeName);
  const safeEmployeeCode = escapeHtml(employeeCode);
  const safeMessage = escapeHtml(message);
  const subject = `[TL Concepts HR Portal] Yêu cầu thay đổi thông tin — ${employeeName}`;
  const html = brandedEmailHtml({
      headerSubtitle: "Yêu cầu thay đổi thông tin nhân viên",
      bodyHtml: `<p style="margin:0 0 14px"><strong>${safeEmployeeName}</strong> (${safeEmployeeCode}) vừa gửi yêu cầu thay đổi thông tin.</p><p style="margin:0 0 6px"><strong>Nội dung:</strong></p><p style="margin:0 0 22px;line-height:1.6">${safeMessage.replaceAll("\n", "<br>")}</p>${APP_URL ? brandedButton(APP_URL, "Mở TL Concepts HR Portal") : ""}`,
    });
  const text = `${employeeName} (${employeeCode}) vừa gửi yêu cầu thay đổi thông tin.\n\nNội dung:\n${message}${APP_URL ? `\n\nMở TL Concepts HR Portal: ${APP_URL}` : ""}`;

  // Submit one request per mailbox so one suppressed or rejected recipient
  // cannot be hidden behind a successful multi-recipient API request.
  const recipientResults = await Promise.all(recipients.map(async (recipient) => ({
    recipient,
    result: await sendEmail(recipient, subject, html, text),
  })));
  const failedRecipients = recipientResults.filter(({ result }) => !result.delivered);
  const allAccepted = failedRecipients.length === 0;
  const notificationError = failedRecipients.length
    ? failedRecipients.map(({ recipient, result }) => `${recipient}: ${result.error}`).join(" | ").slice(0, 2000)
    : null;

  await admin
    .from("employee_profile_change_requests")
    .update(allAccepted
      ? { notification_sent_at: new Date().toISOString(), notification_error: null }
      : { notification_error: notificationError })
    .eq("id", changeRequest.id);

  return jsonResponse(request, {
    notificationDelivered: allAccepted,
    acceptedRecipients: recipientResults.filter(({ result }) => result.delivered).map(({ recipient }) => recipient),
    failedRecipients: failedRecipients.map(({ recipient }) => recipient),
  }, allAccepted ? 201 : 202);
});
