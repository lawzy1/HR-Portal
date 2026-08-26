// Trusted boundary for the invitation flow. The browser can ask to create an
// invitation, but only this function holds the Supabase secret key required to
// create an Auth invite and the database function re-validates the admin.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return jsonResponse(req, { error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse(req, { error: "Missing Authorization header" }, 401);
  if (!APP_URL) return jsonResponse(req, { error: "Server chưa cấu hình APP_URL cho link kích hoạt" }, 500);

  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user: callerUser }, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerUser) return jsonResponse(req, { error: "Phiên đăng nhập không hợp lệ" }, 401);

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
    return jsonResponse(req, { error: "Chỉ Admin đang hoạt động mới được mời nhân viên" }, 403);
  }

  const body = (await req.json().catch(() => null)) as CreateEmployeeBody | null;
  const email = body?.email?.trim().toLowerCase();
  if (!body || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse(req, { error: "Email không hợp lệ" }, 400);
  }
  if (![body.employeeCode, body.fullName, body.department, body.jobTitle].every((value) => value?.trim())) {
    return jsonResponse(req, { error: "Vui lòng điền đủ mã NV, họ tên, phòng ban và chức danh" }, 400);
  }
  if (!isValidDate(body.startDate)) return jsonResponse(req, { error: "Ngày vào làm không hợp lệ" }, 400);

  // Auth owns the email and sends the invitation. No password is ever
  // generated or returned by this endpoint.
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${APP_URL}/auth/activate`,
    data: { invitation_source: "employee_admin_invite" },
  });
  if (inviteError || !invited.user) {
    return jsonResponse(req, { error: inviteError?.message ?? "Không thể gửi lời mời kích hoạt" }, 400);
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
    return jsonResponse(req, { error: createError?.message ?? "Không thể tạo hồ sơ nhân viên" }, 400);
  }

  return jsonResponse(req, { employee }, 201);
});
