import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const FALLBACK_ORIGIN = "http://127.0.0.1:3000";
const ALLOWED_ORIGINS = new Set(
  (Deno.env.get("ALLOWED_ORIGINS") ?? FALLBACK_ORIGIN)
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean),
);

function corsHeaders(request: Request) {
  const origin = request.headers.get("Origin")?.replace(/\/$/, "");
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : FALLBACK_ORIGIN,
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

async function removeEmployeeFiles(admin: ReturnType<typeof createClient>, companyId: string, employeeId: string) {
  const folder = `${companyId}/${employeeId}`;

  while (true) {
    const { data: objects, error: listError } = await admin.storage.from("employee-documents").list(folder, { limit: 100 });
    if (listError) throw listError;
    if (!objects?.length) return;

    const paths = objects.filter((object) => object.id).map((object) => `${folder}/${object.name}`);
    if (paths.length) {
      const { error: removeError } = await admin.storage.from("employee-documents").remove(paths);
      if (removeError) throw removeError;
    }
    if (objects.length < 100) return;
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") return jsonResponse(request, { error: "Method not allowed" }, 405);

  const authorization = request.headers.get("Authorization");
  if (!authorization) return jsonResponse(request, { error: "Missing Authorization header" }, 401);
  const body = await request.json().catch(() => null) as { employeeId?: unknown } | null;
  const employeeId = typeof body?.employeeId === "string" ? body.employeeId : null;
  if (!employeeId) return jsonResponse(request, { error: "Yêu cầu không hợp lệ" }, 400);

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
    return jsonResponse(request, { error: "Chỉ Admin đang hoạt động mới được xóa vĩnh viễn nhân viên" }, 403);
  }

  const { data: employee, error: employeeError } = await admin
    .from("employees")
    .select("id, status")
    .eq("id", employeeId)
    .eq("company_id", adminProfile.company_id)
    .maybeSingle();
  if (employeeError || !employee) return jsonResponse(request, { error: "Không tìm thấy nhân viên" }, 404);
  if (employee.status !== "Đã nghỉ việc") {
    return jsonResponse(request, { error: "Chỉ có thể xóa vĩnh viễn nhân viên đã nghỉ việc" }, 409);
  }

  const { data: profileLinks, error: profilesError } = await admin
    .from("profiles")
    .select("id, role")
    .eq("employee_id", employeeId);
  if (profilesError) return jsonResponse(request, { error: profilesError.message }, 500);
  if (profileLinks?.some((profile) => profile.role === "admin")) {
    return jsonResponse(request, { error: "Không thể xóa nhân viên đang gắn với tài khoản Admin" }, 409);
  }

  try {
    await removeEmployeeFiles(admin, adminProfile.company_id, employeeId);
  } catch (error) {
    return jsonResponse(request, { error: error instanceof Error ? error.message : "Không thể xóa tài liệu của nhân viên" }, 500);
  }

  for (const profile of profileLinks || []) {
    const { error } = await admin.auth.admin.deleteUser(profile.id);
    if (error) return jsonResponse(request, { error: error.message }, 500);
  }

  const { error: deleteError } = await admin
    .from("employees")
    .delete()
    .eq("id", employeeId)
    .eq("company_id", adminProfile.company_id)
    .eq("status", "Đã nghỉ việc");
  if (deleteError) return jsonResponse(request, { error: deleteError.message }, 500);

  return jsonResponse(request, { deleted: true }, 200);
});
