import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { logInternalError, publicError } from "../_shared/error-response.ts";

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

function errorResponse(request: Request, options: Parameters<typeof publicError>[2]) {
  return publicError(request, corsHeaders(request), options);
}

async function removeEmployeeFiles(admin: ReturnType<typeof createClient>, companyId: string, employeeId: string) {
  const removeFolder = async (folder: string): Promise<void> => {
    const { data: objects, error: listError } = await admin.storage.from("employee-documents").list(folder, { limit: 100 });
    if (listError) throw listError;
    if (!objects?.length) return;

    const paths: string[] = [];
    const nestedFolders: string[] = [];
    for (const object of objects) {
      const path = `${folder}/${object.name}`;
      if (object.id) paths.push(path);
      else nestedFolders.push(path);
    }
    if (paths.length) {
      const { error: removeError } = await admin.storage.from("employee-documents").remove(paths);
      if (removeError) throw removeError;
    }
    for (const nestedFolder of nestedFolders) await removeFolder(nestedFolder);
    // Storage.list has no cursor. Once a full page has been removed, read the
    // same prefix again until the page is shorter than the limit.
    if (objects.length === 100) await removeFolder(folder);
  };

  await removeFolder(`${companyId}/${employeeId}`);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") return errorResponse(request, { code: "INVALID_REQUEST", message: "Phương thức gửi yêu cầu không hợp lệ.", status: 405 });

  const authorization = request.headers.get("Authorization");
  if (!authorization) return errorResponse(request, { code: "UNAUTHENTICATED", message: "Phiên đăng nhập đã hết hạn.", status: 401 });
  const body = await request.json().catch(() => null) as { employeeId?: unknown } | null;
  const employeeId = typeof body?.employeeId === "string" ? body.employeeId : null;
  if (!employeeId) return errorResponse(request, { code: "INVALID_REQUEST", message: "Yêu cầu không hợp lệ.", status: 400 });

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
    logInternalError("delete employee authorization failed", adminError);
    return errorResponse(request, { code: "FORBIDDEN", message: "Bạn không có quyền xóa nhân viên.", status: 403 });
  }

  const { data: employee, error: employeeError } = await admin
    .from("employees")
    .select("id, status")
    .eq("id", employeeId)
    .eq("company_id", adminProfile.company_id)
    .maybeSingle();
  if (employeeError || !employee) {
    if (!employeeError) {
      // A browser can retain a selected row briefly after an administrator
      // removes it directly in the database. Treat a repeat delete as a
      // successful no-op so the client clears that stale row.
      return jsonResponse(request, { deleted: true, alreadyDeleted: true }, 200);
    }
    logInternalError("delete employee lookup failed", employeeError);
    return errorResponse(request, { code: "INTERNAL_ERROR", message: "Chưa thể kiểm tra hồ sơ nhân viên. Vui lòng thử lại sau.", status: 500 });
  }
  if (employee.status !== "Đã nghỉ việc") {
    return errorResponse(request, { code: "CONFLICT", message: "Chỉ có thể xóa vĩnh viễn nhân viên đã nghỉ việc.", status: 409 });
  }

  const { data: profileLinks, error: profilesError } = await admin
    .from("profiles")
    .select("id, role")
    .eq("employee_id", employeeId);
  if (profilesError) {
    logInternalError("delete employee profile lookup failed", profilesError);
    return errorResponse(request, { code: "INTERNAL_ERROR", message: "Chưa thể xóa nhân viên. Vui lòng thử lại sau.", status: 500 });
  }
  let storageCleanupWarning = false;
  try {
    await removeEmployeeFiles(admin, adminProfile.company_id, employeeId);
  } catch (error) {
    // Storage cleanup is best-effort. It must not leave a database employee
    // row stuck in the UI when a stale/missing object causes Storage to fail.
    storageCleanupWarning = true;
    logInternalError("delete employee files failed; continuing with database delete", error);
  }

  // Delete employee Auth accounts before the employee row. If the following
  // database delete fails, the offboarded row remains available for a retry;
  // doing this in reverse can leave an untraceable Auth user blocking re-invite.
  for (const profile of profileLinks || []) {
    if (profile.role === "admin" || profile.role === "hr") continue;
    const { error } = await admin.auth.admin.deleteUser(profile.id);
    if (error) {
      logInternalError("delete employee auth user failed", error);
      return errorResponse(request, { code: "INTERNAL_ERROR", message: "Chưa thể xóa nhân viên. Vui lòng thử lại sau.", status: 500 });
    }
  }

  const { error: deleteError } = await admin
    .from("employees")
    .delete()
    .eq("id", employeeId)
    .eq("company_id", adminProfile.company_id)
    .eq("status", "Đã nghỉ việc");
  if (deleteError) {
    logInternalError("delete employee record failed", deleteError);
    return errorResponse(request, { code: "INTERNAL_ERROR", message: "Chưa thể xóa nhân viên. Vui lòng thử lại sau.", status: 500 });
  }

  return jsonResponse(request, {
    deleted: true,
    accountPreserved: profileLinks?.some((profile) => profile.role === "admin" || profile.role === "hr") ?? false,
    storageCleanupWarning,
  }, 200);
});
