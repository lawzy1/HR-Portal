// Creates a new employee: invites an auth user, then creates the matching
// `employees` + `profiles` rows atomically (best-effort rollback on
// partial failure). Runs with the service role because inviting an auth
// user and writing `profiles` (which has no client-facing INSERT policy —
// see supabase/migrations/00000000000001_foundation.sql) both require
// elevated privileges no authenticated client should hold directly.
//
// Caller must be an authenticated admin — verified against `profiles.role`
// server-side, never trusted from the request body.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

interface CreateEmployeeBody {
  fullName: string;
  email: string;
  jobTitle?: string;
  department?: string;
  phone?: string;
  dob?: string;
  gender?: string;
  maritalStatus?: string;
  startDate?: string;
  contractType?: string;
  currentSalary?: number;
  status?: string;
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Missing Authorization header" }, 401);
  }

  // Verify the caller's own identity via their JWT (not trusted input).
  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user: callerUser }, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerUser) {
    return jsonResponse({ error: "Invalid session" }, 401);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: callerProfile, error: profileError } = await admin
    .from("profiles")
    .select("company_id, role")
    .eq("id", callerUser.id)
    .maybeSingle();

  if (profileError || !callerProfile || callerProfile.role !== "admin") {
    return jsonResponse({ error: "Forbidden: admin only" }, 403);
  }

  const body = (await req.json().catch(() => null)) as CreateEmployeeBody | null;
  if (!body?.fullName || !body?.email) {
    return jsonResponse({ error: "fullName and email are required" }, 400);
  }

  const companyId = callerProfile.company_id;

  const { count } = await admin
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  const employeeCode = `NV-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(3, "0")}`;

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(body.email);
  if (inviteError || !invited?.user) {
    return jsonResponse({ error: inviteError?.message ?? "Failed to invite user" }, 400);
  }
  const newUserId = invited.user.id;

  const { data: employee, error: employeeError } = await admin
    .from("employees")
    .insert({
      company_id: companyId,
      employee_code: employeeCode,
      full_name: body.fullName,
      job_title: body.jobTitle ?? null,
      department: body.department ?? null,
      email: body.email,
      phone: body.phone ?? null,
      dob: body.dob ?? null,
      gender: body.gender ?? null,
      marital_status: body.maritalStatus ?? null,
      start_date: body.startDate ?? null,
      contract_type: body.contractType ?? null,
      current_salary: body.currentSalary ?? null,
      status: body.status ?? "Mới tiếp nhận",
    })
    .select()
    .single();

  if (employeeError || !employee) {
    await admin.auth.admin.deleteUser(newUserId);
    return jsonResponse({ error: employeeError?.message ?? "Failed to create employee" }, 400);
  }

  const { error: profileInsertError } = await admin.from("profiles").insert({
    id: newUserId,
    company_id: companyId,
    employee_id: employee.id,
    role: "employee",
    is_active: true,
  });

  if (profileInsertError) {
    await admin.from("employees").delete().eq("id", employee.id);
    await admin.auth.admin.deleteUser(newUserId);
    return jsonResponse({ error: profileInsertError.message }, 400);
  }

  return jsonResponse({ employee }, 201);
});
